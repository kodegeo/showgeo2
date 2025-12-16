import { apiClient } from "./api";
import type { PaginatedResponse, QueryParams } from "./types";

export interface Post {
  id: string;
  entityId: string;
  title: string;
  content: string;
  mediaUrl?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostRequest {
  title: string;
  content: string;
  mediaUrl?: string;
  isPublic?: boolean;
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  mediaUrl?: string;
  isPublic?: boolean;
}

export const postsService = {
  /**
   * Create a new post
   */
  async create(data: CreatePostRequest): Promise<Post> {
    const response = await apiClient.post<Post>("/posts", data);
    return response.data;
  },

  /**
   * Get posts with filters
   */
  async getAll(params?: QueryParams & { entityId?: string; isPublic?: boolean }): Promise<PaginatedResponse<Post>> {
    const response = await apiClient.get<PaginatedResponse<Post>>("/posts", { params });
    return response.data;
  },

  /**
   * Get post by ID
   */
  async getById(id: string): Promise<Post> {
    const response = await apiClient.get<Post>(`/posts/${id}`);
    return response.data;
  },

  /**
   * Update post
   */
  async update(id: string, data: UpdatePostRequest): Promise<Post> {
    const response = await apiClient.patch<Post>(`/posts/${id}`, data);
    return response.data;
  },

  /**
   * Delete post
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/posts/${id}`);
  },
};






