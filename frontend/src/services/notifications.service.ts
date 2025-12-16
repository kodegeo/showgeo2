import { apiClient } from "./api";
import type { PaginatedResponse, QueryParams } from "./types";

export interface Notification {
  id: string;
  userId: string;
  entityId?: string;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  entity?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface NotificationResponse extends PaginatedResponse<Notification> {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    unreadCount?: number;
  };
}

export const notificationsService = {
  /**
   * Get notifications for current user
   */
  async getAll(
    params?: QueryParams & { unreadOnly?: boolean },
  ): Promise<NotificationResponse> {
    const response = await apiClient.get<NotificationResponse>("/notifications", { params });
    return response.data;
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<{ count: number }>("/notifications/unread-count");
    return response.data.count;
  },

  /**
   * Mark notification as read
   */
  async markAsRead(id: string): Promise<Notification> {
    const response = await apiClient.patch<Notification>(`/notifications/${id}/read`);
    return response.data;
  },

  /**
   * Clear all notifications (mark as read or delete)
   */
  async clearAll(markAsRead = false): Promise<{ count: number }> {
    const response = await apiClient.delete<{ count: number }>("/notifications/clear", {
      params: { markAsRead },
    });
    return response.data;
  },
};






