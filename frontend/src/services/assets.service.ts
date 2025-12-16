import { apiClient } from "./api";
import type { PaginatedResponse, QueryParams } from "./types";
import type { Asset, AssetType, AssetOwnerType } from "../../../packages/shared/types";

export interface UploadAssetRequest {
  file: File;
  type: AssetType;
  ownerType: AssetOwnerType;
  ownerId: string;
  isPublic?: boolean;
  metadata?: Record<string, any>;
}

export interface AssetQueryParams extends QueryParams {
  type?: AssetType;
  ownerType?: AssetOwnerType;
  ownerId?: string;
  isPublic?: boolean;
}

export const assetsService = {
  /**
   * Upload asset file
   */
  async upload(data: UploadAssetRequest): Promise<Asset> {
    const formData = new FormData();
    formData.append("file", data.file);
    formData.append("type", String(data.type));
    formData.append("ownerType", String(data.ownerType));
    formData.append("ownerId", data.ownerId);

    if (data.isPublic !== undefined) {
      formData.append("isPublic", String(data.isPublic));
    }

    if (data.metadata) {
      // Send as JSON string, backend can parse if needed
      formData.append("metadata", JSON.stringify(data.metadata));
    }

    // ❗️DO NOT manually set Content-Type here – axios will handle boundary
    const response = await apiClient.post<Asset>("/assets/upload", formData);
    return response.data;
  },

  /**
   * List assets with filters
   */
  async getAll(params?: AssetQueryParams): Promise<PaginatedResponse<Asset>> {
    const response = await apiClient.get<PaginatedResponse<Asset>>("/assets", {
      params,
    });
    return response.data;
  },

  /**
   * Get asset by ID
   */
  async getById(id: string): Promise<Asset> {
    const response = await apiClient.get<Asset>(`/assets/${id}`);
    return response.data;
  },

  /**
   * Get asset URL
   */
  async getUrl(id: string): Promise<string> {
    const response = await apiClient.get<{ url: string }>(`/assets/${id}/url`);
    return response.data.url;
  },

  /**
   * Delete asset
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/assets/${id}`);
  },
};

