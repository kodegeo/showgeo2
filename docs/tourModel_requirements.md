# Tour Model Requirements

## Overview

A **Tour** is a collection of related Events organized under a unified theme, brand, or campaign. It is created by one primary `Entity` (individual creator or organization) and may involve **multiple other Entities** as collaborators or co-hosts. Tours are typically used for live or prerecorded content series like concert tours, speaker circuits, or brand campaigns.

---

## Entity Relationships

- An `Entity` can create one or more Tours.
- A Tour contains multiple `Events`.
- Events in a Tour can share branding, resources, or coordinators.
- A Tour can be **collaborative**, involving multiple Entities.
- Each Tour may have one or more assigned `Event Coordinators`.

---

## Core Properties

| Property           | Type        | Description                                              |
|--------------------|-------------|----------------------------------------------------------|
| `id`               | UUID        | Unique tour identifier                                   |
| `primary_entity_id`| UUID        | The Entity that created the tour                         |
| `name`             | string      | Name of the tour                                         |
| `slug`             | string      | URL-friendly identifier                                  |
| `description`      | text        | Description of the tour                                  |
| `thumbnail`        | string/url  | Cover image for the tour                                 |
| `banner_image`     | string/url  | Optional promotional banner                              |
| `start_date`       | date        | Tour start date                                          |
| `end_date`         | date        | Optional end date                                        |
| `status`           | enum        | `'draft' | 'upcoming' | 'active' | 'completed'`         |
| `tags`             | string[]    | Keywords for discoverability                             |
| `created_at`       | timestamp   | Auto-managed timestamp                                   |
| `updated_at`       | timestamp   | Auto-managed timestamp                                   |

---

## Geographic Streaming Restrictions

| Property                   | Type        | Description                                                   |
|----------------------------|-------------|---------------------------------------------------------------|
| `geo_restricted`           | boolean     | Whether access to streaming events in this tour is limited    |
| `streaming_access_level`   | enum        | `'local' | 'regional' | 'national' | 'international'`         |
| `geo_regions`              | string[]    | Specific regions (e.g., ['Los Angeles', 'California', 'US'])  |

- If `geo_restricted` is `true`, events within the tour will inherit or be constrained by these settings unless overridden at the event level.
- This allows for geo-targeted virtual experiences across the tour.

---


## Relationships

| Association         | Description                                                           |
|---------------------|-----------------------------------------------------------------------|
| `events`            | List of events that belong to the tour                                |
| `primary_entity_id` | The Entity that owns and created the tour                             |
| `collaborating_entities` | List of additional Entities participating in the tour            |
| `event_coordinators`| Coordinators assigned across the tour or per event                    |
| `store_id`          | Optional store linked with the tour’s merchandise                     |

---

## Functional Features

### Tour Creation

- Only one `Entity` is marked as the **Primary Creator**.
- Additional Entities can be added as `collaborators`.
- Collaborators may have role-based permissions (e.g., event admin, promotion, store management).

## Branding & Theming

- Tour-level branding is used across events unless individually customized.
- Branding includes: `thumbnail`, `banner_image`, color palette (future).
- Tour tags and hashtags unify the campaign across social platforms.

---

## Scheduling & Visibility

- Events can be revealed all at once or sequentially.
- Tour may have a landing page with details, calendar view, and featured Entity.
- Ability to "soft launch" the tour (internal preview) before publishing.

### Events

- Events inherit default visuals and theme from the Tour (optional override).
- Events can be scheduled under the same tour or split across timezones, venues, or formats.

## Analytics (future)

- Aggregate view of:
  - Total attendees across all events
  - Revenue per location or streaming region
  - Engagement by geography
- Drill-down into per-event and per-entity stats


## Merchandising

If a `Store` is linked:

- Tour-specific merchandise is promoted across event pages.
- Dynamic inventory control by event/region (future enhancement).


### Notifications & Discovery

- Followers of any linked Entity can be notified of tour activity.
- Tour pages include social sharing, event schedules, and ticketing links.

---

## Lifecycle Status

| Status     | Description                                                     |
|------------|-----------------------------------------------------------------|
| `draft`    | Tour is being configured privately                              |
| `upcoming` | Tour is public but has not started yet                          |
| `active`   | One or more events are currently live                           |
| `completed`| All events in the tour are completed                            |

---

## Permissions

| Role                 | Capabilities                                                             |
|----------------------|--------------------------------------------------------------------------|
| Primary Entity       | Full control: manage tour, events, branding, merch, collaborators        |
| Collaborating Entity | Assigned privileges by Primary Entity (view, co-host, manage events)     |
| Coordinator          | Manages logistics, testing, and execution phases across tour events      |

---

## Future Enhancements

- Smart scheduling (auto-date suggestions based on availability)
- Audience region targeting for tour planning
- Revenue & performance analytics across all tour events
- User voting for cities/venues

