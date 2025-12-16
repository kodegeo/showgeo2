# Profile State Context

## Purpose
Defines the shared profile state management across the Showgeo frontend, covering both `User` and `Creator` profiles.  
Ensures consistent data flow, persistence between routes, and efficient revalidation after updates or uploads.

---

## 1️⃣ Overview

Profile context provides a centralized store for:
- Logged-in user data
- Active creator (entity) context
- Follow/follower stats
- Profile completion percentage
- Layout preference (light, dark, standard)
- Revalidation and synchronization triggers

It connects all profile-related components across:
- `/profile` (User)
- `/creator/:id` (Creator)
- `/dashboard` (Creator Dashboard)
- `/events` and `/store` pages

---

## 2️⃣ State Architecture

### Context Files
| File | Description |
|------|--------------|
| `/src/contexts/ProfileContext.tsx` | Holds user and creator profile state, syncs with backend |
| `/src/contexts/EntityContext.tsx` | Handles active entity switching (creator selection) |
| `/src/contexts/AuthContext.tsx` | Manages auth tokens and base user session |
| `/src/hooks/useProfile.ts` | Unified hook for loading, updating, and refreshing profiles |

---

## 3️⃣ State Interface

```tsx
interface ProfileState {
  currentUser: UserProfile | null;
  currentCreator: CreatorProfile | null;
  activeProfileType: "USER" | "CREATOR";
  isLoading: boolean;
  isRefreshing: boolean;
  profileCompletion: number;
  layoutPreference: "standard" | "dark" | "light";
}

interface ProfileContextValue extends ProfileState {
  refreshProfile: () => Promise<void>;
  switchToCreator: (entityId: string) => void;
  switchToUser: () => void;
  updateProfile: (data: Partial<UserProfile | CreatorProfile>) => Promise<void>;
}
