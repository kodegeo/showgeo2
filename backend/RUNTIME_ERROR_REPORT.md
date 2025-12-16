# Backend Runtime Error Report

Generated: 2024-12-09

## Summary

This report identifies potential runtime errors in the backend codebase related to Prisma schema mismatches, invalid type imports, incorrect relation names, and other inconsistencies.

---

## 1. Invalid Prisma Model Access

| File Path | Problem Found | Code Snippet | Recommended Fix |
|-----------|---------------|--------------|-----------------|
| `backend/src/modules/payments/payments.service.ts` (12 occurrences) | Using `prisma.order` instead of `prisma.orders` | `(this.prisma as any).order.findUnique(...)` | Replace all `prisma.order` with `prisma.orders` |
| `backend/src/modules/payments/payments.service.ts:69` | Using `prisma.order.create` | `const order = await (this.prisma as any).order.create({` | Change to `(this.prisma as any).orders.create({` |
| `backend/src/modules/payments/payments.service.ts:121` | Using `prisma.order.update` | `await (this.prisma as any).order.update({` | Change to `(this.prisma as any).orders.update({` |
| `backend/src/modules/payments/payments.service.ts:180` | Using `prisma.order.findUnique` | `const order = await (this.prisma as any).order.findUnique({` | Change to `(this.prisma as any).orders.findUnique({` |
| `backend/src/modules/payments/payments.service.ts:191` | Using `prisma.order.update` | `await (this.prisma as any).order.update({` | Change to `(this.prisma as any).orders.update({` |
| `backend/src/modules/payments/payments.service.ts:251` | Using `prisma.order.update` | `await (this.prisma as any).order.update({` | Change to `(this.prisma as any).orders.update({` |
| `backend/src/modules/payments/payments.service.ts:260` | Using `prisma.order.findUnique` | `const order = await (this.prisma as any).order.findUnique({` | Change to `(this.prisma as any).orders.findUnique({` |
| `backend/src/modules/payments/payments.service.ts:290` | Using `prisma.order.update` | `await (this.prisma as any).order.update({` | Change to `(this.prisma as any).orders.update({` |
| `backend/src/modules/payments/payments.service.ts:332` | Using `prisma.order.update` | `await (this.prisma as any).order.update({` | Change to `(this.prisma as any).orders.update({` |
| `backend/src/modules/payments/payments.service.ts:349` | Using `prisma.order.findUnique` | `const order = await (this.prisma as any).order.findUnique({` | Change to `(this.prisma as any).orders.findUnique({` |
| `backend/src/modules/payments/payments.service.ts:396` | Using `prisma.order.update` | `await (this.prisma as any).order.update({` | Change to `(this.prisma as any).orders.update({` |
| `backend/src/modules/payments/payments.service.ts:403` | Using `prisma.order.update` | `await (this.prisma as any).order.update({` | Change to `(this.prisma as any).orders.update({` |
| `backend/src/modules/payments/payments.service.ts:501` | Using `prisma.order.findUnique` | `const order = await (this.prisma as any).order.findUnique({` | Change to `(this.prisma as any).orders.findUnique({` |

---

## 2. Invalid Property Access: Typo `entities_events_entityIdToentitiesd`

