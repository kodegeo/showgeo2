// shared/types/asset.types.ts

export enum AssetOwnerType {
  USER = "USER",
  ENTITY = "ENTITY",
}

export enum AssetType {
  IMAGE = "IMAGE",
  AUDIO = "AUDIO",
  VIDEO = "VIDEO",
  DOCUMENT = "DOCUMENT",
  OTHER = "OTHER",
}

export enum StorageProvider {
  SUPABASE = "SUPABASE",
  AWS_S3 = "AWS_S3",
  CLOUDFLARE_R2 = "CLOUDFLARE_R2",
  LOCAL = "LOCAL",
}

// This is the interface your frontend expects when it does:
// import type { Asset } from "@shared/types";
export interface Asset {
  id: string;
  ownerId: string;
  ownerType: AssetOwnerType;
  url: string;
  path: string;
  type: AssetType;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
  metadata?: Record<string, any>;
  isPublic: boolean;
  storageProvider: StorageProvider;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

