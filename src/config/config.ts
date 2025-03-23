// הגדרות קונפיגורציה לשרת

// יבוא של dotenv לטעינת משתני סביבה מקובץ .env (אופציונלי)
import * as dotenv from 'dotenv';
dotenv.config();

const config = {
    // הגדרות שרת
    server: {
        port: process.env.PORT || 3000,
        mainServerCallback: process.env.MAIN_SERVER_CALLBACK || 'http://localhost:8080/whatsapp/status',
    },

    // הגדרות WhatsApp
    whatsapp: {
        // נתיב לשמירת קבצי אימות
        authPath: process.env.AUTH_PATH || './auth_info_baileys',
        // נתיב לשמירת היסטוריית הודעות
        storePath: process.env.STORE_PATH || './baileys_store.json',
        // זמן בדיקת חיבור (במילישניות)
        connectionCheckInterval: parseInt(process.env.CONNECTION_CHECK_INTERVAL || '10000'),
    }
};

export default config;