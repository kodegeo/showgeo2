# Event Model Requirements

## Overview
This document defines the structure and behavior of the `Event` model in the Showgeo platform. It reflects how events are created, managed, restricted, and consumed within the platform. An Event is a live or prerecorded experience hosted by an `Entity`. Events progress through structured **phases** and are coordinated by an `Event Coordinator`. Events support a rich, interactive experience including chat, meetups, testing, and entertainment features. 

## Entity Relationship

- An **Entity** creates one or more Events.
- An Event may be part of a **Tour** (optional).
- Events can have multiple `Entity` collaborators (e.g., Special Guests).
- Each Event is **managed by a Coordinator**.
- An `Entity` can serve as its own Coordinator for pre-recorded events.
- Attendees are `Users` who purchase or are granted access to the event.
- Attendees can follow `Entity` to receive updates.

---

## Event Structure

## Core Attributes

| Property              | Type        | Description                                                  |
|-----------------------|-------------|--------------------------------------------------------------|
| `id`                  | UUID        | Unique event identifier                                      |
| `name`                | string      | Name/title of the event                                      |
| `description`         | text        | Long-form description                                        |
| `thumbnail`           | string/url  | Main image or thumbnail for the event                        |
| `event_type`          | enum        | `live`, `prerecorded`                                        |
| `phase`               | enum        | `'pre-LIVE' | 'LIVE' | 'post-LIVE'`            |
| `start_time`          | datetime    | Scheduled start time                                         |
| `end_time`            | datetime    | Scheduled or actual end time                                 |
| `location`            | string      | Virtual or physical location                             |
| `status`              | enum        | `draft`, `scheduled`, `live`, `completed`, `cancelled`       |
| `entity_id`           | UUID        | The owning Entity                                            |
| `event_coordinator_id`| UUID        | Assigned user who manages and operates the event             |
| `tour_id`             | UUID        | Optional: ID of associated Tour                              |
| `collaborator_entity_ids` | UUID[]  | An Entity involved as guests or co-hosts                      |
| `created_by`          | UUID        | User or system that created the event                        |
| `created_at`          | timestamp   | Auto-managed timestamp                                           |
| `updated_at`          | timestamp   | Auto-managed timestamp  

---

## Streaming and Location

| Property                   | Type          | Description                                                  |
|----------------------------|---------------|--------------------------------------------------------------|
| `is_virtual`               | boolean       | If true, it's a virtual event                                |
| `location`                 | object        | For physical: venue, address, city, state, country           |
| `stream_url`               | string        | For virtual events (LiveKit or external platform)            |
| `test_stream_url`          | string        | For pre-LIVE testing and sound checks                     |
| `video_url`                | string        | For prerecorded event media                                  |


## Geographic Streaming Restrictions

- streaming_access_level: local | regional | national | international
- geo_regions:
  - For local/regional: array of cities or states.
  - For national: target country.
  - For international: allow-list or block-list of countries.
  - restricted: Boolean – whether restrictions are enforced.

---

## Geographic Streaming Restrictions

| Property                | Type        | Description                                                    |
|-------------------------|-------------|----------------------------------------------------------------|
| `streaming_access_level`| enum        | `local`, `regional`, `national`, `international`              |
| `geo_regions`           | string[]    | Target locations (e.g., city/state names or country codes)    |
| `geo_restricted`        | boolean     | If true, access is restricted to `geo_regions`                |

---

## Ticketing

| Property           | Type      | Description                                                   |
|--------------------|-----------|---------------------------------------------------------------|
| `ticket_required`  | boolean   | All events require a ticket (true by default)                 |
| `ticket_types`     | array     | Ticket objects with type, price, currency, and availability       |
| `entry_code_required` | boolean| True if physical location requires an entry code              |
| `entry_code_delivery` | boolean| True if entry code is emailed after registration              |
| `ticket_email_template` | string | Template used in ticket confirmation email                    |

**Ticket Object Schema:**

```json
{
  "type": "free" | "gifted" | "paid",
  "price": number,
  "currency": "USD",
  "availability": number
}```

## Ticket Management

- ticket_required: Boolean – always true.
- ticket_types: Array of ticket objects:
  - type: free | gifted | paid
  - price: amount (if paid)
  - currency: string (e.g., USD)
  - availability: quantity available
  - entry_code_required: Boolean (true for physical events)
  - entry_code_delivery:
  - if true, system generates entry code per ticket and emails to attendee
  - ticket_email_template: customizable template sent to attendee

