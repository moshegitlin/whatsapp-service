import { Boom } from '@hapi/boom';
import  {
    makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    WASocket,
    makeInMemoryStore
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
    private _store = makeInMemoryStore({});
    private _pairingCode: string | null = null;
    private _reconnectAttempts: number = 0;
    private _maxReconnectAttempts: number = 5;
    private _reconnectDelay: number = 5000; // 5 שניות התחלתיות
    private _reconnecting: boolean = false;

    // Singleton pattern
    private constructor() {
        // טעינת Store מהקובץ אם קיים
        try {
            this._store.readFromFile(config.whatsapp.storePath);
        } catch (err) {
            console.warn('קובץ store לא נמצא, ממשיכים');
        }

        // שמירה תקופתית של Store
        setInterval(() => {
            if (this._socket) {
                this._store.writeToFile(config.whatsapp.storePath);
            }
        }, 10000);

        // בדיקת חיבור תקופתית
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

            // קישור Store לאירועים
            this._store.bind(sock.ev);
            sock.ev.on('creds.update', saveCreds);

            let pairingCodeRequested = false;
            let connectionResolved = false;

            return new Promise((resolve, reject) => {
                // טיפול באירועי התחברות
                sock.ev.on('connection.update', async (update) => {
                    const { connection, lastDisconnect, qr } = update;

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
                        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                        console.log(`החיבור נסגר (סיבה ${statusCode}). ניסיון התחברות מחדש: ${shouldReconnect}`);

                        this._connectionStatus = 'disconnected';
                        this._socket = null;

                        // אם לא צריך להתחבר מחדש, ניקוי קבצי הסשן
                        if (!shouldReconnect) {
                            await this.clearSession();
                            // await this.notifyMainServer(false);
                            console.log('התנתקות מ-WhatsApp וניקוי קבצי סשן');
                        } else if (!connectionResolved) {
                            connectionResolved = true;
                            reject(new Error(`החיבור נכשל (סיבה ${statusCode})`));
                        }
                        await this.attemptReconnect()
                    } else if (connection === 'open') {
                        console.log('חיבור WhatsApp נפתח בהצלחה!');
                        this._socket = sock;
                        this._connectionStatus = 'connected';
                        // await this.notifyMainServer(true);
                        console.log('התחברות ל-WhatsApp הסתיימה בהצלחה');

                        if (!connectionResolved && this._pairingCode) {
                            connectionResolved = true;
                            resolve(this._pairingCode);
                        }
                    }
                });

                // טיימאאוט אם לא מקבלים תשובה
                setTimeout(() => {
                    if (!connectionResolved) {
                        connectionResolved = true;
                        reject(new Error('פג זמן בקשת החיבור'));
                    }
                }, 60000); // 60 שניות
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

            if (fs.existsSync(config.whatsapp.storePath)) {
                fs.unlinkSync(config.whatsapp.storePath);
            }

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
    private async attemptReconnect(): Promise<void> {
        if (this._reconnecting) return;

        this._reconnecting = true;

        try {
            // חישוב דיליי אקספוננציאלי (למניעת עומס על השרת)
            const delay = this._reconnectDelay * Math.pow(1.5, this._reconnectAttempts);

            console.log(`מנסה להתחבר מחדש בעוד ${delay/1000} שניות (ניסיון ${this._reconnectAttempts + 1}/${this._maxReconnectAttempts})`);

            // המתנה לפני ניסיון התחברות מחדש
            await new Promise(resolve => setTimeout(resolve, delay));

            // ניסיון התחברות מחדש
            await this.connectToWhatsApp();

            // איפוס מונה הניסיונות אם ההתחברות הצליחה
            this._reconnectAttempts = 0;
        } catch (error) {
            this._reconnectAttempts++;
            console.error(`התחברות מחדש נכשלה (ניסיון ${this._reconnectAttempts}/${this._maxReconnectAttempts}):`, error);

            // בדיקה אם להמשיך בניסיונות התחברות
            if (this._reconnectAttempts < this._maxReconnectAttempts) {
                // ניסיון נוסף
                await this.attemptReconnect();
            } else {
                console.error('מספר מקסימלי של ניסיונות התחברות מחדש הושלם. מפסיק ניסיונות.');
                this._reconnectAttempts = 0; // איפוס לניסיון עתידי
            }
        } finally {
            this._reconnecting = false;
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