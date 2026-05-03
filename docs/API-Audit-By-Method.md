# API Audit by Method — GET, POST, PATCH, DELETE & Workflows

This document groups APIs by **HTTP method** (and Socket.IO events) and summarizes **how they connect** across the application and in key workflows.

**Base URL:** Backend `/api`; Frontend uses `apiClient` with base `/api`. Realtime: Socket.IO on port 3001.

---

## GET

### Backend GET routes (by prefix)

| Path | Controller | Frontend usage |
|------|------------|-----------------|
| `/api`, `/api/health` | app, health | Health checks |
| `/api/auth/me` | auth, auth-alias | auth.service.getMe() |
| `/api/users`, `/api/users/username/:username`, `/api/users/by-auth-user/:authUserId`, `/api/users/:id`, `/api/users/:id/entities` | users | users.service |
| `/api/entities/my-applications`, `/api/entities/popular`, `/api/entities`, `/api/entities/slug/:slug`, `/api/entities/:id`, `/api/entities/:id/collaborators` | entities | entities.service |
| `/api/events`, `/api/events/followed`, `/api/events/discovery`, `/api/events/my-events`, `/api/events/upcoming` | events | events.service.getAll, getFollowed, getMyEvents, getUpcoming |
| `/api/events/:id/financial-summary`, `/api/events/:id/revenue`, `/api/events/:id/clips`, `/api/events/:id/stream`, `/api/events/:id`, `/api/events/:id/access`, `/api/events/:id/roles`, `/api/events/:id/metrics`, `/api/events/:id/analytics`, `/api/events/:id/reminders` | events | events.service, creator.service, clips.service |
| `/api/events/:eventId/registrations/invitations`, `.../access-code`, `.../search-users`, `.../mailbox` | registrations | registrations.service, mailbox (event-scoped) |
| `/api/mailbox` | mailbox | mailbox.service.getMailbox(), StudioLayout |
| `/api/streaming/active`, `/api/streaming/:id` | streaming | streaming.service, useStreaming |
| `/api/tickets/my` | tickets | tickets.service.getMyTickets() |
| `/api/stores`, `/api/stores/:id`, `/api/stores/entity/:entityId` | store | store.service |
| `/api/tours`, `/api/tours/slug/:slug`, `/api/tours/:id`, `/api/tours/:id/events` | tours | tours.service, useTours |
| `/api/clips/trending`, `/api/clips/:clipId` | clips | clips.service |
| `/api/chat/:eventId` | chat | chat.service.getMessages() |
| `/api/events/:eventId/fans`, `/api/events/:eventId/rankings` | fan-interaction | fan-interaction.service |
| `/api/events/:eventId/energy`, `/api/events/:eventId/highlights` | engagement-engine | engagement.service |
| `/api/follow/event/status/:eventId`, `/api/follow/:entityId/followers`, `/api/follow/user/:userId`, `/api/follow/status/:entityId`, `/api/follow/counts/entity/:entityId`, `/api/follow/counts/user/:userId` | follow | follow.service |
| `/api/analytics/entity/:entityId`, `/api/analytics/event/:eventId`, `/api/analytics/user/:userId`, `/api/analytics/overview`, `/api/analytics/recommendations/:userId` | analytics | analytics.service |
| `/api/assets`, `/api/assets/:id`, `/api/assets/:id/url`, `/api/assets/creator/:entityId/gallery` | assets | assets.service |
| `/api/notifications`, `/api/notifications/unread-count` | notifications | notifications.service |
| `/api/events/:eventId/reports`, `/api/me/reports` | moderation | moderation.service |
| `/api/reports`, `/api/admin/reports` | admin-reports, admin | admin.service |
| `/api/events/:eventId/activities` | event-activities | event-activities.service |
| `/api/events/:eventId/meet-greet/queue`, `.../current`, `/api/meet-greet/sessions/my` | meet-greet | meet-greet.service |
| `/api/payments/orders`, `/api/payments/orders/:id` | payments | payments.service |
| `/api/admin/users`, `/api/admin/entities`, `/api/admin/entity-applications`, `.../:id`, `/api/admin/audit-logs` | admin | admin.service |

---

## POST

### Backend POST routes

