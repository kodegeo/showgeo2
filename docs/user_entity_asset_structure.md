# User & Entity Asset Structure (Showgeo 2.0)

## Overview
This document defines the structure, storage approach, and management rules for user and entity assets in **Showgeo 2.0**.  
It ensures scalability, cost efficiency, and consistent organization of uploaded media (images, audio, video, documents).

---

## 🧱 Hierarchical Structure

Assets are grouped by ownership and context. Both **Users** and **Entities** can upload and manage their own assets.  

```
/assets/
  users/
    {userId}/
      profile/
        avatar.jpg
        banner.jpg
      uploads/
        {assetId}/
          file.ext
          metadata.json
  entities/
    {entityId}/
      profile/
        logo.png
        banner.png
      gallery/
        {assetId}/
          file.ext
          metadata.json
      events/
        {eventId}/
          thumbnails/
          recordings/
```

---

## 💾 Storage Model

### Option A — Cloud Object Storage (**Recommended**)

Use a cloud storage service such as **Supabase Storage**, **AWS S3**, or **Cloudflare R2**.  
Each asset record in the database references its file via `url` and `path`.

### Prisma Schema Example

```prisma
model Asset {
  id          String   @id @default(cuid())
  ownerId     String
  ownerType   AssetOwnerType
  url         String
  path        String
  type        AssetType
  metadata    Json?
  isPublic    Boolean  @default(false)
  createdAt   DateTime @default(now())
}

enum AssetOwnerType {
  USER
  ENTITY
}

enum AssetType {
  IMAGE
  AUDIO
  VIDEO
  DOCUMENT
  OTHER
}
```

---

## 🔐 Access Control

| Context | Who Can Upload | Who Can View | Folder Path | Notes |
|----------|----------------|---------------|--------------|--------|
| **User** | Authenticated user | Public (for profile), Private (for uploads) | `/users/{userId}/` | Standard user uploads |
| **Entity (Owner)** | Owner, Manager, Coordinator | Public (for profile), Controlled (for media) | `/entities/{entityId}/` | Managed via roles |
| **Event** | Entity owner or coordinator | Public (for promo), Controlled (for recordings) | `/entities/{entityId}/events/{eventId}/` | Linked to event lifecycle |

---

## ⚙️ Backend Workflow

### Upload Endpoint
```
POST /api/assets/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- file
- type (IMAGE, AUDIO, VIDEO, DOCUMENT)
- ownerType (USER | ENTITY)
- ownerId
- isPublic (optional)
- metadata (optional)
```

### Process
1. Backend validates user context (User or Entity).
2. Validates allowed MIME types and file size.
3. Uploads directly to storage bucket via SDK (Supabase, S3, etc.).
4. Records asset entry in the database (with owner and URL).

---

## 🖼️ Frontend Integration

The upload system integrates with the **Entity Context**:

- If context = `user` → uploads go to `/users/{userId}/`
- If context = `entity` → uploads go to `/entities/{entityId}/`
- React hooks:
  ```tsx
  const { activeContext } = useEntityContext();
  uploadAsset({ file, ownerType: activeContext.type, ownerId: activeContext.id });
  ```
- Entity collaborators (OWNER, MANAGER) have upload privileges under entity context.

---

## 💰 Storage Cost Overview

| Provider | Approx. Cost per GB/Month | Egress Costs | Recommended Use |
|-----------|---------------------------|---------------|----------------|
| **Supabase Storage** | $0.021 | Free CDN | Easiest integration with existing stack |
| **AWS S3** | $0.023 | $0.09/GB | Industry standard, highly scalable |
| **Cloudflare R2** | $0.015 | $0 | Best for large-scale public media |
| **Firebase Storage** | $0.026 | $0.12/GB | Strong auth integration, but higher cost |

---

## 🧠 Design Notes

- Store only **URLs and metadata** in Prisma, not binary data.
- Maintain consistent folder structure for fast migration between storage providers.
- Add lifecycle rules (e.g., delete temporary uploads older than 30 days).
- Track `storageUsage` per Entity to monitor hosting costs and analytics integration.
- Integrate with `AnalyticsModule` for per-entity asset insights.

---

## ✅ Implementation Status

**Status:** ✅ **IMPLEMENTED**

### Backend Implementation

1. ✅ Created `/api/assets` module with upload and retrieval endpoints
2. ✅ Added `AssetsService` for centralized upload logic
3. ✅ Implemented Prisma Asset model with polymorphic owner support
4. ✅ Implemented role-based permissions for entity-managed uploads
5. ✅ Added file validation (MIME types, size limits per asset type)
6. ✅ Storage provider abstraction (Supabase, S3, Cloudflare R2, Local)

### Endpoints Available

- `POST /api/assets/upload` - Upload asset file (multipart/form-data)
- `GET /api/assets` - List assets with filters (public/private)
- `GET /api/assets/:id` - Get asset details
- `GET /api/assets/:id/url` - Get asset URL for download/viewing
- `DELETE /api/assets/:id` - Delete asset (owner or admin)

### Asset Types Supported

- **IMAGE**: jpeg, png, gif, webp, svg (max 5MB)
- **AUDIO**: mpeg, wav, ogg, mp4, webm (max 50MB)
- **VIDEO**: mp4, webm, ogg, quicktime (max 500MB)
- **DOCUMENT**: pdf, doc, docx, txt (max 10MB)
- **OTHER**: any file type (max 100MB)

### Storage Providers

- **SUPABASE** (default)
- **AWS_S3**
- **CLOUDFLARE_R2**
- **LOCAL**

### Frontend Integration

**Status:** 🚧 **Pending**

- ⏳ Frontend hooks: `useAssetUpload()` and `useAssetLibrary()`
- ⏳ React components for file upload UI
- ⏳ Asset gallery/browser components
- ⏳ Integration with Entity Context for uploads

---

**Note:** Storage provider implementation (`uploadToStorage()` and `deleteFromStorage()`) methods are placeholder and need to be implemented based on chosen provider (Supabase Storage, AWS S3, or Cloudflare R2).
