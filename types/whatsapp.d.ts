// הגדרות טיפוסים לשימוש בפרויקט WhatsApp

/**
 * סטטוס החיבור לווטצאפ
 */
declare type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'busy';

/**
 * מידע על סטטוס חיבור
 */
declare interface ConnectionStatusInfo {
    connected: boolean;
    status: ConnectionStatus;
    busy: boolean;
    phoneNumber: string | null;
}

/**
 * בקשת התחברות
 */
declare interface ConnectRequest {
    phoneNumber: string;
}

/**
 * תשובת התחברות
 */
declare interface ConnectResponse {
    success: boolean;
    message: string;
    pairingCode?: string;
    phoneNumber?: string;
}