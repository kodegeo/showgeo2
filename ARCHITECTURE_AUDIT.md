# Showgeo Platform — Architecture Audit Report

**Date:** 2025-03-06  
**Scope:** Prisma schema, backend APIs, frontend services, frontend pages/components.  
**No code changes were made.**

---

## 1) Schema Coverage

### 1.1 Models in Prisma schema (public)

| Domain | Models | Notes |
|--------|--------|------|
| **Auth** | auth schema (Supabase): users, sessions, identities, refresh_tokens, etc. | External. |
| **App** | app_users, user_profiles, entities, entity_roles, entity_applications | Present. |
| **Events** | events, event_roles, geofencing | Present. events.tourId → tours. |
| **Tours** | tours | Present. tours.events[], stores_TourStores, geofencing. |
| **Ticketing / Orders** | tickets, orders, order_items, payments | Present. tickets.orderId → orders. |
| **Store** | stores, products | Present. stores.eventId, stores.tourId. |
| **Streaming** | streaming_sessions | Present. |
| **Social** | follows, notifications | Present. |
| **Moderation** | moderation_reports, admin_reports | Present. |
| **Other** | assets, analytics_summaries, chat_rooms, invites | Present. |

### 1.2 Missing from Prisma schema (used in backend via `(prisma as any)`)

| Table | Used in | Risk |
|-------|---------|------|
| **event_registrations** | registrations.service, streaming.service, events.service, event-activities | High. Core for invites, guest register, ticket–registration link. Defined in SQL migrations (e.g. mailbox.sql) but not in schema.prisma. No type safety or generated client. |
| **mailbox_items** | registrations.service, events.service, moderation.service | High. Inbox/mailbox and notifications depend on it. Same as above. |
| **audience_messages** | registrations.service (getMailbox), events.service (blast) | High. Creator→audience messaging and mailbox. Same as above. |

### 1.3 Schema vs backend expectations

- **tickets**: Schema has `id, userId, eventId, orderId?, type, price?, currency, entryCode?, createdAt, updatedAt`. No `status`, no `registrationId`.
- **Backend** (streaming.service, registrations.service) uses `ticket.status` (e.g. ACTIVE/USED) and `ticket.registrationId` and `ticket.registrations`.
- **Conclusion:** Either migrations added these columns and schema is out of date, or runtime will break when reading `ticket.status` / `ticket.registrationId`. **This can block streaming access control and ticket validation.**

### 1.4 Schema summary

- **Tours with multiple events:** Schema supports it: `tours` has `events[]`, `events.tourId` optional.
- **Ticket purchase:** Schema supports orders → order_items (ticketId/productId) and tickets.orderId; tickets table exists but schema lacks status/registrationId if used by backend.
- **Event messaging:** Depends on `audience_messages` and `mailbox_items`, which are not in schema.
- **Streaming access control:** Depends on tickets (and optionally event_registrations); ticket status/registrationId usage conflicts with current schema.

---

## 2) Backend API Coverage

### 2.1 Events

| Area | Status | Notes |
|------|--------|-------|
| CRUD | Implemented | EventsController + EventsService. create, findAll (with tourId, status, phase, etc.), findOne, update, delete. |
| Phase / lifecycle | Implemented | Phase transition, extend. |
| Query | Implemented | Filters: q, entityId, status, phase, tourId, isVirtual, dates, streamingAccessLevel, etc. |
| Roles / access | Implemented | Event roles, guards, audience actions (reminders, blasts). |
| Mailbox / blast | Implemented | Uses audience_messages + mailbox_items (tables not in schema). |

### 2.2 Tours

| Area | Status | Notes |
|------|--------|-------|
| Module | Stub only | ToursModule exists: no controllers, no providers, no exports. |
| App registration | Missing | ToursModule is not imported in AppModule — no /tours routes at all. |
| Services | None | No ToursController, no ToursService. Events can filter by tourId (events.service), but no tour CRUD or listing. |

