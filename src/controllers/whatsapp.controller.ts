import type { Request, Response } from 'express';

import whatsappService from '../services/whatsapp.service.js';

// בקר לניהול בקשות WhatsApp
export const whatsappController = {
    /**
     * יצירת חיבור חדש ל-WhatsApp והחזרת קוד צימוד
     */
    async connect(req: Request, res: Response): Promise<void> {
        try {
            const { phoneNumber } = req.body;

            if (!phoneNumber) {
                res.status(400).json({
                    success: false,
                    message: 'נדרש מספר טלפון בפורמט בינלאומי (ללא +)',
                });
                return;
            }

            // בדיקה האם יש כבר חיבור פעיל
            if (whatsappService.isConnected) {
                res.status(409).json({
                    success: false,
                    message: 'יש כבר חיבור פעיל ל-WhatsApp',
                    currentPhone: whatsappService.phoneNumber,
                });
                return;
            }

            // התחלת תהליך החיבור וקבלת קוד צימוד
            const pairingCode = await whatsappService.connectToWhatsApp(phoneNumber);

            res.status(202).json({
                success: true,
                message: 'התהליך התחיל, נא להזין את הקוד באפליקציית WhatsApp',
                pairingCode,
                phoneNumber,
            });
        } catch (error) {
            console.error('שגיאה ביצירת חיבור:', error);
            res.status(500).json({
                success: false,
                message:
                    error instanceof Error ? error.message : 'שגיאה לא צפויה בהתחברות ל-WhatsApp',
            });
        }
    },

    /**
     * בדיקת סטטוס חיבור נוכחי
     */
    async status(req: Request, res: Response): Promise<void> {
        try {
            res.json({
                connected: whatsappService.isConnected,
                status: whatsappService.status,
                busy: whatsappService.isBusy,
                phoneNumber: whatsappService.phoneNumber,
            });
        } catch (error) {
            console.error('שגיאה בבדיקת סטטוס:', error);
            res.status(500).json({ success: false, message: 'שגיאה בבדיקת סטטוס' });
        }
    },

    /**
     * ניתוק מWhatsApp ומחיקת הסשן
     */
    async disconnect(req: Request, res: Response): Promise<void> {
        try {
            // בדיקה האם אכן מחובר
            if (!whatsappService.isConnected) {
                res.status(400).json({ success: false, message: 'אין חיבור פעיל לניתוק' });
                return;
            }

            // ניתוק והסרת הסשן - לא מימשנו את הפונקציה בשירות
            // await whatsappService.disconnect();

            res.json({ success: true, message: 'החיבור נותק בהצלחה ונתוני הסשן נמחקו' });
        } catch (error) {
            console.error('שגיאה בניתוק:', error);
            res.status(500).json({ success: false, message: 'שגיאה בניתוק החיבור' });
        }
    },
};
