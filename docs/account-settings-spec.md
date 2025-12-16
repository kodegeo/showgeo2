# Account & Settings System — Functional Specification
**Version:** 1.0  
**Last Updated:** 2025-12-09  
**Author:** Vision & Venture / Showgeo Engineering

---

## 1. Purpose
This document defines the architecture and functionality of the **Account & Settings System** for the Showgeo platform. It introduces a scalable structure for managing user preferences, profile settings, creator onboarding, and eventually billing, security, and notifications.

This system becomes the **central hub for all user self-management**, and provides a permanent home for the **Creator Upgrade Flow**.

---

# 2. Scope of This Release (MVP)
The MVP includes:

### ✅ New Pages
- `/settings` — root settings dashboard  
- `/settings/profile` — edit profile  
- `/settings/account` — view account email & delete account  
- `/settings/creator` — Apply to Become a Creator (existing flow moved here)

### ✅ New Shared Components
- `SettingsSidebar.tsx`
- `SettingsLayout.tsx`

### ❌ Not in MVP (but future-ready)
- Security / Sessions
- Notifications preferences
- Billing & Subscription Management
- Payment methods
- Connected apps
- Admin override panel

---

# 3. High-Level UX / Navigation

### New Top-Level Navigation Item
Inside the user menu (dropdown when clicking profile avatar):

My Profile
Settings
Log Out


Selecting **Settings** routes to `/settings`.

---

# 4. URL Structure

| Page | Path | Description |
|------|------|-------------|
| Settings Home | `/settings` | Overview with links to subsections |
| Profile Settings | `/settings/profile` | Update profile info |
| Account Settings | `/settings/account` | View account, delete account |
| Creator Settings | `/settings/creator` | Start or manage creator application |

---

# 5. Layout Structure

### `SettingsLayout.tsx`
A wrapper layout used by all settings pages.

+---------------------------------------------+
| Top Nav |
+---------------------------------------------+
| Sidebar (25%) | Settings Content (75%) |
+---------------------------------------------+


### `SettingsSidebar.tsx`
Contains:

Profile
Account
Become a Creator
(Coming Soon)
Security
Notifications
Billing


“Coming Soon” items should be greyed out / disabled.

---

# 6. Feature Breakdown

## 6.1 Settings Home Page (`/settings`)
A simple landing screen:

### Components:
- Page title: “Settings”
- Cards linking to each section:
  - Edit Profile
  - Account Information
  - Become a Creator (status-aware)

### Creator Button Logic:
| Entity Status | Button Label | Action |
|---------------|--------------|--------|
| No Entity | “Become a Creator” | Navigate to `/settings/creator` |
| PENDING | “Creator Application Pending” | Non-clickable |
| APPROVED | “Manage Creator Profile” | Link to entity dashboard |
| REJECTED | “Reapply to Become a Creator” | Allows resubmission |

---

## 6.2 Profile Settings (`/settings/profile`)
This uses your existing **UserProfile model** fields.

### Editable:
- First name  
- Last name  
- Username  
- Bio  
- Avatar image upload  
- Banner image upload  
- Location  
- Website  
- Social links  
- Visibility (public/private)

This page already exists in pieces — this spec **consolidates** them.

---

## 6.3 Account Settings (`/settings/account`)
### Shows:
- Registered email (non-editable for now)
- Date joined
- Auth provider (email, OAuth — future)
- Button: Delete account (disabled until implemented)

### Backend:
Add endpoint (future):  
`DELETE /users/me`

---

## 6.4 Creator Settings (`/settings/creator`)
This replaces `/creator/apply`.

### States:

#### 🟦 State 1: No application yet
Show form:

- Brand name  
- Category (music, speaker, business, etc.)  
- Bio  
- Social links  
- Thumbnail image  
- Banner image  
- Terms & Conditions checkbox  

Button: **Submit Creator Application**

This uses your existing `CreatorApplicationPage` logic.

---

#### 🟨 State 2: Application Submitted
Show:

Your creator application is currently under review.
Status: PENDING
You will be notified when your application is approved.


Disabled re-submit button.

---

#### 🟩 State 3: Approved
Show:

Your creator profile is active.
Go to your Creator Dashboard →


Button navigates to:

`/entity/<slug>`

---

#### 🟥 State 4: Rejected
Show rejection reason if stored (optional feature).

Allow:

**Reapply → launches same form pre-filled**

---

# 7. API Requirements

## New Endpoint (Optional)
To fetch creator status quickly:

`GET /entities/my-status`

Returns:

```json
{
  "status": "NONE" | "PENDING" | "APPROVED" | "REJECTED",
  "entityId": "...",
  "slug": "my-stage-name"
}

Used for:

Conditionals in Settings Home

Sidebar badges (“Pending Review”)

8. Components to Implement
# components/settings/SettingsLayout.tsx

Re-usable wrapper that handles:

- Sidebar
- Mobile responsive layout
- Route rendering

# components/settings/SettingsSidebar.tsx

Sidebar items:

Profile
Account
Become a Creator

----- Coming Soon -----
Security
Notifications
Billing

# pages/settings/SettingsHomePage.tsx

- Simple overview page.

# Move existing:

CreatorApplicationPage.tsx → pages/settings/CreatorSettingsPage.tsx

9. Permissions & Access

Role	Can Access Settings	Can Apply to Creator	Can View Creator Dashboard
USER	Yes	Yes	No
ENTITY OWNER	Yes	No	Yes
ADMIN	Yes	N/A	All

10. Future Extensions (Phase 2)
- Security
- Change password
- View login devices
- Session management
- Notifications
- Email notifications
- Push preferences
- Billing
- Payment methods
- Subscription tiers
- Payout info (Stripe Connect)

These should be disabled in the UI now with “Coming Soon”.

11. Folder Structure
src/
  pages/
    settings/
      SettingsHomePage.tsx
      SettingsProfilePage.tsx
      SettingsAccountPage.tsx
      SettingsCreatorPage.tsx
  components/
    settings/
      SettingsLayout.tsx
      SettingsSidebar.tsx

12. Acceptance Criteria (MVP)
Settings System

- Sidebar renders across all settings pages
- Pages function independently
- Navigation works seamlessly

Creator Application Integration

- Old route /creator/apply removed
- New route /settings/creator fully functional
- Status displays properly
- User cannot submit multiple pending applications

Deployment

- No backend modifications required for MVP
- No database migrations required
- Entire feature is UI + routing + form re-routing

13. Testing Checklist
User Tests

- Sign in as normal user → Settings → Creator → submit application
- Creator state updates to Pending
- Routes prevent re-accessing form when pending
- Profile changes save correctly
- Account page loads correctly

Edge Cases
- User with existing entity lands in “approved” state
- User with rejected entity sees “reapply”
- Missing images do not break submission
- Social links optional

14. Version Control Notes

When implementing:

1. Create new branch:
feature/settings-system

2. Scaffold pages & components

3. Move creator application to new location

4. Update routing

5. Submit PR

