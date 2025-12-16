# 🎨 Showgeo Color Palette

This document defines the official color palette for **Showgeo 2.0**.  
All UI components, pages, and marketing materials should adhere to these color definitions for brand consistency.

---

## 🟥 Primary Colors

| Name | HEX | RGB | Usage |
|------|------|------|--------|
| **Red (Primary)** | `#CD000E` | 205, 0, 14 | Brand color used for live events, buttons, and active indicators |
| **Dark Red (Secondary)** | `#860005` | 134, 0, 5 | Used for gradients, shadows, overlays, and hover states |

---

## 🟡 Accent Color

| Name | HEX | RGB | Usage |
|------|------|------|--------|
| **Gold** | `#F49600` | 244, 150, 0 | Premium tiers, VIP events, and highlights |

---

## 🔵 Supporting Color

| Name | HEX | RGB | Usage |
|------|------|------|--------|
| **Blue** | `#1FB5FC` | 31, 181, 252 | Used for informational UIs, secondary buttons, and light mode accents |

---

## 🌗 Gradient + Style Guide

| Style | Value | Usage |
|-------|--------|--------|
| **Primary Gradient** | `linear-gradient(90deg, #860005 0%, #CD000E 100%)` | Main app bar, buttons, hero sections |
| **Accent Gradient** | `linear-gradient(45deg, #F49600 0%, #1FB5FC 100%)` | Premium banners, highlights |
| **Neutral Background** | `#0B0B0B` | Default app background |
| **Surface Light** | `#1A1A1A` | Cards, modals, and secondary surfaces |

---

## 🧩 Developer Usage

### Tailwind Configuration

```js
theme: {
  extend: {
    colors: {
      primary: '#CD000E',
      secondary: '#860005',
      gold: '#F49600',
      blue: '#1FB5FC',
      background: '#0B0B0B',
      surface: '#1A1A1A',
    },
  },
}
```

### CSS Variables

```css
:root {
  --color-primary: #CD000E;
  --color-secondary: #860005;
  --color-gold: #F49600;
  --color-blue: #1FB5FC;
  --color-background: #0B0B0B;
  --color-surface: #1A1A1A;
}
```

---

_Last Updated: November 2025_
