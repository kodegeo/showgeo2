import { apiClient } from "./api";

export interface ChatMessage {
  id: string;
  message: string;
  userId: string | null;
  displayName: string;
  createdAt: string;
}

export interface ChatMessagesResponse {
  data: ChatMessage[];
}

export const chatService = {
  async getMessages(eventId: string): Promise<ChatMessagesResponse> {
    const { data } = await apiClient.get<ChatMessagesResponse>(`/chat/${eventId}`);
    return data;
  },

  async sendMessage(eventId: string, message: string): Promise<{ data: ChatMessage | null }> {
    const { data } = await apiClient.post<{ data: ChatMessage | null }>(`/chat/${eventId}`, {
      message: message.trim(),
    });
    return data;
  },
};
