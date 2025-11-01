## Follow Model Requirements

## Overview
The Follow model captures the relationship between a User and an Entity. A user follows an entity to receive updates related to their events, tours, store releases, or direct messages.

This model supports engagement features like notifications and personalized feeds.

## Table: follows

| Column Name		| Type		| Constraints			| Description
| id				| UUID		| Primary Key			| Unique follow record ID
| user_id			| UUID		| Foreign Key, not null	| The user who is following
| entity_id			| UUID		| Foreign Key, not null	| The entity being followed
| created_at		| datetime	| Default: now()		| Timestamp of when the follow occurred
| updated_at		| datetime	| Auto-managed			| Timestamp of last update

## Relationships

- belongs_to :user
- belongs_to :entity

## Constraints & Validations

- A user_id may only follow a specific entity_id once
- Add a unique index on [user_id, entity_id]
- Validate presence of both user_id and entity_id

## Use Cases

- Users receive notifications for:
- New Events or Tours by followed Entities
- Product drops in associated Stores
- Live announcements and messages
- A User's dashboard or feed shows content from followed Entities
- Used in recommendation logic (e.g., “People you follow also follow…”)

## Permissions

| Role			| Capabilities
| User			| Can follow or unfollow any public Entity
| Entity Admin	| Cannot alter follow relationships
| Platform		| Can access analytics and user engagement

## Future Enhancements

- Follow categories or topics (e.g., “Hip-Hop”, “Comedy”)
- Ability to follow Tours or Events directly
- User-to-user follows for networking or chat purposes
- Notification preferences per Entity