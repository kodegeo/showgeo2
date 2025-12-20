# DATABASE_URL Duplication Root Cause Analysis

**Date:** 2025-01-XX  
**Symptom:** `DATABASE_URL` prints as `"postgresql://...requirepostgresql://...require"` (duplicated)  
**Severity:** CRITICAL - Prevents database connection

---

## A) Observed Symptoms

### Primary Symptom
```
DATABASE_URL="postgresql://showgeo_app.bsxmudeoxlsrwcolhlav:3VxVdDMCcAOxrgb7@aws-1-us-east-2.pooler.supabase.com:6543/postgres?sslmode=requirepostgresql://showgeo_app.bsxmudeoxlsrwcolhlav:3VxVdDMCcAOxrgb7@aws-1-us-east-2.pooler.supabase.com:6543/postgres?sslmode=require"
```

**Location:** `backend/.env:2`

**Evidence:** The `.env` file contains a **single line** with DATABASE_URL duplicated. The URL appears twice, concatenated together with `require` (from `?sslmode=require`) in the middle.

### Secondary Symptom (Logger)
```
TypeError: this.localInstance?.log is not a function
```

**Location:** Likely from `nestjs-pino` LoggerModule usage  
**Evidence:** `main.ts:22` uses `app.useLogger(app.get(LoggerModule))` which is incorrect API usage.

---

## B) Root Causes (Ranked)

### 1. DEFINITIVE: Corrupted `.env` File with Duplicated DATABASE_URL

**File:** `backend/.env:2`  
**Evidence:**
```bash
$ grep -n "DATABASE_URL" backend/.env
2:DATABASE_URL="postgresql://...requirepostgresql://...require"
```

**Root Cause:** The `.env` file itself contains a corrupted DATABASE_URL value where the entire connection string appears twice on a single line, concatenated without separator.

**Why This Happens:**
- Manual editing error (copy-paste duplication)
- Shell script concatenation bug (if a script used `grep DATABASE_URL .env | cut -d '=' -f2-` and multiple lines existed, they would concatenate)
- Environment variable export concatenation (if `export DATABASE_URL="$DATABASE_URL$DATABASE_URL"` was executed)

**Impact:** When `dotenv/config` loads `.env` (`main.ts:1`), it reads this corrupted value directly into `process.env.DATABASE_URL`. PrismaService then reads this corrupted value (`prisma.service.ts:10`).

**Confidence:** **DEFINITIVE** - The corruption exists in the source `.env` file.

---

### 2. DEFINITIVE: Double Environment Loading (Amplifies Issue)

**Files:**
- `backend/src/main.ts:1` - `import 'dotenv/config';`
- `backend/src/app.module.ts:26-29` - `ConfigModule.forRoot({ envFilePath: ".env" })`

**Evidence:**
1. `dotenv/config` executes synchronously at import time, loading `.env` into `process.env`
2. `ConfigModule.forRoot()` loads `.env` again during NestJS bootstrap

**Root Cause:** While `dotenv` prevents overwriting existing keys, this creates redundant loading. More critically, if the `.env` file is corrupted, both loaders will read the corrupted value.

**Impact:** The corrupted DATABASE_URL is loaded twice, ensuring it's available throughout the application lifecycle.

**Confidence:** **DEFINITIVE** - Both loaders are present and will read the corrupted `.env` file.

---

### 3. LIKELY: Logger API Misuse (Secondary Issue)

**File:** `backend/src/main.ts:22`  
**Code:**
```typescript
app.useLogger(app.get(LoggerModule));
```

**Evidence:** `app.get(LoggerModule)` returns the **module instance**, not a logger instance. `app.useLogger()` expects a logger implementation (e.g., `PinoLogger`), not a module.

**Root Cause:** Incorrect NestJS API usage. `LoggerModule` is a module, not a logger. The correct pattern would be:
- `app.useLogger(app.get(PinoLogger))` OR
- Remove `app.useLogger()` entirely if `LoggerModule.forRoot()` is configured

**Impact:** Causes `TypeError: this.localInstance?.log is not a function` because the module doesn't implement the logger interface.

**Confidence:** **LIKELY** - This matches the observed error pattern, but needs runtime confirmation.

---

### 4. UNLIKELY: Multiple PrismaService Instances (Not Primary Cause)

**Files:** 11+ module files declare `PrismaService` in providers arrays

**Evidence:** While multiple modules declare `PrismaService`, NestJS dependency injection should resolve to a singleton. However, each instance reads `process.env.DATABASE_URL` independently.

**Root Cause:** Even if multiple instances exist, they all read the same corrupted `process.env.DATABASE_URL` value, so this doesn't explain the duplication.

**Impact:** None for this specific issue - all instances would read the same corrupted value.

**Confidence:** **UNLIKELY** - Multiple instances don't explain the duplication pattern.

---

## C) Reproduction Steps

### Step 1: Confirm `.env` File Corruption
```bash
cd backend
grep -n "DATABASE_URL" .env
# Expected output: Shows duplicated URL on single line
```

