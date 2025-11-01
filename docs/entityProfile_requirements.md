# Entity Profile Model Requirements

## Overview

An **Entity** represents a user or organization that can create and manage events, tours, stores, and collaborations. Entity can be individuals (e.g., Entity, speakers) or organizations (e.g., political groups, companies). They have a customizable profile for branding, visibility, and community engagement.

---

## Core Relationships

- An `Entity` is linked to one or more `User` accounts (via roles like owner, admin, coordinator).
- An `Entity` can:
  - Create and manage `Events`, `Tours`, and a `Store`.
  - Collaborate on events/tours created by other Entity.
  - Be followed by users.
- Entity can also act as their own `Event Coordinator` for self-managed, pre-recorded events.

---

## Core Properties

| Property           | Type        | Description                                                  |
|--------------------|-------------|--------------------------------------------------------------|
| `id`               | UUID        | Unique identifier                                            |
| `owner_id`         | UUID        | Primary user account that created the entity                 |
| `type`             | enum        | `'individual' | 'organization'`                              |
| `name`             | string      | Display name of the entity                                   |
| `slug`             | string      | URL-safe identifier                                          |
| `bio`              | text        | About section or mission                                     |
| `tags`             | string[]    | Keywords or categories for discovery                         |
| `thumbnail`        | string/url  | Profile image or logo                                        |
| `banner_image`     | string/url  | Optional banner or hero image                                |
| `location`         | string      | Primary geographic base (e.g., "Los Angeles, CA")            |
| `website`          | url         | Official website                                             |
| `social_links`     | object      | `{ twitter, instagram, facebook, youtube, tiktok }`         |
| `created_at`       | timestamp   | Auto-managed timestamp                                       |
| `updated_at`       | timestamp   | Auto-managed timestamp                                       |

---

## Optional Properties

| Property              | Type         | Description                                                  |
|-----------------------|--------------|--------------------------------------------------------------|
| `is_verified`         | boolean      | Whether the Entity has been verified by the platform         |
| `is_public`           | boolean      | Whether the profile is visible to the public                 |
| `default_coordinator_id` | UUID     | Optional default Event Coordinator for all new events        |
| `tour_ids`            | UUID[]       | List of tours created by this entity                         |
| `store_id`            | UUID         | Associated merchandise store                                 |
| `collaborations`      | UUID[]       | Tours/Events this entity is collaborating on (not owner of)  |

---

## Features

### Profile Customization

- Editable bio, branding, and images
- Control visibility settings (public/private)
- Verified badge for official Entity/orgs

### Role-Based Access

- Owner: Full control of the entity
- Admins: Manage events, profile, and followers
- Coordinators: Handle logistics, event setup, and operations

### Follower Mechanism

- Users can follow an Entity
- Followers receive notifications for:
  - New events or tours
  - Merch drops
  - Exclusive updates or messages

### Collaborations

- An Entity can be invited to participate in another entity's tour/event/store
- Accept/decline system with limited/shared permissions

---

## Permissions Table

| Role         | Permissions                                                                 |
|--------------|------------------------------------------------------------------------------|
| Owner        | Full control over entity profile, events, tours, store                      |
| Admin        | Can manage profile, create events, assign coordinators                      |
| Coordinator  | Can manage events and tasks (no profile or settings access)                 |
| Follower     | Receives updates and notifications; no edit permissions                     |

---

## Discoverability & Search

- An Entity is searchable by:
  - Name
  - Tags
  - Location
  - Type (individual vs. organization)
- Follower count and activity contribute to ranking

---

## Notifications

- Send updates to followers:
  - When a new event or tour is added
  - When merch becomes available
  - Event status changes or cancellations
- Follower opt-in for different types of notifications

---

## Future Enhancements

- Custom URL domains (e.g., entityname.showgeo.com)
- Integrated analytics (profile views, engagement rates)
- Donations and subscriptions
- Entity-led streaming channel with archives and replays
