# Showgeo 2.0 Home UI Reference

## Overview
The Showgeo 2.0 Home Page is the **public entry point** of the platform, designed to inspire engagement, display featured events, and guide visitors toward sign-up or event registration. The layout emphasizes clarity, brand consistency, and emotional impact through strong visuals and minimalist design.

---

## Layout Structure

### 1. Header
- **Position:** Fixed at the top, full width.
- **Elements:**
  - Logo (top-left): Use primary or gold variant depending on background.
  - Navigation links: `Home`, `Events`, `About`, `Sign In`, `Sign Up`.
  - Sign Up button styled as CTA (red or gold).
- **Background:** Transparent until scroll; solid black (`#0B0B0B`) after scroll.

### 2. Hero Section
- **Purpose:** Communicate the brand and current featured event(s).
- **Layout:**
  - Full-width image or video background.
  - Centered overlay text: *"Where Artists and Fans Connect Live"*.
  - Primary CTA: **"Get Tickets"** → links to `/events` or featured event.
- **Design Notes:**
  - Text contrast: white text on dark overlay (rgba(0,0,0,0.6)).
  - Button color: red (`#CD000E`) or gold (`#F49600`).
  - Rounded-pill buttons with hover glow.

### 3. Upcoming Events Section
- **Heading:** "Upcoming Live Events"
- **Tabs:** `Free Live` | `Paid Live`
- **Layout:** Responsive grid (3–4 cards per row on desktop, 1–2 on mobile).
- **Event Card Components:**
  - Poster image (ratio 16:9).
  - Overlay date badge.
  - Performer name and short description.
  - CTA button: *"Get Tickets"* or *"Watch Live"*.
- **Hover Effect:** Slight zoom and shadow; button highlight.

### 4. Featured Entities Section
- **Heading:** "Discover Artists & Creators"
- **Layout:** Carousel of artist/entity profile tiles.
- **Each Tile Includes:**
  - Circular image or logo.
  - Name and genre tag.
  - "View Profile" button.

### 5. Footer
- **Content:**
  - Navigation: `Terms of Service`, `Privacy Policy`, `Cookie Policy`.
  - Social links: Instagram, X, YouTube, Facebook icons.
- **Background:** Black (`#0B0B0B`) with subtle gradient.
- **Text:** Gray (`#9A9A9A`) with hover lightening to white.

---

## Color Palette
- **Primary Red:** `#CD000E`  → Main call-to-action buttons.
- **Secondary Gold:** `#F49600` → Highlights, secondary buttons.
- **Accent Blue:** `#1FB5FC` → Interactive hover or live indicators.
- **Dark Background:** `#0B0B0B`.
- **Light Text:** `#FFFFFF`.

---

## Typography
- **Primary Font:** Sans-serif (Montserrat or similar).
- **Headings:** Bold, uppercase.
- **Body Text:** Medium weight; high contrast.
- **Button Text:** Uppercase, letter-spaced slightly.

---

## Interactions
- **Scroll Animation:** Smooth scroll and fade-in effects for sections.
- **Hover:** Buttons glow subtly; images zoom slightly.
- **Responsive Design:**
  - Collapsible menu on mobile.
  - Vertical stacking for sections.

---

## Authentication & CTA Integration
- **Primary CTAs:** Sign In / Sign Up.
- **Unauthenticated users:** Clicking "Get Tickets" redirects to Sign Up or Login.
- **Authenticated users:** Taken directly to event or ticket checkout.

---

## Integration Notes
- **Image Paths:** `/assets/home/hero/`, `/assets/events/posters/`.
- **Dynamic Data:** Fetched from `/api/events?status=upcoming`.
- **Future Enhancements:**
  - Add live ticker ("Now Streaming").
  - Include short video previews in hero or event cards.

---

## Summary
The Showgeo 2.0 Home Page is a sleek, dark-themed landing page that fuses **brand storytelling** with **conversion-driven design**. The layout should prioritize quick loading, intuitive navigation, and seamless redirection into the authentication and event registration flows.