| File Path | Problem Found | Code Snippet | Recommended Fix |
|-----------|---------------|--------------|-----------------|
| `backend/src/modules/payments/payments.service.ts:56` | Typo: `entities_events_entityIdToentitiesd` (extra 'd') | `entityId = event.entities_events_entityIdToentitiesd;` | Change to `event.entityId` (direct field access) |
| `backend/src/modules/payments/payments.service.ts:65` | Typo: `entities_events_entityIdToentitiesd` (extra 'd') | `entityId = store.entities_events_entityIdToentitiesd;` | Change to `store.entityId` (direct field access) |
| `backend/src/modules/follow/follow.service.ts:152` | Typo: `entities_events_entityIdToentitiesd` (extra 'd') | `entityId: follow.entities_events_entityIdToentitiesd,` | Change to `follow.entityId` (direct field access) |
| `backend/src/modules/follow/follow.service.ts:217` | Typo: `entities_events_entityIdToentitiesd` (extra 'd') | `entityId: follow.entities_events_entityIdToentitiesd,` | Change to `follow.entityId` (direct field access) |
| `backend/src/modules/follow/follow.service.ts:283` | Typo: `entities_events_entityIdToentitiesd` (extra 'd') | `return follows.map((follow) => follow.entities_events_entityIdToentitiesd);` | Change to `follow.entityId` (direct field access) |
| `backend/src/modules/events/events.service.ts:99` | Typo: `entities_events_entityIdToentitiesd` (extra 'd') | `if (entityId) where.entities_events_entityIdToentitiesd = entityId;` | Change to `where.entityId = entityId;` |
| `backend/src/modules/events/events.service.ts:220` | Typo: `entities_events_entityIdToentitiesd` (extra 'd') | `if (updateData.entityId !== undefined) data.entities_events_entityIdToentitiesd = updateData.entityId;` | Change to `data.entityId = updateData.entityId;` |
| `backend/src/modules/store/store.service.ts:42` | Typo: `entities_events_entityIdToentitiesd` (extra 'd') | `if (event.entities_events_entityIdToentitiesd !== entityId) {` | Change to `event.entityId !== entityId` |
| `backend/src/modules/store/store.service.ts:234` | Typo: `entities_events_entityIdToentitiesd` (extra 'd') | `if (entityId) where.entities_events_entityIdToentitiesd = entityId;` | Change to `where.entityId = entityId;` |
| `backend/src/modules/store/store.service.ts:510` | Typo: `entities_events_entityIdToentitiesd` (extra 'd') | `if (store.entities_events_entityIdToentitiesd && store.entities.ownerId !== userId && userRole !== UserRole.ADMIN) {` | Change to `store.entityId` and fix logic |
| `backend/src/modules/streaming/streaming.service.ts:82` | Typo: `entities_events_entityIdToentitiesd` (extra 'd') | `entityId: event.entities_events_entityIdToentitiesd,` | Change to `event.entityId` |
| `backend/src/modules/streaming/streaming.service.ts:482` | Typo: `entities_events_entityIdToentitiesd` (extra 'd') | `where: { id: event.entities_events_entityIdToentitiesd },` | Change to `event.entityId` |
| `backend/src/modules/streaming/streaming.service.ts:506` | Typo: `entities_events_entityIdToentitiesd` (extra 'd') | `entityId: event.entities_events_entityIdToentitiesd,` | Change to `event.entityId` |

---

## 3. Invalid Relation Includes

