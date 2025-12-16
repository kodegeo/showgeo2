# Footer Component Map

## Purpose
Defines the visual, structural, and responsive layout for the Showgeo 2.0 footer. The footer ensures consistent branding, navigation, and user trust across all pages including Home, Events, Creator Profiles, and Dashboard.

---

## Component: `Footer`
**Path:** `src/components/Footer.tsx`

### Description
A responsive footer with four content sections and a copyright bar. Provides key navigation links and brand reinforcement using Showgeo’s primary color palette.

---

## Layout Structure
```
<footer>
  ├── Container (max-w-7xl)
  │    ├── Grid (4 columns on desktop, stacked on mobile)
  │    │    ├── Brand Section (Logo + Description)
  │    │    ├── Platform Links
  │    │    ├── Support Links
  │    │
  │    └── Copyright Section
```

---

## Sections Breakdown

### 🟥 1. Brand Section
**Purpose:** Reinforces identity and trust.
- Logo: `/src/assets/branding/logo-red.svg`
- Description: One-sentence platform summary.
- Typography: `text-sm text-gray-400 leading-relaxed`

### 🟨 2. Platform Links
**Purpose:** Main navigation pathways.
- Events
- Creators
- How It Works
- Hover color: `#F49600`

### 🟦 3. Support Links
**Purpose:** Compliance and customer service.
- Help Center
- Contact
- Terms of Service
- Privacy Policy

### ⚫ 4. Copyright Bar
**Purpose:** Legal notice and final brand signature.
- Text alignment: Centered
- Color: `text-gray-500`
- Accent: Gold (`#F49600`) for brand name

---

## Styling & Brand Alignment

### 🎨 Color Palette
| Element | Color | Usage |
|----------|--------|--------|
| Background | `#0B0B0B` | Global dark background |
| Text | `#FFFFFF` | Primary text |
| Accent Red | `#CD000E` | Hover and CTA highlights |
| Gold | `#F49600` | Brand accent for emphasis |
| Divider | `#1F1F1F` | Subtle border tone |

### 🧱 Typography
| Type | Font | Weight | Example |
|------|------|---------|----------|
| Headings | Inter | 600 | Section titles |
| Body | Inter | 400 | Descriptions and links |

---

## Responsive Behavior
| Breakpoint | Layout |
|-------------|--------|
| <640px | Stack all sections vertically |
| 640px–1024px | Two-column layout |
| >1024px | Four-column layout |

---

## Interaction Rules
- **Hover states:** Links transition to gold or red.
- **Logo hover:** None (non-click decorative anchor)
- **Transitions:** `transition-colors duration-200`

---

## Integration
The Footer component should be imported into global layout files:
```tsx
import { Footer } from '@/components/Footer';

export default function HomeLayout({ children }) {
  return (
    <div className="bg-[#0B0B0B] text-white min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
```

---

## Future Enhancements
- Add social media links (Instagram, YouTube, TikTok)
- Add language switcher (EN/ES)
- Include small newsletter sign-up form
- Integrate with analytics for link tracking

---

## Summary
The Showgeo 2.0 footer establishes consistent visual hierarchy, brand recognition, and navigation structure across all public and authenticated views. It adheres to brand color rules and responsive design patterns ensuring accessibility and elegance in both light and dark