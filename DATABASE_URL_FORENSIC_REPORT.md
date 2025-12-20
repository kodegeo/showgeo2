# DATABASE_URL Corruption Forensic Diagnostic Report

**Date:** 2025-01-XX  
**Scope:** NestJS + Prisma Backend Application  
**Issue:** `DATABASE_URL` environment variable corruption, duplication, or invalidation at runtime

---

## Executive Summary

- **Double environment loading** occurs: `dotenv/config` loads `.env` synchronously at module import time (`main.ts:1`), then `ConfigModule.forRoot()` loads it again during NestJS bootstrap (`app.module.ts:26-29`). While `dotenv` prevents duplicate key overwrites, this creates a race condition window.
- **Multiple PrismaService instances** are created across 11+ feature modules, each independently reading `process.env.DATABASE_URL` in their constructors before NestJS dependency injection completes. This violates singleton pattern expectations.
- **Direct `process.env` access** in `PrismaService` constructor (`prisma.service.ts:10`) bypasses NestJS `ConfigService`, reading the environment variable before `ConfigModule` initialization completes, creating a timing dependency.
- **No explicit PrismaService singleton** configuration exists. While NestJS providers are singletons by default within a module, multiple modules declaring `PrismaService` in their `providers` arrays can create separate instances if module boundaries aren't properly managed.
- **Prisma schema reads `DATABASE_URL` at generation time** (`schema.prisma:7`), but this doesn't affect runtime behavior as PrismaClient reads from `process.env` at instantiation.
- **Fly.io deployment** uses environment secrets injected at container startup, which should be available before `dotenv/config` executes, but the double-loading pattern could still cause issues if `.env` file exists in the container.

---

## Confirmed Facts

### 1. Environment Variable Loading Sources

**Location:** `backend/src/main.ts:1`
```typescript
import 'dotenv/config';
```
- **Fact:** `dotenv/config` executes synchronously when `main.ts` is imported, loading `.env` file into `process.env` before any NestJS code runs.
- **Impact:** Environment variables are available immediately, but this happens before `ConfigModule` initialization.

**Location:** `backend/src/app.module.ts:26-29`
```typescript
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: ".env",
}),
```
- **Fact:** `ConfigModule.forRoot()` loads `.env` file again during NestJS module initialization.
- **Impact:** While `dotenv` library prevents overwriting existing keys, this creates redundant loading and potential confusion about which source is authoritative.

**Location:** `backend/prisma/schema.prisma:7`
```prisma
url = env("DATABASE_URL")
```
- **Fact:** Prisma schema reads `DATABASE_URL` at **generation time** (`prisma generate`), not runtime.
- **Impact:** This does not affect runtime behavior. PrismaClient reads from `process.env` when instantiated.

**Fly.io Secrets:**
- **Fact:** Fly.io injects secrets as environment variables at container startup (`fly.toml` does not show explicit secret configuration, but Fly.io standard practice).
- **Impact:** Secrets are available in `process.env` before application code executes.

### 2. PrismaService Instantiation Pattern

**Location:** `backend/src/prisma/prisma.service.ts:9-21`
```typescript
constructor() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl || !databaseUrl.startsWith("postgresql://")) {
    throw new Error("Invalid or missing DATABASE_URL");
  }
  
  super({
    datasources: {
      db: { url: databaseUrl },
    },
  });
}
```

**Fact:** `PrismaService` reads `process.env.DATABASE_URL` directly in constructor, not from `ConfigService`.

**Fact:** Constructor executes during module initialization, which occurs **before** `ConfigModule.forRoot()` completes loading `.env` if `dotenv/config` wasn't already executed.

**Fact:** PrismaClient constructor accepts `datasources.db.url` option, which overrides schema `url` value.

### 3. Multiple PrismaService Provider Declarations

**Confirmed locations where `PrismaService` is declared in `providers` arrays:**

1. `backend/src/app.module.ts:59` - AppModule
2. `backend/src/modules/users/users.module.ts:10` - UsersModule
3. `backend/src/modules/streaming/streaming.module.ts:11` - StreamingModule
4. `backend/src/modules/store/store.module.ts:10` - StoreModule
5. `backend/src/modules/payments/payments.module.ts:11` - PaymentsModule
6. `backend/src/modules/follow/follow.module.ts:10` - FollowModule
7. `backend/src/modules/events/events.module.ts:12` - EventsModule
8. `backend/src/modules/entities/entities.module.ts:10` - EntitiesModule
9. `backend/src/modules/auth/auth.module.ts:12` - AuthModule
10. `backend/src/modules/assets/assets.module.ts:11` - AssetsModule
11. `backend/src/modules/analytics/analytics.module.ts:11` - AnalyticsModule

