import { apiClient } from "./api";

export interface FanPresenceItem {
  id?: string;
  userId: string;
  role?: string;
  joinedAt?: string;
  lastActiveAt?: string;
}

export interface FansResponse {
  eventId: string;
  fans: FanPresenceItem[];
  total: number;
}

export interface FanRankingItem {
  id?: string;
  userId: string;
  rank: number;
  engagementScore?: number;
  updatedAt?: string;
}

export interface RankingsResponse {
  eventId: string;
  rankings: FanRankingItem[];
}

export const fanInteractionService = {
  async getFans(eventId: string): Promise<FansResponse> {
    const { data } = await apiClient.get<FansResponse>(`/events/${eventId}/fans`);
    return data;
  },

  async getRankings(eventId: string): Promise<RankingsResponse> {
    const { data } = await apiClient.get<RankingsResponse>(`/events/${eventId}/rankings`);
    return data;
  },
};
