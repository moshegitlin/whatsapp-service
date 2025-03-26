import type { WASocket } from '@whiskeysockets/baileys';

import whatsappService from './whatsapp.service.js';

class WhatsAppGroupsService {
    /**
     * Get socket instance from the main service
     */
    private getSocket(): WASocket {
        const socket = whatsappService.socket;
        if (!socket) {
            throw new Error('WhatsApp connection not available');
        }
        return socket;
    }

    /**
     * Fetch all groups
     */
    async getAllGroups(): Promise<GroupInfo[]> {
        try {
            const socket = this.getSocket();
            const chats = await socket.groupFetchAllParticipating();
            return Object.entries(chats).map(([id, chat]) => ({
                id,
                name: chat.subject || 'Unknown Group',
                isCommunity: chat.isCommunity,
            }));
        } catch (error) {
            console.error('Error fetching groups:', error);
            throw error;
        }
    }
}

export default new WhatsAppGroupsService();
