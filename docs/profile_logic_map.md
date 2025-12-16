# Showgeo User Profile Logic Map

## 1. Overview
This document defines the **state management**, **interactivity**, and **data flow logic** for the Showgeo User Profile system.

It complements:
- `profile_layout_map.md` (spatial structure)
- `profile_component_structure.md` (component hierarchy)
- `profile_visual_standards.md` (branding consistency)

All logic assumes a **Supabase-backed data model**, with React Query or SWR hooks for real-time data syncing.

---

## 2. High-Level Logic Flow

User → Auth State → Profile Data → UI Rendering
↓
Events / Artists / Streams
↓
Filters & Interactions


| Layer | Description | Connected Components |
|--------|--------------|----------------------|
| **Auth Layer** | Handles user sign-in, token validation, and Supabase session | `AuthProvider`, `ProfileLayout` |
| **Data Fetching Layer** | Pulls profile, event, and artist data from Supabase tables | `useProfileData`, `useEvents`, `useArtists` |
| **State Layer** | Stores UI state (filters, theme, follow status) | `useProfileState`, `useTheme` |
| **UI Layer** | Displays banners, sections, and carousels | `ProfileBanner`, `ProfileSection`, `ProfileCard` |

---

## 3. State Management Overview

| Hook | Scope | Description |
|------|--------|-------------|
| `useProfileData()` | Global | Loads and caches the user profile (name, bio, banner, followers, following, theme preference). |
| `useEvents(filter, range)` | Section | Fetches user events based on Paid/Free filter and time range (week/month/quarter/year). |
| `useArtists(userId)` | Section | Lists followed artists and recommended artists. |
| `useFollowActions()` | Local | Handles “Follow” and “Unfollow” actions. |
| `useTheme()` | Global | Manages dark/light/standard themes. |
| `useProfileCompletion()` | Derived | Calculates % completion for profile setup. |

---

## 4. Data Flow per Interaction

### 🔹 A. Loading User Profile
**Trigger:** User logs in or visits `/profile`.  
**Flow:**
1. `AuthProvider` retrieves Supabase session.
2. `useProfileData()` fetches from `profiles` table:
   - firstName, lastName, username, email
   - avatar_url, banner_url
   - bio, followers, following, theme_preference
3. If no avatar/banner, defaults from `/assets/defaults/`.
4. Data populates `ProfileBanner`, `ProfileStats`, and sidebar info.

**Supabase Table:** `profiles`

| Field | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| user_id | uuid | FK → auth.users |
| username | text | Unique |
| avatar_url | text | Optional |
| banner_url | text | Optional |
| bio | text | 280 char limit |
| followers | integer | Default 0 |
| following | integer | Default 0 |
| theme_preference | text | (“dark”, “light”, “standard”) |

---

### 🔹 B. Follow / Unfollow Behavior
**Components:** `ProfileBanner`, `ProfileCard`  
**Flow:**
1. User clicks **Follow** → `useFollowActions().follow(targetId)`
2. Writes entry to `follows` table:

follower_id → following_id

3. Updates counters in both users’ profiles (atomic Supabase RPC).
4. Optimistic UI updates before network confirmation.

**Supabase Table:** `follows`
| Field | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| follower_id | uuid | FK → profiles.id |
| following_id | uuid | FK → profiles.id |
| created_at | timestamptz | default now() |

---

### 🔹 C. Events & Content Loading
**Components:** `ProfileSection`, `ProfileCard`, `ProfileFilters`  
**Flow:**
1. `useEvents(filter, range)` queries Supabase `events` table.
2. Filters:
- `price_type = 'free'` or `'paid'`
- `date_range` within selected timeframe
3. Populates horizontal carousels.
4. Uses infinite scroll to lazy-load more results.

**Supabase Table:** `events`
| Field | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| title | text | Event title |
| artist_id | uuid | FK → artists.id |
| start_date | date | — |
| end_date | date | — |
| price_type | text | (“paid”, “free”) |
| thumbnail_url | text | — |
| location | text | — |
| category | text | (“music”, “podcast”, etc.) |

---

### 🔹 D. Filters and Sorting
**Components:** `ProfileFilters`, `ProfileSection`  
**Logic:**
```tsx
const [filter, setFilter] = useState<"paid" | "free">("paid");
const [range, setRange] = useState<"week" | "month" | "quarter" | "year">("month");

const events = useEvents({ filter, range });
