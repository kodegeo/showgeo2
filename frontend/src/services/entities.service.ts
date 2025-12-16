import { apiClient } from "./api";
import type { PaginatedResponse, QueryParams } from "./types";
import type { Entity, EntityRole } from "../../../packages/shared/types";

export interface CreateEntityRequest {
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

export interface UpdateEntityRequest {
  name?: string;
  bio?: string;
  tags?: string[];
  thumbnail?: string;
  bannerImage?: string;
  location?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  isPublic?: boolean;
}

export interface AddCollaboratorRequest {
  userId: string;
  role: "MANAGER" | "COORDINATOR" | "ADMIN";
}

export const entitiesService = {
  /**
   * Create entity
   */
  async create(data: CreateEntityRequest): Promise<Entity> {
    const response = await apiClient.post<Entity>("/entities", data);
    return response.data;
  },

  /**
   * Get all entities
   */
  async getAll(params?: QueryParams & { type?: string; isVerified?: boolean }): Promise<
    PaginatedResponse<Entity>
  > {
    const response = await apiClient.get<PaginatedResponse<Entity>>("/entities", { params });
    return response.data;
  },

  /**
   * Get entity by ID
   */
  async getById(id: string): Promise<Entity> {
    const response = await apiClient.get<Entity>(`/entities/${id}`);
    return response.data;
  },

  /**
   * Get entity by slug
   */
  async getBySlug(slug: string): Promise<Entity> {
    const response = await apiClient.get<Entity>(`/entities/slug/${slug}`);
    return response.data;
  },

  /**
   * Update entity
   */
  async update(id: string, data: UpdateEntityRequest): Promise<Entity> {
    const response = await apiClient.patch<Entity>(`/entities/${id}`, data);
    return response.data;
  },

  /**
   * Delete entity
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/entities/${id}`);
  },

  /**
   * Add collaborator
   */
  async addCollaborator(id: string, data: AddCollaboratorRequest): Promise<EntityRole> {
    const response = await apiClient.post<EntityRole>(`/entities/${id}/collaborators`, data);
    return response.data;
  },

  /**
   * Remove collaborator
   */
  async removeCollaborator(id: string, userId: string): Promise<void> {
    await apiClient.delete(`/entities/${id}/collaborators/${userId}`);
  },

  /**
   * Get collaborators
   */
  async getCollaborators(id: string): Promise<EntityRole[]> {
    const response = await apiClient.get<EntityRole[]>(`/entities/${id}/collaborators`);
    return response.data;
  },

  /**
   * Apply to become a creator
   * Creates an Entity with PENDING status
   */
  async creatorApply(data: {
    brandName: string;
    category: "musician" | "comedian" | "speaker" | "dancer" | "fitness";
    bio?: string;
    socialLinks?: Record<string, string>;
    website?: string;
    thumbnail?: string;
    bannerImage?: string;
  }): Promise<Entity> {
    const response = await apiClient.post<Entity>("/entities/creator-apply", data);
    return response.data;
  },
};






