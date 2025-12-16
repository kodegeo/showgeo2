import { apiClient } from "./api";

export interface EntityMetrics {
  eventsCount: number;
  activeFollowers: number;
  storeSales: number;
  averageViewers: number;
  notificationsSent: number;
  engagementScore: number;
}

export interface EventPerformance {
  viewers: number;
  messages: number;
  reactions: number;
  participants: number;
  ticketsSold: number;
  revenue: number;
  trend: Array<{
    date: string;
    viewers: number;
    messages: number;
    reactions: number;
  }>;
}

export interface UserEngagement {
  eventsAttended: number;
  streamsWatched: number;
  entitiesFollowed: number;
  productsPurchased: number;
  engagementScore: number;
}

export interface PlatformOverview {
  totalUsers: number;
  totalEntities: number;
  totalEvents: number;
  activeSessions: number;
  topPerformingEntities: Array<{
    id: string;
    name: string;
    engagementScore: number;
  }>;
  recentActivity: Array<{
    type: string;
    count: number;
    timestamp: string;
  }>;
}

export interface Recommendations {
  entities: Array<{
    id: string;
    name: string;
    slug: string;
    type: string;
    reason: string;
  }>;
  events: Array<{
    id: string;
    name: string;
    startTime: string;
    reason: string;
  }>;
}

export const analyticsService = {
  /**
   * Get entity analytics
   */
  async getEntityAnalytics(entityId: string): Promise<EntityMetrics> {
    const response = await apiClient.get<EntityMetrics>(`/analytics/entity/${entityId}`);
    return response.data;
  },

  /**
   * Get event performance analytics
   */
  async getEventPerformance(eventId: string): Promise<EventPerformance> {
    const response = await apiClient.get<EventPerformance>(`/analytics/event/${eventId}`);
    return response.data;
  },

  /**
   * Get user engagement analytics
   */
  async getUserEngagement(userId: string): Promise<UserEngagement> {
    const response = await apiClient.get<UserEngagement>(`/analytics/user/${userId}`);
    return response.data;
  },

  /**
   * Get platform overview (Admin only)
   */
  async getPlatformOverview(): Promise<PlatformOverview> {
    const response = await apiClient.get<PlatformOverview>("/analytics/overview");
    return response.data;
  },

  /**
   * Get recommendations for user
   */
  async getRecommendations(userId: string): Promise<Recommendations> {
    const response = await apiClient.get<Recommendations>(`/analytics/recommendations/${userId}`);
    return response.data;
  },
};






