# API Stabilization Refactor — Summary

## 1. Files modified

### New file
- **`frontend/src/services/apiRoutes.ts`** — Central API route map (all paths relative to `/api`).

### Layouts
- **`frontend/src/layouts/StudioLayout.tsx`** — Switched mailbox from `GET /registrations/mailbox` to `GET /mailbox` via `API.mailbox`; uses `apiClient`.

### Services
- **`frontend/src/services/auth.service.ts`** — All auth calls use `API` constants.
- **`frontend/src/services/users.service.ts`** — `createProfile` now uses `PATCH /users/:id` (no `POST .../profile`); all paths use `API`.
- **`frontend/src/services/entities.service.ts`** — All paths use `API` (entities, collaborators, my-applications, creator-apply).
- **`frontend/src/services/events.service.ts`** — All paths use `API` (events, phase, metrics, revenue, reminders, blasts, register, etc.).
- **`frontend/src/services/follow.service.ts`** — All paths use `API`.
- **`frontend/src/services/assets.service.ts`** — All paths use `API`.
- **`frontend/src/services/mailbox.service.ts`** — Uses `API.mailbox`.
- **`frontend/src/services/store.service.ts`** — All paths use `API` (stores, products).
- **`frontend/src/services/streaming.service.ts`** — All paths use `API`.
- **`frontend/src/services/clips.service.ts`** — All paths use `API`.
- **`frontend/src/services/admin.service.ts`** — All paths use `API`.
- **`frontend/src/services/registrations.service.ts`** — All paths use `API` (invitations, access-code, search-users).
- **`frontend/src/services/meet-greet.service.ts`** — All paths use `API` (queue, current, start-next, session complete/miss/join-vip).
- **`frontend/src/services/event-activities.service.ts`** — All paths use `API` (event activities, activity launch/complete).
- **`frontend/src/services/moderation.service.ts`** — All paths use `API` (event reports, me/reports, report status).
- **`frontend/src/services/creator/creator.service.ts`** — Uses `API`; `deleteResource("product")` now calls `DELETE /stores/products/:id`; Block/Invite in `manageFan` disabled (no backend `/fans/manage`).
- **`frontend/src/services/posts.service.ts`** — **Deprecated**: no backend `/posts`; `getAll()` returns empty list; create/update/delete/getById throw with message.
- **`frontend/src/services/fans.service.ts`** — Follow/Unfollow use `API.follow`; Block/Invite no-op with console warning (no `/fans/manage`).
- **`frontend/src/services/index.ts`** — Exports `API` from `apiRoutes`.

### Hooks
- **`frontend/src/hooks/useEntities.ts`** — `useUpdateEntityDraft` now uses `apiClient.patch(API.entity(id), data)` instead of `axios.patch`.
- **`frontend/src/hooks/useTours.ts`** — Uses `apiClient` with `API.tours` and `API.tourBySlug(slug)` (params for entityId).
- **`frontend/src/hooks/useStreaming.ts`** — All `fetch` calls replaced with `apiClient`; uses `API.streamingActive`, `API.streamingSession`, `API.streamingSessionEnd`; auth via apiClient interceptor.

### Components
- **`frontend/src/components/profile/ProfileEventCard.tsx`** — **Fixed**: removed broken raw `fetch` and undefined `API`/`getAuthToken`; now uses `followService.getEventFollowStatus(event.id)` for initial load; follow/unfollow/notify already used `followService`.

---

## 2. Deprecated / non-existent APIs removed or disabled

| Endpoint / area | Action |
|-----------------|--------|
| **GET /registrations/mailbox** | Replaced with **GET /mailbox** (StudioLayout). |
| **POST /users/:userId/profile** | Replaced with **PATCH /users/:userId** (users.service `createProfile`). |
| **DELETE /products/:id** | Replaced with **DELETE /stores/products/:id** (creator.service `deleteResource`). |
| **POST /fans/manage** | Disabled: creator.service and fans.service no longer call it; Block/Invite no-op with warning. |
| **GET/POST/PATCH/DELETE /posts** | Deprecated: posts.service returns empty list for getAll; create/update/delete/getById throw. |

---

## 3. Updated API calls (standardized)

- **API client**: All request paths go through **apiClient** (baseURL `/api`). No direct `axios` or `fetch` for app API calls.
- **Route constants**: Services and hooks use **`API`** from `apiRoutes.ts` (e.g. `API.mailbox`, `API.event(id)`, `API.storeProduct(id)`).
- **Entity update auth**: Entity PATCH from `useEntities` now uses `apiClient.patch(API.entity(id), data)` so auth is sent.
- **Streaming**: useStreaming uses `apiClient.get(API.streamingActive)`, `apiClient.post(API.streamingSession(eventId), body)`, `apiClient.post(API.streamingSessionEnd(sessionId))`.
- **Follow (event card)**: ProfileEventCard uses `followService` (apiClient under the hood) for event follow status, follow, unfollow, notify.

---

## 4. Remaining mismatches / notes

- **Posts**: Backend has no posts module. Any UI that calls `postsService.create`, `update`, `delete`, or `getById` will get an error or empty list until a backend posts API exists.
- **Block/Invite**: Backend has no `POST /fans/manage`. Follow/Unfollow work; Block/Invite are no-op with console warning.
- **Creator deleteResource("post")**: Calls to delete a “post” no longer hit the backend; they no-op with a warning (no `/posts`).
- All other core flows (auth, users, entities, events, streaming, follow, assets, mailbox, stores, clips, admin, tours) use valid backend routes via `API` and `apiClient`.

---

## 5. Core APIs verified (still used correctly)

- GET /auth/me, POST /auth/register-app-user  
- PATCH /users/:id, GET /users/:id, GET /users/:id/entities  
- GET /entities, GET /entities/:id, PATCH /entities/:id, DELETE /entities/:id  
- POST /events, PATCH /events/:id, GET /events/:id, POST /events/:id/phase/transition  
- POST /streaming/session/:eventId, GET /streaming/active, POST /streaming/session/:id/end  
- POST /assets/upload, GET /assets, DELETE /assets/:id  
- GET /mailbox  
- DELETE /stores/products/:id (product delete)  
- Follow: POST/DELETE /follow/:entityId, POST/DELETE /follow/event/:eventId, GET /follow/event/status/:eventId, PATCH /follow/event/:eventId/notify  

---

## 6. Resumed pass (follow-up)

- **ProfileEventCard**: Replaced broken `fetch(\`${API}/api/follow/...\`)` (undefined `API`/`getAuthToken`) with `followService.getEventFollowStatus(event.id)`.
- **apiRoutes.ts**: Added registration helpers (`eventRegistrationsInvitations`, `eventRegistrationsAccessCode`, `eventRegistrationsSearchUsers`), meet-greet (`meetGreetQueue`, `meetGreetCurrent`, `meetGreetStartNext`, `meetGreetSessionComplete`, `meetGreetSessionMiss`, `meetGreetSessionJoinVip`), event-activities (`eventActivities`, `activityLaunch`, `activityComplete`), and moderation (`eventReports`, `meReports`, `reportStatus`).
- **registrations.service.ts**, **meet-greet.service.ts**, **event-activities.service.ts**, **moderation.service.ts**: Switched to `API` constants from `apiRoutes` for all request paths.
