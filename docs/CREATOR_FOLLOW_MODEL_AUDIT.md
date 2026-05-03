# Creator Follow Model Audit

## 1. Existing follows schema — sufficient

The current **`follows`** table is sufficient for the creator follow model. No new table or schema change was required.

| Requirement | Status |
|-------------|--------|
| User follows entity | ✅ `user_id` → `target_id` with `target_type = ENTITY` |
| Entity follows entity | N/A — growth engine is "user follows creator (entity)". Entity-to-entity follow not required. |
| Follow timestamps | ✅ `createdAt`, `updatedAt` |
| Uniqueness | ✅ `@@unique([user_id, target_id, target_type])` (and legacy `@@unique([user_id, target_id])`) |
| Notify preference (event-level) | ✅ `notify` on follow row (used for event reminders) |

**Note:** All backend queries that referred to `follows` using `entityId` or `userId` as field names have been fixed to use the actual columns: `target_id`, `target_type: "ENTITY"`, and `user_id`. This was a bug fix, not a schema change.

---

## 2. Schema / API changes made

### Backend fixes (no new endpoints)

- **`notifications.service.ts`** — `broadcastToFollowers`: query `follows` with `where: { target_id: entityId, target_type: "ENTITY" }`, `select: { user_id: true }`; map to `user_id` for recipient list.
- **`events.service.ts`** — Audience "FOLLOWERS" blast: resolve event’s `entityId`, then query follows with `target_id` / `target_type: "ENTITY"`, select `user_id`.
- **`analytics.service.ts`** — All `follows.count` and `follows.findMany` now use `target_id`/`target_type: "ENTITY"` or `user_id` as appropriate.

### New notification hook methods (target followers)

- **`notifications.service.ts`**
  - `notifyEventScheduled(eventId, entityId, eventName, startTime?)` — use after creator schedules a new event.
  - `notifyTourLaunched(entityId, tourName, tourId, tourSlug?)` — use when a creator launches/publishes a tour.

Existing hooks unchanged:

- `notifyStreamingSessionStarted(eventId, entityId)` — creator starts live stream (call from streaming/session start).
- `notifyEventPhaseUpdate(...)` — event phase change.
- `notifyProductAdded(...)` — new product.

### Frontend

- **`PublicCreatorProfilePage.tsx`** — Follow / Following button added:
  - Uses `followService.isFollowing(entity.id)` and `followService.followEntity` / `unfollowEntity`.
  - Shown only when viewer is logged in and not the profile owner.
  - Invalidates follow and count queries on success.

---

## 3. Endpoints / hooks for follower-driven discovery

### Follow API (existing)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/follow/:entityId` | Follow entity (auth) |
| DELETE | `/follow/:entityId` | Unfollow entity (auth) |
| GET | `/follow/:entityId/followers` | Get followers for entity (public, paginated) |
| GET | `/follow/user/:userId` | Get entities followed by user (public, paginated) |
| GET | `/follow/status/:entityId` | Current user’s follow status for entity (auth) |
| GET | `/follow/counts/entity/:entityId` | Follower count for entity (public) |
| POST | `/follow/event/:eventId` | Follow event (auth) |
| DELETE | `/follow/event/:eventId` | Unfollow event (auth) |
| GET | `/follow/event/status/:eventId` | Event follow + notify status (auth) |
| PATCH | `/follow/event/:eventId/notify` | Set notify for event (auth) |

### Discovery (existing)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/events/followed` | Upcoming/live events from entities the current user follows (auth). Powers “From Creators You Follow”. |

### Notification hook points (target followers)

Call these from the appropriate services so followers receive in-app (and optional push) notifications:

| Hook | When to call | Method |
|------|----------------|--------|
| **Creator schedules new event** | After event create when status is SCHEDULED (or when event is first published). | `NotificationsService.notifyEventScheduled(eventId, entityId, eventName, startTime?)` |
| **Creator starts live stream** | When streaming session becomes active for the event. | `NotificationsService.notifyStreamingSessionStarted(eventId, entityId)` |
| **Creator launches tour** | After tour create or when tour is published. | `NotificationsService.notifyTourLaunched(entityId, tourName, tourId, tourSlug?)` |

Wiring (not done in this audit to avoid scope creep):

- In **events.service** `create()` (or when transitioning to SCHEDULED): inject `NotificationsService`, call `notifyEventScheduled` after successful create.
- In **streaming** (session start): ensure `notifyStreamingSessionStarted` is called when session goes live.
- In **tours.service** `create()` or `update()`: inject `NotificationsService`, call `notifyTourLaunched` when tour is created or published.

---

## 4. Frontend readiness

| Requirement | Status |
|-------------|--------|
| Creator profile: Follow / Following button | ✅ Added on `PublicCreatorProfilePage`; uses entity id, follow status, and follow/unfollow mutations. |
| Homepage / discover: “From Creators You Follow” | ✅ Already present: `FollowFeed` on `HomePage` uses `GET /events/followed`. |

No overengineering: no new subscription or membership layers; follow remains user → entity with optional event-level notify.
