# Event Lifecycle Implementation

## 1. Files changed

### Backend
- **`backend/prisma/schema.prisma`** – Added `registrationAccess` (String?, `'OPEN' | 'INVITE_ONLY'`) on `events`.
- **`backend/prisma/migrations/20260306200000_add_event_registration_access/migration.sql`** – Migration adding `registrationAccess` column.
- **`backend/src/modules/events/dto/create-event.dto.ts`** – Added `registrationAccess?: 'OPEN' | 'INVITE_ONLY'`.
- **`backend/src/modules/events/events.service.ts`** – Create/update pass through `registrationAccess`.
- **`backend/src/modules/registrations/registrations.service.ts`** – **FREE + OPEN**: when no existing registration and `event.registrationAccess === 'OPEN'` and event is free, create a new `event_registrations` row (then complete registration and issue free ticket + mailbox).

### Frontend
- **`frontend/src/services/events.service.ts`** – `UpdateEventRequest` includes `registrationAccess`.
- **`frontend/src/pages/events/EventRegisterPage.tsx`** – For **FREE + OPEN** events: show “Register for free” (email if guest, or use session if logged in); still show access-code form for invite-only or code holders.
- **`frontend/src/pages/events/EventLandingPage.tsx`** – Promotion: added `EventPromotionTools`. Post-event: when `phase === 'POST_LIVE'` or `status === 'COMPLETED'`, show “Event ended” and “Watch replay” link if `videoUrl` is set.
- **`frontend/src/pages/studio/CreatorEventEditPage.tsx`** – Event setup: **Pricing** (FREE / PAID + price), **Registration access** (OPEN / INVITE ONLY), **Ticket required** checkbox, **Geofencing** (streaming access level + comma-separated regions), **Replay** (enable + video URL). Save sends `ticketTypes`, `registrationAccess`, `streamingAccessLevel`, `geoRegions`, `videoUrl` where applicable.

---

## 2. Event lifecycle gaps still remaining

- **Event creation (CreateEventPage / CreateEventModal)** – Still minimal (name, time, location). Full pricing, access, and geofencing are only in **CreatorEventEditPage** after creation. Consider adding a short “Event type” step (free/paid, open/invite) to create flow.
- **Pre-event: audience blasts** – Blast API and UI exist; no change. Confirm reminder cron and mailbox confirmation are sufficient for your product.
- **Live: stream token without ticket** – Watch flow still requires a ticket (or access code for guests). There is no “public stream” mode where unregistered users can watch; if desired, that would need a separate rule (e.g. `ticketRequired: false` and optional ticket).
- **Post-event: replay on-site** – Replay is a **link** to `event.videoUrl` (opens in new tab). There is no in-app replay player or dedicated `/events/:id/replay` page.
- **Post-event: analytics** – Creator event analytics and `GET /analytics/event/:eventId` exist; no change.
- **Schema migration** – `registrationAccess` was applied via `prisma db execute` in this pass. Ensure migration `20260306200000_add_event_registration_access` is applied in all environments (or mark as applied in migration history).

---

## 3. Assumptions made

- **OPEN registration** – Only for **free** events (no ticket type with `price > 0`). Paid events stay checkout-only.
- **Open registration creates one row per user/email** – First “open” register creates an `event_registrations` row with `INVITED` then immediately updates to `REGISTERED` and issues a free ticket. Duplicate register (same userId or email) reuses that row and returns “Already registered” when status is already `REGISTERED`.
- **Default when `registrationAccess` is null** – Treated as **INVITE_ONLY** (no open registration). Existing events keep current behavior until set to OPEN in edit.
- **Replay** – Uses existing `events.videoUrl`. “Replay” in edit is a placeholder in the sense that it’s a single URL field; no separate “replay enabled” flag or model.
- **Geofencing** – Uses existing `streamingAccessLevel` and `geoRegions`; validation on stream token (e.g. geo-check) was assumed already in place; no change in this pass.
- **Promotion** – Public event page and creator event detail both expose sharing (event link, Twitter, Facebook, embed). Creator link is the existing creator block on the event page; tour link shown when `event.tours?.slug` exists.
- **Lifecycle phases** – PRE_LIVE → LIVE → POST_LIVE and status (e.g. COMPLETED) are assumed to be driven by existing phase transition and status logic; only the **display** of “Ended” and replay link was added on the public event page.
