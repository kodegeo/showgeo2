# Geofencing Model

## Overview

Geofencing defines **where** a digital experience (e.g., livestream, store, event) is accessible. It allows entities to create **custom access rules** based on city, state, country, timezone, or global region.

This is a **reusable model** used by Events, Tours, and Stores.

---

## Use Cases

- Allow only U.S. residents to attend a live concert
- Make merchandise available only in EST and PST timezones
- Block access from a specific country or city
- Grant international access to virtual events, excluding U.S. viewers
- Combine timezone + country for hybrid restrictions

---

## Core Properties

| Property           | Type       | Description                                                  |
|--------------------|------------|--------------------------------------------------------------|
| `id`               | UUID       | Unique identifier                                            |
| `target_type`      | string     | `"event"` \| `"tour"` \| `"store"` (polymorphic use case)    |
| `target_id`        | UUID       | Associated entity ID                                         |
| `type`             | enum       | `'allowlist'` \| `'blocklist'`                               |
| `regions`          | string[]   | List of geofencing rules. See [Region Format](#region-format) |
| `description`      | string     | Optional admin note                                          |
| `created_at`       | timestamp  | Auto-managed timestamp                                       |
| `updated_at`       | timestamp  | Auto-managed timestamp                                       |

---

## Region Format

Each `region` string should follow the format:


### Supported Region Types

| Type         | Example Value          | Description                              |
|--------------|------------------------|------------------------------------------|
| `city`       | `city:Los Angeles`     | Specific city                            |
| `state`      | `state:California`     | U.S. state                               |
| `country`    | `country:US`           | 2-letter ISO code                        |
| `timezone`   | `timezone:EST`         | U.S. timezones (e.g., EST, PST, CST)     |
| `continent`  | `continent:North America` | Optional, high-level grouping          |
| `region`     | `region:international` | Special flag for "non-US" audiences      |
| `global`     | `global`               | Wildcard to override all restrictions    |

### Notes

- `region:international` = all countries **except** `country:US`
- Multiple region entries can be **combined** for precision targeting
- Cursor should enforce uniqueness for region entries

---

## Examples

### 1. U.S. Only + EST Timezone

```json
{
  "type": "allowlist",
  "regions": ["country:US", "timezone:EST"]
}

## Block Example New York Only

{
  "type": "blocklist",
  "regions": ["city:New York"]
}

## International Only

{
  "type": "allowlist",
  "regions": ["region:international"]
}

# Example California + International

{
  "type": "allowlist",
  "regions": ["state:California", "region:international"]
}

## Access Logic

- IF type == 'allowlist': Allow ONLY if user's location matches one or more regions
- IF type == 'blocklist': Deny if user's location matches one or more regions
- DEFAULT (no rules): Full access

## Associations

| Model		| Notes
| Event		| Restrict livestream availability
| Tour		| Restrict visibility of tour stops
| Store		| Limit merchandise availability by region

# Permissions

| Role			| Capabilities
| Entity Owner	| Full access to define region rules
| Manager		| Edit rules if delegated
| Coordinator	| Read-only access (default)

## Future Features

- Radius-based rules (e.g., "within 50 miles of LA")
- Real-time IP-to-location edge validation
- Audience analytics by region
- Region-level content previews
- Admin (Platform)	Full override and region control
