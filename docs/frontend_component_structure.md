# Frontend Component Structure

**Date:** 2025-11-02  
**Status:** ✅ Complete Documentation  
**Location:** `/frontend/src/components` and `/frontend/src/pages`

---

## Overview

This document provides a comprehensive overview of the frontend component structure, organized by feature and functionality.

---

## Directory Structure

```
frontend/src/
├── components/
│   ├── creator/
│   │   ├── CreatorSidebar.tsx
│   │   ├── CreatorProfileBanner.tsx
│   │   ├── CreatorQuickActions.tsx
│   │   └── CreatorDashboardLayout.tsx
│   ├── Navigation/
│   │   ├── Navigation.tsx
│   │   ├── NavLinks.tsx
│   │   └── NavAction.tsx
│   ├── Footer.tsx
│   ├── ProtectedRoute.tsx
│   ├── CreatorRoute.tsx
│   ├── EntityContextSwitch.tsx
│   ├── AvatarUpload.tsx
│   ├── AssetUpload.tsx
│   ├── AssetGallery.tsx
│   └── AssetPreview.tsx
├── pages/
│   ├── creator/
│   │   ├── CreatorDashboardPage.tsx
│   │   ├── CreatorEventsPage.tsx
│   │   ├── CreatorStorePage.tsx
│   │   ├── CreatorAnalyticsPage.tsx
│   │   └── CreatorSettingsPage.tsx
│   ├── HomePage.tsx
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx
│   ├── ProfilePage.tsx
│   └── ProfileSetupPage.tsx
└── hooks/
    ├── useAuth.ts
    ├── useUsers.ts
    ├── useEntities.ts
    ├── useEvents.ts
    ├── useStore.ts
    ├── useAnalytics.ts
    ├── useFollow.ts
    ├── useAssets.ts
    └── useEntityContext.ts
```

---

## Creator Dashboard Components

### Layout Components

#### CreatorDashboardLayout
**Location:** `components/creator/CreatorDashboardLayout.tsx`  
**Purpose:** Main layout wrapper for creator dashboard pages  
**Features:**
- Combines sidebar, profile banner, quick actions, and main content
- Responsive layout structure
- Props for action handlers

#### CreatorSidebar
**Location:** `components/creator/CreatorSidebar.tsx`  
**Purpose:** Navigation sidebar for creator dashboard  
**Features:**
- Collapsible on mobile (overlay)
- Fixed on desktop
- Active route highlighting
- Navigation to all creator pages

#### CreatorProfileBanner
**Location:** `components/creator/CreatorProfileBanner.tsx`  
**Purpose:** Entity profile banner with stats and actions  
**Features:**
- Banner image with gradient overlay
- Avatar with verification badge
- Follower/Following statistics
- Action buttons (Edit, Go Live, Share)

#### CreatorQuickActions
**Location:** `components/creator/CreatorQuickActions.tsx`  
**Purpose:** Quick action buttons bar  
**Features:**
- Horizontal button layout
- Responsive wrapping
- Icon-based actions
- Direct navigation links

---

## Route Guards

### ProtectedRoute
**Location:** `components/ProtectedRoute.tsx`  
**Purpose:** General route protection with authentication  
**Features:**
- Authentication check
- Role-based access control
- Loading states
- Redirect handling

### CreatorRoute
**Location:** `components/CreatorRoute.tsx`  
**Purpose:** Creator dashboard route protection  
**Features:**
- Authentication validation
- Entity context validation
- User entities check
- Auto-redirect to profile setup

---

## Creator Pages

### CreatorDashboardPage
**Route:** `/creator/dashboard`  
**Location:** `pages/creator/CreatorDashboardPage.tsx`  
**Features:**
- Overview stats cards
- Recent events list
- Store summary
- Analytics overview
- Empty states

### CreatorEventsPage
**Route:** `/creator/events`  
**Location:** `pages/creator/CreatorEventsPage.tsx`  
**Features:**
- Event grid/list view
- Event cards with badges
- Create event button
- Empty state

### CreatorStorePage
**Route:** `/creator/store`  
**Location:** `pages/creator/CreatorStorePage.tsx`  
**Features:**
- Store information display
- Product listing
- Create store functionality
- Add product button

### CreatorAnalyticsPage
**Route:** `/creator/analytics`  
**Location:** `pages/creator/CreatorAnalyticsPage.tsx`  
**Features:**
- Key metrics cards
- Engagement metrics
- Loading states
- Empty states

### CreatorSettingsPage
**Route:** `/creator/settings`  
**Location:** `pages/creator/CreatorSettingsPage.tsx`  
**Features:**
- Settings navigation cards
- Entity information display
- Status badges

---

## Shared Components

### Navigation
**Location:** `components/Navigation/Navigation.tsx`  
**Purpose:** Main site navigation  
**Features:**
- Logo and brand
- Navigation links
- Auth state display
- Entity context switcher

