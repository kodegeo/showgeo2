# User Model Requirements

## Overview

This document outlines the structure and relationships required for the updated `User` model and its associated roles. The system supports various user roles and introduces a new abstraction: **Entity**. Entity can be individuals or organizations that create and collaborate on events, stores, and tours.

---

## Core Concepts

### 1. Roles

The following roles should be in this application:

- User: Can browse, chat, purchase, follow, and attend events
- Entity: Owns an Entity profile and manages its content, store, and events
- Manager: Manages an Entity on behalf of the Owner.
- Coordinator: Launches events, tests feeds and manages performance. They are required for live-stream events.
- Admin: Full system access, including moderation and management

### 2. User

A **User** is any person who uses the platform. All Entity is a Users, but a User is not necessarily an Entity.

- A User can:
  - Register as an Attendee
  - Be associated with one or more Entity (as a Manager, Coordinator, or Entity Owner)
  - Be assigned permissions by the Entity
  - Follow Entity to receive updates
  - Act in multiple roles (e.g., an Admin can also be an Attendee)
  - Chat with other users
  - Provide status updates.
  - Create discussion room or pages.
  - Search for upcoming LIVEs.
  - Share notifications and or merchandise.
  - Purchase tickets for a LIVE.

### 3. Entity

An **Entity** is a creator account in the system. An Entity can be an individual (e.g., speakers, musicians) or organization (e.g., nonprofits, agencies).

- An Entity can:
  - Create one or more **Events**
  - Create ticketing for attendees of an event.
  - Create gift baskets for attendees.  
  - Create VIP tickets and packages for attendees.  
  - Group Events into a **Tour**
  - Own or collaborate on a **Store**
  - Collaborate with another Entity on an Event or Store
  - Assign an **Event Coordinator** or act as their own if the event is pre-recorded
  - Host **pre-recorded** or **live stream** events
  - Be **followed by Users** for updates (see Notifications section)
  - Chat with another Entity.
  - Follow/unfollow other Entity
  - Provide status updates.
  - Send notifications to users who are following the Entity.
  - Create discussion room or pages.
  - Search for another Entity's upcoming LIVEs.
  - Share notifications and or merchandise.


### 4. Manager

A **Manager** can manage one or more Entity. Their function includes correspondence with users on the entity's behalf, creating discussion rooms, and sharing details about events, products, etc.  

- A Manager can:

  - Perform Entity functions on the Entity's behalf

### 5. Coordinator

A **Coodinator** manages the launch of an event for an Entity. 

- A Coordinator can:

  - Perform testing before an event 
  - Monitor the performance of a stream for an Entity
  - See what the users see during an event

### 6. Admin

A **Admin** is a superuser that can perform all roles. 

- A Admin can:

  - Can function in any role

---

## New Feature: Follow System

Users can **follow Entity**. This creates a one-way relationship where:

- The follower (User) is notified when:
  - A new **Event** or **Tour** is created
  - The Entity sends out a **message or broadcast**
- This data should be stored in a new `follows` table or join structure, with optional notification preferences

### Relationships
- A `User` can own multiple `Entities`.
- A `User` can have multiple `EntityRole` relationships (OWNER, MANAGER, COORDINATOR).
- A `User` can act in a specific `Context` (personal or entity) for API requests and frontend actions.

### Fields
| Field | Type | Description |
|--------|------|-------------|
| `activeContext` | JSON / Nullable | Stores the current acting mode (user or entity). Used for frontend context switching. |


**Schema Suggestion:**
```json
Follow {
  followerId: UserID,
  followedEntityId: EntityID,
  notifyOnEvent: boolean,
  notifyOnTour: boolean,
  notifyOnMessage: boolean
}
