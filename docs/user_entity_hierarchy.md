# User–Entity Hierarchy & Context Architecture (Showgeo 2.0)

## Overview
Showgeo supports a flexible user model where every participant begins as a **User** and can optionally **convert to an Entity**. 
Entities represent public-facing identities (artists, brands, labels, or event organizers) and own public content, followers, and monetized features.

This document defines:
- The lifecycle and rules of user → entity conversion
- The relationship model between Users, Entities, and Roles
- Context switching between personal and entity modes
- Integration with Auth, Payments, and other modules

---

## 1. Core Concepts

| Concept | Description | Example |
|----------|--------------|----------|
| **User** | A registered account (email, password, profile). | A fan or creator using their real name. |
| **Entity** | A public-facing identity owned or managed by users. | “DJ Nova”, “Coachella”, “Showgeo Events”. |
| **EntityRole** | The relationship between users and entities (OWNER, MANAGER, COORDINATOR). | DJ Nova’s assistant has MANAGER access. |
| **Context** | The active mode (acting as a User or Entity). | Switching from personal mode to “DJ Nova”. |

---

## 2. Conversion Flow (User → Entity)

1. Every registered account starts as a **User**.
2. A User can **create or convert** into an Entity via `/entities/convert`.
3. Conversion creates a new `Entity` record and assigns the user as `OWNER` in `EntityRole`.
4. The user remains associated with their original account — no new login required.
5. The user cannot “revert” to user-only mode (to prevent relational orphaning).
6. Multiple entities can be owned or managed by a single user.

### Example Conversion Request
```json
POST /entities/convert
{
  "name": "DJ Nova",
  "slug": "dj-nova",
  "type": "INDIVIDUAL",
  "bio": "Electronic artist and producer."
}
```

### Example Response
```json
{
  "entityId": "a92d...",
  "ownerId": "u38e...",
  "role": "OWNER",
  "status": "converted"
}
```

---

## 3. Context Switching (User ↔ Entity)

Users can toggle between **User mode** and **Entity mode** on the frontend.  
This determines which identity is active when performing actions (posting, streaming, managing stores, etc.).

### Frontend Implementation
- Store active context in local/session state:
  ```json
  {
    "activeContext": {
      "mode": "entity",
      "entityId": "a92d...",
      "entityName": "DJ Nova"
    }
  }
  ```
- Include `X-Context-Entity` header in API requests when acting as an entity.
- UI indicator (top bar toggle) showing current context:  
  “Acting as **DJ Nova**” → Switch to personal mode.

### Backend Handling
Middleware reads context header or JWT claim:
```ts
req.context = {
  entityId: headers["x-context-entity"] || null,
  actingAsEntity: Boolean(headers["x-context-entity"])
}
```

Actions like `POST /events` or `POST /stores` automatically assign ownership based on active context.

---

## 4. Role Hierarchy & Permissions

| Role | Description | Permissions |
|------|--------------|-------------|
| **OWNER** | Primary creator of the entity. | Full control over all operations, including deletion. |
| **ADMIN** | Manager with delegated rights. | Manage users, content, and monetization. |
| **MANAGER** | Operational manager. | Manage events, products, followers. |
| **COORDINATOR** | Event/staff-level collaborator. | Manage assigned events or streams. |
| **VIEWER** | Read-only access (future use). | No modification rights. |

---

## 5. Integration with Modules

### AuthModule
- JWT tokens include user ID and optional active entity ID.
- `@CurrentUser()` decorator exposes both contexts.

### EntitiesModule
- Adds `POST /entities/convert` endpoint.
- Auto-assigns user as `OWNER`.
- Handles slug uniqueness and permission validation.

### PaymentsModule
- Payments flow through the **Entity** context (Stripe connected account).
- Users buy as individuals; entities sell and receive payouts.

### StreamingModule
- Streaming sessions are owned by **Entities**, not users.
- Coordinators can manage live sessions under assigned entities.

### NotificationsModule
- Notifications are context-aware (User or Entity ID in metadata).

---

## 6. Lifecycle Rules

| Action | Allowed | Notes |
|---------|----------|--------|
| Create entity | ✅ | User becomes OWNER |
| Convert back to user-only | ❌ | Prevents data orphaning |
| Own multiple entities | ✅ | Each with unique slug |
| Delete entity | ✅ (Owner/Admin) | Soft-delete preferred |
| Transfer ownership | ✅ | Via collaborator management |
| Switch context | ✅ | From profile dropdown in frontend |

---

## 7. Frontend Design Guidelines

| Feature | Description |
|----------|-------------|
| **Context Toggle** | Top-right dropdown toggle between personal and entity modes. |
| **Profile Management** | In User mode → edit personal profile; in Entity mode → edit public profile. |
| **Dashboard Separation** | Separate dashboard views for users and entities. |
| **Permissions UI** | Managers see limited actions (e.g., no delete). |

---

## 8. Future Enhancements

- **Entity Verification Flow** – Apply for verified status (blue check).  
- **Entity Teams** – Invite collaborators with roles.  
- **Context-Based Analytics** – View analytics for current mode (User or Entity).  
- **Multi-Tenant Auth** – OAuth scope per context for 3rd-party integrations.  

---

## Summary

✅ **Users start as Users.**  
✅ **They can convert to Entities and own multiple identities.**  
✅ **They act under active context (User or Entity).**  
✅ **Entities manage events, stores, streaming, and payments.**  
✅ **Frontend supports context switching for dashboard and posting.**

This hierarchy ensures scalability, consistency, and creator-first design — enabling Showgeo to support both fans and artists seamlessly.
