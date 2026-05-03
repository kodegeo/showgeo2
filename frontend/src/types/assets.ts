/**
 * Universal asset upload contract.
 * Backend builds storage paths from ownerType + ownerId (or eventId) + metadata.
 * Frontend only sends metadata; no file paths.
 */

export type OwnerType = "user" | "entity" | "event";

export type AssetType =
  | "avatar"
  | "banner"
  | "logo"
  | "thumbnail"
  | "clip"
  | "product"
  | "gallery"
  | "creator-id"
  | "creator-logo"
  | "creator-profile"
  | "creator-sample";

export interface UploadAssetParams {
  file: File;
  ownerType: OwnerType;
  ownerId: string;
  assetType: AssetType;
  visibility?: "public" | "private";
  metadata?: Record<string, unknown>;
}

/** Normalized response from any upload; objects store only the URL. */
export interface NormalizedAssetResponse {
  assetId: string;
  /** Alias for assetId for backward compatibility */
  id: string;
  url: string;
  ownerType: OwnerType;
  ownerId: string;
  assetType: AssetType;
}

/** Structured error payload (message + code). */
export interface AssetUploadErrorPayload {
  message: string;
  code: "FILE_TOO_LARGE" | "UNSUPPORTED_FILE_TYPE" | "NETWORK_ERROR" | "UPLOAD_FAILED";
}

/** Default max file size: 10MB images, 200MB video, 10MB documents */
export const DEFAULT_MAX_SIZE_IMAGE = 10 * 1024 * 1024;
export const DEFAULT_MAX_SIZE_VIDEO = 200 * 1024 * 1024;
export const DEFAULT_MAX_SIZE_DOCUMENT = 10 * 1024 * 1024;
