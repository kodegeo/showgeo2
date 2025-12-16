# User & Entity Media Policy (Showgeo 2.0)

## Overview
This document outlines the standards, storage policies, moderation framework, and cost controls for all **media assets** (images, videos, and posters) uploaded or embedded within the Showgeo 2.0 platform.  
The policy supports scalability, compliance, and cost efficiency while ensuring a safe and visually consistent user experience.

---

## 🧱 1. Media Types and Dimensional Standards

| Category | Asset Type | Description | Recommended Dimensions | Max File Size |
|-----------|-------------|--------------|--------------------------|----------------|
| **User** | Avatar | Profile photo | 512×512 | 1 MB |
| **User** | Banner | Profile header image | 1920×480 | 2 MB |
| **Entity** | Logo | Brand mark | 1024×1024 | 2 MB |
| **Entity** | Banner | Entity cover photo | 2560×720 | 3 MB |
| **Entity** | Poster | Promotional poster | 1080×1350 | 4 MB |
| **Event** | Thumbnail | Event listing preview | 1280×720 (16:9) | 1 MB |
| **Event** | Poster | Landing page visual | 1080×1350 | 3 MB |
| **Event** | Trailer | Short video teaser | 1920×1080 | 100 MB |
| **Store** | Product Image | Merch or digital item | 1080×1080 | 2 MB |
| **Tour** | Banner / Poster | Tour listing visuals | 1920×720 | 3 MB |

🧩 All images should be auto-resized and optimized during upload using Sharp, Cloudflare Images, or an equivalent image optimization pipeline.

---

## 🎥 2. Video Capabilities and Role-Based Access

| Role | Upload Video | Embed (YouTube/Vimeo) | Downloadable | Retention | Review Required |
|------|---------------|------------------------|---------------|------------|----------------|
| **User (default)** | ❌ | ✅ | ❌ | N/A | N/A |
| **Entity Manager** | ⚠️ (≤ 500 MB) | ✅ | ❌ | 30 days | ✅ |
| **Entity Owner** | ✅ (≤ 2 GB) | ✅ | ✅ | 90 days | ✅ |
| **Admin** | ✅ (Unlimited) | ✅ | ✅ | Permanent | ❌ |

- **Free Tier Users:** Embed YouTube/Vimeo links only. No direct upload.  
- **Entities:** May upload limited promotional content (commercials, ads, trailers).  
- **Admins:** Oversee moderation and lifecycle cleanup.  

---

## ☁️ 3. Storage Infrastructure and Lifecycle Policy

### Tiered Storage Model

| Tier | Provider | Target Users | Retention | Notes |
|------|-----------|---------------|------------|-------|
| **Free Tier** | YouTube / Vimeo | All free users | Indefinite (external) | Embeds only — no storage cost |
| **Standard Entity** | Supabase Storage | Verified creators | 90 days | Ideal for small to mid-scale |
| **Pro / Verified Entity** | Cloudflare Stream | High-traffic entities | 180 days | Auto-transcoding and CDN delivery |
| **Enterprise / Label Partner** | AWS S3 + Glacier Lifecycle | Labels, sponsors | 365 days | Cold storage for archival |

### Lifecycle Management Rules
- Supabase uploads expire after **90 days** unless renewed.  
- Cloudflare Stream assets auto-delete after **180 days** (or move to Glacier).  
- AWS Glacier auto-archives after 6 months of inactivity.  
- Embeds (YouTube/Vimeo) persist externally, no cost incurred.

---

## 🔐 4. Moderation Framework

| Stage | Action | Responsible Role | Description |
|--------|---------|------------------|--------------|
| **Pre-Upload** | File type, size, and role validation | Backend | Enforce MIME type and role quotas |
| **Upload Review** | AI / Manual content screening | Admin / Moderator | Detect inappropriate content |
| **Post-Upload** | Approval or rejection | Admin | Toggle moderationStatus |
| **User Reporting** | Flagging system | Authenticated users | Report inappropriate material |
| **Audit Logging** | Moderation history | System | Log reviewer, timestamps, and reason |

### Prisma Model Extension
```prisma
model Asset {
  id              String   @id @default(cuid())
  ownerId         String
  ownerType       AssetOwnerType
  url             String
  path            String
  type            AssetType
  metadata        Json?
  isPublic        Boolean  @default(false)
  duration        Int?
  moderationStatus VideoModerationStatus @default(PENDING)
  expiresAt       DateTime?
  isDownloadable  Boolean @default(false)
  storageProvider StorageProvider
  createdAt       DateTime @default(now())
}

enum StorageProvider {
  YOUTUBE
  SUPABASE
  CLOUDFLARE
  AWS_S3
  GLACIER
}

enum VideoModerationStatus {
  PENDING
  APPROVED
  REJECTED
}
```

---

## 🧾 5. Cost Overview

| Provider | Approx. Cost per GB/month | Egress | Pros | Cons |
|-----------|---------------------------|---------|------|------|
| **YouTube** | Free | N/A | Global reach, embed-ready | No control over ads |
| **Supabase** | $0.021 | Free CDN | Seamless NestJS integration | Moderate storage limits |
| **Cloudflare Stream** | ~$0.015 | Free egress | Auto-transcode, CDN | Slightly higher complexity |
| **AWS S3 + Glacier** | $0.023 / $0.004 | $0.09/GB | Enterprise-grade durability | High egress cost |

---

## 🧩 6. Backend Workflow Example

### Upload
```
POST /api/assets/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- file
- type (IMAGE | VIDEO)
- ownerType (USER | ENTITY)
- ownerId
- isPublic (optional)
- metadata (optional)
```

### Processing Flow
1. Validate role and storage limits.  
2. Optimize or transcode asset.  
3. Upload to storage provider (Supabase, Cloudflare, or S3).  
4. Create asset record with `expiresAt` and `moderationStatus`.  
5. Trigger moderation or notification queue.

---

## 🧠 7. Design Recommendations

- Store only URLs and metadata in the database (no binaries).  
- Limit video uploads to **approved entity roles** only.  
- Enable **AI-based content screening** via Cloudflare or OpenAI’s moderation API.  
- Include scheduled cleanup tasks for expired videos.  
- Track storage usage and media costs per entity for billing visibility.  
- Integrate reporting and moderation dashboards for admin roles.

---

## ✅ 8. Implementation Roadmap

| Phase | Deliverable | Description |
|--------|--------------|--------------|
| **1** | `AssetModule` | Centralized upload, retrieval, and moderation logic |
| **2** | `VideoLifecycleJob` | Daily cleanup and archival process |
| **3** | `EntityRolePolicy` | Role-based media permission enforcement |
| **4** | `AdminDashboard` | Content moderation and reporting tools |
| **5** | `AnalyticsIntegration` | Track storage, cost, and performance metrics |

---

**Status:** Draft complete.  
This media policy ensures a cost-efficient, scalable, and safe environment for users and entities while supporting a professional standard for all event, artist, and brand media.
