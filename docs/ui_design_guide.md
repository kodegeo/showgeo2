# Showgeo UI Design Guide

This guide defines the design system, brand identity, and interface rules for Showgeo 2.0.  
All frontend components and pages should follow these conventions unless otherwise specified in `.cursorrules`.

---

## 🎨 Color Palette

| Usage | Name | Hex | Notes |
|--------|------|-----|-------|
| Primary | Deep Blue | `#1B1F3B` | Main background and accent color |
| Secondary | Sky Blue | `#4E91E0` | Buttons, highlights, and links |
| Accent | Gold | `#E6B422` | Used for highlights, icons, and calls to action |
| Surface | Charcoal | `#0E0E10` | Dark surfaces and panels |
| Text (Light Mode) | White | `#FFFFFF` | Primary text color |
| Text (Dark Mode) | Light Gray | `#E2E2E2` | For contrast against dark backgrounds |
| Border | Slate Gray | `#2A2E3F` | For cards and outlines |
| Success | Green | `#4ADE80` | Success states (purchase, upload complete) |
| Error | Red | `#EF4444` | Error or warning indicators |

**Color usage hierarchy:**  
Primary → Secondary → Accent → Surface  
Use minimal bright tones; maintain a sleek, cinematic aesthetic.

---

## ✍️ Typography

| Element | Font | Weight | Size | Example Usage |
|----------|------|---------|------|----------------|
| Headings (H1–H3) | Inter | 700 (Bold) | 32–20px | Page titles, section headers |
| Subheadings | Inter | 600 (Semibold) | 18px | Card titles, section labels |
| Body Text | Inter | 400 (Regular) | 16px | Paragraphs, descriptions |
| Captions | Inter | 500 (Medium) | 14px | Metadata, small labels |
| Buttons | Inter | 600 (Semibold) | 16px | Call-to-action text |

- Line height: `1.5`
- Letter spacing: `0.02em`
- Use consistent casing — title case for headings, sentence case for body text.

---

## 🧱 Layout and Spacing

- **Grid:** 12-column grid with 24px gutters
- **Spacing scale (Tailwind):**
  - `p-2` → 8px  
  - `p-4` → 16px  
  - `p-6` → 24px  
  - `p-8` → 32px
- **Max width containers:**
  - Page container: `max-w-7xl mx-auto px-6`
  - Content blocks: `max-w-5xl`
- **Breakpoints:**  
  - `sm`: 640px  
  - `md`: 768px  
  - `lg`: 1024px  
  - `xl`: 1280px  
  - `2xl`: 1536px

---

## 🧩 Components

### Buttons
- Default: `rounded-lg px-4 py-2 font-semibold transition-colors`
- Variants:
  - Primary: `bg-sky-500 hover:bg-sky-600 text-white`
  - Secondary: `bg-transparent border border-sky-400 text-sky-400 hover:bg-sky-400/10`
  - Danger: `bg-red-600 hover:bg-red-700 text-white`

### Cards
- Rounded corners: `rounded-2xl`
- Shadow: `shadow-lg hover:shadow-xl`
- Padding: `p-4 md:p-6`
- Background: `bg-charcoal` or `bg-[#1B1F3B]/80`
- Hover effect: `transform hover:-translate-y-1 transition-all duration-300`

### Modals
- Background: semi-transparent black (`bg-black/70`)
- Centered with `flex items-center justify-center`
- Rounded edges (`rounded-xl`) and padding (`p-6`)

### Tabs & Navigation
- Active state: underline or color accent (`text-sky-400`)
- Inactive: `text-gray-400 hover:text-gray-200`
- Use sticky headers for persistent navbars (`sticky top-0 z-50`)

---

## 🖼️ Images and Media

| Asset Type | Aspect Ratio | Recommended Dimensions | Notes |
|-------------|---------------|--------------------------|-------|
| Profile | 1:1 | 400×400 px | Circular mask |
| Banner | 21:9 | 1920×820 px | Used for entity/event headers |
| Poster | 16:9 | 1280×720 px | Default event thumbnail |
| Logo | Variable | SVG preferred | Dark/light variants |
| Gallery Image | 4:3 | 1200×900 px | Responsive scaling |

**Guidelines:**
- Always compress images before upload.
- Use WebP or AVIF for optimal size.
- Large media (video, audio) should use Supabase or Cloudflare Stream references.

---

## 📽️ Video & Audio Integration

- Default provider: YouTube (free-tier embedding)
- Premium/Entity video uploads → Cloudflare Stream or Supabase Storage
- Video Player aspect ratio: `16:9`, responsive container
- Use skeleton loaders for buffering states

**Video Lifecycle:**
- Free-tier → embed only  
- Entity premium → upload & stream (auto-expire after 30 days unless renewed)
- Flag inappropriate material → triggers moderation pipeline

---

## 🪄 Effects and Animation

- Use Framer Motion for fade, slide, and scale transitions.
- Default transitions:
  - Fade-in: `opacity-0 → opacity-100` in 300ms
  - Scale-up: `scale-95 → scale-100` in 200ms
- Card hover animation: slight lift (`translateY(-4px)`)

---

## 🧭 Navigation & Pages

| Page | Key Elements | Layout Notes |
|-------|---------------|--------------|
| Home | Hero banner, featured events, trending entities | 3-column layout with responsive hero |
| Event Details | Banner, poster, media, ticket CTA | Full-bleed header with floating ticket widget |
| Entity Profile | Banner, logo, media grid | Tabs for events, music, and merch |
| User Profile | Avatar, bio, activity feed | Center-aligned with two-column responsive grid |

---

## 🧰 Implementation References

All pages must use:
- Tailwind CSS for layout and styling
- React components under `src/components/`
- Design tokens defined in `tailwind.config.js`
- Global styles referenced from this guide
- Dark mode supported (media-query or context toggle)

---

## 📁 Assets Folder Structure

```
/docs/branding/
 ├─ Showgeo Branding Sheet.pdf
 ├─ logo_light.svg
 ├─ logo_dark.svg
 ├─ favicon.png
 ├─ mockups/
 │   ├─ Home Page.png
 │   ├─ Event Landing Page.png
 │   └─ Music Player.png
```

---

### ✅ Summary

This guide serves as the **canonical reference** for all UI/UX and styling work in Showgeo 2.0.  
Cursor should refer to this file whenever generating frontend pages or components to maintain design consistency.

---
