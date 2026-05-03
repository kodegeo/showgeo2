# Event Attendance Model Refactor

## Summary

- **event_registrations** = canonical source of truth for attendance/entitlement.
- **tickets** = derived access artifact (wallet item); every ticket is tied to a `registrationId` when created through the canonical flows.

## 1. Files changed

### Schema & migration
- **`backend/prisma/schema.prisma`** – Added `source` (String?, `'PUBLIC' | 'INVITE' | 'PURCHASE'`) on `event_registrations`.
- **`backend/prisma/migrations/20260306210000_add_registration_source/migration.sql`** – Adds `source` column.

### Backend logic
- **`backend/src/modules/registrations/registrations.service.ts`**
  - `sendInvitations`: set `source: "INVITE"` when creating registrations.
  - OPEN registration path: set `source: "PUBLIC"` when creating a new registration.
  - `ensureFreeTicket`: always sets `registrationId`; added `updatedAt` on ticket create.
- **`backend/src/modules/payments/payments.service.ts`**
  - `handleCheckoutCompleted`: for each ticket (per quantity), **create one `event_registrations`** (eventId, userId, status REGISTERED, **source: "PURCHASE"**), then create **one ticket** with `registrationId` set to that registration. No more creating tickets without a registration.
- **`backend/src/modules/analytics/analytics.service.ts`**
  - `getEventAnalytics`: attendance count is **event_registrations** with `status: "REGISTERED"`; `ticketSales` remains ticket count (derived artifact).
- **`backend/src/modules/streaming/streaming.service.ts`**
  - Comment only: ticket is access artifact, registration is entitlement source; when `ticket.registrationId` is set, registration is already validated (status REGISTERED).

## 2. Schema changes

| Model                | Change |
|----------------------|--------|
| `event_registrations` | New optional field: `source` (String?) — `'PUBLIC' | 'INVITE' | 'PURCHASE'`. |

**Migration:** run or apply `20260306210000_add_registration_source/migration.sql` (adds column; existing rows leave `source` null, treated as legacy/INVITE in logic).

## 3. Target flows (after refactor)

| Flow              | Attendance (event_registrations)     | Access (tickets)                    |
|-------------------|--------------------------------------|-------------------------------------|
| **FREE OPEN**     | Create reg (source PUBLIC) → REGISTERED | ensureFreeTicket(registrationId)   |
| **FREE INVITE_ONLY** | Existing INVITED reg → REGISTERED   | ensureFreeTicket(registrationId)   |
| **PAID**          | Create reg (source PURCHASE, REGISTERED) per quantity | Create ticket with registrationId  |

## 4. Places still using the old split logic

- **Legacy tickets without `registrationId`**  
  Tickets created before this refactor (e.g. paid tickets created without a registration) have `registrationId = null`. Streaming still allows them (viewer access is ticket-based; registration is only checked when `ticket.registrationId` is set). No data backfill was added; optional backfill could link old paid tickets to new or existing registrations.

- **`handlePaymentSucceeded`**  
  Payment webhook path was not changed in this refactor. If your flow uses `handlePaymentSucceeded` to create tickets, that path may still create tickets without a registration. Prefer using `handleCheckoutCompleted` (session.completed) so all new paid tickets go through registration → ticket.

- **Event metrics in `events.service.ts` (e.g. getEventMetrics)**  
  Already uses `event_registrations.count({ status: "REGISTERED" })` for `registrationsCount` and ticket counts for viewers/join rates. No change; consistent with registration-first model.

- **Other analytics (entity/aggregate)**  
  `aggregateMetrics` and similar still use `tickets.count` for “tickets sold”. For entity-level reporting this is acceptable; for event-level attendance, prefer `event_registrations` (REGISTERED) as in `getEventAnalytics`.

## 5. Assumptions

- **Backward compatibility:** Tickets with `registrationId = null` remain valid for stream access; only when `registrationId` is present do we require the linked registration to be REGISTERED.
- **One registration per ticket for paid:** Each quantity in an order item gets one new event_registration (PURCHASE) and one ticket linked to it.
- **Source semantics:** `PUBLIC` = open registration; `INVITE` = created via sendInvitations; `PURCHASE` = created at checkout completion. Null/legacy can be treated as INVITE or unknown.
