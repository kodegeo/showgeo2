# Profile Setup Redirect Issue - Diagnostic Report

**Generated:** 2024-12-09  
**Issue:** After completing ProfileSetupPage, user is redirected back to ProfileSetupPage instead of ProfilePage

---

## Problem Analysis

### Current Flow

1. **User completes ProfileSetupPage form**
   - Fills in: firstName, lastName, location, timezone, avatarUrl
   - Submits form

2. **ProfileSetupPage.handleSubmit()** (lines 138-156)
   ```typescript
   await updateProfile.mutateAsync({ ... });  // Updates profile
   await refetchUser();                        // Refetches user data
   await new Promise(resolve => setTimeout(resolve, 300));  // Waits 300ms
   navigate("/profile", { replace: true });   // Navigates to /profile
   ```

3. **ProfileSetupGuard checks profile** (lines 10-31)
   ```typescript
   useEffect(() => {
     if (isLoading) return;
     if (!user) return;
     
     if (!isProfileComplete && currentPath !== "/profile/setup") {
       navigate("/profile/setup", { replace: true });  // ❌ REDIRECTS BACK
     }
   }, [user, isLoading, isProfileComplete, navigate, location.pathname]);
   ```

4. **isProfileComplete calculation** (useAuth.ts lines 151-159)
   ```typescript
   const profile = prismaUser?.profile;
   const isProfileComplete = !!(
     profile?.firstName &&
     profile?.lastName &&
     profile?.location &&
     profile?.timezone &&
     profile?.avatarUrl
   );
   ```

---

## Root Causes Identified

### 🔴 **CRITICAL ISSUE #1: Race Condition with Query Refetch**

**Problem:**
- `refetchUser()` is called, but it's **asynchronous**
- The 300ms delay doesn't guarantee the query has completed
- `prismaUser` might still contain the **old profile data** when `ProfileSetupGuard` checks
- `isProfileComplete` is calculated from `prismaUser`, which hasn't updated yet

**Evidence:**
- `useQuery` with `staleTime: 5 * 60 * 1000` (5 minutes) means React Query might use cached data
- `invalidateQueries` triggers a refetch, but it's not awaited
- The guard checks `isProfileComplete` immediately after navigation, before the refetch completes

**Location:**
- `frontend/src/pages/ProfileSetupPage.tsx:148-156`
- `frontend/src/hooks/useAuth.ts:26-37` (query definition)
- `frontend/src/components/ProfileSetupGuard.tsx:10-31` (guard check)

---

### 🔴 **CRITICAL ISSUE #2: Query Invalidation Timing**

**Problem:**
- `useUpdateUserProfile` invalidates `["auth", "me"]` query in `onSuccess` (line 64)
- But `refetchUser()` is called **after** the mutation completes
- There's a race condition where:
  1. Mutation completes → invalidates query
  2. `refetchUser()` is called → starts refetch
  3. 300ms delay → might not be enough
  4. Navigate to `/profile` → guard checks immediately
  5. Query refetch might not be done → `prismaUser` still has old data

**Location:**
- `frontend/src/hooks/useUsers.ts:59-65` (mutation onSuccess)
- `frontend/src/pages/ProfileSetupPage.tsx:148` (refetchUser call)

---

### 🟡 **ISSUE #3: isProfileComplete Depends on Query State**

**Problem:**
- `isProfileComplete` is calculated from `prismaUser` which comes from a React Query
- The calculation happens **synchronously** on every render
- If `prismaUser` hasn't updated yet, `isProfileComplete` will be `false` even if the profile was just saved

**Location:**
- `frontend/src/hooks/useAuth.ts:151-159`

---

### 🟡 **ISSUE #4: Guard Effect Dependency Array**

**Problem:**
- The guard's `useEffect` depends on `isProfileComplete`
- But `isProfileComplete` might not update immediately after `prismaUser` updates
- The effect might run before `isProfileComplete` recalculates

**Location:**
- `frontend/src/components/ProfileSetupGuard.tsx:31` (dependency array)

---

### 🟡 **ISSUE #5: Query staleTime Too Long**

**Problem:**
- `staleTime: 5 * 60 * 1000` (5 minutes) means React Query considers data fresh for 5 minutes
- Even after invalidation, if the query refetch hasn't completed, React Query might return stale data
- This could cause `prismaUser` to have old profile data

**Location:**
- `frontend/src/hooks/useAuth.ts:36`

---

## Required Fields Check

### Profile Completeness Requirements (useAuth.ts:153-159)
```typescript
const isProfileComplete = !!(
  profile?.firstName &&      // ✅ Required
  profile?.lastName &&        // ✅ Required
  profile?.location &&        // ✅ Required
  profile?.timezone &&        // ✅ Required
  profile?.avatarUrl          // ✅ Required
);
```

### ProfileSetupPage Form Fields
- ✅ firstName (line 268-280)
- ✅ lastName (line 282-299)
- ✅ location (line 354-371)
- ✅ timezone (line 373-446) - **DROPDOWN SELECT**
- ✅ avatarUrl (line 252-260) - via AvatarUpload component

**All required fields are present in the form.**

---

## Data Flow Analysis

### Step-by-Step Execution