| Path | Controller | Frontend usage |
|------|------------|-----------------|
| `/api/auth/register-app-user`, `/api/auth/dev/create-user` | auth | auth.service.registerAppUser() |
| `/api/entities/creator-apply`, `/api/entities`, `/api/entities/:id/collaborators` | entities | entities.service, creatorApply |
| `/api/events` | events | events.service.create(), creator.service.createEvent() |
| `/api/events/:id/revenue-splits`, `.../revenue-splits/:splitId/approve` | events | (backend/revenue flows) |
| `/api/events/:id/clips` | events | clips.service.create() |
| `/api/events/:id/roles` | events | (event roles) |
| `/api/events/:id/phase/transition`, `/api/events/:id/phase/extend` | events | events.service, creator.service.goLive() |
| `/api/events/:id/metrics`, `/api/events/:id/test-results`, `/api/events/:id/audience-action`, `/api/events/:id/reminders`, `/api/events/:id/blasts` | events | events.service |
| `/api/events/:eventId/registrations/invitations`, `.../register`, `.../validate-ticket` | registrations | registrations.service |
| `/api/streaming/session/:eventId`, `/api/streaming/:eventId/token`, `/api/streaming/session/:id/end`, `/api/streaming/:id/metrics`, `/api/streaming/validate-geofence` | streaming | streaming.service, useStreaming |
| `/api/stores`, `/api/stores/:id/products` | store | store.service, creator.service |
| `/api/tours` | tours | (admin/creator) |
| `/api/clips/:clipId/share` | clips | (share flow) |
| `/api/chat/:eventId` | chat | chat.service.sendMessage() |
| `/api/assets/upload`, `/api/assets/creator/upload`, `/api/assets/creator/bulk-upload` | assets | assets.service, creator.service (event thumbnail, etc.) |
| `/api/upload/avatar`, `/api/upload/banner` | upload | (legacy upload) |
| `/api/notifications/test` | notifications | (testing) |
| `/api/events/:eventId/reports` | moderation | moderation.service.createReport() |
| `/api/reports` | admin-reports | (report creation) |
| `/api/events/:eventId/activities`, `/api/activities/:activityId/launch`, `.../complete` | event-activities | event-activities.service |
| `/api/events/:eventId/meet-greet/start-next`, `.../join-vip`, `/api/meet-greet/sessions/:sessionId/complete`, `.../miss`, `/api/meet-greet/sessions/:sessionId/join`, `.../join-vip` | meet-greet | meet-greet.service |
| `/api/payments/checkout`, `/api/payments/webhook`, `/api/payments/refund` | payments | payments.service |
| `/api/admin/events/:id/terminate` | admin | admin.service.terminateEvent() |
| `/api/users/:id/convert-to-entity`, `/api/users/upgrade-to-creator`, `/api/users/:id/promote-to-entity` | users | users.service, creator flows |

---

## PATCH

### Backend PATCH routes

| Path | Controller | Frontend usage |
|------|------------|-----------------|
| `/api/users/:id`, `/api/users/:id/link-supabase` | users | users.service.updateProfile(), etc. |
| `/api/entities/:id` | entities | entities.service.update(), useEntities |
| `/api/events/:id` | events | events.service.update(), creator.service (thumbnail patch) |
| `/api/stores/:id`, `/api/stores/products/:id` | store | store.service |
| `/api/tours/:id` | tours | (admin/creator) |
| `/api/notifications/:id/read` | notifications | notifications.service.markRead() |
| `/api/reports/:reportId/status` | moderation | moderation.service.updateReportStatus() |
| `/api/reports/:id/resolve` | admin-reports | admin.service.resolveReport() |
| `/api/activities/:activityId` | event-activities | event-activities.service |
| `/api/follow/event/:eventId/notify` | follow | follow.service.setEventNotify() |
| `/api/admin/users/:id/suspend`, `.../reinstate`, `.../promote`, `.../demote`, `.../promote-to-admin`, `.../demote-admin`, `.../disable`, `.../enable` | admin | admin.service |
| `/api/admin/entities/:id/disable`, `.../reinstate`, `.../suspend`, `.../reject` | admin | admin.service |
| `/api/admin/entity-applications/:id/accept`, `.../reject`, `.../ban` | admin | admin.service |

---

## DELETE

### Backend DELETE routes

| Path | Controller | Frontend usage |
|------|------------|-----------------|
| `/api/users/:id` | users | users.service.delete() |
| `/api/entities/:id`, `/api/entities/:id/collaborators/:userId` | entities | entities.service |
| `/api/events/:id` | events | events.service.delete() |
| `/api/clips/:clipId` | clips | clips.service.delete() |
| `/api/stores/:id`, `/api/stores/products/:id` | store | store.service |
| `/api/assets/:id` | assets | assets.service |
| `/api/notifications/clear` | notifications | notifications.service.clear() |
| `/api/follow/:entityId`, `/api/follow/event/:eventId` | follow | follow.service, creator.service |

---

## Realtime (Socket.IO) — Service APIs

| Event | Direction | Purpose |
|-------|-----------|--------|
| `join_event_lobby` | Client → Server | Join event room for chat/presence |
| `send_message` | Client → Server | Send chat message to event room |
| `disconnect` | Client → Server | Tear down socket from engine |

*Events and Stream gateways are placeholders for future event-level and stream-level realtime features.*

---

## How APIs Connect in Workflows

