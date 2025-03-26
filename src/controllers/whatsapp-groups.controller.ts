import type { Request, Response } from 'express';

import whatsappGroupsService from '../services/whatsapp-groups.service.js';
import whatsappService from '../services/whatsapp.service.js';

export const whatsappGroupsController = {
    /**
     * Get all groups
     */
    async getAllGroups(req: Request, res: Response): Promise<void> {
        try {
            if (!whatsappService.isConnected) {
                res.status(400).json({ success: false, message: 'WhatsApp not connected' });
                return;
            }
            const groups = await whatsappGroupsService.getAllGroups();
            res.json({ success: true, groups, numOfGroups: groups.length });
        } catch (error) {
            console.error('Error getting groups:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    },
};