**Tours with multiple events:** Backend cannot list or manage tours; only events can be queried by tourId. **Not usable for “tours with multiple events” without a real Tours API.**

### 2.3 Ticketing

| Area | Status | Notes |
|------|--------|-------|
| Event ticket types | Implemented | events.ticketTypes (JSON), event update. |
| Registration flow | Implemented | RegistrationsController: register, sendInvitations, validateTicket. Uses event_registrations (not in schema). |
| Ticket creation | Via orders | PaymentsService creates order + order_items (ticketId); ticket creation may be in webhook/checkout flow. |
| Validate ticket | Implemented | registrations.validateTicket; streaming uses ticket + optional event_registrations. |

### 2.4 Orders / Payments

| Area | Status | Notes |
|------|--------|-------|
| Checkout | Implemented | PaymentsController createCheckout → PaymentsService.createCheckoutSession (Stripe session + PENDING order + order_items). |
| Webhook | Implemented | handleWebhook (Stripe); completes order, creates payments. |
| Get orders | Implemented | getOrders with filters (userId, entityId, eventId, status, type, pagination). |

Backend supports ticket purchase (checkout + webhook); frontend does not call it (see below).

### 2.5 Messaging / Mailbox

| Area | Status | Notes |
|------|--------|-------|
| Mailbox API | Implemented | MailboxController GET /mailbox → RegistrationsService.getMailbox(userId, eventId?). Returns mailbox_items + audience_messages (both tables not in schema). Resilient to missing relations. |
| Event-scoped mailbox | Implemented | GET events/:eventId/registrations/mailbox. |
| Audience blast | Implemented | EventsService sends to audience_messages and creates mailbox_items for audit. |
| Notifications | Implemented | NotificationsService (app_users notifications table); separate from mailbox. |

Event messaging and mailbox are implemented in code but depend on tables not declared in schema.

### 2.6 Streaming / Watch

| Area | Status | Notes |
|------|--------|-------|
| Create session | Implemented | POST /streaming/session/:eventId. |
| Token | Implemented | POST /streaming/:eventId/token. Validates ticket (status ACTIVE, optional registration), geofence; supports ticketId and accessCode; redemption logic (bind/burn). |
| Active sessions | Implemented | GET /streaming/active. |
| End session / metrics | Implemented | End session, update metrics, validate-geofence. |

Streaming access control is implemented; it assumes ticket has `status` and optional `registrationId` (schema mismatch noted above).

### 2.7 Creator dashboards

| Area | Status | Notes |
|------|--------|-------|
| Events | Via Events API | Create, update, list by entity, phase, etc. |
| Store | Implemented | StoreController + StoreService (stores, products). |
| Analytics | Implemented | AnalyticsController + AnalyticsService. |
| Registrations / mailbox | Implemented | Registrations + mailbox as above. |
| No dedicated “creator” module | N/A | Creator features are spread across events, store, registrations, streaming. |

### 2.8 Navigation (backend)

Backend does not drive navigation; it exposes REST APIs. No gaps specific to “navigation” on the server.

---

## 3) Frontend Service Coverage

### 3.1 Services present

| Service | File | Notes |
|---------|------|-------|
| Auth | auth.service.ts | getCurrentUser, register, etc. |
| Users | users.service.ts | Profiles, entities. |
| Entities | entities.service.ts | CRUD, applications. |
| Events | events.service.ts | getAll, getById, create, update, phase, access, reminders, blasts. |
| Follow | follow.service.ts | Follow entity/event, status. |
| Store | store.service.ts | Stores, products. |
| Streaming | streaming.service.ts | createSession, generateToken, getActiveSessions, etc. |
| Notifications | notifications.service.ts | List, create. |
| Analytics | analytics.service.ts | Entity/event metrics. |
| Payments | payments.service.ts | **Stub only.** createCheckout, getOrders, getOrder, createRefund return placeholders (Promise.resolve(empty)). |
| Mailbox | mailbox.service.ts | getMailbox() → GET /mailbox. Implemented. |
| Event activities | event-activities.service.ts | Activities. |
| Meet-greet | meet-greet.service.ts | Meet-greet. |
| Moderation / Admin | moderation.service.ts, admin.service.ts | Reports, admin. |
| Creator | creator/creator.service.ts | Create event/post/product, start stream, etc. |