---

### Event Ownership and Participation

- host_entity_id: Primary Entity hosting the event.
- participating_Entity: List of Entity IDs tagged as co-hosts or special guests.
- is_part_of_tour: Boolean – is this event part of a tour?
- tour_id: Optional reference to associated Tour.
- event_coordinator_id: User ID of assigned Event Coordinator.

### Event Type and Location

- is_virtual: Boolean – is this a virtual event?
- location:
   - If physical: structured location data (venue, address, city, state, country).
   - If virtual: string (URL or platform ID).

---

### Event Branding 

- Multiple logos, banners, or promotional tags can appear on tour and event pages.
- Collaborating Entity can cross-promote the tour.
- custom_branding	object	(Optional: logo URL, brand colors, sponsor info)

---

### Event Promotion 

- Campaign management features 
- Email blast to followers
- Discussion rooms and virtual pre-event activities
- Integration with Entity social platforms for notification and branding
- custom_branding	object	(Optional: logo URL, brand colors, sponsor info)

---


## Phase Management

## Phase Lifecycle

| Phase              | Description                                             | Launch Trigger             | Countdown | Ends When                              |
|--------------------|---------------------------------------------------------|----------------------------|-----------| ---------------------------------------|
| pre_event_phase    | Admin sound checks, attendee hangouts, entertainment warm-up | Manual or scheduled        | Yes       | Manually by coordinator or countdown   |
| live_phase         | Main LIVE or event; streaming begins                 | Manual or after countdown  | Yes       | Auto/completion of stream or manual    |
| post_event_phase   | Meet & greet, attendee chat rooms, post-show interaction     | Manual or auto-after-live  | Optional  | Manually ended or scheduled            |


An event is broken into **3 sequential phases**:

### 1. Pre-LIVE

- Coordinator must **launch** Pre-LIVE phase manually or on schedule.
- Features:
  - Soundcheck & stream testing (visible only to admins and Entity)
  - Pre-LIVE music/video (mp3, mp4, or integrated playlist)
  - Comedian (Entity) or entertainment warm-up (video or stream)
  - Hangout rooms for event attendees (auto-close when event starts)
  - Countdown timer to LIVE phase
  - Coordinator task management & phase preparation

### 2. LIVE

- Live stream begins
- Coordinator or system triggers transition from Pre-LIVE
- Features:
  - Stream broadcast (via LiveKit)
  - Ability to extend or delay start/end time
  - Entity visibility into select attendees (video wall or Zoom-style)
  - Stream status monitoring

### 3. Post-LIVE

- Manually or automatically launched after event ends
- Features:
  - Attendee chat rooms
  - Meet-and-greet (one-on-one or small group)
  - Post-show announcements
  - Option to promote future events or merch

---

## Event Testing

Testing and Performance Management

- testing_enabled: Boolean – whether sound check/testing is enabled pre-launch
- test_result_logs: Array of system tests or performance checks
- live_metrics:
   - Real-time viewership stats
   - Engagement metrics (chats, reactions, ticket scans)

---

## Coordinator Capabilities

- Launch each phase
- View & manage countdowns
- Run testing tools during Pre-Event Phase
- Run testing during phases for a seamless launch of a phase 
- Manage tasks related to setup, launch, or transition
- Extend or delay phases
- Trigger hangout room closures or start entertainment
- Monitor live viewership and engagement stats
- Manage task lists by phase

---

## Associations

| Association            | Description                                                    |
|------------------------|----------------------------------------------------------------|
| `event_coordinator_id` | User coordinating the event                                    |
| `attendees`            | Users attending or registered                                  |
| `collaborators`        | Other Entity involved in the event                           |
| `chat_rooms`           | Rooms associated with this event across phases                 |
| `hangout_rooms`        | Temporary rooms created during pre-event phase               |

---

## Notifications

Trigger notifications for:
- New Event/Tour announcement (to followers)
- Phase transitions (especially event launch)
- Chat room openings
- Post-LIVE meetups
- follower_notification_enabled: Boolean – whether followers of the Entity are notified
- notification_types: event_created | event_live | event_update

---

## Future Features

- Phase-specific analytics dashboards
- Coordinator dashboards for testing history
- AI-powered live sentiment analysis
- Real-time QA and live polls

## Audit Fields

- created_at: Timestamp
- updated_at: Timestamp
- last_launched_by: User ID (typically the Coordinator)


