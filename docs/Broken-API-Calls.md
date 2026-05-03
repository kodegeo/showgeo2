# Broken API Calls — Frontend vs Backend

This document lists frontend API calls that **do not match** backend routes or DTOs: missing endpoints, legacy/wrong paths, or payload shape mismatches.

**Conventions:** Frontend uses `apiClient` (base `/api`). Backend global prefix is `/api`. All paths below are relative to `/api`.

---

## Quick reference: frontend call → backend route

| Frontend (file / call) | Method + path | Backend route | Status |
|------------------------|---------------|---------------|--------|
| StudioLayout | GET `/registrations/mailbox` | GET `/mailbox` | **BROKEN** — use `/mailbox` |
| users.service | POST `/users/:id/profile` | (none) | **BROKEN** — use PATCH `/users/:id` |
| users.service | PATCH `/users/:id`, DELETE `/users/:id` | PATCH/DELETE `/users/:id` | OK |
| posts.service | GET/POST/PATCH/DELETE `/posts`, `/posts/:id` | (none) | **BROKEN** — no posts API |
| creator.service | POST `/fans/manage` | (none) | **BROKEN** — no fans/manage |
| creator.service | DELETE `/products/:id` (deleteResource) | DELETE `/stores/products/:id` | **BROKEN** — wrong path |
| creator.service | PATCH `/events/:id`, POST `/events/:id/phase/transition`, DELETE `/follow/:id` | Same | OK |
| useEntities (axios) | PATCH `/api/entities/:id` | PATCH `/entities/:id` | **BROKEN** — use apiClient (auth) |
| auth.service | GET `/auth/me`, POST `/auth/register-app-user` | Same | OK |
| events.service | DELETE/PATCH/GET/POST events, phase, metrics, etc. | Same | OK |
| follow.service, fans.service | DELETE `/follow/:id`, DELETE `/follow/event/:id` | Same | OK |
| assets.service | DELETE `/assets/:id` | DELETE `/assets/:id` | OK |
| store.service | DELETE `/stores/:id`, DELETE `/stores/products/:id` | Same | OK |
| clips.service | DELETE `/clips/:id` | DELETE `/clips/:clipId` | OK |
| entities.service | DELETE `/entities/:id`, DELETE `/entities/:id/collaborators/:userId` | Same | OK |
| admin.service | PATCH/POST `/admin/users/:id/...`, `/admin/entities/:id/...`, etc. | Same | OK |
| useStreaming (fetch) | GET `/streaming/active`, POST `/streaming/session/:id`, POST `/streaming/session/:id/end` | Same | OK |
| ProfileEventCard (fetch) | GET/DELETE/POST/PATCH `/follow/event/...` | Same | OK |
| mailbox.service | GET `/mailbox` | GET `/mailbox` | OK |

---

## 1. Endpoint does not exist

### 1.1 GET `/registrations/mailbox` — StudioLayout

| Item | Value |
|------|--------|
| **Frontend** | `frontend/src/layouts/StudioLayout.tsx`: `apiClient.get("/registrations/mailbox")` |
| **Backend** | No route `GET /registrations/mailbox`. Mailbox is **GET /mailbox** (MailboxController). |
| **Fix** | Use **GET /mailbox** (e.g. switch to `apiClient.get("/mailbox")` or use `mailbox.service.getMailbox()`). |

---

### 1.2 POST `/users/:userId/profile` — Create user profile

| Item | Value |
|------|--------|
| **Frontend** | `frontend/src/services/users.service.ts` `createProfile()`: `apiClient.post(\`/users/${userId}/profile\`, data)` |
| **Backend** | No route **POST /users/:id/profile**. Profile create/update is **PATCH /users/:id** with `UpdateUserProfileDto` (idempotent: creates profile if missing). |
| **Fix** | Use **PATCH /users/:id** with the same payload for both create and update (backend `updateProfile` already creates when absent), or add a dedicated POST route and keep frontend as-is. |

---

### 1.3 Posts — Full CRUD (entire resource missing)

| Item | Value |
|------|--------|
| **Frontend** | `frontend/src/services/posts.service.ts`: POST `/posts`, GET `/posts`, GET `/posts/:id`, PATCH `/posts/:id`, DELETE `/posts/:id` |
| **Backend** | No **posts** controller; no routes under `/posts`. |
| **Fix** | Either add a Posts module and implement these routes, or remove/refactor posts.service and any UI that depends on it (e.g. creator post creation) so they use an existing resource (e.g. assets, entities). |

---

### 1.4 POST `/fans/manage` — Manage fan (Block / Invite)