| File Path | Problem Found | Code Snippet | Recommended Fix |
|-----------|---------------|--------------|-----------------|
| `backend/src/modules/events/events.service.ts:117` | Invalid relation: `entity` | `include: { entity: true, ... }` | Change to `entities_events_entityIdToentities: true` |
| `backend/src/modules/events/events.service.ts:118` | Invalid relation: `coordinator` | `include: { coordinator: { ... } }` | Change to `app_users: { ... }` |
| `backend/src/modules/events/events.service.ts:122` | Invalid relation: `profile` | `select: { profile: true }` | Change to `user_profiles: true` |
| `backend/src/modules/events/events.service.ts:125` | Invalid relation: `tour` | `include: { tour: true }` | Change to `tours: true` |
| `backend/src/modules/events/events.service.ts:126` | Invalid relation: `collaborators` | `include: { collaborators: true }` | Change to `entities_EventCollaborators: true` |
| `backend/src/modules/events/events.service.ts:156` | Invalid relation: `entity` | `include: { entity: true, ... }` | Change to `entities_events_entityIdToentities: true` |
| `backend/src/modules/events/events.service.ts:157` | Invalid relation: `coordinator` | `include: { coordinator: { ... } }` | Change to `app_users: { ... }` |
| `backend/src/modules/events/events.service.ts:161` | Invalid relation: `profile` | `select: { profile: true }` | Change to `user_profiles: true` |
| `backend/src/modules/events/events.service.ts:164` | Invalid relation: `tour` | `include: { tour: true }` | Change to `tours: true` |
| `backend/src/modules/events/events.service.ts:165` | Invalid relation: `collaborators` | `include: { collaborators: true }` | Change to `entities_EventCollaborators: true` |
| `backend/src/modules/events/events.service.ts:168` | Invalid relation: `user` | `include: { user: { ... } }` | Change to `app_users: { ... }` |
| `backend/src/modules/events/events.service.ts:172` | Invalid relation: `profile` | `select: { profile: true }` | Change to `user_profiles: true` |
| `backend/src/modules/events/events.service.ts:178` | Invalid relation: `chatRooms` | `include: { chatRooms: true }` | Change to `chat_rooms: true` |
| `backend/src/modules/entities/entities.service.ts:397` | Invalid relation: `owner` | `include: { owner: { ... } }` | Change to `app_users: { ... }` |
| `backend/src/modules/entities/entities.service.ts:401` | Invalid relation: `profile` | `select: { profile: true }` | Change to `user_profiles: true` |
| `backend/src/modules/entities/entities.service.ts:404` | Invalid relation: `roles` | `include: { roles: { ... } }` | Change to `entity_roles: { ... }` |
| `backend/src/modules/entities/entities.service.ts:406` | Invalid relation: `user` | `include: { user: { ... } }` | Change to `app_users: { ... }` |
| `backend/src/modules/entities/entities.service.ts:410` | Invalid relation: `profile` | `select: { profile: true }` | Change to `user_profiles: true` |
| `backend/src/modules/entities/entities.service.ts:473` | Invalid relation: `owner` | `include: { owner: { ... } }` | Change to `app_users: { ... }` |
| `backend/src/modules/entities/entities.service.ts:477` | Invalid relation: `profile` | `select: { profile: true }` | Change to `user_profiles: true` |
| `backend/src/modules/entities/entities.service.ts:480` | Invalid relation: `roles` | `include: { roles: { ... } }` | Change to `entity_roles: { ... }` |
| `backend/src/modules/entities/entities.service.ts:482` | Invalid relation: `user` | `include: { user: { ... } }` | Change to `app_users: { ... }` |
| `backend/src/modules/entities/entities.service.ts:486` | Invalid relation: `profile` | `select: { profile: true }` | Change to `user_profiles: true` |
| `backend/src/modules/users/users.service.ts:236` | Invalid relation: `profile` | `include: { profile: true, ... }` | Change to `user_profiles: true` |
| `backend/src/modules/payments/payments.service.ts:508` | Invalid relation: `event` | `include: { event: { ... } }` | Change to `events: { ... }` |
| `backend/src/modules/payments/payments.service.ts:520` | Invalid relation: `store` | `include: { store: { ... } }` | Change to `stores: { ... }` |
| `backend/src/modules/payments/payments.service.ts:534` | Invalid relation: `event` | `include: { event: { ... } }` | Change to `events: { ... }` |
| `backend/src/modules/payments/payments.service.ts:542` | Invalid relation: `store` | `include: { store: { ... } }` | Change to `stores: { ... }` |
| `backend/src/modules/payments/payments.service.ts:549` | Invalid relation: `user` | `include: { user: { ... } }` | Change to `app_users: { ... }` |
| `backend/src/modules/payments/payments.service.ts:553` | Invalid relation: `profile` | `select: { profile: { ... } }` | Change to `user_profiles: { ... }` |
| `backend/src/modules/payments/payments.service.ts:562` | Invalid relation: `entity` | `include: { entity: { ... } }` | Change to `entities: { ... }` |
| `backend/src/modules/payments/payments.service.ts:467` | Invalid relation: `event` | `include: { event: { ... } }` | Change to `events: { ... }` |
| `backend/src/modules/payments/payments.service.ts:474` | Invalid relation: `store` | `include: { store: { ... } }` | Change to `stores: { ... }` |
| `backend/src/modules/assets/assets.service.ts:578` | Invalid relation: `roles` | `include: { roles: true }` | Change to `entity_roles: true` |
| `backend/src/modules/assets/assets.service.ts:609` | Invalid relation: `roles` | `include: { roles: true }` | Change to `entity_roles: true` |

---

## 4. Invalid Prisma Type Imports

| File Path | Problem Found | Code Snippet | Recommended Fix |
|-----------|---------------|--------------|-----------------|
| **None Found** | All type imports appear correct | N/A | N/A |

