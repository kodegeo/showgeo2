import { apiClient } from "./api";
import type { PaginatedResponse } from "./types";

export interface Follower {
  id: string;
  userId: string;
  entityId: string;
  user: {
    id: string;
    email: string;
    profile?: {
      username?: string;
      avatarUrl?: string;
    };
  };
  createdAt: string;
}

export interface Following {
  id: string;
  userId: string;
  entityId: string;
  entity: {
    id: string;
    name: string;
    slug: string;
    type: string;
    thumbnail?: string;
  };
  createdAt: string;
}

export const followService = {
  /**
   * Follow an entity
   */
  async followEntity(entityId: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(`/follow/${entityId}`);
    return response.data;
  },

  /**
   * Unfollow an entity
   */
  async unfollowEntity(entityId: string): Promise<{ message: string }> {
    await apiClient.delete(`/follow/${entityId}`);
    return { message: "Unfollowed successfully" };
  },

  /**
   * Get followers of an entity
   */
  async getFollowers(
    entityId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<Follower>> {
    const response = await apiClient.get<PaginatedResponse<Follower>>(
      `/follow/${entityId}/followers`,
      { params: { page, limit } },
    );
    return response.data;
  },

  /**
   * Get entities followed by a user
   */
  async getFollowing(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<Following>> {
    const response = await apiClient.get<PaginatedResponse<Following>>(
      `/follow/user/${userId}`,
      { params: { page, limit } },
    );
    return response.data;
  },

  /**
   * Check if current user is following an entity
   */
  async isFollowing(entityId: string): Promise<boolean> {
    const response = await apiClient.get<{ isFollowing: boolean }>(
      `/follow/status/${entityId}`,
    );
    return response.data.isFollowing;
  },

  /**
   * Get follower count for an entity
   */
  async getFollowCounts(entityId: string): Promise<{ followers: number; following: number }> {
    const response = await apiClient.get<{ followers: number; following: number }>(
      `/follow/counts/entity/${entityId}`,
    );
    return response.data;
  },

  /**
   * Follow an event (like / bookmark)
   */
  async followEvent(eventId: string): Promise<{ id: string; eventId: string; notify: boolean }> {
    const response = await apiClient.post<{ id: string; eventId: string; notify: boolean }>(
      `/follow/event/${eventId}`,
    );
    return response.data;
  },

  /**
   * Unfollow an event
   */
  async unfollowEvent(eventId: string): Promise<void> {
    await apiClient.delete(`/follow/event/${eventId}`);
  },

  /**
   * Check if current user follows event and get notify preference
   */
  async getEventFollowStatus(
    eventId: string,
  ): Promise<{ isFollowing: boolean; notify?: boolean }> {
    const response = await apiClient.get<{
      eventId: string;
      userId: string;
      isFollowing: boolean;
      notify?: boolean;
    }>(`/follow/event/status/${eventId}`);
    return {
      isFollowing: response.data.isFollowing,
      notify: response.data.notify,
    };
  },

  /**
   * Set notify/reminder preference for a followed event
   */
  async setEventNotify(eventId: string, notify: boolean): Promise<{ notify: boolean }> {
    const response = await apiClient.patch<{ notify: boolean }>(
      `/follow/event/${eventId}/notify`,
      { notify },
    );
    return response.data;
  },
};

