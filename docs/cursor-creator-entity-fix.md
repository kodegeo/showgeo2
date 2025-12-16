# Task: Fix Entity creator application + queries to match Prisma schema

## Scope

- Backend only.
- Do NOT modify the Prisma schema.
- Do NOT change the EntityStatus enum or the `status` field in the Entity model.
- Only change:
  - `backend/src/modules/entities/entities.service.ts`
  - (And DTOs if needed: `backend/src/modules/entities/dto/creator-apply.dto.ts`)

## Goals

1. Keep "purpose" as the UX / DTO concept, but persist it into the `bio` field on the `Entity` model.
2. Ensure all Prisma queries use fields that actually exist on the Entity table (`bio`, not `purpose`).
3. Keep using `status: EntityStatus.PENDING` when creating a creator application.
4. Resolve all TypeScript errors related to Entity fields and status.

---

## Required Changes

### 1) Fix `findAll` search filter

Replace:

```ts
{ purpose: { contains: search, mode: "insensitive" } },
With:

ts
Copy code
{ bio: { contains: search, mode: "insensitive" } },
2) Map purpose → bio when creating an entity
In createCreatorApplication, ensure:

ts
Copy code
bio: purpose,
instead of:

ts
Copy code
purpose: purpose,
Remove any purpose fields being used as Prisma properties.

3) Keep status logic unchanged
Continue using:

ts
Copy code
status: EntityStatus.PENDING
Ensure EntityStatus is imported from @prisma/client.

4) Ensure TypeScript alignment with Prisma-generated types
Fix any leftover TS errors by aligning field names to the current Prisma model.