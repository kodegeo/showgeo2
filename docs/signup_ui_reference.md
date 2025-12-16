# Showgeo 2.0 Sign-Up UI Reference

## Overview
The Sign-Up Page is designed to convert visitors quickly and seamlessly into users. It follows the Showgeo 2.0 dark, minimalist aesthetic while maintaining a friendly, modern onboarding experience. The layout prioritizes simplicity, visual balance, and mobile responsiveness.

---

## Layout Structure

### 1. Header
- **Position:** Fixed, minimal header.
- **Elements:**
  - Logo (centered or top-left).
  - Optional link: `Back to Home` → redirects to `/`.
- **Background:** Transparent over dark background.

### 2. Sign-Up Card
- **Position:** Centered vertically and horizontally.
- **Container Style:**
  - Dark background (`#0B0B0B`), slightly translucent.
  - Rounded corners (border-radius: `1rem`).
  - Subtle shadow and blur backdrop.
  - Width: 420px (desktop), 100% (mobile).

#### Form Fields
| Field | Type | Notes |
|--------|------|-------|
| **Email Address** | Text / Email | Required; validated format. |
| **Password** | Password | Required; toggle visibility icon. |
| **Confirm Password** | Password | Required; matches password. |
| **Display Name (optional)** | Text | Can be filled later in profile setup. |

#### Buttons & Links
- **Primary CTA:** `Create Account`
  - Style: Red (`#CD000E`) background, white text, uppercase.
  - Hover: Lighter red or gold glow.
- **Secondary Link:** `Already have an account? Sign In`
  - Inline text link → `/auth/login`.

#### Social Login Section
- **Title:** `Or continue with`
- **Options:** Google, Apple (optional future: Spotify).
- **Button Style:**
  - Outlined with white borders and logo icons.
  - Light hover background with reduced opacity.

---

## 3. Footer
- **Content:** Privacy policy and support links.
- **Placement:** Fixed or anchored at bottom.
- **Style:** Small, gray text (`#9A9A9A`), centered alignment.

---

## Typography
- **Primary Font:** Montserrat or Poppins.
- **Font Weight:** 400–600 for body; 700 for headers.
- **Title Text:** `Create Your Account` or `Join the Showgeo Community`.
- **Input Labels:** Small uppercase text; white.
- **Placeholder Text:** Medium gray (`#B0B0B0`).

---

## Colors
| Element | Color | Description |
|----------|--------|--------------|
| **Background** | `#0B0B0B` | Dark neutral background. |
| **Primary Red** | `#CD000E` | Primary CTA color. |
| **Gold Accent** | `#F49600` | Optional hover highlight. |
| **Text (Light)** | `#FFFFFF` | Main text color. |
| **Text (Muted)** | `#9A9A9A` | Secondary labels. |

---

## Responsive Design
- **Mobile (≤768px):**
  - Full-width form.
  - Stack logo above form.
  - Centered buttons.
- **Desktop:**
  - Centered modal.
  - Optional side banner with background image or gradient overlay.

---

## Interactions & States
- **Input Focus:** Border highlight in red or gold.
- **Error State:** Small red text under field (e.g., “Passwords must match”).
- **Loading State:** Spinner overlay inside the `Create Account` button.
- **Success:** Redirect to `/dashboard` or event continuation page.

---

## Behavioral Flow
1. **User clicks “Sign Up”** (from Home, Event, or CTA).
2. **Sign-Up form appears** → user enters details.
3. **After submission:**
   - Validates input.
   - Calls `/api/auth/register` endpoint.
   - If successful:
     - Redirects to `/dashboard` (if general signup), or
     - Returns to referring event page (if from `/events/:slug`).
4. **If errors:** Display inline messages.

---

## Integration Notes
- **API Endpoint:** `POST /api/auth/register`
- **On Success:** Set JWT in local storage, update AuthContext.
- **On Error:** Display message (Invalid email, password, or user exists).
- **Redirect Priority:**
  - If signup came from event → return to `/events/:slug`.
  - Else → `/dashboard`.

---

## Summary
The Showgeo Sign-Up Page is designed to reduce friction and encourage quick onboarding. It aligns with Showgeo’s **dark luxury** aesthetic and leverages minimalism to enhance clarity. The focus is on **fast conversion, emotional engagement, and easy access** to live event participation.

