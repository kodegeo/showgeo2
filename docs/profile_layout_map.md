# Showgeo User Profile Layout Map

## 1. Overview
This layout map defines **spatial relationships**, **grid positioning**, and **visual grouping** for the Showgeo User Profile.  
It complements `profile_component_structure.md` and `profile_visual_standards.md` to create a cohesive user experience aligned with Showgeo branding.

---

## 2. Page Layout Overview
The User Profile uses a **three-zone adaptive grid layout**:

┌────────────────────────────────────────────────────────────┐
│ Header │
│ (Navigation, Search, Notifications, Cart) │
├──────────────┬──────────────────────────────────────────────┤
│ Sidebar │ Main Content Area │
│ (Persistent) │ (Scrollable, Dynamic Sections) │
├──────────────┴──────────────────────────────────────────────┤
│ Footer │
│ (Platform Links, Support, Social Icons) │
└────────────────────────────────────────────────────────────┘


- **Header** remains fixed at the top.  
- **Sidebar** is collapsible and theme-aware.  
- **Main Content Area** scrolls independently.  
- **Footer** is global (same as `Footer.tsx`).

---

## 3. Layout Grid Definition
| Region | Columns | Role | Key Components |
|---------|----------|------|----------------|
| **Sidebar** | 1 (fixed width: 260px) | Primary navigation | `ProfileSidebar` |
| **Header** | full width | Global navigation & user controls | `ProfileHeader` |
| **Main Area** | auto-fill (min 300px) | Dynamic profile content | `ProfileBanner`, `ProfileSections` |
| **Footer** | full width | Global links & info | `Footer` |

**CSS Grid Reference:**
```css
grid-template-areas:
  "header header"
  "sidebar main"
  "footer footer";

grid-template-columns: 260px 1fr;
grid-template-rows: auto 1fr auto;
