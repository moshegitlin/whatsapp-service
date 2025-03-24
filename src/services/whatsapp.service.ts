import { Boom } from '@hapi/boom';
import  {
    makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    WASocket,
} from '@whiskeysockets/baileys';
import fs from 'fs';
import config from '../config/config.js';
import axios from 'axios';

// משתנים גלובליים
class WhatsAppService {
    private static instance: WhatsAppService;
    private _socket: WASocket | null = null;
    private _phoneNumber: string | null = null;
    private _connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'busy' = 'disconnected';
    private _pairingCode: string | null = null;

    // Singleton pattern
    private constructor() {
        this.checkExistingSession().then(()=> console.log());
    }

    public static getInstance(): WhatsAppService {
        if (!WhatsAppService.instance) {
            WhatsAppService.instance = new WhatsAppService();
        }
        return WhatsAppService.instance;
    }

    // בדיקת קיום סשן קיים והתחברות אליו
    private async checkExistingSession(): Promise<void> {
        try {
            // בדיקה האם קובץ הסשן קיים
            if (fs.existsSync(config.whatsapp.authPath)) {
                console.log('נמצאו קבצי סשן קיימים, מנסה להתחבר...');
                await this.connectToWhatsApp();
            }
        } catch (error) {
            console.error('שגיאה בבדיקת סשן קיים:', error);
        }
    }

    // התחברות לWhatsApp
    public async connectToWhatsApp(phoneNumber?: string): Promise<string | null> {
        // if (this._connectionStatus === 'busy') {
        //     throw new Error('השרת עסוק כרגע בחיבור אחר');
        // }

        this._connectionStatus = 'connecting';
        this._phoneNumber = phoneNumber || this._phoneNumber;
        this._pairingCode = null;

        try {
            const { state, saveCreds } = await useMultiFileAuthState(config.whatsapp.authPath);
            const sock = makeWASocket({
                auth: state,
                printQRInTerminal: false,
            });
            sock.ev.on('creds.update', saveCreds);
            let pairingCodeRequested = false;
            let connectionResolved = false;

            return new Promise((resolve, reject) => {
                // טיפול באירועי התחברות
                sock.ev.on('connection.update', async (update) => {
                    const { connection, lastDisconnect, qr } = update;
                    console.log(94)
                    console.log(connection)

                    // בקשת קוד צימוד אם יש QR ומספר טלפון
                    if (qr && this._phoneNumber && !sock.authState.creds.registered && !pairingCodeRequested) {
                        pairingCodeRequested = true;
                        try {
                            this._pairingCode = await sock.requestPairingCode(this._phoneNumber);
                            console.log(`קוד צימוד: ${this._pairingCode}`);
                            if (!connectionResolved) {
                                connectionResolved = true;
                                resolve(this._pairingCode);
                            }
                        } catch (err) {
                            console.error('שגיאה בקבלת קוד צימוד:', err);
                            if (!connectionResolved) {
                                connectionResolved = true;
                                reject(new Error('שגיאה בקבלת קוד צימוד'));
                            }
                        }
                    }

                    if (connection === 'close') {
                        console.log(116)
                        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                        console.log(`החיבור נסגר (סיבה ${statusCode}). ניסיון התחברות מחדש: ${shouldReconnect}`);

                        this._connectionStatus = 'disconnected';
                        this._socket = null;
                        if (!shouldReconnect) {
                            await this.clearSession();
                            // await this.notifyMainServer(false);
                            console.log('התנתקות מ-WhatsApp וניקוי קבצי סשן');
                            reject(new Error(`החיבור נכשל (סיבה ${statusCode})`));
                        } else if (!connectionResolved) {
                            connectionResolved = true;
                            reject(new Error(`החיבור נכשל (סיבה ${statusCode})`));
                        }
                        await this.connectToWhatsApp();
                    } else if (connection === 'open') {
                        console.log('חיבור WhatsApp נפתח בהצלחה!');
                        this._socket = sock;
                        this._connectionStatus = 'connected';
                        // await this.notifyMainServer(true);
                            connectionResolved = true;
                            resolve(this._pairingCode);
                    }
                });

                // טיימאאוט אם לא מקבלים תשובה
                // setTimeout(() => {
                //     if (!connectionResolved) {
                //         connectionResolved = true;
                //         console.log(147)
                //         reject(new Error('פג זמן בקשת החיבור'));
                //     }
                //     console.log(149)
                // }, 60000); // 60 שניות
            });
        } catch (error) {
            this._connectionStatus = 'disconnected';
            console.error('שגיאה בהתחברות לWhatsApp:', error);
            throw error;
        }
    }

    // ניקוי קבצי סשן ומידע גלובלי
    private async clearSession(): Promise<void> {
        try {
            if (fs.existsSync(config.whatsapp.authPath)) {
                fs.rmSync(config.whatsapp.authPath, { recursive: true, force: true });
            }

            // if (fs.existsSync(config.whatsapp.storePath)) {
            //     fs.unlinkSync(config.whatsapp.storePath);
            // }

            this._phoneNumber = null;
            this._socket = null;
            this._connectionStatus = 'disconnected';
            console.log('קבצי סשן נמחקו בהצלחה');
        } catch (error) {
            console.error('שגיאה במחיקת קבצי סשן:', error);
        }
    }

    // שליחת עדכון לשרת הראשי
    private async notifyMainServer(isConnected: boolean): Promise<void> {
        try {
            await axios.post(config.server.mainServerCallback, {
                status: isConnected ? 'connected' : 'disconnected',
                phoneNumber: this._phoneNumber,
                timestamp: new Date().toISOString()
            });
            console.log(`עדכון נשלח לשרת הראשי: ${isConnected ? 'מחובר' : 'מנותק'}`);
        } catch (error) {
            console.error('שגיאה בשליחת עדכון לשרת הראשי:', error);
        }
    }
    // getters
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

    // setter
    public set busy(value: boolean) {
        if (value) {
            this._connectionStatus = 'busy';
        } else if (this._connectionStatus === 'busy') {
            this._connectionStatus = this._socket ? 'connected' : 'disconnected';
        }
    }
}

export default WhatsAppService.getInstance();