**Note**: The codebase correctly uses type aliases (e.g., `type User = app_users`) to handle mapped model names.

---

## 5. Multiple PrismaClient Instances

| File Path | Problem Found | Code Snippet | Recommended Fix |
|-----------|---------------|--------------|-----------------|
| **No Issues Found** | Single PrismaService instance | `PrismaService extends PrismaClient` | PrismaService is properly implemented as a singleton via NestJS dependency injection |

---

## 6. Outdated Compiled JS in dist/

| File Path | Problem Found | Code Snippet | Recommended Fix |
|-----------|---------------|--------------|-----------------|
| `backend/dist/main.js` | Outdated compiled JavaScript | File exists with timestamp Dec 9 09:50 | Run `npm run build` to regenerate dist/ from current src/ code |

---

## 7. Active Prisma Schema

| File Path | Problem Found | Code Snippet | Recommended Fix |
|-----------|---------------|--------------|-----------------|
| `backend/prisma/schema.prisma` | **Active Schema** | Schema uses `@@map` to map models to plural table names | This is the correct schema being used at runtime |

**Schema Details:**
- Models are mapped to plural table names (e.g., `model app_users @@map("users")`)
- Relations use generated names (e.g., `entities_events_entityIdToentities`)
- All models follow the pluralized naming convention

---

## 8. Additional Inconsistencies

| File Path | Problem Found | Code Snippet | Recommended Fix |
|-----------|---------------|--------------|-----------------|
| `backend/src/modules/payments/payments.service.ts:201` | Using `prisma.payment.create` | `await (this.prisma as any).payment.create({` | Change to `(this.prisma as any).payments.create({` |
| `backend/src/modules/payments/payments.service.ts:265` | Using `prisma.payment.upsert` | `await (this.prisma as any).payment.upsert({` | Change to `(this.prisma as any).payments.upsert({` |
| `backend/src/modules/payments/payments.service.ts:297` | Using `prisma.payment.create` | `await (this.prisma as any).payment.create({` | Change to `(this.prisma as any).payments.create({` |
| `backend/src/modules/payments/payments.service.ts:312` | Using `prisma.payment.findUnique` | `const payment = await (this.prisma as any).payment.findUnique({` | Change to `(this.prisma as any).payments.findUnique({` |
| `backend/src/modules/payments/payments.service.ts:322` | Using `prisma.payment.update` | `await (this.prisma as any).payment.update({` | Change to `(this.prisma as any).payments.update({` |
| `backend/src/modules/payments/payments.service.ts:386` | Using `prisma.payment.update` | `await (this.prisma as any).payment.update({` | Change to `(this.prisma as any).payments.update({` |
| `backend/src/modules/payments/payments.service.ts:314` | Invalid relation: `order` | `include: { order: true }` | Change to `orders: true` |

---

## Summary Statistics

- **Total Issues Found**: 60+
- **Critical Issues** (Runtime Errors): 12 (invalid model access: `prisma.order`)
- **High Priority** (Runtime Errors): 13 (typo: `entities_events_entityIdToentitiesd`)
- **Medium Priority** (Runtime Errors): 35+ (invalid relation includes)
- **Low Priority** (Build/Type Issues): 1 (outdated dist/)

---

## Recommended Action Plan

1. **Immediate Fixes** (Critical):
   - Replace all `prisma.order` with `prisma.orders` in `payments.service.ts`
   - Replace all `prisma.payment` with `prisma.payments` in `payments.service.ts`
   - Fix all `entities_events_entityIdToentitiesd` typos to use `entityId` directly

2. **High Priority Fixes**:
   - Update all invalid relation includes to match schema relation names
   - Test each service after fixes to ensure queries work correctly

3. **Maintenance**:
   - Run `npm run build` to regenerate `dist/` folder
   - Consider adding automated tests to catch these issues early

---

## Notes

- The codebase uses `(this.prisma as any)` type assertions to work around TypeScript's strict checking for mapped model names. This is a temporary workaround but necessary given the `@@map` configuration.
- All relation names must match exactly as defined in `schema.prisma`, including the complex generated names like `entities_events_entityIdToentities`.
- Direct field access (e.g., `event.entityId`) is preferred over accessing relation fields when the field exists directly on the model.

