# Security Audit Report: ownerId/userId/entityId in Request Body/Query Params

**Date:** 2026-01-06  
**Scope:** All controllers and DTOs accepting `ownerId`, `userId`, or `entityId` from request body or query parameters

---

## 🔴 CRITICAL SECURITY ISSUES

### 1. **AssetQueryDto - ownerId in Query Params (PUBLIC ENDPOINT)**
**File:** `backend/src/modules/assets/dto/asset-query.dto.ts:30`  
**Controller:** `AssetsController.list()` (line 133)  
**Endpoint:** `GET /assets` (PUBLIC - no authentication required)

**Issue:**
- Accepts `ownerId` in query params for filtering assets
- Endpoint is `@Public()` - no authentication required
- Service method `listAssets()` (line 436) directly uses `query.ownerId` in WHERE clause
- **Vulnerability:** Unauthenticated users can query assets by any `ownerId` to discover:
  - Which users/entities exist
  - Asset metadata for non-public assets (if query bypasses public filter)

**Current Protection:**
- Line 439-446: If `userId` is not provided, only public assets are returned
- However, if `ownerId` is specified in query, it's still used in the WHERE clause

**Risk Level:** 🟡 **MEDIUM** - Information disclosure, enumeration attack

**Recommendation:**
```typescript
// In listAssets method, if userId is not provided, ignore ownerId filter
if (!userId && query.ownerId) {
  // Remove ownerId from where clause for unauthenticated requests
  delete where.ownerId;
}
```

---

## 🟡 MEDIUM RISK ISSUES

### 2. **PaymentQueryDto - userId/entityId in Query Params**
**File:** `backend/src/modules/payments/dto/payment-query.dto.ts:11,16`  
**Controller:** `PaymentsController.getOrders()` (line 79)  
**Endpoint:** `GET /payments/orders` (Requires authentication)

