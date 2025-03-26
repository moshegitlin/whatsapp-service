interface GroupInfo {
    id: string;
    name: string;
    isCommunity?: boolean;
}

/**
 * Result of sending messages to groups
 */
interface SendMessageToGroupsResult {
    success: boolean;
    messageId: string;
    failedGroups?: string[];
}

/**
 * Result of clearing messages from groups
 */
interface ClearGroupMessagesResult {
    success: boolean;
    clearedGroups: string[];
    failedGroups?: string[];
}