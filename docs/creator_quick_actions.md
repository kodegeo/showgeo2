# Creator Quick Actions Specification

## Purpose
The Creator Quick Actions bar provides instant access to the most common tasks creators perform — creating events, managing their store, viewing analytics, starting live streams, and managing posts or media.  
It appears immediately below the Creator Profile Banner and above the Main Area content.

---

## Component
**Component Name:** `CreatorQuickActions.tsx`  
**Location:** `src/components/creator/`  

---

## Layout
- Horizontal button bar (flex layout).
- Responsive (wraps to multiple lines on smaller screens).
- Buttons display both icon and label.
- Active hover state uses brand color highlights.

**Style Reference:**
- Background: `#0B0B0B`
- Border: subtle top and bottom border in `#1A1A1A`
- Icons: lucide-react (white, 20px)
- Hover: Primary Red `#CD000E`
- Text: Poppins, 14px, white
- Padding: `py-3 px-4`
- Rounded corners for button containers.

---

## Actions Overview

| Action | Icon | Description | Type | Behavior |
|--------|------|--------------|-------|-----------|
| Create Event | `calendar-plus` | Opens modal to create a new event | Modal | Launches `<CreateEventModal />` |
| Manage Store | `store` | Navigates to creator’s store management page | Link | Routes to `/creator/store` |
| View Analytics | `bar-chart-3` | Opens the analytics overview page | Link | Routes to `/creator/analytics` |
| Start Stream | `video` | Triggers “Go Live” modal to start streaming | Modal | Launches `<StartStreamModal />` |
| Manage Posts | `file-text` | Navigates to post management | Link | Routes to `/creator/posts` |
| Upload Media | `upload-cloud` | Opens modal for media upload | Modal | Launches `<UploadMediaModal />` |
| Edit Profile | `user-cog` | Navigates to profile setup page | Link | Routes to `/profile/setup` |

---

## Behavior Details

### 1. **Create Event**
- Opens a modal with the following fields:
  - `Event Name`
  - `Date & Time`
  - `Category`
  - `Public / Private` toggle
  - `Thumbnail Upload`
- Submit triggers: `POST /api/events`
- Success message: “Event created successfully.”

### 2. **Manage Store**
- Directs to `/creator/store`
- Displays product list and “Add New Product” button.
- Uses: `GET /api/store`

### 3. **View Analytics**
- Directs to `/creator/analytics`
- Displays graphs, top-performing content, and revenue overview.

### 4. **Start Stream**
- Opens a streaming modal.
- Modal includes:
  - Stream Title
  - Visibility toggle (Public/Private)
  - Category selector
  - “Go Live” button → `POST /api/stream/start`

### 5. **Manage Posts**
- Navigates to `/creator/posts`
- Lists all creator posts.
- Includes “Create Post” button with modal launch.

### 6. **Upload Media**
- Opens media upload modal.
- Uses `/api/assets/upload`
- File types: images, videos, audio.
- Automatically tags uploaded assets with the creator’s ID.

### 7. **Edit Profile**
- Routes to `/profile/setup`
- Prefills creator info for editing.

---

## State and Permissions
- Visible only to `role = CREATOR`
- “Start Stream” and “Manage Store” disabled for unverified creators
- Tooltips:
  - “Available after verification” for locked features
- Context-aware (can update in real-time if verification changes)

---

## Accessibility
- All buttons have `aria-label` attributes.
- Keyboard navigation enabled (Tab + Enter).
- Focus state uses gold outline (`#F49600`).

---

## Integration Notes
- Uses `useCreatorContext()` to access role and verification state.
- Modals registered in `CreatorDashboardLayout.tsx`.
- On success (e.g., event created), trigger Toast notifications via `useToast()`.

---

## Example Layout Structure

```tsx
<div className="flex flex-wrap justify-start gap-4 bg-[#0B0B0B] border-y border-[#1A1A1A] py-3 px-6">
  <QuickActionButton icon={CalendarPlus} label="Create Event" onClick={openEventModal} />
  <QuickActionButton icon={Store} label="Manage Store" href="/creator/store" />
  <QuickActionButton icon={BarChart3} label="View Analytics" href="/creator/analytics" />
  <QuickActionButton icon={Video} label="Start Stream" onClick={openStreamModal} />
  <QuickActionButton icon={FileText} label="Manage Posts" href="/creator/posts" />
  <QuickActionButton icon={UploadCloud} label="Upload Media" onClick={openUploadModal} />
  <QuickActionButton icon={UserCog} label="Edit Profile" href="/profile/setup" />
</div>