### Footer
**Location:** `components/Footer.tsx`  
**Purpose:** Site footer  
**Features:**
- Links and branding
- Copyright notice

### EntityContextSwitch
**Location:** `components/EntityContextSwitch.tsx`  
**Purpose:** Entity context switcher  
**Features:**
- User/Entity toggle
- Entity selection dropdown
- Context persistence

### Asset Components

#### AvatarUpload
**Location:** `components/AvatarUpload.tsx`  
**Purpose:** Avatar upload component  
**Features:**
- Drag and drop
- Image preview
- Upload progress
- Remove functionality

#### AssetUpload
**Location:** `components/AssetUpload.tsx`  
**Purpose:** General asset upload  
**Features:**
- File type validation
- Multiple file support
- Upload progress
- Error handling

#### AssetGallery
**Location:** `components/AssetGallery.tsx`  
**Purpose:** Asset gallery display  
**Features:**
- Grid layout
- Asset preview
- Delete functionality
- Filter by type

#### AssetPreview
**Location:** `components/AssetPreview.tsx`  
**Purpose:** Full-screen asset preview  
**Features:**
- Modal display
- Download option
- Delete option
- Navigation

---

## Public Pages

### HomePage
**Route:** `/`  
**Location:** `pages/HomePage.tsx`  
**Features:**
- Hero section
- Feature cards
- CTA sections
- Brand assets

### LoginPage
**Route:** `/login`  
**Location:** `pages/LoginPage.tsx`  
**Features:**
- Login form
- Brand styling
- Error handling
- Redirect handling

### RegisterPage
**Route:** `/register`  
**Location:** `pages/RegisterPage.tsx`  
**Features:**
- Registration form
- Validation
- Brand styling
- Success redirect

---

## Protected Pages

### DashboardPage
**Route:** `/dashboard`  
**Location:** `pages/DashboardPage.tsx`  
**Purpose:** User dashboard (non-creator)  
**Features:**
- Welcome message
- Dashboard cards
- User profile link

### ProfilePage
**Route:** `/profile`  
**Location:** `pages/ProfilePage.tsx`  
**Features:**
- Profile display
- Profile completion check
- Edit profile link
- Empty states

### ProfileSetupPage
**Route:** `/profile/setup`  
**Location:** `pages/ProfileSetupPage.tsx`  
**Features:**
- Profile form
- Avatar upload
- Social links
- Validation

---

## Component Patterns

### Layout Pattern
```tsx
<div className="min-h-screen bg-[#0B0B0B] text-white flex flex-col">
  <Navigation />
  <main className="flex-1 pt-20 md:pt-24">
    {/* Content */}
  </main>
  <Footer />
</div>
```

### Creator Layout Pattern
```tsx
<CreatorDashboardLayout>
  {/* Page content */}
</CreatorDashboardLayout>
```

### Protected Route Pattern
```tsx
<Route
  path="/protected"
  element={
    <ProtectedRoute>
      <Component />
    </ProtectedRoute>
  }
/>
```

### Creator Route Pattern
```tsx
<Route
  path="/creator/*"
  element={
    <CreatorRoute>
      <CreatorComponent />
    </CreatorRoute>
  }
/>
```

---

## Styling Standards

**Colors:**
- Primary Red: `#CD000E`
- Gold: `#F49600`
- Blue: `#1FB5FC`
- Background: `#0B0B0B`
- Border: `gray-800` / `#1A1A1A`
- Text: `white` / `#FFFFFF`
- Muted: `#9A9A9A`

**Typography:**
- Headings: `font-heading` (Montserrat), uppercase, tracking-tighter
- Body: `font-body` (Poppins), regular

**Spacing:**
- Consistent padding: `p-4`, `p-6`, `p-8`
- Consistent gaps: `gap-4`, `gap-6`
- Consistent margins: `mb-4`, `mb-6`, `mb-8`

**Borders:**
- Standard: `border border-gray-800`
- Hover: `hover:border-[#CD000E]/50`
- Radius: `rounded-lg`

---

## Data Integration

### Hooks Pattern
```tsx
const { currentEntity } = useEntityContext();
const { data: events } = useEvents({ entityId: currentEntity?.id });
const { data: analytics } = useEntityAnalytics(currentEntity?.id || "");
```

### Loading States
```tsx
{isLoading ? (
  <LoadingSpinner />
) : data ? (
  <Content data={data} />
) : (
  <EmptyState />
)}
```

### Error Handling
```tsx
{error && (
  <ErrorMessage message={error.message} />
)}
```

---

## Summary

The frontend component structure is well-organized with clear separation between:
- **Layout components** (reusable structure)
- **Feature components** (creator-specific)
- **Shared components** (used across features)
- **Pages** (route-level components)
- **Route guards** (authentication and authorization)

All components follow consistent styling standards, use proper TypeScript types, and integrate with the API through React Query hooks.

**Status:** ✅ Complete and documented