1. **User submits form** → `handleSubmit` called
2. **Mutation starts** → `updateProfile.mutateAsync()` 
3. **Mutation completes** → `onSuccess` callback runs:
   - Sets query data: `queryClient.setQueryData(["users", variables.id], data)`
   - Invalidates queries: `queryClient.invalidateQueries({ queryKey: ["auth", "me"] })`
4. **refetchUser() called** → Starts async refetch of `["auth", "me"]` query
5. **300ms delay** → Waits (but refetch might not be done)
6. **Navigate to /profile** → Router navigates
7. **ProfileSetupGuard mounts** → Checks `isProfileComplete`
8. **isProfileComplete calculated** → Based on `prismaUser?.profile`
9. **❌ PROBLEM:** `prismaUser` might still have old data because:
   - Query refetch is still in progress
   - React Query might return cached/stale data
   - The `prismaUser` state hasn't updated yet
10. **Guard redirects** → Back to `/profile/setup` because `isProfileComplete === false`

---

## Solutions

### ✅ **Solution 1: Wait for Query to Actually Complete**

Instead of a fixed delay, wait for the query refetch to actually complete:

```typescript
// In ProfileSetupPage.tsx
await updateProfile.mutateAsync({ ... });

// Wait for the query to actually refetch and update
const { data: updatedUser } = await refetchUser();

// Verify the profile is complete before navigating
if (updatedUser?.profile?.firstName && 
    updatedUser?.profile?.lastName && 
    updatedUser?.profile?.location && 
    updatedUser?.profile?.timezone && 
    updatedUser?.profile?.avatarUrl) {
  navigate("/profile", { replace: true });
} else {
  // Still incomplete, stay on page or show error
  setErrors({ submit: "Please complete all required fields" });
}
```

### ✅ **Solution 2: Use Query State to Wait for Loading**

Check if the query is still loading before navigating:

```typescript
// In ProfileSetupPage.tsx
await updateProfile.mutateAsync({ ... });
await refetchUser();

// Wait for query to finish loading
let retries = 0;
while (retries < 10) {
  const { data: currentUser } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authService.getCurrentUser(),
  });
  
  if (currentUser?.profile?.firstName && 
      currentUser?.profile?.lastName && 
      currentUser?.profile?.location && 
      currentUser?.profile?.timezone && 
      currentUser?.profile?.avatarUrl) {
    navigate("/profile", { replace: true });
    break;
  }
  
  await new Promise(resolve => setTimeout(resolve, 100));
  retries++;
}
```

### ✅ **Solution 3: Update Query Data Directly**

Instead of invalidating and refetching, directly update the query cache with the new data:

```typescript
// In useUpdateUserProfile onSuccess
onSuccess: (data, variables) => {
  // Update users query
  queryClient.setQueryData(["users", variables.id], data);
  
  // Update auth query directly with new user data
  queryClient.setQueryData(["auth", "me"], data);
  
  // Still invalidate to trigger any dependent queries
  queryClient.invalidateQueries({ queryKey: ["users", variables.id] });
  queryClient.invalidateQueries({ queryKey: ["users"] });
}
```

### ✅ **Solution 4: Use Optimistic Updates**

Update the query cache optimistically before the mutation completes:

```typescript
// In ProfileSetupPage.tsx
const queryClient = useQueryClient();

await updateProfile.mutateAsync({ ... }, {
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ["auth", "me"] });
    
    // Snapshot previous value
    const previousUser = queryClient.getQueryData(["auth", "me"]);
    
    // Optimistically update
    queryClient.setQueryData(["auth", "me"], (old: any) => ({
      ...old,
      profile: { ...old?.profile, ...newData.data }
    }));
    
    return { previousUser };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(["auth", "me"], context.previousUser);
  },
  onSettled: () => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
  }
});
```

---

## Recommended Fix

**Use Solution 3 (Direct Query Data Update) + Solution 1 (Wait for Refetch)**

This ensures:
1. The query cache is updated immediately with the new data
2. We verify the data is actually complete before navigating
3. No race conditions with async refetches

---

## Additional Issues Found

### Issue: ProfileSetupGuard Loading State

The guard shows a loading state when `isLoading` is true, but `isLoading` comes from `authState.isLoading`, not `isLoadingUser`. This means:
- The guard might show loading even when the user query is still loading
- The guard might not wait for the user query to complete before checking profile completeness

**Fix:** Check both `isLoading` and `isLoadingUser`:

```typescript
if (isLoading || isLoadingUser) {
  return <LoadingState />;
}
```

---

## Testing Checklist

After implementing fixes, verify:

1. ✅ First-time user registers → Redirected to `/profile/setup`
2. ✅ User completes all required fields → Can navigate to `/profile`
3. ✅ User saves profile → Redirected to `/profile` (not back to setup)
4. ✅ Returning user logs in → Goes directly to `/profile` (not setup)
5. ✅ User with incomplete profile → Redirected to `/profile/setup`
6. ✅ User tries to access `/profile/setup` after completing → Redirected to `/profile`

---

## Files That Need Changes

1. **`frontend/src/hooks/useUsers.ts`** - Update mutation `onSuccess` to set query data directly
2. **`frontend/src/pages/ProfileSetupPage.tsx`** - Wait for actual query completion before navigating
3. **`frontend/src/components/ProfileSetupGuard.tsx`** - Check `isLoadingUser` in addition to `isLoading`
4. **`frontend/src/hooks/useAuth.ts`** - Consider reducing `staleTime` or making it configurable