| Item | Value |
|------|--------|
| **Frontend** | `frontend/src/services/creator/creator.service.ts` `manageFan()` (when action is Block or Invite): `apiClient.post("/fans/manage", { entityId, userId, action, notes })`. Also `frontend/src/services/fans.service.ts` for non–follow/unfollow actions. |
| **Backend** | No route **POST /fans/manage**. Fan-interaction only has **GET /events/:eventId/fans** and **GET /events/:eventId/rankings**. |
| **Fix** | Add **POST /fans/manage** (or equivalent) and implement Block/Invite logic, or remove Block/Invite from the frontend and use follow/unfollow only. |

---

## 2. Wrong / legacy path

### 2.1 Mailbox — StudioLayout uses legacy path

| Item | Value |
|------|--------|
| **Frontend** | `StudioLayout.tsx`: **GET /registrations/mailbox** |
| **Backend** | **GET /mailbox** (user-level mailbox). Event-scoped mailbox is **GET /events/:eventId/registrations/mailbox**. |
| **Fix** | Use **GET /mailbox** for the studio unread count (same as mailbox.service). |

---

### 2.2 DELETE product in `creator.service.deleteResource`

| Item | Value |
|------|--------|
| **Frontend** | `frontend/src/services/creator/creator.service.ts` `deleteResource(resourceType: "product", resourceId)`: `apiClient.delete(\`/products/${resourceId}\`)` |
| **Backend** | Products are under stores: **DELETE /stores/products/:id** (StoreController). There is no **DELETE /products/:id**. |
| **Fix** | For products, call **DELETE /stores/products/:id** (and ensure `storeId` is known if required by backend). |

---

## 3. Payload / DTO shape differences

### 3.1 User profile create vs backend

| Item | Value |
|------|--------|
| **Frontend** | `users.service.createProfile(userId, data)` sends **POST /users/:userId/profile** with `CreateUserProfileRequest`: `username?, firstName?, lastName?, bio?, avatarUrl?, location?, website?`. |
| **Backend** | No POST profile route. **PATCH /users/:id** uses `UpdateUserProfileDto` (extends CreateUserProfileDto): includes `username`, `firstName`, `lastName`, `avatarUrl`, `bannerUrl`, `bio`, `location`, `timezone`, `website`, `socialLinks`, `preferences`, `visibility` (enum: PUBLIC, PRIVATE, UNLISTED). |
| **Fix** | Once using PATCH for create/update, send the same shape as `UpdateUserProfileDto`; add `visibility` and any other optional fields if the UI supports them. |

---

### 3.2 Entity update via `axios` (no auth)

| Item | Value |
|------|--------|
| **Frontend** | `frontend/src/hooks/useEntities.ts` `useUpdateEntityDraft()`: `axios.patch(\`/api/entities/${id}\`, data)` (plain **axios**, not **apiClient**). |
| **Backend** | **PATCH /entities/:id** with `UpdateEntityDto`; requires auth (SupabaseAuthGuard). |
| **Fix** | Use **apiClient.patch(\`/entities/${id}\`, data)** so the request includes the same auth (e.g. Bearer token) as other API calls; entity payload shape should match `UpdateEntityDto`. |

---

## 4. Summary table

| # | Frontend call | Backend expectation | Issue |
|---|----------------|---------------------|--------|
| 1 | GET `/registrations/mailbox` (StudioLayout) | GET `/mailbox` | Wrong path (legacy). |
| 2 | POST `/users/:userId/profile` (users.service.createProfile) | PATCH `/users/:id` (no POST profile) | Endpoint does not exist. |
| 3 | POST/GET/PATCH/DELETE `/posts`, `/posts/:id` (posts.service) | (none) | No posts API. |
| 4 | POST `/fans/manage` (creator.service, fans.service) | (none) | Endpoint does not exist. |
| 5 | DELETE `/products/:id` (creator.service deleteResource) | DELETE `/stores/products/:id` | Wrong path. |
| 6 | PATCH `/api/entities/:id` via **axios** (useEntities) | PATCH `/entities/:id` with auth | Likely no auth sent; use apiClient. |

---

## 5. Recommended fixes (short)

1. **StudioLayout:** Use `apiClient.get("/mailbox")` (or mailbox.service) instead of `GET /registrations/mailbox`.
2. **users.service createProfile:** Call **PATCH /users/:id** with `UpdateUserProfileDto`-shaped body for both create and update; remove POST to `/users/:userId/profile`.
3. **posts.service:** Either implement a Posts API under `/posts` or retire posts and switch UI to another resource.
4. **fans/manage:** Implement **POST /fans/manage** (or equivalent) for Block/Invite, or remove those actions from the frontend.
5. **creator.service deleteResource:** For `resourceType === "product"`, call **DELETE /stores/products/:id** (not `/products/:id`).
6. **useEntities useUpdateEntityDraft:** Use `apiClient.patch(\`/entities/${id}\`, data)` instead of `axios.patch(...)` so auth is applied.
