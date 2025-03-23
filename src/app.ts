import express, { Express } from 'express';
import cors from 'cors';
import whatsappRoutes from './routes/whatsapp.routes.js';

// יצירת אפליקציית Express
const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// נתיבים
app.use('/api/whatsapp', whatsappRoutes);

// בדיקת בריאות השרת
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;