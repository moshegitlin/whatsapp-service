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

    /**
     * Send message to multiple groups
     */
    async sendMessageToGroups(req: Request, res: Response): Promise<void> {
        try {
            if (!whatsappService.isConnected) {
                res.status(400).json({ success: false, message: 'WhatsApp not connected' });
                return;
            }

            const { groupIds, message, messageId } = req.body;

            if (!groupIds?.length) {
                res.status(400).json({ success: false, message: 'Group IDs are required' });
                return;
            }

            if (!message) {
                res.status(400).json({ success: false, message: 'Message is required' });
                return;
            }

            if (!messageId) {
                res.status(400).json({ success: false, message: 'Message ID is required' });
                return;
            }

            const result = await whatsappGroupsService.sendMessageToGroups(groupIds, message, messageId);
            res.json(result);
        } catch (error) {
            console.error('Error sending messages to groups:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    },

    /**
     * Clear messages from groups
     */
    async clearGroupMessages(req: Request, res: Response): Promise<void> {
        try {
            if (!whatsappService.isConnected) {
                res.status(400).json({ success: false, message: 'WhatsApp not connected' });
                return;
            }

            const { groupIds } = req.body;

            if (!groupIds?.length) {
                res.status(400).json({ success: false, message: 'Group IDs are required' });
                return;
            }

            const result = await whatsappGroupsService.clearGroupMessages(groupIds);
            res.json(result);
        } catch (error) {
            console.error('Error clearing group messages:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
};