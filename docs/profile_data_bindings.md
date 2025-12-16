# Profile Data Bindings

## Purpose
Defines how user and creator profile data is bound to UI components in the Showgeo platform.  
This ensures consistent state management, correct Supabase integration, and clean API data flow across the frontend.

---

## 1️⃣ Data Sources

| Data Type | Source | Description |
|------------|---------|-------------|
| User profile | `/api/users/:id` | Core user data including avatar, name, username, and bio |
| Creator profile | `/api/entities/:id` | Extended creator data including events, store items, and media |
| Follower stats | `/api/follow/:id/stats` | Follower and following counts for user or creator |
| Media assets | Supabase Storage (`users/{id}/` or `entities/{id}/`) | Avatar, banner, event thumbnails, etc. |
| Event list | `/api/events?entityId={id}` | Creator’s upcoming and past events |
| Store data | `/api/store/products?entityId={id}` | Creator’s products for sale |
| Recommendations | `/api/recommendations?userId={id}` | Personalized feed for the user |

---

## 2️⃣ State Structure

```tsx
interface UserProfile {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  followersCount: number;
  followingCount: number;
  layoutPreference: "light" | "dark" | "standard";
  location?: string;
  timezone?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    youtube?: string;
    tiktok?: string;
  };
}

interface CreatorProfile extends UserProfile {
  entityId: string;
  events: EventSummary[];
  products: ProductSummary[];
  posts: PostSummary[];
  followersCount: number;
  followingCount: number;
  stats?: {
    revenue?: number;
    activeStreams?: number;
    totalEvents?: number;
  };
}