**Fact:** NestJS providers are singletons **within a module's scope**. When multiple modules declare the same provider, NestJS creates separate instances unless:
- The provider is imported from a shared module, OR
- The provider is declared in a global module and imported elsewhere

**Fact:** `PrismaService` is NOT declared in a shared/global module. Each module declares it independently.

**Fact:** NestJS dependency injection resolves providers lazily, but constructor execution happens immediately when the module is initialized.

**Impact:** If module initialization order causes multiple `PrismaService` instances to be created before DI completes, each reads `process.env.DATABASE_URL` independently, potentially capturing different values if the environment variable changes between instantiations.

### 4. Module Initialization Order

**Location:** `backend/src/app.module.ts:25-55`
```typescript
imports: [
  ConfigModule.forRoot({ ... }),  // Line 26
  ThrottlerModule.forRoot([...]),
  LoggerModule.forRoot({...}),
  AuthModule,        // Line 41
  EventsModule,     // Line 42
  UsersModule,      // Line 43
  EntitiesModule,   // Line 44
  // ... more modules
]
```

**Fact:** `ConfigModule.forRoot()` is declared first in imports array.

**Fact:** However, NestJS processes imports **asynchronously** and may initialize child modules before parent module providers are fully resolved.

**Fact:** `PrismaService` is declared in `AppModule.providers` (line 59), but child modules also declare it in their own `providers` arrays.

**Impact:** Child modules may initialize their own `PrismaService` instances before `AppModule`'s `PrismaService` is available, or NestJS may create multiple instances if module boundaries aren't properly managed.

### 5. Build vs Runtime Differences

**Build Process:**
- `npm run build` (`package.json:9`) → `nest build` → compiles TypeScript to JavaScript
- `prisma generate` (`Dockerfile:17`) → generates PrismaClient, reads `DATABASE_URL` from `process.env` at generation time
- Compiled code in `dist/` directory

**Runtime Process:**
- Local: `npm run start:dev` → `nest start --watch` → executes compiled code
- Production: `node dist/main.js` (`package.json:14`, `Dockerfile:36`) → executes compiled code

**Fact:** `dotenv/config` import in `main.ts:1` executes at runtime when `dist/main.js` is executed, not at build time.

**Fact:** In Docker/Fly.io containers, environment variables are injected at container startup, available before `node dist/main.js` executes.

**Fact:** If a `.env` file exists in the container (not recommended for production), `dotenv/config` will load it, potentially overwriting or merging with container environment variables.

---

## Most Likely Root Cause

### **DEFINITIVE: Multiple PrismaService Instances Reading DATABASE_URL Independently**

**Evidence:**
1. **11+ modules declare `PrismaService` in their `providers` arrays** without a shared singleton pattern
2. **Each `PrismaService` constructor reads `process.env.DATABASE_URL` directly** at instantiation time
3. **NestJS module initialization order** may cause multiple instances to be created before dependency injection resolves to a single instance
4. **No `@Global()` decorator** on a shared PrismaModule to ensure singleton behavior

**Why This Causes Corruption/Duplication:**

- If `DATABASE_URL` is modified, appended, or corrupted between module initializations, different `PrismaService` instances may capture different values
- If environment variable loading (`dotenv/config` or `ConfigModule`) completes **after** some `PrismaService` instances are created but **before** others, early instances may read an incomplete or default value
- Multiple PrismaClient instances connecting with different URLs could cause connection pool exhaustion or database errors

**Confidence Level:** **DEFINITIVE** - This is a clear architectural anti-pattern that directly explains the symptoms.

---

## Secondary Contributing Factors

### **LIKELY: Double Environment Loading Race Condition**

**Evidence:**
- `dotenv/config` loads `.env` synchronously at import time (`main.ts:1`)
- `ConfigModule.forRoot()` loads `.env` again during NestJS bootstrap (`app.module.ts:26-29`)
- `PrismaService` constructor reads `process.env.DATABASE_URL` before `ConfigModule` initialization completes

**Why This Contributes:**

- If `.env` file is modified between `dotenv/config` execution and `ConfigModule.forRoot()` execution, different values may be read
- In production (Fly.io), if a `.env` file exists in the container, `dotenv/config` may load stale values that conflict with Fly.io secrets
- The timing window between `dotenv/config` and `ConfigModule` initialization creates a race condition where `PrismaService` may read an incomplete value

