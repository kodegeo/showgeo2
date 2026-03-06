# Transaction Audit Report: Entity and Entity Application Creation

**Date:** 2026-01-06  
**Scope:** All flows that create `entities` or `entity_applications` records

---

## 📋 Summary

| Flow | File | Method | Uses Transaction? | Risk Level |
|------|------|--------|-------------------|------------|
| Create Entity (Direct) | `entities.service.ts` | `createEntity()` | ❌ NO | 🟡 MEDIUM |
| Create Creator Application | `entities.service.ts` | `createCreatorApplication()` | ❌ NO | 🟢 LOW* |
| Convert User to Entity | `users.service.ts` | `convertToEntity()` | ❌ NO | 🔴 HIGH |
| Promote User to Entity | `users.service.ts` | `promoteUserToEntity()` | ✅ YES | 🟢 LOW |

\* Uses nested Prisma create (atomic at DB level, but not explicit transaction)

---

## 🔴 HIGH RISK: Non-Transactional Flows

### 1. **UsersService.convertToEntity() - Entity + User Role Update**

**File:** `backend/src/modules/users/users.service.ts:495`  
**Controller:** `UsersController.convertToEntity()` (line 150)  
**Endpoint:** `POST /users/:id/convert-to-entity`

**Code Flow:**
```typescript
// Line 525-556: Create entity + entity_roles (nested create - atomic)
const entity = await (this.prisma as any).entities.create({
  data: {
    ...convertToEntityDto,
    ownerId: userId,
    entity_roles: {
      create: {
        userId,
        role: EntityRoleType.OWNER,
      },
    },
  },
  // ... includes
});

// Line 559-564: SEPARATE UPDATE - NOT IN TRANSACTION
if (user.role === UserRole.USER) {
  await (this.prisma as any).app_users.update({
    where: { id: userId },
    data: { role: UserRole.ENTITY },
  });
}
```

**Risk Analysis:**
- **Data Integrity Risk:** 🔴 **HIGH**
  - Entity is created successfully
  - User role update happens in a separate operation
  - If user role update fails, entity exists but user is still `USER` role
  - Creates inconsistent state: entity exists but user cannot access it properly

