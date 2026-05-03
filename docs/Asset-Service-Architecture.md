# Asset Service Architecture

All uploads in the application use a single entry point: **POST /assets/upload**. The frontend `assets.service` is the only layer that talks to this endpoint. Objects (users, events, entities) store only the **returned URL**; no asset metadata is stored in frontend state. The database schema is unchanged; the backend owns path generation and storage.

---

## Upload contract

- **Endpoint:** `POST /assets/upload` (via `API.assetsUpload` in `apiRoutes.ts`)
- **Content-Type:** `multipart/form-data`
- **Required fields:** `file`, `ownerType`, `ownerId`, `assetType`
- **Optional:** `visibility` (public/private), `metadata`

The frontend sends ownership and purpose; the backend derives storage paths (e.g. `users/{userId}/...`, `events/{eventId}/thumbnail.{ext}`).

---

## OwnerType

Who owns the asset:

| Value   | Meaning  | Example use              |
|---------|----------|--------------------------|
| `user`  | App user | Avatar, banner, creator application docs |
| `entity`| Creator/brand | Logo, product image, gallery |
| `event` | Event    | Thumbnail, clip          |

---

## AssetType

Purpose of the asset (used for validation and backend metadata):

| Value              | Typical owner | Notes                    |
|--------------------|---------------|--------------------------|
| `avatar`           | user          | Profile picture          |
| `banner`           | user          | Profile banner           |
| `logo`             | entity        | Entity/creator logo      |
| `thumbnail`       | event         | Event cover image        |
| `clip`             | event         | Event clip (video/image) |
| `product`          | entity        | Store product image      |
| `gallery`          | entity        | General media            |
| `creator-id`       | user          | ID verification (application) |
| `creator-logo`     | user          | Brand logo (application) |
| `creator-profile`  | user          | Profile photo (application) |
| `creator-sample`   | user          | Sample media (application) |

---

## Event flow example

**Event thumbnail (create / update):**

1. Call `assetsService.uploadEventThumbnail(file, eventId)`.
2. Service sends `POST /assets/upload` with `ownerType: "event"`, `ownerId: eventId`, `assetType: "thumbnail"`.
3. Backend returns asset with `url`.
4. Frontend updates the event with that URL only: `PATCH /events/:id` with `{ thumbnail: url }` (or `thumbnailUrl` per API). No asset metadata is stored in frontend state; only the URL is attached to the event.

---

## Creator application flow example

1. User selects files (e.g. profile photo, brand logo, ID document).
2. On submit, frontend calls:
   - `assetsService.uploadCreatorProfilePhoto(file, userId)`
   - `assetsService.uploadCreatorLogo(file, userId)`
   - `assetsService.uploadCreatorId(file, userId)`
   - (Optional) `assetsService.uploadCreatorSampleMedia(file, userId)`
3. Each call uses `POST /assets/upload`; responses are normalized to `{ assetId, url, ownerType, ownerId, assetType }`.
4. The returned **URLs** are included in the creator application payload (e.g. `thumbnail`, `bannerImage`, `proof.proof`). Only URLs are stored in the application; no asset rows are stored in frontend state.

---

## Avatar upload flow

1. UI calls `assetsService.uploadUserAvatar(file, userId)`.
2. Service validates file (type, size), then `POST /assets/upload` with `ownerType: "user"`, `ownerId: userId`, `assetType: "avatar"`.
3. Normalized response includes `url`.
4. Frontend updates user profile with that URL (e.g. `PATCH /users/:id` with `avatarUrl`). Only the URL is stored; no client-side asset metadata.

---

## Banner upload flow

1. UI calls `assetsService.uploadUserBanner(file, userId)`.
2. Same contract: `POST /assets/upload` with `ownerType: "user"`, `ownerId: userId`, `assetType: "banner"`.
3. Response is normalized; frontend attaches only the returned `url` to the user profile (e.g. `bannerUrl`). No asset metadata in frontend state.

---

## Design principles

- **Single entry point:** All uploads go through `assetsService.uploadAsset()` or one of its wrappers; all use `POST /assets/upload` via `API.assetsUpload`.
- **Objects store URLs only:** Events, users, entities, and application payloads store only the asset URL returned from upload. No asset metadata is kept in frontend state.
- **Backend owns paths:** The frontend does not build file paths. It sends `ownerType`, `ownerId`, `assetType` (and for events, `eventId`); the backend builds paths and persists the asset.
- **Database schema unchanged:** No Prisma or DB changes are required for this architecture; the existing `/assets/upload` endpoint and schema remain in place.