### 3.2 Tours

- **useTours** (hooks/useTours.ts) calls `GET /tours?entityId=...` and `GET /tours/slug/:slug`.
- **Backend:** No ToursController; ToursModule not in AppModule. These requests **404**.
- **Conclusion:** Frontend expects a Tours API that does not exist.

### 3.3 Ticket purchase

- **payments.service.ts** does not call the backend. createCheckout returns `{ checkoutUrl: "" }`, getOrders/getOrder return empty/null.
- **usePayments / useCreateCheckout** exist and call this stub, so no real checkout or order list.
- **EventLandingPage** shows “Get tickets (placeholder)” and does not integrate checkout.
- **Conclusion:** Ticket purchase is not integrated; backend is ready, frontend is not.

### 3.4 Messaging / mailbox

- **mailbox.service.ts** calls GET /mailbox and returns data. Implemented.
- **MailboxPage** and mailbox UI use it. No missing integration for “event messaging” from a service perspective (backend mailbox + audience_messages handle it).

### 3.5 Streaming / watch

- **streaming.service.ts** calls createSession, generateToken, getActiveSessions, etc. Implemented.
- **EventWatchPage** uses ticketId/accessCode and generateToken. Streaming access control is wired; only ticket/registration schema and ticket purchase flow are gaps.

---

## 4) UI Coverage

### 4.1 Tours

- **useTours** and references in EntityProfilePage, PublicCreatorProfilePage, store.service, events.service (tourId filter).
- **No dedicated tour list/detail pages** found; no tour management in creator dashboard.
- **Backend** has no tours API, so any tour UI would 404 on load.

### 4.2 Events

- **EventsPage, EventLandingPage, LiveNowPage** (list, detail, live). Creator: CreatorEventsPage, CreatorEventDetailPage, CreatorEventEditPage, CreatorEventTicketsPage, CreateEventPage, EventLivePage, etc. Implemented.

### 4.3 Ticketing

- **CreatorEventTicketsPage** configures ticket types (name, price, quantity, access level); saved via event update. No purchase flow.
- **EventLandingPage** has “Get tickets (placeholder)” — no checkout.
- **TicketsPage** (“My Tickets”) is a placeholder empty state; no call to getOrders or ticket list.
- **Conclusion:** Ticketing configuration exists; purchase and “my tickets” are not implemented in UI.

### 4.4 Orders

- **payments.service** is a stub; no UI can show real orders or checkout.
- **CartSection** exists but checkout is not wired to backend.

### 4.5 Messaging / Mailbox

- **MailboxPage** (3-column layout, categories, search, list, message view). Implemented.
- **MailboxItemCard** (CTAs, event links, watch with ticket/accessCode). Implemented.
- **CreatorEventBlastPage** for sending blasts. Implemented.

### 4.6 Streaming / Watch

- **EventWatchPage** (LiveKit, token with ticketId/accessCode). Implemented.
- **StreamingPanel, LiveKitViewer, etc.** Used for watch and producer. Implemented.

### 4.7 Creator dashboards

- **Studio layout:** CreatorDashboardPage, CreatorEventsPage, CreatorEventDetailPage, CreatorEventEditPage, CreatorEventTicketsPage, CreatorStorePage, CreatorAnalyticsPage, CreatorApplicationPage, CreatorStatusPage, CreatorSettingsPage, EntityProfilePage, etc. Implemented.
- **Role-based routing** (creator vs viewer) and creator nav (Create Event, Creator Dashboard) are in place.

### 4.8 Navigation

