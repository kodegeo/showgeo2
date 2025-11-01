## UserProfile Model Requirements

## Overview
The UserProfile model stores public-facing, editable information for a User. This includes bio, avatar, and social links. It is distinct from the User model, which handles authentication and roles. This model enables personalization, discoverability, and social interaction across the platform.

---

## Associations

- UserProfile belongs_to User
- User has_one UserProfile

## Table: user_profiles

| Column Name	| Type		| Constraints					| Description
| id  			| UUID		| Primary Key					| Unique profile ID
| user_id 		| UUID		| Foreign Key, indexed, not null| References users.id
| username 		| string	| Unique, optional	Public-facing | username or handle
| first_name	| string	| Optional						| User’s first name
| last_name 	| string	| Optional						| User’s last name
| avatar_url	| string	| Optional						| Profile picture URL
| bio 			| text		| Optional						| Short description or biography
| location 		| string	| Optional						| City, state, or region
| timezone 		| string	| Optional						| IANA timezone identifier (e.g., America/Los_Angeles)
| website 		| string	| Optional						| Personal or business website
| social_links 	| JSONB		| Optional						| Twitter, IG, YouTube, etc. as JSON
| preferences	| JSONB		| Optional						| Notification or UI settings
| visibility	| string	| Default: 'public'				| 'public'
| created_at 	| datetime 	| Default: now()				| Timestamp
| updated_at 	| datetime 	| Auto-updated					| Timestamp

## Example social_links
```json
{
  "twitter": "@showgeo",
  "instagram": "https://instagram.com/showgeo",
  "youtube": "https://youtube.com/@showgeo"
}```

## Permissions
| Role	| Capabilities
| User	| Create and edit their own profile
| Admin	| View and moderate any profile
| Public| View profiles marked as public

## Notes
- UserProfile must be created when a User signs up or logs in for the first time.
- Profile visibility (visibility) will support future privacy settings.
- avatar_url is expected to be a cloud-hosted image or media URL.

## Future extensions may include:

- Profile badges
- Profile history
- Engagement stats (likes, follows, etc.)