# Event Management Replacement Plan

## Goal
Replace the fragmented event setup / access / invitation / blast experience with one unified management surface:

`/studio/events/:eventid/manage`

This page becomes the single control center for an event after it is created.

---

## Product UX

### Primary route
- `/studio/events/:eventid/manage`

### Remove as primary destinations
- `/studio/events/:eventid/access`
- `/studio/events/:eventid/tickets`
- `/studio/events/:eventid/invitations`
- `/creator/events/:eventid/blast`

These can temporarily redirect to the new manage page with a tab query param.

### Tabs inside Manage page
1. Overview
2. Audience
3. Tickets
4. Messaging
5. Settings

### Header actions
Top right actions on the page:
- Share Event
- Invite Audience
- Send Message
- View Public Page
- Go Live

### UX principles
- All event-management actions live on one page.
- No action should require bouncing between dashboard, access, and invitations pages.
- Tickets and audience should feel connected.
- Audience tab is where creators actually distribute access.

---

## Information Architecture

### Overview tab
Purpose: event health + next actions.

Blocks:
- Event summary card
- Status / phase / start time / visibility
- Media preview (thumbnail/banner/promo url)
- Quick actions
- Pre-live checklist
- Links to Audience / Tickets / Messaging tabs

### Audience tab
Purpose: distribute access.

Blocks:
- Ticket type selector
- Invite followers
- Invite by email
- Share registration link / access code
- Audience activity / recent invites / counts

Rules:
- If no ticket types exist, show clear inline warning and CTA to Tickets tab.
- Default selected ticket type should auto-pick the first available type.
- Users should never need a separate `/access` page.

### Tickets tab
Purpose: define ticket inventory.

Blocks:
- EventTicketTypesSection
- explanatory copy about public vs invite-only distribution
- optional small summary row: total ticket types / free / paid

### Messaging tab
Purpose: send creator communications.

Blocks:
- blast composer
- audience selector (followers / ticket holders)
- channel selector (start with in-app, email disabled if not implemented)
- message history placeholder

### Settings tab
Purpose: metadata and access rules.

Blocks:
- name / description / category
- start / end / location
- visibility
- geo rules
- promo video url
- banner / thumbnail links if needed

---

## Routing Plan

### New route
- `/studio/events/:eventid/manage`

### Query-param tabs
- `/studio/events/:eventid/manage?tab=overview`
- `/studio/events/:eventid/manage?tab=audience`
- `/studio/events/:eventid/manage?tab=tickets`
- `/studio/events/:eventid/manage?tab=messaging`
- `/studio/events/:eventid/manage?tab=settings`

### Redirect old routes
- `/studio/events/:id/access` -> `/studio/events/:eventid/manage?tab=audience`
- `/studio/events/:id/tickets` -> `/studio/events/:eventid/manage?tab=tickets`
- `/studio/events/:id/invitations` -> `/studio/events/:eventid/manage?tab=audience`
- `/creator/events/:id/blast` -> `/studio/events/:eventid/manage?tab=messaging`

---

## Replacement File Strategy

### New files to create
- `frontend/src/pages/studio/events/CreatorEventManagePage.tsx`
- `frontend/src/components/events/manage/EventManageHeader.tsx`
- `frontend/src/components/events/manage/EventManageTabs.tsx`
- `frontend/src/components/events/manage/EventManageOverviewTab.tsx`
- `frontend/src/components/events/manage/EventManageAudienceTab.tsx`
- `frontend/src/components/events/manage/EventManageTicketsTab.tsx`
- `frontend/src/components/events/manage/EventManageMessagingTab.tsx`
- `frontend/src/components/events/manage/EventManageSettingsTab.tsx`

### Files to simplify or redirect
- `CreatorEventAccessPage.tsx`
- `CreatorEventTicketsPage.tsx`
- `CreatorEventInvitationsPage.tsx`
- `CreatorEventBlastPage.tsx`

### Files to update links/navigation
- `CreatorEventsPage.tsx`
- `CreatorEventDetailPage.tsx`
- `EventStudioPage.tsx`
- route config / app routing files

---

## Data / Service Rules

### Keep using existing services where possible
- `eventsService.update`
- `eventsService.inviteToEvent`
- `eventsService.createBlast`
- `eventsService.getTicketTypesCatalog` if available
- `useEvent`
- `useUpdateEvent`

### Do NOT use legacy registrations service in the new manage flow
Legacy pages can keep it only while redirecting, but the new page should use `eventsService` only.

### Audience tab behavior
- load ticket types from event / catalog
- auto-select first valid ticket type
- followers invite uses `eventsService.inviteToEvent(eventId, { type: 'FOLLOWERS', ticketTypeId })`
- email invite uses `eventsService.inviteToEvent(eventId, { type: 'EMAIL', ticketTypeId, emails })`
- clear email field only on success
- invalidate event and mailbox queries on success

