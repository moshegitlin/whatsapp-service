import { Router } from 'express';

import { whatsappController } from '../controllers/whatsapp.controller.js';

const router = Router();

// נתיב ליצירת חיבור חדש
router.post('/connect', whatsappController.connect);

// נתיב לבדיקת סטטוס
router.get('/status', whatsappController.status);

// נתיב לניתוק חיבור קיים
router.post('/disconnect', whatsappController.disconnect);

export default router;
