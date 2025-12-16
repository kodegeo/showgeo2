# Creator Dashboard Toast Events

## Purpose
Defines all success, warning, and error toasts that appear within the Creator Dashboard UI.  
Toasts are used for providing immediate feedback for user actions such as uploads, event creation, and streaming.  
They follow a consistent color, tone, and animation pattern across all creator-facing pages.

---

## Framework
**Library:** ShadCN UI + `useToast()` hook  
**Animation:** Slide-in from top-right, fade-out after 3 seconds  
**Colors:**
- Success: `#00C853` (Green)
- Warning: `#F49600` (Gold)
- Error: `#CD000E` (Red)
- Info: `#1FB5FC` (Blue)

---

## Standard Toast Types

| Type | Icon | Color | Duration | Example Message |
|------|------|--------|-----------|----------------|
| success | check-circle | Green | 3s | “Event created successfully!” |
| error | x-circle | Red | 5s | “Upload failed. Please try again.” |
| warning | alert-triangle | Gold | 4s | “Feature available after verification.” |
| info | info | Blue | 3s | “Analytics updated.” |

---

## Event → Toast Mapping

| Action | Success Toast | Error Toast | Notes |
|--------|----------------|--------------|-------|
| Create Event | “Event created successfully.” | “Could not create event.” | Linked to `/api/events` |
| Upload Media | “Upload complete!” | “Upload failed.” | Linked to `/api/assets/upload` |
| Start Stream | “Stream started!” | “Stream connection failed.” | Linked to `/api/stream/start` |
| Create Post | “Post published!” | “Could not publish post.” | Linked to `/api/posts` |
| Add Product | “Product added to store.” | “Error adding product.” | Linked to `/api/store/products` |
| Manage Fan | “Fan updated successfully.” | “Failed to update fan.” | Linked to `/api/fans/manage` |
| Delete Action | “Deleted successfully.” | “Could not delete item.” | Global handler |
| Update Profile | “Profile updated.” | “Error saving profile.” | `/api/users/profile` |
| Verification Required | “Feature available after verification.” | — | Shown if feature locked |

---

## Implementation Example

```tsx
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

const { toast } = useToast();

toast({
  title: "Event created successfully!",
  icon: <CheckCircle className="text-green-500" />,
  className: "bg-[#0B0B0B] text-white border border-[#1A1A1A]",
  duration: 3000,
});
