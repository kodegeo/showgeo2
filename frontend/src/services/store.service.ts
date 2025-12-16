import { apiClient } from "./api";
import type { PaginatedResponse, QueryParams } from "./types";
import type { Store, Product, StoreStatus, StoreVisibility } from "../../../packages/shared/types";

export interface CreateStoreRequest {
  name: string;
  slug: string;
  description?: string;
  bannerImage?: string;
  logoUrl?: string;
  currency?: string;
  status?: StoreStatus;
  visibility?: StoreVisibility;
  eventId?: string;
  tourId?: string;
}

export interface UpdateStoreRequest {
  name?: string;
  description?: string;
  bannerImage?: string;
  logoUrl?: string;
  status?: StoreStatus;
  visibility?: StoreVisibility;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  imageUrl?: string;
  isDigital?: boolean;
  isAvailable?: boolean;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  isDigital?: boolean;
  isAvailable?: boolean;
}

export const storeService = {
  /**
   * Create store
   */
  async create(data: CreateStoreRequest): Promise<Store> {
    const response = await apiClient.post<Store>("/stores", data);
    return response.data;
  },

  /**
   * Get all stores
   */
  async getAll(
    params?: QueryParams & {
      entityId?: string;
      isActive?: boolean;
      visibility?: StoreVisibility;
    },
  ): Promise<PaginatedResponse<Store>> {
    const response = await apiClient.get<PaginatedResponse<Store>>("/stores", { params });
    return response.data;
  },

  /**
   * Get store by ID
   */
  async getById(id: string): Promise<Store & { products?: Product[] }> {
    const response = await apiClient.get<Store & { products?: Product[] }>(`/stores/${id}`);
    return response.data;
  },

  /**
   * Get store by entity ID
   */
  async getByEntity(entityId: string): Promise<Store & { products?: Product[] }> {
    const response = await apiClient.get<Store & { products?: Product[] }>(
      `/stores/entity/${entityId}`,
    );
    return response.data;
  },

  /**
   * Update store
   */
  async update(id: string, data: UpdateStoreRequest): Promise<Store> {
    const response = await apiClient.patch<Store>(`/stores/${id}`, data);
    return response.data;
  },

  /**
   * Delete store
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/stores/${id}`);
  },

  /**
   * Add product to store
   */
  async addProduct(storeId: string, data: CreateProductRequest): Promise<Product> {
    const response = await apiClient.post<Product>(`/stores/${storeId}/products`, data);
    return response.data;
  },

  /**
   * Update product
   */
  async updateProduct(id: string, data: UpdateProductRequest): Promise<Product> {
    const response = await apiClient.patch<Product>(`/stores/products/${id}`, data);
    return response.data;
  },

  /**
   * Delete product
   */
  async deleteProduct(id: string): Promise<void> {
    await apiClient.delete(`/stores/products/${id}`);
  },
};