**Failure Scenarios:**
1. Entity created → User role update fails → Entity orphaned (user can't access)
2. Entity created → Database connection lost → User role never updated
3. Entity created → Constraint violation on user update → Partial state

**Impact:**
- User has an entity but cannot access it (role mismatch)
- Admin workflows may break (expecting user.role === ENTITY)
- Frontend may show incorrect state

**Recommendation:**
```typescript
// Wrap in transaction
const entity = await (this.prisma as any).$transaction(async (tx: any) => {
  const newEntity = await tx.entities.create({
    data: {
      ...convertToEntityDto,
      ownerId: userId,
      entity_roles: {
        create: {
          userId,
          role: EntityRoleType.OWNER,
        },
      },
    },
    // ... includes
  });

  // Update user role atomically
  if (user.role === UserRole.USER) {
    await tx.app_users.update({
      where: { id: userId },
      data: { role: UserRole.ENTITY },
    });
  }

  return newEntity;
});
```

---

## 🟡 MEDIUM RISK: Non-Transactional Flows

### 2. **EntitiesService.createEntity() - Entity Only (No Application)**

**File:** `backend/src/modules/entities/entities.service.ts:39`  
**Controller:** `EntitiesController.create()` (line 69)  
**Endpoint:** `POST /entities`  
**Requires:** `ENTITY` or `ADMIN` role

**Code Flow:**
```typescript
// Line 71-102: Single create operation (nested entity_roles)
const entity = await (this.prisma as any).entities.create({
  data: {
    ...createData,
    entity_roles: {
      create: {
        userId: ownerId,
        role: EntityRoleType.OWNER,
      },
    },
  },
  // ... includes
});
```

**Risk Analysis:**
- **Data Integrity Risk:** 🟡 **MEDIUM**
  - Uses nested Prisma create for entity + entity_roles
  - Prisma nested creates are atomic at the database level
  - However, no explicit transaction wrapper
  - If any validation/check fails after creation, no rollback mechanism

**Failure Scenarios:**
1. Entity created → Subsequent validation fails → Entity exists but invalid
2. Entity created → Application logic error → Entity orphaned
3. Entity created → Network timeout → Partial state

**Impact:**
- Lower risk because entity + entity_roles are created atomically
- No separate operations that could fail independently
- Main risk is application-level errors after creation

**Status:** ⚠️ **ACCEPTABLE** - Nested create is atomic, but consider wrapping in transaction for consistency

---

## 🟢 LOW RISK: Properly Transactional or Atomic

### 3. **EntitiesService.createCreatorApplication() - Entity + Application**

**File:** `backend/src/modules/entities/entities.service.ts:259`  
**Controller:** `EntitiesController.creatorApply()` (line 55)  
**Endpoint:** `POST /entities/creator-apply`

**Code Flow:**
```typescript
// Line 365-403: Single create with nested entity_roles + entity_applications
const entity = await (this.prisma as any).entities.create({
  data: {
    ...createData,
    entity_roles: {
      create: {
        userId,
        role: EntityRoleType.OWNER,
      },
    },
    entity_applications: {
      create: {
        id: randomUUID(),
        owner_id: userId,
        status: "PENDING",
        proof: applicationDto.proof || null,
      },
    },
  },
  // ... includes
});
```

**Risk Analysis:**
- **Data Integrity Risk:** 🟢 **LOW**
  - Uses nested Prisma create for entity + entity_roles + entity_applications
  - All three records created atomically in a single database operation
  - Prisma ensures atomicity at the database level
  - No separate operations that could fail independently

**Status:** ✅ **SAFE** - Nested creates are atomic, all related records created together

**Note:** While not using an explicit `$transaction`, Prisma's nested create operations are atomic. However, for consistency with other flows and to handle application-level errors, consider wrapping in a transaction.

---

### 4. **UsersService.promoteUserToEntity() - Entity + User Role Update**

**File:** `backend/src/modules/users/users.service.ts:577`  
**Controller:** `UsersController.promoteToEntity()` (line 205)  
**Endpoint:** `POST /users/:id/promote-to-entity`  
**Requires:** `ADMIN` role

**Code Flow:**
```typescript
// Line 610-661: WRAPPED IN TRANSACTION ✅
const entity = await (this.prisma as any).$transaction(async (tx: any) => {
  // Create entity + entity_roles
  const newEntity = await tx.entities.create({
    data: {
      ...createData,
      entity_roles: {
        create: {
          userId,
          role: EntityRoleType.OWNER,
        },
      },
    },
    // ... includes
  });

  // Update user role atomically
  await tx.app_users.update({
    where: { id: userId },
    data: {
      role: UserRole.ENTITY,
    },
  });

  return newEntity;
});
```

**Risk Analysis:**
- **Data Integrity Risk:** 🟢 **LOW**
  - ✅ Uses explicit `$transaction` wrapper
  - ✅ Entity creation and user role update are atomic
  - ✅ If any operation fails, entire transaction rolls back
  - ✅ No partial state possible

**Status:** ✅ **SAFE** - Properly transactional

---

## 📊 Detailed Analysis

### Transaction Usage Comparison

| Method | Entity Create | Entity Roles | Entity Application | User Role Update | Transaction? |
|--------|--------------|--------------|-------------------|------------------|--------------|
| `createEntity()` | ✅ Nested | ✅ Nested | ❌ N/A | ❌ N/A | ❌ No |
| `createCreatorApplication()` | ✅ Nested | ✅ Nested | ✅ Nested | ❌ N/A | ⚠️ Implicit* |
| `convertToEntity()` | ✅ Nested | ✅ Nested | ❌ N/A | ❌ Separate | ❌ No |
| `promoteUserToEntity()` | ✅ In tx | ✅ Nested | ❌ N/A | ✅ In tx | ✅ Yes |

\* Prisma nested creates are atomic, but not an explicit transaction wrapper

---

## 🔍 Risk Breakdown

### Risk 1: Partial Entity Creation (convertToEntity)

**Scenario:**
```
1. Entity created successfully ✅
2. entity_roles created successfully ✅
3. User role update fails ❌
   → Entity exists but user.role = USER
   → User cannot properly access entity
   → Inconsistent application state
```

**Likelihood:** Medium (database errors, network issues, constraint violations)  
**Impact:** High (broken user experience, data inconsistency)  
**Severity:** 🔴 **HIGH**

---

### Risk 2: Application-Level Errors After Creation

**Scenario:**
```
1. Entity created successfully ✅
2. Application logic after creation fails
   → Entity exists but application state is invalid
   → No rollback mechanism
```

**Likelihood:** Low (application errors are usually caught before DB writes)  
**Impact:** Medium (orphaned records, cleanup needed)  
**Severity:** 🟡 **MEDIUM**

---

## 🎯 Recommendations

### Priority 1: Fix convertToEntity() Transaction

**File:** `backend/src/modules/users/users.service.ts:495`

**Current Code:**
```typescript
// Line 525-556: Create entity
const entity = await (this.prisma as any).entities.create({...});

// Line 559-564: Update user role (SEPARATE - NOT ATOMIC)
if (user.role === UserRole.USER) {
  await (this.prisma as any).app_users.update({...});
}
```

**Recommended Fix:**
```typescript
// Wrap entire operation in transaction
const entity = await (this.prisma as any).$transaction(async (tx: any) => {
  // Create entity + entity_roles
  const newEntity = await tx.entities.create({
    data: {
      ...convertToEntityDto,
      ownerId: userId,
      entity_roles: {
        create: {
          userId,
          role: EntityRoleType.OWNER,
        },
      },
    },
    include: {
      app_users: {
        select: {
          id: true,
          email: true,
          user_profiles: true,
        },
      },
      entity_roles: {
        include: {
          app_users: {
            select: {
              id: true,
              email: true,
              user_profiles: true,
            },
          },
        },
      },
    },
  });

  // Update user role atomically
  if (user.role === UserRole.USER) {
    await tx.app_users.update({
      where: { id: userId },
      data: { role: UserRole.ENTITY },
    });
  }

  return newEntity;
});
```

---

### Priority 2: Consider Transaction Wrapper for createEntity()

**File:** `backend/src/modules/entities/entities.service.ts:39`

**Recommendation:**
While nested creates are atomic, wrapping in a transaction provides:
- Consistent error handling
- Ability to add additional operations later
- Consistency with other flows

**Optional Fix:**
```typescript
const entity = await (this.prisma as any).$transaction(async (tx: any) => {
  return await tx.entities.create({
    data: {
      ...createData,
      entity_roles: {
        create: {
          userId: ownerId,
          role: EntityRoleType.OWNER,
        },
      },
    },
    // ... includes
  });
});
```

---

### Priority 3: Consider Transaction Wrapper for createCreatorApplication()

**File:** `backend/src/modules/entities/entities.service.ts:259`

**Recommendation:**
While nested creates are atomic, wrapping in a transaction provides:
- Consistent pattern with other flows
- Ability to add validation/cleanup operations
- Better error handling

**Optional Fix:**
```typescript
const entity = await (this.prisma as any).$transaction(async (tx: any) => {
  return await tx.entities.create({
    data: {
      ...createData,
      entity_roles: {
        create: {
          userId,
          role: EntityRoleType.OWNER,
        },
      },
      entity_applications: {
        create: {
          id: randomUUID(),
          owner_id: userId,
          status: "PENDING",
          proof: applicationDto.proof || null,
        },
      },
    },
    // ... includes
  });
});
```

---

## ✅ Verification Checklist

- [x] Identified all entity creation flows
- [x] Identified all entity_application creation flows
- [x] Checked transaction usage for each flow
- [x] Analyzed data integrity risks
- [x] Documented failure scenarios
- [x] Provided specific code recommendations

---

## 📝 Notes

1. **Prisma Nested Creates:** Prisma's nested `create` operations are atomic at the database level, but they don't provide application-level transaction boundaries. If application logic fails after the create, there's no automatic rollback.

2. **Explicit Transactions:** Using `$transaction` provides:
   - Application-level atomicity
   - Consistent error handling
   - Ability to add additional operations
   - Better debugging and logging

3. **Pattern Consistency:** Using transactions consistently across all entity creation flows makes the codebase more maintainable and predictable.

---

## 🎯 Conclusion

**Critical Issue:** 1 flow (`convertToEntity`) creates entity and updates user role separately, risking data inconsistency.

**Recommendation:** Fix `convertToEntity()` to use a transaction. Consider adding transaction wrappers to other flows for consistency, though they're lower priority since nested creates are atomic.



