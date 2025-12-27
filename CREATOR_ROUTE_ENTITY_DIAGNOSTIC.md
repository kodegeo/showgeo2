# Creator Route Entity Diagnostic Report

**Date:** December 19, 2025  
**Issue:** `/creator/events` renders "No entity found" despite user having entities  
**Status:** ROOT CAUSE IDENTIFIED

---

## 1. Observed Behavior

**UI Behavior:**
- Route `/creator/events` renders "No entity found" message
- User has `isEntity = true` in Supabase
- Backend `/entities/:id` endpoint works correctly
- `useUserEntities` successfully fetches owned/managed entities
- Console logs show `entitiesData` exists with valid entities

**Console Evidence:**
- `[CreatorRoute]` logs show `hasEntities: true`, `currentEntity: null`
- `CreatorEventsPage` logs show `currentEntity: null` or `undefined`
- `useEvents` hook receives `entityId: undefined` because `currentEntity?.id` is null

---

## 2. Root Cause

**Primary Cause:** Race condition in `CreatorRoute` guard logic at lines 108-116.

The guard checks `if (requireEntity && !currentEntity && hasEntities)` and calls `switchToEntity()`, but **does not await** the async operation. The component renders `<CreatorProviders>{children}</CreatorProviders>` before `switchToEntity()` completes, allowing child components to mount with `currentEntity === null`.

**Exact Problem Location:** `CreatorRoute.tsx` lines 108-116

```typescript
// 6️⃣ Creator has entities but none selected
if (requireEntity && !currentEntity && hasEntities) {
  const firstEntity = entitiesData?.owned?.[0] || entitiesData?.managed?.[0];
  
  if (firstEntity) {
    switchToEntity(firstEntity.id);  // ❌ NOT AWAITED
    return <LoadingScreen message="Setting up your creator workspace…" />;
  }
}
```

**Why This Fails:**
- `switchToEntity()` is async (line 38-54 in `useEntityContext.ts`)
- The guard returns `<LoadingScreen>` but React may re-render before `switchToEntity()` completes
- The `useEffect` at lines 53-68 also calls `switchToEntity()` but has a dependency race condition
- Both code paths can execute simultaneously, causing inconsistent state

---

## 3. Why This Happens

**Lifecycle Issue:**

1. **Initial Render:**
   - `CreatorRoute` mounts
   - `entitiesLoading: true` → shows `<LoadingScreen>`
   - `entitiesData` loads → `hasEntities: true`
   - `currentEntity: null` (from localStorage or initial state)

2. **Guard Evaluation (Line 108):**
   - Condition `requireEntity && !currentEntity && hasEntities` is `true`
   - Calls `switchToEntity(firstEntity.id)` **without await**
   - Returns `<LoadingScreen>` immediately

3. **Race Condition:**
   - `switchToEntity()` starts async fetch (`entitiesService.getById()`)
   - React may re-render before fetch completes
   - Guard condition re-evaluates: `currentEntity` is still `null`
   - Guard may pass through to line 119, rendering `<CreatorProviders>`
   - Child `CreatorEventsPage` mounts with `currentEntity === null`

4. **Entity Auto-Binding Failure:**
   - The `useEffect` at lines 53-68 has `switchToEntity` in dependencies
   - This creates a dependency loop: `switchToEntity` changes → effect runs → calls `switchToEntity` → function reference changes → effect runs again
   - The effect may not complete before guard logic renders children

**Architectural Mismatch:**

- `useEntityContext()` is **not a React Context** — it's a hook using `useLocalStorage`
- Each component calling `useEntityContext()` gets its own isolated state
- `CreatorRoute` and `CreatorEventsPage` have separate `currentEntity` instances
- No shared state synchronization between guard and child components

---

## 4. Minimal Fix

**Fix Location:** `frontend/src/components/CreatorRoute.tsx`

**Change:** Make guard logic await entity selection before rendering children.

```typescript
// 6️⃣ Creator has entities but none selected
if (requireEntity && !currentEntity && hasEntities) {
  const firstEntity =
    entitiesData?.owned?.[0] || entitiesData?.managed?.[0];

  if (firstEntity) {
    // ✅ CRITICAL: Show loading while entity loads, prevent children from mounting
    if (entityLoading) {
      return <LoadingScreen message="Setting up your creator workspace…" />;
    }
    // ✅ If we reach here and still no entity, trigger switch (useEffect handles it)
    // The useEffect at line 53 will call switchToEntity, and entityLoading will be true
    // on next render, so we'll show loading screen
    return <LoadingScreen message="Setting up your creator workspace…" />;
  }
}
```

**Better Fix:** Remove duplicate logic, rely solely on `useEffect`:

```typescript
// 6️⃣ Creator has entities but none selected - wait for useEffect to complete
if (requireEntity && !currentEntity && hasEntities) {
  // useEffect at line 53 handles switchToEntity
  // Show loading while entity is being loaded
  if (entityLoading) {
    return <LoadingScreen message="Setting up your creator workspace…" />;
  }
  // If loading completes but still no entity, something failed
  // Fall through to show children (they'll handle null entity gracefully)
}
```

**Recommended Fix:** Simplify guard to wait for entity loading:

```typescript
// 6️⃣ Creator has entities but none selected
if (requireEntity && !currentEntity && hasEntities) {
  // useEffect handles switchToEntity automatically
  // Show loading while entity loads
  return <LoadingScreen message="Setting up your creator workspace…" />;
}
```

**Remove the duplicate `switchToEntity` call at lines 108-116** — the `useEffect` at lines 53-68 already handles this.

---

## 5. Why This Fix Is Correct

**Authority Model Alignment:**

- **Supabase = Authority:** User's `isEntity` flag is the source of truth for creator status
- **Prisma = Persistence:** Entities are fetched via `useUserEntities` (backend `/users/:id/entities`)
- **UI = Derived State:** `currentEntity` is UI state derived from localStorage + API fetch

**Fix Rationale:**

1. **Eliminates Race Condition:** By showing `<LoadingScreen>` whenever `currentEntity` is null but entities exist, we prevent children from mounting until entity selection completes.

2. **Single Source of Truth:** The `useEffect` at lines 53-68 is the **only** place that should call `switchToEntity()` for auto-selection. Removing the duplicate call at line 113 prevents conflicting state updates.

3. **Respects Async Nature:** `switchToEntity()` is async and sets `entityLoading: true`. The guard should check `entityLoading` and wait, not call `switchToEntity()` synchronously.

4. **Minimal Change:** Only removes duplicate logic, doesn't change architecture or add new abstractions.

**Expected Behavior After Fix:**

1. User navigates to `/creator/events`
2. `CreatorRoute` guard sees `hasEntities: true`, `currentEntity: null`
3. `useEffect` calls `switchToEntity(firstEntityId)`
4. Guard shows `<LoadingScreen>` because `currentEntity` is still null
5. `switchToEntity()` completes, `currentEntity` is set
6. Guard re-evaluates, `currentEntity` exists, renders `<CreatorProviders>`
7. `CreatorEventsPage` mounts with `currentEntity` populated

---

## Summary

**Root Cause:** Duplicate `switchToEntity()` call in guard logic that doesn't await completion, allowing children to mount before entity selection finishes.

**Fix:** Remove duplicate `switchToEntity()` call at line 113, rely solely on `useEffect` for auto-selection, and show loading screen while `entityLoading` is true.

**Impact:** Minimal — removes 4 lines of duplicate logic, preserves existing architecture.



