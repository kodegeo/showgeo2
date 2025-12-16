# Creator Dashboard Structure

## Overview
The Creator Dashboard provides a centralized interface for creators to manage their profile, events, store, media, analytics, and community engagement. It builds on the core profile layout but introduces creator-specific functionality and a modular layout optimized for content and performance management.

---

## Page Hierarchy
| Path | Description |
|------|--------------|
| `/creator/dashboard` | Primary Creator landing page |
| `/creator/events` | Manage, create, and schedule events |
| `/creator/store` | Manage merchandise and digital store items |
| `/creator/analytics` | View audience engagement and earnings |
| `/creator/settings` | Adjust profile, page, and fan management settings |

---

## Layout Overview

### Left Sidebar

Layouts
Mailbox
Transactions
Orders
Stores
Posts
Rooms
Live Now
────────────
Find Artists
Find Events
Find Rooms
Podcasts
Artists (Following)
Friends (Following)
Creators (Following)
────────────
Profile Settings
Page Settings
User Management
Fan Management


**Behavior**
- Collapsible on mobile; fixed on desktop.
- Icons from `/assets/icons` displayed next to each label.
- Active route highlighted.
- “Live Now” triggers a modal to immediately start streaming.

---

### Profile Banner + Quick Actions

**Profile Banner**
- Displays creator’s avatar, banner, and follower statistics.
- Overlay bottom row:
  - Left: “Followers” count  
  - Right: “Following” count  
- Action buttons: `Edit Page`, `Go Live`, `Share Page`

**Quick Actions Bar**
- Positioned under the profile banner.
- Buttons include:
  - `Create Event`
  - `Manage Store`
  - `View Analytics`
  - `Start Stream`
  - `Manage Posts`
- Icon-based with hover tooltips.
- Responsive and collapsible on smaller viewports.

---

## Main Area

Sections scroll horizontally (carousel style) and include a **Free/Paid** filter and **Time Range** dropdown.

| Section | Description |
|----------|--------------|
| My Events | Shows all created events with metrics and actions. |
| My Store | Displays products or tickets for sale. |
| Analytics Overview | Provides summary charts and stats. |
| My Rooms | Lists active and upcoming rooms or streams. |
| Upcoming Events | Highlights future scheduled events. |
| Podcasts | Lists uploaded or scheduled podcast sessions. |

**Filter Controls**
- Toggle for **Free / Paid**
- Dropdown for **This Week / This Month / This Quarter / This Year**

---

## Component Map

| Component | Purpose | Status |
|------------|----------|--------|
| `CreatorDashboardLayout.tsx` | Combines sidebar, header, main content, and footer | ✅ Implemented |
| `CreatorSidebar.tsx` | Renders sidebar navigation with collapsible sections | ✅ Implemented |
| `CreatorQuickActions.tsx` | Provides top-level buttons for creator tasks | ✅ Implemented |
| `CreatorProfileBanner.tsx` | Displays avatar, banner, and follower info | ✅ Implemented |
| `CreatorRoute.tsx` | Route guard for creator pages with entity context | ✅ Implemented |
| `CreatorOverview.tsx` | Displays core dashboard panels | ✅ Implemented (in CreatorDashboardPage) |
| `CreatorEventManager.tsx` | Handles event CRUD operations | ✅ Implemented (in CreatorEventsPage) |
| `CreatorStoreManager.tsx` | Manages product listings and sales analytics | ✅ Implemented (in CreatorStorePage) |
| `CreatorAnalyticsPanel.tsx` | Displays traffic, engagement, and financial stats | ✅ Implemented (in CreatorAnalyticsPage) |
| `CreatorMediaUpload.tsx` | Handles image and video uploads | ⏳ Planned (use AssetUpload component) |

---

## Visual & UX Standards
- **Brand Colors**
  - Primary Red: `#CD000E`
  - Gold: `#F49600`
  - Blue: `#1FB5FC`
  - Background: `#0B0B0B`
- **Typography**
  - Headings: Montserrat (Uppercase, Bold)
  - Body: Poppins (Regular)
- **Layouts**
  - Support **Light**, **Dark**, and **Standard** themes.
  - White or gold text accents on dark backgrounds.
  - Smooth transitions, shadows, and hover feedback.

---

## Data and API Integration

| Feature | API Endpoint | Notes |
|----------|---------------|-------|
| Events | `/api/events` | CRUD for creator events |
| Store | `/api/store` | Manage products and orders |
| Analytics | `/api/analytics` | Fetch engagement and sales data |
| Media | `/api/assets/upload` | Upload and manage thumbnails/media |
| Profile | `/api/profile` | Retrieve and update creator info |
| Streaming | `/api/stream/start` | Initiate live sessions |

---

## Access Control
- ✅ Requires authentication (redirects to `/login` if not authenticated)
- ✅ Requires entity context (user must have at least one entity)
- ✅ Redirects to `/profile/setup` if no entities exist
- ✅ Entity context must be active (auto-selected or user-selected via entity switcher)
- ⏳ Role-based restrictions (ENTITY role) - can be added if needed
- ⏳ Verification requirements for specific features - planned

---

## Future Extensions
- Collaboration features for multiple creators.
- Advanced Analytics (hourly engagement, revenue breakdown).
- Fan subscription tiers.
- Creator-to-creator messaging.

---
