import fs from 'fs';

import { Boom } from '@hapi/boom';
import { makeWASocket, useMultiFileAuthState, makeInMemoryStore } from '@whiskeysockets/baileys';
import type { WASocket } from '@whiskeysockets/baileys';
import axios from 'axios';

import config from '../config/config.js';

class WhatsAppService {
    private static instance: WhatsAppService;
    private _socket: WASocket | null = null;
    private _store: ReturnType<typeof makeInMemoryStore> = makeInMemoryStore({});
    private _phoneNumber: string | null = null;
    private _connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'busy' =
        'disconnected';

    // להגבלת מספר ניסיונות להתחבר מחדש
    private maxReconnectAttempts: number = 3;
    private reconnectAttempt: number = 0;

    // Singleton
    private constructor() {
        this.checkExistingSession().catch((error) => {
            console.error('שגיאה בבדיקת סשן קיים:', error);
        });
    }

    public static getInstance(): WhatsAppService {
        if (!WhatsAppService.instance) {
            WhatsAppService.instance = new WhatsAppService();
        }
        return WhatsAppService.instance;
    }

    private async checkExistingSession(): Promise<void> {
        try {
            const authPath = config.whatsapp.authPath;

            if (fs.existsSync(authPath)) {
                // Check if the directory is not empty
                const files = fs.readdirSync(authPath);

                if (files.length > 0) {
                    // If there are existing session files, try to connect
                    console.log('נמצאו קבצי סשן קיימים, מנסה להתחבר...');
                    await this.connectToWhatsApp();
                } else {
                    console.log('נמצאה תיקיית סשן, אך היא ריקה. יוצר סשן חדש...');
                }
            }
        } catch (error) {
            console.error('שגיאה בבדיקת סשן קיים:', error);
        }
    }

    private async closeSocket(): Promise<void> {
        if (!this._socket) return;

        try {
            await this._socket.logout();
            this._socket.ev.removeAllListeners('connection.update');
            this._socket.ev.removeAllListeners('creds.update');
            console.log('Socket closed successfully');
        } catch (error) {
            console.error('Error closing socket:', error);
        }
    }

    public async connectToWhatsApp(phoneNumber?: string): Promise<string | null> {
        this._connectionStatus = 'connecting';
        this._phoneNumber = phoneNumber || this._phoneNumber;
        let pairingCode: string | null;

        try {
            const { state, saveCreds } = await useMultiFileAuthState(config.whatsapp.authPath);

            this._socket = makeWASocket({
                auth: state,
                printQRInTerminal: false,
            });

            this._socket.ev.on('creds.update', saveCreds);
            this._store.bind(this._socket.ev);
            return new Promise((resolve, reject) => {
                let pairingCodeRequested = false;
                this._socket?.ev.on('connection.update', async (update: any) => {
                    const { connection, lastDisconnect, qr } = update;
                    console.log(`סטטוס חיבור: ${connection}`);
                    if (
                        qr &&
                        this._phoneNumber &&
                        !this._socket?.authState.creds.registered &&
                        !pairingCodeRequested
                    ) {
                        pairingCodeRequested = true;
                        try {
                            pairingCode = (await this._socket?.requestPairingCode(
                                this._phoneNumber,
                            )) as string;
                            console.log(`קוד צימוד: ${pairingCode}`);
                            resolve(pairingCode);
                        } catch (err) {
                            await this.clearSession();
                            console.error(err);
                            reject(err);
                        }
                    }

                    if (connection === 'close') {
                        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                        console.log(`  החיבור נסגר (סיבה ${statusCode}). ניסיון התחברות מחדש...`);
                        this._connectionStatus = 'disconnected';
                        this._socket = null;

                        // ניסיון התחברות מחדש במקרה של קוד 515 עד שמספר הניסיונות יגיע למקסימום
                        if (
                            statusCode === 515 &&
                            this.reconnectAttempt < this.maxReconnectAttempts
                        ) {
                            this.reconnectAttempt++;
                            try {
                                await this.closeSocket();
                                await this.connectToWhatsApp();
                                resolve(null);
                            } catch (error) {
                                reject(error);
                            }
                        } else {
                            // במקרים אחרים, מנקה את הסשן ומדווח על כשל
                            await this.clearSession();
                            reject(new Error(`החיבור נכשל (סיבה ${statusCode})`));
                        }
                    } else if (connection === 'open') {
                        console.log('חיבור WhatsApp נפתח בהצלחה!');
                        this._connectionStatus = 'connected';
                        this.reconnectAttempt = 0;
                        resolve(pairingCode);
                    }
                });
            });
        } catch (error) {
            await this.clearSession();
            this._connectionStatus = 'disconnected';
            console.error('שגיאה בהתחברות לWhatsApp:', error);
            throw error;
        }
    }
    private async clearSession(): Promise<void> {
        try {
            if (fs.existsSync(config.whatsapp.authPath)) {
                fs.rmSync(config.whatsapp.authPath, { recursive: true, force: true });
            }
            await this.closeSocket();
            this._phoneNumber = null;
            this._socket = null;
            this._connectionStatus = 'disconnected';
            console.log('קבצי סשן נמחקו בהצלחה');
        } catch (error) {
            console.error('שגיאה במחיקת קבצי סשן:', error);
        }
    }

    //  production יהיה פעיל במצב
    private async notifyMainServer(isConnected: boolean): Promise<void> {
        try {
            await axios.post(config.server.mainServerCallback, {
                status: isConnected ? 'connected' : 'disconnected',
                phoneNumber: this._phoneNumber,
                timestamp: new Date().toISOString(),
            });
            console.log(`עדכון נשלח לשרת הראשי: ${isConnected ? 'מחובר' : 'מנותק'}`);
        } catch (error) {
            console.error('שגיאה בשליחת עדכון לשרת הראשי:', error);
        }
    }

    // Getters
    public get isConnected(): boolean {
        return this._connectionStatus === 'connected';
    }

    public get isBusy(): boolean {
        return this._connectionStatus === 'busy';
    }

    public get status(): string {
        return this._connectionStatus;
    }
    public get phoneNumber(): string | null {
        return this._phoneNumber;
    }

    public get socket(): WASocket | null {
        return this._socket;
    }
    // להוסיף ל-WhatsAppService
    public get store(): ReturnType<typeof makeInMemoryStore> {
        return this._store;
    }

    // Setter for the busy state
    public set busy(value: boolean) {
        if (value) {
            this._connectionStatus = 'busy';
        } else if (this._connectionStatus === 'busy') {
            this._connectionStatus = this._socket ? 'connected' : 'disconnected';
        }
    }
}

export default WhatsAppService.getInstance();
