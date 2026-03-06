# Phase 1 Test Checklist

Run these checks to verify Phase 1 implementation.

## PART A — Backend: Prisma + Supabase Pooler

1. **Backend startup with pooler URL**
   - Ensure `DATABASE_URL` in backend `.env` includes: `sslmode=require`, `pgbouncer=true`, `statement_cache_size=0`.
   - Start backend: `cd backend && npm run start:dev`.
   - Expect: no 500s from prepared statement errors (42P05 / 08P01).

2. **GET /api/events returns 200**
   - Call `GET /api/events` (browser or Postman).
   - Expect: 200 and a list of events (or empty array).

## PART B/C — Backend: Follows + Event + Notify

3. **Run migration**
   - From backend: `npx prisma migrate deploy` (or `migrate dev` locally).
   - Ensures `follows.notify` exists and FK on `target_id` to entities is dropped so EVENT follows work.

4. **Like event**
   - As logged-in user: `POST /api/follow/event/:eventId` (with Bearer token).
   - Expect: 201 with `{ id, eventId, notify: false }`.
   - Then: `DELETE /api/follow/event/:eventId` → 204.

5. **Follow creator (entity)**
   - As logged-in user: `POST /api/follow/:entityId` (with Bearer token).
   - Expect: 201 (or 409 if already following).
   - Then: `DELETE /api/follow/:entityId` → 204.

6. **Notify toggle**
   - Like an event first (`POST /api/follow/event/:eventId`).
   - `PATCH /api/follow/event/:eventId/notify` with body `{ "notify": true }` (Bearer token).
   - Expect: 200 with `{ notify: true }`.
   - Check: a row in `notifications` with type `EVENT_NOTIFY_ENABLED` and message containing the event name.
   - `PATCH .../notify` with `{ "notify": false }` → 200, `follows.notify` false.

7. **User (USER role) can follow entities and like events**
   - Log in as a user with USER role (not ENTITY).
   - Follow an entity and like an event via API or UI.
   - Expect: both succeed.

## PART D/E — Frontend: Routing and Actions

8. **Event card body → Event Landing Page**
   - Open a public entity page or creator profile that shows event cards.
   - Click the card body (thumbnail/title/date).
   - Expect: navigate to `/events/:eventId` (Event Landing Page).

9. **Creator row → Creator Profile Page**
   - On the same event card, click the creator avatar/name row.
   - Expect: navigate to `/entities/:slug` (Creator Profile Page).

10. **Action icons do not navigate**
    - Click Like (heart), Follow creator (user+), or Notify (bell).
    - Expect: no navigation; only the action runs (and state updates).

11. **Event Landing Page**
    - Go to `/events/:id` for a valid event id.
    - Expect: event name, description, time, location, thumbnail, status; creator block linking to `/entities/:slug`; Like / Follow creator / Notify buttons.
    - If `ticketRequired`: "Get tickets" placeholder CTA shown.

## Summary

- [ ] Backend starts without prepared-statement 500s
- [ ] GET /api/events returns 200
- [ ] Event card body → /events/:eventId
- [ ] Creator row → /entities/:slug
- [ ] Like event (POST/DELETE follow/event) works
- [ ] Follow creator (POST/DELETE follow/:entityId) works
- [ ] Notify toggle works when liked; persists in follows.notify; writes confirmation notification
- [ ] USER role can follow entities and like events
