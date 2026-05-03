# Universal Asset Upload Service — Summary

All uploads are standardized to **POST /assets/upload** with a single contract. No database or Prisma changes were made; the existing `/assets/upload` endpoint is unchanged.

---

## 1. Upload contract

- **Endpoint:** `POST /assets/upload`
- **Content-Type:** `multipart/form-data`
- **Required:** `file`, `ownerType`, `ownerId`, `assetType` (frontend sends these; backend receives `type`, `ownerType`, `ownerId`, optional `eventId`, `isPublic`, `metadata`).
- **Optional:** `visibility`, `metadata`
- Frontend `assets.service` maps `ownerType`/`ownerId`/`assetType` to backend fields (e.g. `eventId` for events, `metadata.purpose` for path/handling).

---

## 2. Files modified

### Frontend

| File | Changes |
|------|--------|
| `frontend/src/types/assets.ts` | `OwnerType`, `AssetType` (includes `creator-id`, `creator-logo`, `creator-profile`, `creator-sample`), `UploadAssetParams`, `DEFAULT_MAX_SIZE_*` |
| `frontend/src/services/assets.service.ts` | `uploadAsset()`, validation, convenience wrappers (avatar, banner, logo, event thumbnail/clip, product, creator ID/logo/profile/sample) |
| `frontend/src/services/creator/creator.service.ts` | Event creation uses `assetsService.uploadEventThumbnail()` then `PATCH /events/:id`; `uploadMedia()` and post-media upload use `assetsService.uploadAsset()` |
| `frontend/src/components/uploads/AvatarUpload.tsx` | Uses `assetsService.uploadUserAvatar()`; added `isUploading` state and `queryClient`; error state for UI |
| `frontend/src/components/profile/ProfileBanner.tsx` | Uses `assetsService.uploadUserBanner()`; added `isUploadingBanner` and `queryClient`; removed `useUploadAsset`; banner error state and message |
| `frontend/src/hooks/useUploadAvatar.js` | Uses `assetsService.uploadUserAvatar()`; loading/error state |

### Backend

- **No changes.** Existing `POST /assets/upload` and DTOs are used as-is. Path logic remains in backend (e.g. `events/{eventId}/thumbnail`, `users/{userId}/...`, `entities/{entityId}/gallery/...`).

---

## 3. Legacy endpoints removed / not used

| Legacy endpoint | Status |
|-----------------|--------|
| `POST /upload/avatar` | Not present in codebase; all avatar uploads use `assetsService.uploadUserAvatar()` → `/assets/upload` |
| `POST /upload/banner` | Not present; banner uses `assetsService.uploadUserBanner()` → `/assets/upload` |
| `POST /creator/upload` | Backend still has `POST /assets/creator/upload`; frontend creator application and media flows use `/assets/upload` via `assetsService` (ownerType/ownerId/assetType). No frontend calls to `/assets/creator/upload` in the refactored flows. |
| `POST /assets/creator/upload` | Still available for entity-only creator media; new flows use universal `/assets/upload` with metadata. |

---

## 4. New asset service methods

| Method | ownerType | assetType | Notes |
|--------|-----------|-----------|--------|
| `uploadAsset(params)` | param | param | Generic; validates file, maps to backend contract |
| `uploadUserAvatar(file, userId)` | user | avatar | |
| `uploadUserBanner(file, userId)` | user | banner | |
| `uploadEntityLogo(file, entityId)` | entity | logo | |
| `uploadEventThumbnail(file, eventId)` | event | thumbnail | Backend path: `events/{eventId}/thumbnail.{ext}` |
| `uploadEventClip(file, eventId)` | event | clip | |
| `uploadProductImage(file, entityId)` | entity | product | |
| `uploadCreatorId(file, ownerId)` | user | creator-id | Creator application (e.g. ID verification) |
| `uploadCreatorLogo(file, ownerId)` | user | creator-logo | |
| `uploadCreatorProfilePhoto(file, ownerId)` | user | creator-profile | |
| `uploadCreatorSampleMedia(file, ownerId)` | user | creator-sample | |

---

## 5. Event creation flow

- **Create Event (with thumbnail):** Create event via `POST /events`, then if thumbnail file is present call `assetsService.uploadEventThumbnail(file, eventId)`, then `PATCH /events/:id` with `{ thumbnail: asset.url }`.
- Implemented in `creatorService.createEvent()` and used by Create Event modal.

---

## 6. Event assets

- Event thumbnail and clip uploads use `ownerType = "event"` and `ownerId = eventId`. Backend receives `eventId` and builds paths like `events/{eventId}/thumbnail.{ext}`.

---

## 7. File path / metadata

- Frontend does **not** build storage paths. It sends `file`, `ownerType`, `ownerId`, `assetType` (and for events, backend uses `eventId`). Backend derives paths (e.g. `users/{userId}/...`, `entities/{entityId}/gallery/...`, `events/{eventId}/thumbnail`). Optional `metadata` (e.g. `purpose`) is sent for backend use.

---

## 8. Creator application flow

- Creator onboarding uses:
  - `assetsService.uploadCreatorProfilePhoto(file, user.id)` for profile/thumbnail
  - `assetsService.uploadCreatorLogo(file, user.id)` for banner/brand logo
  - `assetsService.uploadCreatorId(file, user.id)` for ID/proof
- Returned asset URLs are stored in the application payload and submitted with the creator application. No legacy `/creator/upload` or `/upload/avatar` in this flow.

---

## 9. Upload error handling

- **assets.service:** `validateFile()` enforces type and size; throws on invalid file type or file too large; network errors surface from `apiClient`.
- **UI:** AvatarUpload, ProfileBanner, and CreatorApplicationPage set error state and show messages (e.g. “Image must be under 5MB”, “Invalid file type”, “Banner upload failed. Try again.”).

---

## 10. Upload calls not refactored / notes

- **Posts:** `creatorService.createPost()` uploads media via `assetsService.uploadAsset()` (assetType `gallery`); the subsequent `POST /posts` is unchanged (posts API is deprecated elsewhere).
- **Backend path for creator assets:** Backend `generateFolderPath` currently uses `users/{id}/{year}/{month}` or `entities/{id}/gallery/{year}/{month}`. Spec suggested paths like `entities/{entityId}/creator/id`; that would require backend changes. Current implementation stores creator application assets with existing path rules; `metadata.purpose` (e.g. `creator-id`, `creator-logo`) is sent for future use if backend adds purpose-based subpaths.

---

## 11. Type definitions (`frontend/src/types/assets.ts`)

- `OwnerType`: `"user" | "entity" | "event"`
- `AssetType`: `"avatar" | "banner" | "logo" | "thumbnail" | "clip" | "product" | "gallery" | "creator-id" | "creator-logo" | "creator-profile" | "creator-sample"`
- `UploadAssetParams`: `file`, `ownerType`, `ownerId`, `assetType`, optional `visibility`, `metadata`
- `DEFAULT_MAX_SIZE_IMAGE`, `DEFAULT_MAX_SIZE_VIDEO`, `DEFAULT_MAX_SIZE_DOCUMENT`
