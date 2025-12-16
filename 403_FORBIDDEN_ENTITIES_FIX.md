# 403 Forbidden Error on `/users/:id/entities` - Fix Summary

## Error
```
GET http://localhost:3000/api/users/9683ed55-f225-4e26-b0a7-6cd45e1caf35/entities 403 (Forbidden)
```

## Root Cause

The backend endpoint `/users/:id/entities` checks if the authenticated user's ID matches the requested user ID:

```typescript
if (user.id !== id && user.role !== UserRole.ADMIN) {
  throw new ForbiddenException("You can only view your own entities");
}
```

The 403 error occurs when:
1. The authenticated user's ID doesn't match the requested ID in the URL
2. The user is not an ADMIN
3. There might be a type mismatch (string vs UUID format)

## Fixes Applied

### 1. Backend Controller (`backend/src/modules/users/users.controller.ts`)
- Added null check for `user` object
- Added explicit string conversion for ID comparison to handle UUID string comparisons
- Improved error message to show both authenticated user ID and requested ID for debugging

```typescript
findEntities(@Param("id") id: string, @CurrentUser() user: User) {
  // Ensure user is authenticated
  if (!user) {
    throw new ForbiddenException("User not authenticated");
  }

  // Users can only view their own entities
  // Convert both to strings to handle potential type mismatches (UUID strings)
  const userId = String(user.id || "");
  const paramId = String(id || "");
  
  if (userId !== paramId && user.role !== UserRole.ADMIN) {
    throw new ForbiddenException(
      `You can only view your own entities. Authenticated user ID: ${userId}, Requested ID: ${paramId}`
    );
  }
  
  return this.usersService.findEntities(id);
}
```

### 2. Frontend Hook (`frontend/src/hooks/useUsers.ts`)
- Improved `enabled` condition to check for non-empty string

```typescript
export function useUserEntities(userId: string) {
  return useQuery({
    queryKey: ["users", userId, "entities"],
    queryFn: () => usersService.getEntities(userId),
    enabled: !!userId && userId.trim() !== "", // Only enable if userId is a valid non-empty string
  });
}
```

## Debugging

The improved error message will now show:
- The authenticated user's ID (from `@CurrentUser()`)
- The requested user ID (from the URL parameter)

This will help identify if:
- The user object is not being set correctly by the guard
- There's a UUID format mismatch
- The frontend is requesting a different user's entities

## Next Steps

1. **Check the error message** - The new error message will show both IDs to help identify the mismatch
2. **Verify authentication** - Ensure the Supabase token is being sent correctly in the Authorization header
3. **Check user object** - Verify that `@CurrentUser()` is returning the correct user with the correct `id` property
4. **Verify frontend** - Ensure the frontend is only requesting entities for the authenticated user's ID

## Common Causes

1. **Token mismatch**: The Supabase token might be for a different user
2. **User not found**: The `verifySupabaseToken` might not be finding the correct user in the database
3. **ID format**: UUID strings might have different formats (with/without dashes, uppercase/lowercase)
4. **Race condition**: The user might not be fully authenticated when the request is made

