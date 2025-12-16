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
};