- **Navigation.tsx:** Explore, Live Now, Creators, My Tickets, Mailbox, Cart, Profile dropdown; for creators: Create Event, Creator Dashboard. Implemented.
- **Route guards** (HomeRedirect, CreatorRouteGuard, ProtectedRoute, StudioRoute, UserRoute). Implemented.

---

## 5) Missing Integrations & Blockers

### 5.1 Tours with multiple events

| Layer | Gap |
|-------|-----|
| Schema | tours and events.tourId exist. |
| Backend | No Tours API (ToursModule empty, not in AppModule). No way to create/list/update tours or attach events. |
| Frontend | useTours calls /tours and /tours/slug/:slug → 404. No tour management or tour detail UI. |
| **Blocker** | **Backend must implement ToursController + ToursService and register ToursModule. Frontend then needs to wire useTours and add tour UIs (list/detail/management).** |

### 5.2 Ticket purchase

| Layer | Gap |
|-------|-----|
| Schema | orders, order_items, tickets, payments present. tickets missing status/registrationId in schema but used in backend. |
| Backend | Checkout and webhook implemented. |
| Frontend | payments.service is a stub; no call to POST /payments/checkout or GET /payments/orders. EventLandingPage and TicketsPage do not integrate checkout or order list. |
| **Blocker** | **Frontend must implement payments.service with real API calls (createCheckout, getOrders, getOrder) and wire EventLandingPage “Get tickets” and TicketsPage “My tickets” to checkout and order history.** |

### 5.3 Event messaging

| Layer | Gap |
|-------|-----|
| Schema | audience_messages and mailbox_items not in schema (used via (prisma as any)). |
| Backend | getMailbox and blast use these tables; API works if tables exist. |
| Frontend | Mailbox and blast UI implemented. |
| **Blocker** | **Schema: Add event_registrations, mailbox_items, audience_messages to schema.prisma (or document as raw tables and ensure migrations match). No frontend integration missing for messaging.** |

### 5.4 Streaming access control

| Layer | Gap |
|-------|-----|
| Schema | tickets has no status or registrationId in schema; backend expects both. |
| Backend | Token generation validates ticket status and optional registration. |
| Frontend | EventWatchPage passes ticketId/accessCode; streaming.service.generateToken used. |
| **Blocker** | **Schema: Add tickets.status and tickets.registrationId (and relation to event_registrations if applicable) so Prisma and backend agree. Otherwise ticket validation may fail or be inconsistent.** |

### 5.5 Summary table

| Feature | Schema | Backend API | Frontend service | UI | Blocks platform? |
|---------|--------|-------------|------------------|-----|------------------|
| Tours (multi-event) | OK | Missing | Calls non-existent API | No tour UI | Yes |
| Ticket purchase | Partial (ticket status/registrationId) | OK | Stub only | Placeholder only | Yes |
| Event messaging | Tables not in schema | OK | OK | OK | Schema only |
| Streaming access | Same as ticket | OK | OK | OK | Schema (ticket fields) |

---

## 6) Recommendations (no changes made)

1. **Schema**
   - Add or document **event_registrations**, **mailbox_items**, **audience_messages** (and align migrations).
   - Add **tickets.status** and **tickets.registrationId** (and relations) to match backend usage.
2. **Tours**
   - Implement **ToursController** and **ToursService** (CRUD, list by entity, get by slug).
   - Register **ToursModule** in AppModule.
   - Wire frontend **useTours** and add tour list/detail/management pages.
3. **Ticket purchase**
   - Implement **payments.service** with real createCheckout, getOrders, getOrder (and optionally createRefund).
   - Wire **EventLandingPage** “Get tickets” to checkout (e.g. redirect to Stripe or in-app checkout).
   - Wire **TicketsPage** to getOrders or a “my tickets” API so users see purchased tickets.
4. **Messaging**
   - No backend or frontend feature work required for event messaging beyond schema alignment for mailbox/audience_messages.

This report is for audit only; no code or config was modified.
