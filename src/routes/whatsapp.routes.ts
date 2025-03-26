import { Router } from 'express';

import { whatsappGroupsController } from '../controllers/whatsapp-groups.controller.js';
import { whatsappController } from '../controllers/whatsapp.controller.js';

const router = Router();

// נתיב ליצירת חיבור חדש
router.post('/connect', whatsappController.connect);

// נתיב לבדיקת סטטוס
router.get('/status', whatsappController.status);

// נתיב לניתוק חיבור קיים
router.post('/disconnect', whatsappController.disconnect);

// נתיבים לטיפול בקבוצות
router.get('/groups', whatsappGroupsController.getAllGroups);
router.post('/messages/send-to-groups', whatsappGroupsController.sendMessageToGroups);
router.post('/messages/clear-groups', whatsappGroupsController.clearGroupMessages);

export default router;
