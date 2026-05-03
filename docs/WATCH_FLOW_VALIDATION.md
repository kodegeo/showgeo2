# Watch Flow Validation (MVP)

This document confirms how the watch (streaming) flow works with purchased tickets and what remains in place after the MVP completion phase.

## 1. Valid purchased ticket can access stream

- **Backend** (`streaming.service.ts`): VIEWER token requires `ticketId` (logged-in) or `accessCode` (guest). Ticket is loaded via `tickets.findUnique` with `include: { registrations: true }`. Checks: ticket exists, `ticket.eventId === eventId`, `ticket.status === "ACTIVE"`, and if `ticket.registrationId` is set, the related `event_registrations` row must have `status === "REGISTERED"`.
- **Paid tickets**: Created in `payments.service.ts` after Stripe webhook with `id`, `userId`, `eventId`, `orderId`, `type: PAID`, `status: "ACTIVE"`, and `updatedAt`. No `registrationId` for paid tickets, so the registration check is skipped. A valid paid ticket therefore passes all backend checks.
- **Frontend**: EventWatchPage sends `ticketId` in the token request when the user is authenticated. TicketsPage links to `/events/:eventId/watch?ticketId=:ticketId` using the first ticket from the order’s items (from `getOrders` / `getOrder`). So a user with a completed order can open Watch with the correct `ticketId` and receive a token.

**Conclusion:** A valid purchased (paid) ticket allows stream access when the user opens the watch page with that `ticketId` (and event is LIVE).

## 2. Invalid access is blocked

- **Backend**: No token is issued without a valid ticket: missing `ticketId`/`accessCode` → 403; ticket not found or wrong event → 403; `ticket.status !== "ACTIVE"` → 403; ticket already claimed by another user → 403; access code already redeemed → 403; event not LIVE → 403. Geofence and Code of Conduct checks also apply.
- **Frontend**: EventWatchPage requires `ticketId` (logged-in) or `accessCode` (guest) and shows an error if token generation fails (e.g. 403).

**Conclusion:** Invalid or missing ticket/access code is blocked; only valid, ACTIVE tickets for the correct event and (when applicable) correct user can get a viewer token.

## 3. Mailbox / ticket confirmation remains intact

- **Schema:** `event_registrations`, `mailbox_items`, and `tickets` (with `status`, `registrationId`) are aligned with backend usage. Mailbox continues to be populated by registrations (e.g. TICKET type for free registrations, INVITATION, NOTIFICATION, EVENT_UPDATE). Paid tickets are created in the payments webhook and are not tied to `event_registrations`; they do not create mailbox_items in the current flow.
- **Behaviour:** Free registration flow still creates a ticket, updates registration to REGISTERED, and adds a TICKET mailbox item. Paid checkout creates orders and tickets via webhook; mailbox content for paid tickets (if any) is unchanged by this phase.

**Conclusion:** Mailbox and ticket confirmation behaviour for existing flows (e.g. free registration, invitations) is unchanged. Paid ticket creation does not currently add mailbox items; that can be a future enhancement.

## Remaining considerations (non-blocking for MVP)

- **Multiple tickets per order:** Orders can have multiple items; TicketsPage uses the first item’s ticket for the “Watch” link. Users with multiple tickets for the same event may need to pick which ticket to use (or the UI could be extended to show one row per ticket).
- **Paid tickets in mailbox:** Optionally, a mailbox item could be created when a paid order is completed so “My Tickets” and Mailbox stay in sync.
- **Success URL:** Frontend passes `successUrl` with `eventId` so after checkout the user can go to “My Tickets” or “Back to event”. Stripe’s `session_id` may be appended by the backend; the success page uses `eventId` from the query for navigation.
