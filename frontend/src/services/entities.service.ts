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
   * Get current user's entity applications
   */
  async getMyApplications(): Promise<{ data: any[] }> {
    const response = await apiClient.get<{ data: any[] }>("/entities/my-applications");
    return response.data;
  },

  /**
   * Apply to become a creator
   * Creates an Entity with PENDING status
   * 
   * Automatically uses:
   * - FormData (multipart/form-data) if any file is provided
   * - JSON (application/json) if no files
   * 
   * @param data Application data
   * @param proofFile Optional proof document file
   * @param businessDocFile Optional business verification document file
   * @param trademarkDocFile Optional trademark/IP verification document file
   */
  async creatorApply(
    data: {
      brandName: string;
      category: "musician" | "comedian" | "speaker" | "dancer" | "fitness";
      bio?: string;
      socialLinks?: Record<string, string>;
      website?: string;
      thumbnail?: string;
      bannerImage?: string;
      termsAccepted: boolean;
      phone?: string; // Contact phone number for verification
      proof?: Record<string, any>; // Additional proof data (legacy)
    },
    proofFile?: File,
    businessDocFile?: File,
    trademarkDocFile?: File
  ): Promise<Entity> {
    // Use FormData if any file is provided, otherwise use JSON
    const hasFiles = proofFile || businessDocFile || trademarkDocFile;
    
    // Root cause fix: Log files before API call to verify they're passed correctly
    console.log("[CREATOR_FORM] API call - files:", {
      proofFile: proofFile?.name,
      businessDocFile: businessDocFile?.name,
      trademarkDocFile: trademarkDocFile?.name,
    });
    
    if (hasFiles) {
      console.log("[CREATOR_FORM] Using FormData (multipart/form-data) for file upload");
      const formData = new FormData();
      
      // Append required fields
      formData.append("brandName", data.brandName);
      formData.append("category", data.category);
      formData.append("termsAccepted", String(data.termsAccepted)); // Ensure boolean is sent as string
      
      // Append optional fields (only if defined)
      if (data.bio !== undefined && data.bio !== null) {
        formData.append("purpose", data.bio); // DTO expects "purpose", not "bio"
      }
      if (data.website !== undefined && data.website !== null) {
        formData.append("website", data.website);
      }
      if (data.thumbnail !== undefined && data.thumbnail !== null) {
        formData.append("thumbnail", data.thumbnail);
      }
      if (data.bannerImage !== undefined && data.bannerImage !== null) {
        formData.append("bannerImage", data.bannerImage);
      }
      if (data.phone !== undefined && data.phone !== null && data.phone.trim()) {
        formData.append("phone", data.phone.trim());
      }
      if (data.socialLinks !== undefined && data.socialLinks !== null && Object.keys(data.socialLinks).length > 0) {
        // Send as JSON string - NestJS DTO Transform will parse it
        formData.append("socialLinks", JSON.stringify(data.socialLinks));
      }
      if (data.proof !== undefined && data.proof !== null && Object.keys(data.proof).length > 0) {
        // Send proof data as JSON string - will be merged with file URLs in backend
        formData.append("proof", JSON.stringify(data.proof));
      }
      
      // Append files (field names match FileFieldsInterceptor)
      if (proofFile) {
        formData.append("proof", proofFile);
        console.log("[CREATOR_FORM] Added proof file:", proofFile.name, `(${(proofFile.size / 1024).toFixed(2)} KB)`);
      }
      if (businessDocFile) {
        formData.append("businessDoc", businessDocFile);
        console.log("[CREATOR_FORM] Added business doc file:", businessDocFile.name, `(${(businessDocFile.size / 1024).toFixed(2)} KB)`);
      }
      if (trademarkDocFile) {
        formData.append("trademarkDoc", trademarkDocFile);
        console.log("[CREATOR_FORM] Added trademark doc file:", trademarkDocFile.name, `(${(trademarkDocFile.size / 1024).toFixed(2)} KB)`);
      }

      // Browser will set Content-Type with boundary automatically
      console.log("[CREATOR_FORM] Sending multipart/form-data request");
      const response = await apiClient.post<Entity>("/entities/creator-apply", formData);
      return response.data;
    } else {
      // JSON submission - build clean object without undefined fields
      const jsonData: any = {
        brandName: data.brandName,
        category: data.category,
        termsAccepted: data.termsAccepted,
      };
      
      if (data.bio !== undefined && data.bio !== null) {
        jsonData.purpose = data.bio; // DTO expects "purpose"
      }
      if (data.website !== undefined && data.website !== null) {
        jsonData.website = data.website;
      }
      if (data.thumbnail !== undefined && data.thumbnail !== null) {
        jsonData.thumbnail = data.thumbnail;
      }
      if (data.bannerImage !== undefined && data.bannerImage !== null) {
        jsonData.bannerImage = data.bannerImage;
      }
      if (data.phone !== undefined && data.phone !== null && data.phone.trim()) {
        jsonData.phone = data.phone.trim();
      }
      if (data.socialLinks !== undefined && data.socialLinks !== null && Object.keys(data.socialLinks).length > 0) {
        jsonData.socialLinks = data.socialLinks;
      }
      if (data.proof !== undefined && data.proof !== null && Object.keys(data.proof).length > 0) {
        jsonData.proof = data.proof;
      }
      
      console.log("[CREATOR_FORM] Sending JSON request (no file)");
      const response = await apiClient.post<Entity>("/entities/creator-apply", jsonData);
      return response.data;
    }
  },
};






