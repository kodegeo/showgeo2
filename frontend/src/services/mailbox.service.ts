import { apiClient } from "./api";

export type MailboxItemType = "TICKET" | "INVITATION" | "NOTIFICATION" | "EVENT_UPDATE" | "AUDIENCE_MESSAGE";

export interface MailboxItem {
  id: string;
  userId?: string;
  email?: string;
  type: MailboxItemType;
  title: string;
  message: string;
  metadata?: {
    eventId?: string;
    eventName?: string;
    startTime?: string;
    phase?: string;
    ticketId?: string;
    registrationId?: string;
    entityId?: string;
    entityName?: string;
    senderId?: string;
    channel?: string;
    [key: string]: unknown;
  };
  isRead: boolean;
  registrationId?: string;
  createdAt: string;
  updatedAt: string;
  _isAudienceMessage?: boolean; // Flag to identify audience messages
  _messageClassification?: "system_message" | "audience_message"; // Message classification
  _senderEntityName?: string; // Entity name for audience messages
}

export const mailboxService = {
  /**
   * Get mailbox items for authenticated user
   */
  async getMailbox(): Promise<MailboxItem[]> {
    // Note: Backend endpoint is GET /events/:eventId/registrations/mailbox
    // But we need a user-level mailbox endpoint
    // For now, we'll use a placeholder endpoint that should be added to backend
    // TODO: Backend should add GET /mailbox endpoint
    const response = await apiClient.get<MailboxItem[]>("/mailbox");
    return response.data;
  },
};