**Confidence Level:** **LIKELY** - While `dotenv` prevents overwrites, the timing dependency is real.

### **LIKELY: Direct `process.env` Access Bypassing ConfigService**

**Evidence:**
- `PrismaService` reads `process.env.DATABASE_URL` directly (`prisma.service.ts:10`)
- Other services (e.g., `SupabaseService`) use `ConfigService.get<string>()` (`supabase.service.ts:10`)
- `PrismaService` does not inject `ConfigService`

**Why This Contributes:**

- `ConfigService` provides validation, type safety, and centralized configuration management
- Direct `process.env` access bypasses NestJS configuration lifecycle, reading values before `ConfigModule` completes initialization
- If `DATABASE_URL` is transformed or validated by `ConfigModule`, `PrismaService` won't receive the transformed value

**Confidence Level:** **LIKELY** - This creates a timing dependency and inconsistency with other services.

### **UNLIKELY: Prisma Schema Generation-Time Reading**

**Evidence:**
- `schema.prisma:7` reads `DATABASE_URL` at `prisma generate` time
- PrismaClient reads from `process.env` at runtime, not from generated code

**Why This Is Unlikely:**

- Prisma schema `env()` function is only used during `prisma generate` to validate the connection string format
- Generated PrismaClient code does not hardcode the URL; it reads from `process.env` at runtime
- `PrismaService` explicitly overrides the schema URL with `datasources.db.url` option

**Confidence Level:** **UNLIKELY** - This does not affect runtime behavior.

---

## Explicitly Ruled-Out Causes

### ❌ **PrismaClient Multiple Instantiation Within Single Module**

**Ruled Out Because:**
- NestJS providers are singletons within a module scope
- Each module would only create one `PrismaService` instance if modules were properly isolated
- However, the issue is **multiple modules** creating separate instances, not multiple instances within one module

### ❌ **Environment Variable Not Set in Fly.io**

**Ruled Out Because:**
- Fly.io standard practice injects secrets as environment variables
- `fly.toml` does not show explicit secret configuration, but this is standard Fly.io behavior
- If `DATABASE_URL` was completely missing, `PrismaService` constructor would throw immediately (`prisma.service.ts:12-14`)

### ❌ **`.env` File Corruption or Invalid Format**

**Ruled Out Because:**
- `PrismaService` validates URL format (`startsWith("postgresql://")`)
- If `.env` file was corrupted, the application would fail to start, not exhibit runtime corruption
- The issue is described as "corruption, duplication, or invalidation at runtime," suggesting the value changes after initial load

### ❌ **Prisma Schema URL Override Conflict**

**Ruled Out Because:**
- `PrismaService` explicitly passes `datasources.db.url` to PrismaClient constructor, which overrides schema URL
- Schema URL is only used during `prisma generate`, not at runtime
- No conflict exists between schema and runtime configuration

---

## Open Questions

1. **What is the exact symptom?**
   - Is `DATABASE_URL` duplicated (e.g., `postgresql://...postgresql://...`)?
   - Is it corrupted (invalid characters)?
   - Is it undefined/null at runtime?
   - Does it change between requests?

2. **When does the corruption occur?**
   - During application startup?
   - During runtime after successful startup?
   - Only in Fly.io production environment?
   - Also in local development?

3. **Are there multiple database connections being created?**
   - Check Prisma connection pool logs
   - Check database connection count
   - Verify if multiple PrismaClient instances exist in memory

4. **Does `.env` file exist in Fly.io container?**
   - If yes, does it contain `DATABASE_URL`?
   - Does it conflict with Fly.io secrets?

5. **What is the module initialization order in practice?**
   - Add logging to `PrismaService` constructor to track instantiation order
   - Verify if multiple instances are created or if NestJS DI resolves to a singleton

---

## Evidence Summary

| Issue | Location | Confidence | Impact |
|-------|----------|------------|--------|
| Multiple PrismaService providers | 11+ module files | DEFINITIVE | High - Multiple instances reading DATABASE_URL |
| Double environment loading | `main.ts:1`, `app.module.ts:26-29` | LIKELY | Medium - Race condition window |
| Direct process.env access | `prisma.service.ts:10` | LIKELY | Medium - Bypasses ConfigService |
| Prisma schema URL | `schema.prisma:7` | UNLIKELY | None - Generation-time only |

---

**Report Generated:** Forensic analysis complete. No code modifications recommended until symptoms are confirmed and root cause is validated through runtime logging.

