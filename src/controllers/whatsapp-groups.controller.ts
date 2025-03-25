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
            // console.log(groups);
            res.json({ success: true, groups });
        } catch (error) {
            console.error('Error getting groups:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    },

    /**
     * Get archived groups
     */
    async getArchivedGroups(req: Request, res: Response): Promise<void> {
        try {
            if (!whatsappService.isConnected) {
                res.status(400).json({ success: false, message: 'WhatsApp not connected' });
                return;
            }

            const groups = await whatsappGroupsService.getArchivedGroups();
            res.json({ success: true, groups });
        } catch (error) {
            console.error('Error getting archived groups:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    },

    /**
     * Update archive status
     */
    async updateArchiveStatus(req: Request, res: Response): Promise<void> {
        try {
            if (!whatsappService.isConnected) {
                res.status(400).json({ success: false, message: 'WhatsApp not connected' });
                return;
            }

            const { groupId, archived } = req.body;

            if (!groupId || typeof archived !== 'boolean') {
                res.status(400).json({
                    success: false,
                    message: 'Group ID and archived status are required'
                });
                return;
            }

            whatsappGroupsService.setGroupArchived(groupId, archived);
            res.json({ success: true, message: 'Group archive status updated' });
        } catch (error) {
            console.error('Error updating archive status:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    },

    /**
     * Update multiple groups archive status
     */
    async updateMultipleArchiveStatus(req: Request, res: Response): Promise<void> {
        try {
            if (!whatsappService.isConnected) {
                res.status(400).json({ success: false, message: 'WhatsApp not connected' });
                return;
            }

            const { archivedIds } = req.body;

            if (!Array.isArray(archivedIds)) {
                res.status(400).json({
                    success: false,
                    message: 'archivedIds must be an array of group IDs'
                });
                return;
            }

            whatsappGroupsService.updateArchivedGroups(archivedIds);
            res.json({ success: true, message: 'Groups archive status updated' });
        } catch (error) {
            console.error('Error updating multiple archive status:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
};