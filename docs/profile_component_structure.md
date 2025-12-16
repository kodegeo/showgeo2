# Showgeo User Profile Component Structure

## 1. Overview
This document defines the **component hierarchy** and **structural layout** for the Showgeo User Profile (a.k.a. User Dashboard).  
It complements `profile_visual_standards.md` and `branding_reference.md` to ensure consistent UI and functional alignment across the frontend.

---

## 2. Layout Overview
The profile page should use a **layout-based architecture**, ensuring that common elements like navigation and headers remain persistent across subpages.

### Main Structure

ProfileLayout
├─ ProfileSidebar
├─ ProfileHeader
└─ ProfileContent
├─ ProfileBanner
├─ ProfileFilters
├─ ProfileSections


### File Locations
| Component | Path | Purpose |
|------------|------|----------|
| `ProfileLayout.tsx` | `/src/layouts/` | Overall page wrapper. Includes sidebar, header, and main content area. |
| `ProfileSidebar.tsx` | `/src/components/profile/` | Persistent left navigation (Layouts, Mailbox, etc.). |
| `ProfileHeader.tsx` | `/src/components/profile/` | Search bar, filters, notifications, and shopping cart. |
| `ProfileBanner.tsx` | `/src/components/profile/` | Displays user banner, avatar, and follower stats. |
| `ProfileFilters.tsx` | `/src/components/profile/` | "Paid / Free" and "Time Range" filters above content. |
| `ProfileSection.tsx` | `/src/components/profile/` | Wrapper for each scrollable media section (My Events, Trending Now, etc.). |
| `ProfileCarousel.tsx` | `/src/components/profile/` | Horizontal scroller for cards inside sections. |
| `ProfileCard.tsx` | `/src/components/profile/` | Reusable content card (event, artist, or show). |
| `ProfileStats.tsx` | `/src/components/profile/` | Small metrics (followers, growth, events). |
| `ProfileActions.tsx` | `/src/components/profile/` | Edit, Follow, or Upload buttons under avatar. |
| `IconButton.tsx` | `/src/components/ui/` | Generic reusable icon button for Sidebar and Header. |

---

## 3. Sidebar Structure

### `ProfileSidebar`
- **Purpose:** Navigation and quick access.
- **Behavior:** Collapsible, theme-aware, responsive.
- **Menu Items:**
  1. Layouts
  2. Mailbox
  3. Find Artists
  4. Find Events
  5. Find Rooms
  6. Live Now
  7. Favorites
  8. Podcasts
  9. Recommendations
  10. (Divider)
  11. Profile Settings
  12. Order History
  13. Artists (Following)
  14. Friends (Following)
  15. Creators (Following)

**Icons:**  
Uses the SVGs in `/assets/icons` (white for dark mode, black for light mode).  
Hover and active states use glow (#CD000E → #F49600).

---

## 4. Profile Banner
Displays the user’s **avatar**, **banner image**, and **follow metrics** overlay.

| Element | Description |
|----------|--------------|
| **Banner** | Background image (default `/assets/defaults/profile-banner.png`) |
| **Avatar** | Center-bottom overlap (default `/assets/defaults/avatar-showgeo.png`) |
| **Overlay Left** | “Follow” button + “Followers: [count]” |
| **Overlay Right** | “Following: [count]” |
| **Gradient** | `linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.9))` |

---

## 5. Main Content Sections
Organized as **horizontal scrolls (carousels)** under filters.

### `ProfileFilters`
- **Paid / Free Toggle**
- **Time Range Dropdown:** “This Week”, “This Month”, “This Quarter”, “This Year”
- Filters apply globally to all sections.

### `ProfileSection`
Each section title uses Montserrat Bold Uppercase with a small gold underline accent.

**Sections (default order):**
1. My Events
2. Trending Now
3. My Artists
4. Streaming Now
5. Upcoming Events

---

## 6. Interaction & Animation
| Interaction | Behavior |
|--------------|-----------|
| Hover on cards | Scale to 1.05 + soft shadow |
| Sidebar hover | Expand with labels |
| Button hover | Gradient glow (Red → Gold) |
| Section scroll | Smooth horizontal scroll (hidden scrollbar) |
| Filter click | Highlight toggle state (active red or gold) |

---

## 7. Responsive Behavior
| Screen | Sidebar | Content Layout |
|---------|----------|----------------|
| Desktop (≥1200px) | Full width | 3–5 carousels visible |
| Tablet (768–1199px) | Collapsible | 2–3 carousels visible |
| Mobile (≤767px) | Icons only | Stacked vertical layout |

---

## 8. Developer Integration Notes
Import layout in `ProfilePage.tsx`:
```tsx
import ProfileLayout from "@/layouts/ProfileLayout";
import ProfileBanner from "@/components/profile/ProfileBanner";
import ProfileSection from "@/components/profile/ProfileSection";

export default function ProfilePage() {
  return (
    <ProfileLayout>
      <ProfileBanner />
      <ProfileSection title="My Events" />
      <ProfileSection title="Trending Now" />
      <ProfileSection title="Upcoming Events" />
    </ProfileLayout>
  );
}
