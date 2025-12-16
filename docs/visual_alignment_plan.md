
# Visual Alignment Plan for Showgeo Frontend

## Purpose
This document establishes the visual and brand alignment plan for the Showgeo web application. It ensures that all pages, components, and future enhancements follow a consistent color, typography, and layout system based on Showgeo’s branding and design references.

---

## 1. Brand Foundations

### Brand Colors
| Name | Hex | Usage |
|------|-----|--------|
| **Primary Red** | `#CD000E` | Buttons, highlights, hero CTAs |
| **Dark Red (Secondary)** | `#860005` | Gradients, backgrounds, hover states |
| **Gold Accent** | `#F49600` | Callouts, icons, price tags |
| **Blue Accent** | `#1FB5FC` | Info tags, free event labels |
| **Dark Gray / Black** | `#0B0B0B` | Page backgrounds |
| **White** | `#FFFFFF` | Text and contrasting backgrounds |

### Typography
| Type | Font | Weight | Usage |
|------|-------|--------|--------|
| Headings | Inter / Poppins | 700–800 | Hero titles, section headers |
| Subheadings | Inter / Poppins | 500–600 | Section labels |
| Body | Inter / Open Sans | 400 | Paragraph text |
| Buttons | Inter / Poppins | 600 | Calls to action |

---

## 2. Asset Mapping

### Branding Assets (src/assets/branding)
| Asset | Purpose |
|--------|----------|
| `logo-red.svg` | Default logo for dark backgrounds |
| `logo-blue.svg` | Alternate for light/neutral backgrounds |
| `logo-gold.svg` | Used in premium or event-exclusive contexts |
| `watermark-red.png` | Overlay for event and media pages |
| `play.svg`, `pause.svg`, `next.svg`, `prev.svg`, `indicator.svg` | Music player controls |

### Page Images (src/assets/images)
| File | Section | Description |
|-------|----------|-------------|
| `bg_home.png` | Home Hero | Main background image for the home page hero section |
| `bg_signup.jpg` | Auth Pages | Background for sign-up and login screens |
| `bg_upcoming.jpg` | Events Page | Background for upcoming and paid event lists |
| `countdown.png` | Hero Overlay | Countdown section background |
| `email_red.png`, `lock_red.png`, `google.png` | Auth Icons | Icons used in sign-in/sign-up UI |
| `thumbnail.png` | Placeholder | Default thumbnail for events, artists, or entities |

---

## 3. Component-Level Visuals

### Navigation (Navigation.tsx)
- Use `logo-red.svg` left-aligned in the navbar.
- Apply gradient underline for hover states using `#CD000E` → `#860005`.
- Background: `#0B0B0B` (opaque, not translucent).

### Hero Section (HomePage.tsx)
- Background image: `bg_home.png`
- Overlay gradient: top `rgba(0,0,0,0.6)` → bottom `rgba(134,0,5,0.85)`.
- Headline: “Live Events. Real Connections.”  
  - “Live Events.” → white  
  - “Real Connections.” → `#CD000E`
- Buttons:
  - Primary: Red (#CD000E) with white text.
  - Secondary: Transparent with red border and text.

### Features Section
- 3-column grid: Live Streaming | Community Building | Monetization
- Icons in red circle badges.
- Use hover scale and shadow effects in gold accent (`#F49600`).

### CTA Section (bottom of home page)
- Gradient: `#CD000E` → `#860005`
- Text: white, bold, centered.
- Buttons: “Join Now” (gold) and “Find Events” (red).

### Footer
- Background: `#0B0B0B`
- Logo: `logo-red.svg`
- Section links:
  - White text, gold hover underline.
- Social icons: red circular background, white icons inside.

---

## 4. Responsive Rules

| Breakpoint | Layout |
|-------------|---------|
| ≥1200px | Full-width hero, 3-column features |
| ≥768px | Stacked hero, 2-column features |
| ≤480px | Single-column stacked layout, reduced padding |

---

## 5. Cursor Implementation Notes

### For `/task update_homepage_branding target=frontend`
Cursor should:
1. Replace the hero background with `bg_home.png`.
2. Update logo import to `logo-red.svg`.
3. Apply primary and secondary red gradients to hero and CTA sections.
4. Update global Tailwind config with brand colors:
   ```js
   theme: {
     extend: {
       colors: {
         primary: '#CD000E',
         secondary: '#860005',
         gold: '#F49600',
         blue: '#1FB5FC',
         dark: '#0B0B0B',
       },
     },
   }
   ```
5. Update typography hierarchy per table above.
6. Ensure responsive behavior matches the layout plan.

---

## 6. Future Pages

| Page | Key Assets | Notes |
|------|-------------|--------|
| **SignUp / Login** | bg_signup.jpg, lock_red.png, google.png | Centered card with semi-transparent overlay |
| **Events Listing** | bg_upcoming.jpg | Tabs for “Free” and “Paid” events |
| **Entity Profile** | logo-red.svg, watermark-red.png | Include entity banner and gallery assets |
| **Music Player** | play.svg, pause.svg, next.svg, prev.svg | Integrated with dark theme and red accent lighting |

---

## 7. Verification Checklist
- [ ] Hero background matches `bg_home.png`
- [ ] Navbar and footer use logo-red.svg
- [ ] Buttons use primary red (#CD000E)
- [ ] Fonts loaded and applied globally
- [ ] Footer and CTA follow gold and red scheme
- [ ] Background images scale responsively
- [ ] Cursor sync complete and `/task update_homepage_branding` applied

---

**Document Owner:** Khalid Morris  
**Version:** 1.0  
**Date:** November 2025  
**Purpose:** Establish consistent visual alignment across Showgeo UI.