### Step 2: Verify Environment Loading Order
```bash
cd backend
node -e "require('dotenv/config'); console.log(process.env.DATABASE_URL)"
# Expected output: Shows duplicated URL
```

### Step 3: Test ConfigModule Loading
```bash
cd backend
# Start app and check logs for DATABASE_URL value
npm run start:dev
# Check PrismaService constructor logs (if added)
```

### Step 4: Reproduce Logger Error
```bash
cd backend
npm run start:dev
# Expected: TypeError: this.localInstance?.log is not a function
# Location: During app.useLogger() call
```

### Step 5: Verify Shell Script Concatenation (If Applicable)
```bash
# If a script exists that exports DATABASE_URL:
cd backend
grep -r "export.*DATABASE_URL.*grep\|grep.*DATABASE_URL.*export" --include="*.sh" .
# Check if any script concatenates multiple .env lines
```

---

## D) Minimal Fix Plan

### Fix 1: Correct `.env` File (CRITICAL)
- **Action:** Edit `backend/.env:2` to contain a single, correct DATABASE_URL
- **Command to verify:**
  ```bash
  cd backend
  grep "DATABASE_URL" .env | wc -l
  # Should output: 1
  grep "DATABASE_URL" .env | grep -o "postgresql://" | wc -l
  # Should output: 1
  ```
- **Safe extraction command (if needed):**
  ```bash
  # Extract first DATABASE_URL value only
  grep "^DATABASE_URL=" .env | head -1 | cut -d '=' -f2- | sed 's/^"//;s/"$//' | head -c 200
  ```

### Fix 2: Remove Redundant Environment Loading (RECOMMENDED)
- **Action:** Remove `import 'dotenv/config';` from `main.ts:1`
- **Rationale:** `ConfigModule.forRoot()` already loads `.env` file
- **Risk:** Low - ConfigModule handles environment loading properly

### Fix 3: Fix Logger API Usage (RECOMMENDED)
- **Action:** Remove `app.useLogger(app.get(LoggerModule))` from `main.ts:22`
- **Rationale:** `LoggerModule.forRoot()` in `app.module.ts:36` already configures logging
- **Alternative:** If custom logger needed, use `app.useLogger(app.get(PinoLogger))`
- **Risk:** Low - Removing incorrect API call

### Fix 4: Add DATABASE_URL Validation (PREVENTIVE)
- **Action:** Add validation in `PrismaService` constructor to detect duplication
- **Location:** `prisma.service.ts:10-14`
- **Check:** Verify URL doesn't contain duplicate `postgresql://` patterns
- **Risk:** None - Adds safety check

---

## E) Risks / Side Effects

### Risk 1: `.env` File Corruption Persists
- **Impact:** If `.env` is regenerated or synced from another source, corruption may return
- **Mitigation:** Add validation script to CI/CD pipeline
- **Severity:** HIGH

### Risk 2: Removing `dotenv/config` Breaks Other Code
- **Impact:** If other code depends on `dotenv/config` executing before imports
- **Mitigation:** Test thoroughly after removal
- **Severity:** LOW (ConfigModule should handle all cases)

### Risk 3: Logger Change Affects Logging Behavior
- **Impact:** Removing `app.useLogger()` may change log format/output
- **Mitigation:** Verify logs still work correctly after change
- **Severity:** LOW (LoggerModule.forRoot() should handle it)

### Risk 4: Multiple PrismaService Instances Still Exist
- **Impact:** Even after fixing `.env`, multiple instances may cause connection pool issues
- **Mitigation:** Create shared PrismaModule with `@Global()` decorator
- **Severity:** MEDIUM (not causing current issue, but architectural debt)

---

## Evidence Summary

| Issue | File:Line | Confidence | Impact |
|-------|-----------|------------|--------|
| Corrupted `.env` file | `backend/.env:2` | DEFINITIVE | CRITICAL |
| Double env loading | `main.ts:1`, `app.module.ts:26` | DEFINITIVE | HIGH |
| Logger API misuse | `main.ts:22` | LIKELY | MEDIUM |
| Multiple PrismaService | 11+ modules | UNLIKELY | LOW |

---

## Commands to Confirm Root Cause

```bash
# 1. Verify .env corruption
cd backend
grep "DATABASE_URL" .env
grep -o "postgresql://" .env | wc -l  # Should be 1, currently 2

# 2. Test dotenv loading
node -e "require('dotenv/config'); console.log(process.env.DATABASE_URL?.match(/postgresql:\/\//g)?.length)"

# 3. Check for shell scripts that might concatenate
find . -name "*.sh" -exec grep -l "DATABASE_URL\|grep.*env\|export.*env" {} \;

# 4. Verify PrismaService reads corrupted value
# Add to prisma.service.ts constructor:
# console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length);
# console.log('DATABASE_URL matches:', process.env.DATABASE_URL?.match(/postgresql:\/\//g)?.length);
```

---

**Report Status:** Root cause identified. `.env` file contains duplicated DATABASE_URL on single line. Fix requires editing `.env` file directly.