### Messaging tab behavior
- use `eventsService.createBlast`
- show empty-audience warning before send
- keep email channel disabled if backend not ready

---

## Visual Layout Spec

### Page shell
Use `CreatorDashboardLayout`.
Main content max width: `max-w-6xl mx-auto px-6 py-6`.

### Header row
Left:
- Event name
- subtitle: status / phase / date

Right:
- secondary buttons: Share Event, Invite Audience, Send Message
- primary buttons: View Public Page, Go Live

### Tab bar
Horizontal, under header.
Active tab uses red underline and white text.
Inactive tabs use muted text.

### Content area
Use card sections:
- rounded-xl
- border white/10
- bg white/[0.03]
- p-6

### Responsive behavior
- Header actions wrap on smaller screens.
- Tabs remain horizontally scrollable.
- Audience and Settings content max width around `max-w-2xl` to reduce visual sprawl.

---

## Implementation Order

### Phase 1 ✅ (done)
Build the new manage page and wire tabs.

- Route: `/studio/events/:id/manage` with `?tab=overview|audience|tickets|messaging|settings`
- Files: `CreatorEventManagePage.tsx`, `frontend/src/components/events/manage/*`
- Legacy `/studio/events/:id/tickets` redirects to `?tab=tickets`
- Primary nav updated toward Manage where noted in this doc (detail page, route helpers, etc.)

### Phase 2
Move audience, tickets, messaging logic into the new page.

### Phase 3
Convert old pages into redirects only.

### Phase 4
Update all links and buttons to point to `/manage`.

### Phase 5
Debug API/data mismatches and remove dead flows.

---

## Cursor Execution Prompt

```tsx
We are replacing the fragmented event management experience with one unified page.

Build a new route and page:
`/studio/events/:id/manage`

Create these tabs inside the page:
- Overview
- Audience
- Tickets
- Messaging
- Settings

Requirements:

1. Create `CreatorEventManagePage.tsx`
- Use `CreatorDashboardLayout`
- Read `eventId` from route params
- Load event via `useEvent(eventId)`
- Read active tab from query param `tab`
- Default to `overview`
- Render a header with event name, status, phase, and actions
- Actions:
  - Share Event
  - Invite Audience (switch to `audience` tab)
  - Send Message (switch to `messaging` tab)
  - View Public Page
  - Go Live

2. Create tab components:
- `EventManageOverviewTab.tsx`
- `EventManageAudienceTab.tsx`
- `EventManageTicketsTab.tsx`
- `EventManageMessagingTab.tsx`
- `EventManageSettingsTab.tsx`

3. Audience tab
- Move the invite logic from `CreatorEventAccessPage`
- Use `eventsService.inviteToEvent`
- Show ticket type selector
- Auto-select first valid ticket type if one exists
- If no ticket types exist, show warning with a button/link to Tickets tab
- Followers invite button
- Email invite textarea + send button
- Invalidate `['events', eventId]` and `['mailbox']` on success
- Clear email input only on success

4. Tickets tab
- Render `EventTicketTypesSection`
- Add short explanatory copy
- No redirect logic here

5. Messaging tab
- Move the blast UI from `CreatorEventBlastPage`
- Use `eventsService.createBlast`
- Keep audience selection and channel selection
- Email channel may remain disabled if not implemented

6. Settings tab
- Move editable event metadata from `EventStudioPage` overview/access sections
- Save with `eventsService.update`
- Include:
  - name
  - description
  - category
  - start/end time
  - location
  - visibility
  - geo restriction / geo regions
  - promo video url

7. Replace old pages with redirects:
- `CreatorEventAccessPage.tsx` -> `/studio/events/:id/manage?tab=audience`
- `CreatorEventTicketsPage.tsx` -> `/studio/events/:id/manage?tab=tickets`
- `CreatorEventInvitationsPage.tsx` -> `/studio/events/:id/manage?tab=audience`
- `CreatorEventBlastPage.tsx` -> `/studio/events/:id/manage?tab=messaging`

8. Update all navigation links/buttons pointing to old routes:
- from `CreatorEventsPage`
- from `CreatorEventDetailPage`
- from `EventStudioPage`
- from app routes / route helpers

9. Keep existing APIs and services if possible.
Do not introduce new backend endpoints in this pass.
Do not use `registrationsService` for the new manage flow.

10. After implementing, run the frontend build and fix any TypeScript/import errors.

Goal:
A creator should be able to manage tickets, invite people, message their audience, and edit settings from ONE page.
No more hidden `/access` workflow.
```

---

## Debug Order After Build

1. Confirm `/studio/events/:id/manage` loads
2. Confirm tabs switch via query params
3. Confirm ticket types load in Audience tab
4. Confirm Invite Followers mutation fires
5. Confirm Email Invite mutation fires
6. Confirm Tickets tab saves and refreshes event data
7. Confirm Messaging tab creates blast
8. Confirm old routes redirect correctly
9. Confirm all buttons now target `/manage`

