import app from './app.js';
import config from './config/config.js';

// התחלת השרת והאזנה לפורט
const server = app.listen(config.server.port, () => {
    console.log(`🚀 שרת WhatsApp פעיל ומאזין לפורט ${config.server.port}`);
});

// טיפול בסגירת השרת בצורה תקינה
function gracefulShutdown() {
    console.log('🛑 מקבל סיגנל לסיום, סוגר את השרת...');
    server.close(() => {
        console.log('✅ השרת נסגר בהצלחה');
        process.exit(0);
    });

    // אם השרת לא נסגר תוך 10 שניות, נכפה יציאה
    setTimeout(() => {
        console.log('⚠️ לא הצלחנו לסגור את השרת בצורה תקינה, יוצא בכח');
        process.exit(1);
    }, 10000);
}

// רישום מאזינים לאירועי סגירה
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
