# Showgeo User Profile Visual Standards

## 1. Overview
The **Showgeo User Profile** (also referred to as the User Dashboard) is a personalized hub where users can manage their identity, explore creators and events, and interact with the platform’s social and streaming features. This design combines personalization, discovery, and community, while maintaining alignment with Showgeo’s brand identity.

---

## 2. Visual Themes (From Branding Sheet)

### Brand Colors
- **Primary Red:** #CD000E  
- **Dark Red (Secondary):** #860005  
- **Gold (Accent):** #F49600  
- **Blue (Alternate Accent):** #1FB5FC  
- **Dark Backgrounds:** #0B0B0B – #141414  
- **Light Text:** #FFFFFF / #F5F5F5  

### Typography
- **Headings:** Montserrat, bold uppercase  
- **Body Text:** Poppins, medium weight  
- **System Fallback:** sans-serif  

### Theme Modes
| Mode | Background | Text | Accent |
|------|-------------|------|--------|
| **Dark (Default)** | #0B0B0B | #FFFFFF | Red / Gold |
| **Standard** | #141414 | #F5F5F5 | Red / Gold |
| **Light** | #FFFFFF | #0B0B0B | Gold / Red |

Theme selection is available in the **Layouts** section of the sidebar.

---

## 3. Layout Structure

### 🧭 Left Sidebar
Primary navigation area containing quick access to profile and media features.

**Items (in order):**
1. Layouts  
2. Mailbox  
3. Find Artists  
4. Find Events  
5. Find Rooms  
6. Live Now  
7. Favorites  
8. Podcasts  
9. Recommendations  
10. *(Divider)*  
11. Profile Settings  
12. Order History  
13. Artists (Following)  
14. Friends (Following)  
15. Creators (Following)

Each item uses lucide-react icons with hover highlight effects — red glow in dark mode, gold in light mode.

---

### 👤 Profile Header & Banner

**Banner Section**
- User’s uploaded banner or the default (`/assets/defaults/profile-banner.png`) appears at the top.
- Centered avatar overlays the lower part of the banner.
- User name and handle appear beneath avatar.

**Follower Overlay Layout**
- **Bottom-Left:**  
  - Follow button (red, glow on hover).  
  - Below: “Followers: [count]”.  
- **Bottom-Right:**  
  - “Following: [count]”.  

**Banner Guidelines**
- Aspect ratio: 16:9 (1920x1080 recommended).  
- Overlay gradient: `linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.9))`.

**Avatar**
- Circular frame (default: `/assets/defaults/avatar-showgeo.png`).  
- Users can upload replacements in Profile Settings.

---

### 🧩 Main Content Area

The main scrollable content region displays event and media cards in a horizontal, carousel-style layout.

**Sections:**
- My Events  
- Trending Now  
- My Artists  
- Streaming Now  
- Upcoming Events  

Each section supports Paid / Free filters and time-based sorting.

**Top Filter Bar**
- **Filters:** "Paid" and "Free" (highlighted toggle).  
- **Time Filter (top-right dropdown):** “This Week”, “This Month”, “This Quarter”, “This Year”.  
- Filter selections apply dynamically without reloading the page.

**Cards**
- Each item displays thumbnail, title, artist, and category.  
- Hover animation (scale 1.05, shadow highlight).

---

### 🎛 Header Bar
Persistent top navigation with:
- Search (Artists, Events, Rooms)  
- Notifications  
- Shopping Cart  
- User dropdown (Profile, Settings, Logout)

---

## 4. Interactivity & Animation
- Smooth transitions (300ms ease-in-out).  
- Buttons: gradient glow (`#CD000E → #F49600`).  
- Sidebar expands on hover or tap.  
- Autocomplete for search fields.  
- Responsive resizing for cards and banners.

---

## 5. Responsive Design
| Screen Size | Sidebar | Banner | Main Area |
|--------------|----------|---------|------------|
| ≥1200px | Full-width | Full banner | 3–5 horizontal rows |
| 768–1199px | Collapsible | Cropped | 2–3 rows |
| ≤767px | Icon-only | Stacked layout | Vertical scroll |

---

## 6. Accessibility
- Minimum contrast ratio: 4.5:1  
- Keyboard navigation for all elements  
- Focus indicators on hover and tab  
- ARIA labels for all interactive icons

---

## 7. Default Assets
| Element | File | Path |
|----------|------|------|
| Avatar | `avatar-showgeo.png` | `/assets/defaults/` |
| Banner | `profile-banner.png` | `/assets/defaults/` |
| Icons | `lucide-react` | `/src/components/icons/` |

---

## 8. Future Integrations
- Real-time activity feed (friends’ streams and follows).  
- Music or live-stream player integration.  
- Creator badges and verified artist status.  
- Event ticket and purchase history tracking.

---

## 9. Developer Notes
- Profile layout component: `/src/layouts/ProfileLayout.tsx`.  
- Individual sections (My Events, Trending, etc.) in `/src/components/profile/sections/`.  
- Sidebar and Header in `/src/components/profile/navigation/`.  
- Maintain consistency with `branding_reference.md` and `color_pallette.md` for fonts and colors.

---

**Status:**  
Defines the complete design, structure, and user experience standards for the **Showgeo User Profile (User Dashboard)**.