**Issue:**
- Accepts `userId` and `entityId` in query params
- **Current Protection:** Line 534-538 in `payments.service.ts`:
  - Non-admins: `where.userId = userId` (forced to authenticated user's ID)
  - Admins: Can query by `queryUserId` if provided
- **Vulnerability:** Admin-only feature, but query params are documented in Swagger

**Risk Level:** 🟢 **LOW** (Admin-only, properly protected)

**Status:** ✅ **PROTECTED** - Non-admins cannot query other users' orders

---

### 3. **UploadAssetDto - ownerId in Request Body**
**File:** `backend/src/modules/assets/dto/upload-asset.dto.ts:17`  
**Controller:** `AssetsController.upload()` (line 94)  
**Endpoint:** `POST /assets/upload` (Requires authentication)

**Issue:**
- Accepts `ownerId` in request body
- **Current Protection:** `validateOwnership()` method (line 581-617):
  - For USER assets: `ownerId !== userId && userRole !== ADMIN` → throws ForbiddenException
  - For ENTITY assets: Checks if user is owner/admin/manager of entity
- **Vulnerability:** Users could attempt to upload assets for other users/entities

**Risk Level:** 🟢 **LOW** (Properly validated)

**Status:** ✅ **PROTECTED** - Ownership is validated before upload

---

### 4. **AddCollaboratorDto - userId in Request Body**
**File:** `backend/src/modules/entities/dto/add-collaborator.dto.ts:8`  
**Controller:** `EntitiesController.addCollaborator()` (line 156)  
**Endpoint:** `POST /entities/:id/collaborators` (Requires authentication)

**Issue:**
- Accepts `userId` in request body (the collaborator to add)
- **Current Protection:** 
  - Line 559-562: Checks entity exists and user has collaborator permissions
  - Line 590: Prevents adding owner as collaborator
- **Vulnerability:** Users could attempt to add any user as collaborator

**Risk Level:** 🟢 **LOW** (Entity ownership/collaborator permissions are checked)

**Status:** ✅ **PROTECTED** - Only entity owners/managers can add collaborators

---

### 5. **BulkUploadDto - entityId in Request Body**
**File:** `backend/src/modules/assets/dto/bulk-upload.dto.ts` (referenced)  
**Controller:** `AssetsController.bulkUploadCreatorMedia()` (line 200)  
**Endpoint:** `POST /assets/creator/bulk-upload` (Requires ENTITY/ADMIN role)

**Issue:**
- Accepts `entityId` in request body
- **Current Protection:**
  - Requires `@Roles("ENTITY", "ADMIN")` guard
  - Calls `uploadCreatorMedia()` which validates entity access via `validateOwnership()`
- **Vulnerability:** ENTITY users could attempt to upload for other entities

**Risk Level:** 🟢 **LOW** (Entity access is validated)

**Status:** ✅ **PROTECTED** - Entity ownership/role is validated

---

## 🟢 LOW RISK / ACCEPTABLE

### 6. **StoreQueryDto - entityId in Query Params**
**File:** `backend/src/modules/store/dto/store-query.dto.ts:15`  
**Controller:** `StoreController.findAll()` (line 81)  
**Endpoint:** `GET /stores` (PUBLIC)

**Risk Level:** 🟢 **LOW** - Public browsing endpoint, entityId is for filtering public stores

**Status:** ✅ **ACCEPTABLE** - Public data filtering

---

### 7. **EventQueryDto - entityId in Query Params**
**File:** `backend/src/modules/events/dto/event-query.dto.ts:30`  
**Controller:** `EventsController.findAll()` (line 73)  
**Endpoint:** `GET /events` (PUBLIC)

**Risk Level:** 🟢 **LOW** - Public browsing endpoint, entityId is for filtering public events

**Status:** ✅ **ACCEPTABLE** - Public data filtering

---

### 8. **AdminController.getAuditLogs() - adminId in Query Params**
**File:** `backend/src/modules/admin/admin.controller.ts:440`  
**Endpoint:** `GET /admin/audit-logs` (ADMIN only)

**Risk Level:** 🟢 **LOW** - Admin-only endpoint, filtering by adminId is expected behavior

**Status:** ✅ **ACCEPTABLE** - Admin audit functionality

---

## 📋 SUMMARY

| Endpoint | DTO Field | Source | Risk | Status |
|----------|-----------|--------|------|--------|
| `GET /assets` | `ownerId` | Query | 🟡 MEDIUM | ⚠️ Needs fix |
| `POST /assets/upload` | `ownerId` | Body | 🟢 LOW | ✅ Protected |
| `GET /payments/orders` | `userId`, `entityId` | Query | 🟢 LOW | ✅ Protected |
| `POST /entities/:id/collaborators` | `userId` | Body | 🟢 LOW | ✅ Protected |
| `POST /assets/creator/bulk-upload` | `entityId` | Body | 🟢 LOW | ✅ Protected |
| `GET /stores` | `entityId` | Query | 🟢 LOW | ✅ Acceptable |
| `GET /events` | `entityId` | Query | 🟢 LOW | ✅ Acceptable |
| `GET /admin/audit-logs` | `adminId` | Query | 🟢 LOW | ✅ Acceptable |

---

## 🔧 RECOMMENDED FIXES

### Priority 1: Fix AssetQueryDto ownerId filtering

**File:** `backend/src/modules/assets/assets.service.ts`

```typescript
async listAssets(query: AssetQueryDto, userId?: string): Promise<{...}> {
  const { page = 1, limit = 20, ...restQuery } = query;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (restQuery.type) where.type = restQuery.type;
  if (restQuery.ownerType) where.ownerType = restQuery.ownerType;
  
  // SECURITY FIX: Only allow ownerId filtering for authenticated users
  // and only if they're querying their own assets or have entity access
  if (restQuery.ownerId) {
    if (!userId) {
      // Unauthenticated users cannot filter by ownerId
      // This prevents enumeration attacks
      // They can only see public assets
    } else {
      // Authenticated users can filter by ownerId, but access control
      // is handled by the public/owned filter below
      where.ownerId = restQuery.ownerId;
    }
  }
  
  if (restQuery.isPublic !== undefined) where.isPublic = restQuery.isPublic;

  if (!userId) {
    // Unauthenticated: only public assets
    where.isPublic = true;
  } else {
    // Authenticated: public assets OR own assets
    const publicOrOwned = {
      OR: [
        { isPublic: true },
        { ownerId: userId, ownerType: AssetOwnerType.USER },
        // For entity assets, check if user has access
        // This requires additional query or join
      ],
    };
    where.AND = [publicOrOwned];
    
    // If ownerId was specified, ensure user has access to that owner
    if (restQuery.ownerId && restQuery.ownerType === AssetOwnerType.ENTITY) {
      const hasAccess = await this.checkEntityAccess(restQuery.ownerId, userId);
      if (!hasAccess) {
        // User doesn't have access to this entity's assets
        // Remove ownerId filter or throw error
        throw new ForbiddenException("You do not have access to this entity's assets");
      }
    }
  }

  // ... rest of method
}
```

---

## ✅ VERIFIED PROTECTED ENDPOINTS

The following endpoints properly validate ownership/access:

1. ✅ `POST /assets/upload` - Validates ownership via `validateOwnership()`
2. ✅ `POST /entities/:id/collaborators` - Validates entity permissions
3. ✅ `POST /assets/creator/bulk-upload` - Validates entity access
4. ✅ `GET /payments/orders` - Forces non-admin users to their own orders

---

## 🎯 CONCLUSION

**Overall Security Posture:** 🟡 **GOOD with one medium-risk issue**

Most endpoints properly validate ownership and access. The primary concern is the public `GET /assets` endpoint allowing `ownerId` filtering, which could enable enumeration attacks.

**Action Items:**
1. **HIGH PRIORITY:** Fix `AssetQueryDto` ownerId filtering for unauthenticated requests
2. **MEDIUM PRIORITY:** Add rate limiting to public endpoints to prevent enumeration
3. **LOW PRIORITY:** Consider removing `ownerId` from public API documentation



