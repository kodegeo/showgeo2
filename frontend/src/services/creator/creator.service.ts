import { apiClient } from "../api";
import type { CreatePostRequest, Post } from "../posts.service";
import type { Event } from "../../../../packages/shared/types/event.types";
import type { Product } from "../../../../packages/shared/types/store.types";
import type { Asset } from "../../../../packages/shared/types/asset.types";
import type { CreateEventRequest } from "../events.service";
import type { CreateProductRequest } from "../store.service";


import type { StreamingSession, CreateSessionRequest } from "../streaming.service";
import type { ManageFanRequest } from "../fans.service";

export interface CreateEventWithThumbnailRequest extends CreateEventRequest {
  thumbnailFile?: File;
}

export interface CreatePostWithMediaRequest extends Omit<CreatePostRequest, "mediaUrl"> {
  mediaFile?: File;
}

export interface CreateProductWithImageRequest extends Omit<CreateProductRequest, "imageUrl"> {
  imageFile?: File;
}

export interface StartStreamRequest {
  entityId: string;
  title: string;
  description?: string;
  category?: string;
  isPublic?: boolean;
  notifyFollowers?: boolean;
}

export interface UploadMediaRequest {
  file: File;
  title: string;
  description?: string;
  type: "IMAGE" | "VIDEO" | "AUDIO";
  isPublic?: boolean;
  expiration?: string;
  entityId: string;
}

