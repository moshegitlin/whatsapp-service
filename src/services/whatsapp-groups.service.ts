import type { WASocket, LastMessageList} from '@whiskeysockets/baileys';

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
    async sendMessageToGroups(
        groupIds: string[],
        message: string,
        messageId: string
    ): Promise<SendMessageToGroupsResult> {
        const socket = this.getSocket();
        const failedGroups: string[] = [];
        console.log('groupIds', groupIds);
        for (const groupId of groupIds) {
            try {
                const sleepTime = 1500 + Math.floor(Math.random() * 300);
                await new Promise(resolve => setTimeout(resolve, sleepTime));

                await socket.sendMessage(groupId, { text: message });
            } catch (error) {
                console.error('Error sending group:', error);
                if (error instanceof Error &&
                    (error.message.includes('not-found') || error.message.includes('does not exist'))) {
                    failedGroups.push(groupId);
                } else {
                    try {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        await socket.sendMessage(groupId, { text: message });
                    } catch {
                        failedGroups.push(groupId);
                    }
                }
            }
        }

        return {
            success: failedGroups.length === 0,
            messageId,
            ...(failedGroups.length > 0 ? { failedGroups } : {})
        };
    }

    // פונקציה חדשה
    // בפונקציה clearGroupMessages
    async clearGroupMessages(
        groupIds: string[]
    ): Promise<ClearGroupMessagesResult> {
        const socket = this.getSocket();
        const clearedGroups: string[] = [];
        const failedGroups: string[] = [];

        for (const groupId of groupIds) {
            try {
                const sleepTime = 1000 + Math.floor(Math.random() * 1000);
                await new Promise(resolve => setTimeout(resolve, sleepTime));

                // יצירת רשימה ריקה של הודעות אחרונות כנדרש בטיפוס
                const emptyLastMessages: LastMessageList = {};

                // ארכוב וביטול ארכוב עם הפרמטר הנדרש
                await socket.chatModify({
                    archive: true,
                    lastMessages: emptyLastMessages
                }, groupId);

                await socket.chatModify({
                    archive: false,
                    lastMessages: emptyLastMessages
                }, groupId);

                // מחיקת הצ'אט עצמו
                await socket.chatModify({
                    delete: true,
                    lastMessages: emptyLastMessages
                }, groupId);

                clearedGroups.push(groupId);
            } catch (error) {
                console.error(`Failed to clear chat for group ${groupId}:`, error);
                failedGroups.push(groupId);
            }
        }

        return {
            success: failedGroups.length === 0,
            clearedGroups,
            ...(failedGroups.length > 0 ? { failedGroups } : {})
        };
    }
}

export default new WhatsAppGroupsService();
