import type { WASocket } from '@whiskeysockets/baileys';

import whatsappService from './whatsapp.service.js';

interface GroupInfo {
    id: string;
    name: string;
    isArchived?: boolean;
    desc?: string;
    size?: number;
    creation?: number;
    isCommunity?: boolean;
}

class WhatsAppGroupsService {
    // Store for archived groups - this will need to be populated from your frontend
    private archivedGroups: Set<string> = new Set();

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
            const service = whatsappService
            const chats = await socket.groupFetchAllParticipating();
            console.log("first chats",Object.entries(chats)[0]);
            return Object.entries(chats).map(([id, chat]) => {
                // בדיקת סטטוס ארכיון מה-store
                const isArchivedFromStore = service.store.chats.get(id)?.archived || false;

                return {
                    id,
                    name: chat.subject || 'Unknown Group',
                    isArchived: isArchivedFromStore,
                    desc: chat.desc,
                    size: chat.size,
                    creation: chat.creation,
                    isCommunity: chat.isCommunity
                };
            });
        } catch (error) {
            console.error('Error fetching groups:', error);
            throw error;
        }
    }

    /**
     * Get only archived groups
     */
    async getArchivedGroups(): Promise<GroupInfo[]> {
        try {
            const allGroups = await this.getAllGroups();
            return allGroups.filter(group => group.isArchived);
        } catch (error) {
            console.error('Error fetching archived groups:', error);
            throw error;
        }
    }

    /**
     * Get only non-archived groups
     */
    async getNonArchivedGroups(): Promise<GroupInfo[]> {
        try {
            const allGroups = await this.getAllGroups();
            return allGroups.filter(group => !group.isArchived);
        } catch (error) {
            console.error('Error fetching non-archived groups:', error);
            throw error;
        }
    }

    /**
     * Mark a group as archived
     */
    setGroupArchived(groupId: string, archived: boolean): void {
        if (archived) {
            this.archivedGroups.add(groupId);
        } else {
            this.archivedGroups.delete(groupId);
        }
    }

    /**
     * Update archive status for multiple groups
     */
    updateArchivedGroups(archivedIds: string[]): void {
        this.archivedGroups = new Set(archivedIds);
    }
}

export default new WhatsAppGroupsService();