export const creatorService = {
  /**
   * Create event with optional thumbnail upload
   */
  async createEvent(data: CreateEventWithThumbnailRequest): Promise<Event> {
    // If thumbnail file is provided, upload it first
    let thumbnailUrl: string | undefined;
    if (data.thumbnailFile) {
      const formData = new FormData();
      formData.append("file", data.thumbnailFile);
      formData.append("type", "IMAGE");
      formData.append("ownerType", "ENTITY");
      formData.append("ownerId", data.entityId);
      formData.append("isPublic", "true");
      formData.append("metadata", JSON.stringify({ purpose: "event-thumbnail" }));

      const assetResponse = await apiClient.post<Asset>("/assets/upload", formData);
      thumbnailUrl = assetResponse.data.url;
    }

    // Create event with thumbnail URL
    const { thumbnailFile, ...eventData } = data;

    const response = await apiClient.post<Event>("/events", eventData);
    
    // If thumbnail exists, update event after creation
    if (thumbnailUrl) {
      await apiClient.patch(`/events/${response.data.id}`, {
        thumbnail: thumbnailUrl,
      });
    }
    
    return response.data;
  },   
  /**
   * Upload media asset
   */
  async uploadMedia(data: UploadMediaRequest): Promise<Asset> {
    const formData = new FormData();
    formData.append("file", data.file);
    formData.append("type", data.type);
    formData.append("ownerType", "ENTITY");
    formData.append("ownerId", data.entityId);
    formData.append("isPublic", String(data.isPublic ?? true));
    formData.append("metadata", JSON.stringify({
      purpose: "media",
      title: data.title,
      description: data.description,
      expiration: data.expiration,
    }));

    const response = await apiClient.post<Asset>("/assets/upload", formData);
    return response.data;
  },

  /**
   * Create post with optional media upload
   */
  async createPost(data: CreatePostWithMediaRequest & { entityId: string }): Promise<Post> {
    // If media file is provided, upload it first
    let mediaUrl: string | undefined;
    if (data.mediaFile) {
      const formData = new FormData();
      formData.append("file", data.mediaFile);
      formData.append("type", data.mediaFile.type.startsWith("image/") ? "IMAGE" : "VIDEO");
      formData.append("ownerType", "ENTITY");
      formData.append("ownerId", data.entityId);
      formData.append("isPublic", String(data.isPublic ?? true));
      formData.append("metadata", JSON.stringify({ purpose: "post-media" }));

      const assetResponse = await apiClient.post<Asset>("/assets/upload", formData);
      mediaUrl = assetResponse.data.url;
    }

    // Create post with media URL
    const { mediaFile, entityId, ...postData } = data;
    const response = await apiClient.post<Post>("/posts", {
      ...postData,
      mediaUrl,
    });
    return response.data;
  },

  /**
   * Add product with optional image upload
   */
  async addProduct(data: CreateProductWithImageRequest & { storeId: string; entityId: string }): Promise<Product> {
    // If image file is provided, upload it first
    let imageUrl: string | undefined;
    if (data.imageFile) {
      const formData = new FormData();
      formData.append("file", data.imageFile);
      formData.append("type", "IMAGE");
      formData.append("ownerType", "ENTITY");
      formData.append("ownerId", data.entityId);
      formData.append("isPublic", "true");
      formData.append("metadata", JSON.stringify({ purpose: "product-image" }));

      const assetResponse = await apiClient.post<Asset>("/assets/upload", formData);
      imageUrl = assetResponse.data.url;
    }

    // Create product with image URL
    const { imageFile, entityId, ...productData } = data;
    const response = await apiClient.post<Product>(`/stores/${data.storeId}/products`, {
      ...productData,
      imageUrl,
    });
    return response.data;
  },

  /**
   * Start streaming session
   */
  async startStream(data: StartStreamRequest): Promise<StreamingSession> {
    // 1. Create event (DRAFT by default)
    // ✅ Fix: Set ticketRequired: false for instant streams (no tickets needed)
    // Without this, the phase transition to LIVE will fail with 400 error
    // because ticketRequired defaults to true but no ticket types are provided
    const eventResponse = await apiClient.post<Event>("/events", {
      entityId: data.entityId,
      name: data.title,
      description: data.description,
      eventType: "LIVE",
      startTime: new Date().toISOString(),
      ticketRequired: false, // ✅ Required to avoid 400 error on phase transition
    });

    // 2. Transition phase / status via dedicated endpoint
    await apiClient.post(`/events/${eventResponse.data.id}/phase/transition`, {
      phase: "LIVE",
    });

    // 3. Start streaming session
    // ✅ Fix: Don't send eventId in body - it's already in the URL path
    // The ValidationPipe has forbidNonWhitelisted: true, so sending eventId causes 400 error
    const sessionResponse = await apiClient.post<StreamingSession>(
      `/streaming/session/${eventResponse.data.id}`,
      {
        accessLevel: data.isPublic ? "PUBLIC" : "REGISTERED",
      } as CreateSessionRequest,
    );

    return { ...sessionResponse.data, eventId: eventResponse.data.id };
  },

  /**
   * Manage fan (follow, unfollow, block, invite)
   */
  async manageFan(data: {
    entityId: string;
    userId: string;
    action: ManageFanRequest["action"];
    notes?: string;
  }): Promise<{ message: string }> {
    // For Follow/Unfollow, use existing follow endpoints
    if (data.action === "Follow") {
      const response = await apiClient.post<{ message: string }>(`/follow/${data.entityId}`);
      return response.data;
    }

    if (data.action === "Unfollow") {
      await apiClient.delete(`/follow/${data.entityId}`);
      return { message: "Unfollowed successfully" };
    }

    // For Block and Invite, use fans endpoint
    const response = await apiClient.post<{ message: string }>("/fans/manage", {
      entityId: data.entityId,
      userId: data.userId,
      action: data.action,
      notes: data.notes,
    });
    return response.data;
  },

  /**
   * Delete resource (generic)
   */
  async deleteResource(resourceType: string, resourceId: string): Promise<void> {
    const endpointMap: Record<string, string> = {
      event: "/events",
      post: "/posts",
      product: "/products",
      asset: "/assets",
      store: "/stores",
    };

    const endpoint = endpointMap[resourceType.toLowerCase()] || `/${resourceType}s`;
    await apiClient.delete(`${endpoint}/${resourceId}`);
  },
};






