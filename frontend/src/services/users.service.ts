import { apiClient } from "./api";
import type { PaginatedResponse, QueryParams } from "./types";
import type { User, UserProfile, Entity } from "../../../packages/shared/types";

export interface CreateUserProfileRequest {
  username?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatarUrl?: string;
  location?: string;
  website?: string;
}

export interface UpdateUserProfileRequest {
  username?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  location?: string;
  timezone?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  preferences?: Record<string, unknown>;
  visibility?: "public" | "private";
}

export interface ConvertToEntityRequest {
  name: string;
  slug: string;
  type: "INDIVIDUAL" | "ORGANIZATION";
  bio?: string;
  tags?: string[];
  thumbnail?: string;
  bannerImage?: string;
  location?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  isPublic?: boolean;
}

export interface UserEntitiesResponse {
  owned: Array<{ id: string; name: string; slug: string; type: string }>;
  managed: Array<{ id: string; name: string; slug: string; type: string; role: string }>;
  followed: Array<{ id: string; name: string; slug: string; type: string }>;
}

export const usersService = {
  /**
   * Get all users (Admin only)
   */
  async getAll(params?: QueryParams): Promise<PaginatedResponse<User & { profile?: UserProfile }>> {
    const response = await apiClient.get<PaginatedResponse<User & { profile?: UserProfile }>>(
      "/users",
      { params },
    );
    return response.data;
  },

  /**
   * Get user by ID
   */
  async getById(id: string): Promise<User & { profile?: UserProfile }> {
    const response = await apiClient.get<User & { profile?: UserProfile }>(`/users/${id}`);
    return response.data;
  },

  /**
   * Get user by username
   */
  async getByUsername(username: string): Promise<User & { profile?: UserProfile }> {
    const response = await apiClient.get<User & { profile?: UserProfile }>(
      `/users/username/${username}`,
    );
    return response.data;
  },

  /**
   * Get user's entities (owned and followed)
   */
  async getEntities(id: string): Promise<UserEntitiesResponse> {
    const response = await apiClient.get<UserEntitiesResponse>(`/users/${id}/entities`);
    return response.data;
  },

  /**
   * Create user profile
   */
  async createProfile(userId: string, data: CreateUserProfileRequest): Promise<UserProfile> {
    const response = await apiClient.post<UserProfile>(`/users/${userId}/profile`, data);
    return response.data;
  },

  /**
   * Update user profile
   */
  async updateProfile(
    id: string,
    data: UpdateUserProfileRequest,
  ): Promise<User & { profile?: UserProfile }> {
    const response = await apiClient.patch<User & { profile?: UserProfile }>(
      `/users/${id}`,
      data,
    );
    return response.data;
  },

  /**
   * Convert user to entity (create first entity)
   */
  async convertToEntity(userId: string, data: ConvertToEntityRequest): Promise<Entity> {
    const response = await apiClient.post<Entity>(`/users/${userId}/convert-to-entity`, data);
    return response.data;
  },

  /**
   * Upgrade user to creator role
   */
  async upgradeToCreator(): Promise<User & { profile?: UserProfile }> {
    const response = await apiClient.post<User & { profile?: UserProfile }>("/users/upgrade-to-creator");
    return response.data;
  },

  /**
   * Delete user (Admin only)
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  },
};