### 1. Event creation and go-live
1. **POST** `/api/events` (create event) ← events.service.create(), creator.service.createEvent()
2. **POST** `/api/assets/upload` (thumbnail) ← creator.service (FormData with eventId)
3. **PATCH** `/api/events/:id` (set thumbnail URL) ← creator.service
4. **GET** `/api/events/:id/stream` (RTMP/stream key) ← events.service.getStream()
5. **POST** `/api/events/:id/phase/transition` (e.g. to LIVE) ← events.service.transitionPhase(), creator.service.goLive()
6. **POST** `/api/streaming/session/:eventId` (start session) ← streaming.service.createSession(), creator.service.goLive()
7. Realtime: **join_event_lobby** + **send_message** for live chat

### 2. Viewer registration and watch
1. **GET** `/api/events/:id` (event details) ← events.service.getById()
2. **POST** `/api/events/:eventId/registrations/register` or **POST** `/api/payments/checkout` (ticket)
3. **POST** `/api/events/:eventId/registrations/validate-ticket` (stream access)
4. **POST** `/api/streaming/:eventId/token` (viewer token)
5. **GET** `/api/chat/:eventId`, **POST** `/api/chat/:eventId` or Socket **join_event_lobby** / **send_message**

### 3. Creator dashboard and revenue
1. **GET** `/api/events/my-events` ← events.service.getMyEvents()
2. **GET** `/api/events/:id/revenue` ← events.service.getEventRevenue()
3. **GET** `/api/events/:id/analytics` ← events.service.getAnalytics()
4. **GET** `/api/events/:id/clips` ← clips.service.getByEventId()
5. **GET** `/api/payments/orders` (with eventId/entityId) ← payments.service.getOrders()

### 4. Follow and discovery
1. **GET** `/api/events/upcoming`, **GET** `/api/events/followed`, **GET** `/api/events/discovery`
2. **POST** `/api/follow/:entityId`, **DELETE** `/api/follow/:entityId` ← follow.service, fans.service
3. **POST** `/api/follow/event/:eventId`, **DELETE** `/api/follow/event/:eventId`
4. **GET** `/api/clips/trending` ← clips.service.getTrending()
5. **GET** `/api/entities/popular` ← entities.service.getPopular()
6. **GET** `/api/analytics/recommendations/:userId` ← analytics.service.getRecommendations()

### 5. Admin and moderation
1. **GET** `/api/admin/users`, **GET** `/api/admin/entities`, **GET** `/api/admin/reports`, **GET** `/api/admin/entity-applications`
2. **PATCH** `/api/admin/users/:id/suspend`, `.../reinstate`, `.../disable`, `.../enable`, etc.
3. **PATCH** `/api/admin/entities/:id/suspend`, `.../reject`, `.../disable`, `.../reinstate`
4. **PATCH** `/api/admin/entity-applications/:id/accept`, `.../reject`, `.../ban`
5. **POST** `/api/admin/events/:id/terminate`
6. **POST** `/api/events/:eventId/reports`, **GET** `/api/events/:eventId/reports`, **PATCH** `/api/reports/:reportId/status` (moderation)

### 6. User and profile
1. **GET** `/api/auth/me` ← auth.service.getMe()
2. **GET** `/api/users/:id`, **GET** `/api/users/username/:username` ← users.service
3. **PATCH** `/api/users/:id` (profile) ← users.service.updateProfile()
4. **POST** `/api/users/:id/convert-to-entity`, **POST** `/api/users/upgrade-to-creator` (creator onboarding)
5. **GET** `/api/users/:id/entities` ← users.service.getUserEntities()

### 7. Stores and commerce
1. **GET** `/api/stores`, **GET** `/api/stores/entity/:entityId` ← store.service
2. **POST** `/api/stores`, **PATCH** `/api/stores/:id` ← store.service
3. **POST** `/api/stores/:id/products`, **PATCH** `/api/stores/products/:id`, **DELETE** `/api/stores/products/:id`
4. **POST** `/api/payments/checkout` → **GET** `/api/payments/orders`, **GET** `/api/payments/orders/:id`
5. **POST** `/api/payments/refund`

### 8. Notifications and mailbox
1. **GET** `/api/notifications`, **GET** `/api/notifications/unread-count` ← notifications.service
2. **PATCH** `/api/notifications/:id/read`, **DELETE** `/api/notifications/clear`
3. **GET** `/api/mailbox` ← mailbox.service, StudioLayout
4. **GET** `/api/events/:eventId/registrations/mailbox` (event-scoped mailbox)

---

## Summary

- **Backend:** All routes live under `/api`; controllers define path segments (e.g. `events`, `admin`).
- **Frontend:** One-to-one or one-to-many mapping from service methods to backend paths; `apiClient` sends credentials and uses `/api` as base.
- **Realtime:** Socket.IO only; no REST. Lobby gateway handles **join_event_lobby**, **send_message**, **disconnect**; Events and Stream gateways reserved for future use.
- **Workflows:** Event lifecycle, viewer flow, creator dashboard, follow/discovery, admin/moderation, user/profile, stores/payments, and notifications/mailbox all follow the GET/POST/PATCH/DELETE patterns above.
