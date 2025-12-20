# Prisma Enum Tree-Shaking Diagnostic Report
**Date:** December 19, 2025  
**Issue:** Fly.io production crashes with `TypeError: Cannot convert undefined or null to object` at `@IsEnum()` decorators  
**Status:** PERSISTENT - Current mitigation strategies ineffective

---

## Executive Summary

The NestJS application crashes on Fly.io production deployment due to Prisma enums being tree-shaken by webpack during the build process. Despite implementing multiple mitigation strategies (`sideEffects` configuration, enum array storage, enhanced error handling), the issue persists. The error occurs when DTO decorators execute at module load time, receiving `undefined` values instead of enum objects.

**Critical Finding:** Webpack is aggressively optimizing Prisma enum imports even with `sideEffects` markers, suggesting the bundler configuration may need explicit overrides or an alternative bundling strategy.

---

## Observed Symptoms

### Production Error (Fly.io)
```
TypeError: Cannot convert undefined or null to object
    at Function.entries (<anonymous>)
    at validEnumValues (/app/node_modules/class-validator/cjs/decorator/typechecker/IsEnum.js:18:19)
    at IsEnum (/app/node_modules/class-validator/cjs/decorator/typechecker/IsEnum.js:28:31)
    at Object.<anonymous> (/app/dist/main.js:1509:34)
```

**Error Location:** `/app/dist/main.js:1509:34` - DTO decorator evaluation during module loading  
**Error Pattern:** Consistent across all deployments (image SHA: `8090d18c4f9f31098b9f36bf961d57e68684df407602002c650e44774fe0444d`)  
**Impact:** Application fails to start, enters restart loop (max 10 restarts reached)

### Local Behavior
- ✅ Build succeeds: `npm run build` completes without errors
- ✅ Runtime succeeds: `NODE_ENV=production node dist/main.js` loads successfully
- ✅ Enums available: `[RuntimeEnums] Successfully initialized all enums` logged

**Discrepancy:** Local production build works, but Fly.io production build fails. This suggests environment-specific webpack optimization differences.

---

## Root Cause Analysis

### 1. Webpack Tree-Shaking Aggressiveness

**Evidence:**
- `nest-cli.json` specifies `"webpack": true` and `"webpackConfigPath": "webpack.config.js"`
- No custom webpack config found in repository
- NestJS uses default webpack configuration with aggressive production optimizations
- Prisma enums are ESM exports that webpack can statically analyze and remove

**Why Current Fixes Fail:**

#### A. `sideEffects` Configuration (Ineffective)
**Location:** `package.json:8-11`
```json
"sideEffects": [
  "src/common/runtime-enums.ts",
  "**/*.ts"
]
```

**Problem:**
- `sideEffects` only prevents tree-shaking of the **module itself**, not its **imports**
- Webpack still analyzes `import { AssetType } from "@prisma/client"` and determines it's unused
- The `@prisma/client` package may not declare `sideEffects`, allowing webpack to tree-shake its exports

#### B. Enum Array Storage (Ineffective)
**Location:** `runtime-enums.ts:55-75`
```typescript
const _enumKeepAlive = [AssetType, AssetOwnerType, ...];
void _enumKeepAlive;
```

**Problem:**
- Webpack's `usedExports` optimization analyzes the array and determines enum objects are never accessed
- `void _enumKeepAlive` is treated as a no-op, allowing webpack to remove the array entirely
- Array elements are only referenced, never **used**, so webpack optimizes them away

#### C. Enhanced Error Handling (Diagnostic Only)
**Location:** `runtime-enums.ts:29-50, 79-88`

**Status:** Working as intended - provides diagnostic information but doesn't prevent the issue

---

### 2. Module Evaluation Order

**Evidence:**
- Error occurs at `/app/dist/main.js:1509:34` during module loading
- DTO decorators execute at class definition time (before `RuntimeEnums` validation)
- Webpack bundles everything into a single `dist/main.js` file

**Problem:**
- If webpack tree-shakes Prisma enums **before** `RuntimeEnums` module evaluates, the enums are already `undefined`
- Decorators execute synchronously during module load, so they receive `undefined` values
- No opportunity for runtime recovery once decorators are evaluated

---

### 3. Prisma Client Generation Timing

**Evidence:**
- `Dockerfile:17` runs `npx prisma generate` before `npm run build`
- Prisma generates enum definitions in `node_modules/.prisma/client/`
- Webpack bundles from `node_modules/@prisma/client` which re-exports generated code

**Potential Issue:**
- Prisma's generated client may use ESM exports that webpack can statically analyze
- If Prisma's `package.json` doesn't declare `sideEffects`, webpack treats it as tree-shakeable
- Generated enum objects may not be marked as side-effectful

---

## Why Local vs Production Differ

### Local Production Build Works
- **Possible reasons:**
  1. Different Node.js version (local: v24.10.0, Fly.io: v22.21.1)
  2. Different webpack optimization level (local may use development optimizations)
  3. Different `NODE_ENV` handling during build
  4. Cached webpack modules or different dependency resolution

### Fly.io Production Build Fails
- **Possible reasons:**
  1. Stricter webpack production optimizations
  2. Different `@prisma/client` package resolution
  3. Docker build context differences
  4. Webpack cache invalidation in Docker

---

## Recommendations (Priority Order)

### 🔴 CRITICAL: Create Custom Webpack Configuration

**Action:** Create `backend/webpack.config.js` with explicit Prisma enum preservation

**Rationale:** NestJS default webpack config may be too aggressive. Custom config allows fine-grained control over optimization.

**Implementation Steps:**
1. Create `backend/webpack.config.js`
2. Configure `optimization.usedExports: false` for `@prisma/client` module
3. Add `externals` or `resolve.alias` to preserve Prisma enum imports
4. Test locally with production build before deploying

**Risk:** Medium - May increase bundle size, but necessary for runtime correctness

---

### 🟠 HIGH: Disable Webpack Tree-Shaking for @prisma/client

**Action:** Configure webpack to treat `@prisma/client` as having side effects

**Implementation Options:**

#### Option A: Webpack Config Module Rule
```javascript
module: {
  rules: [{
    test: /node_modules\/@prisma\/client/,
    sideEffects: true
  }]
}
```

#### Option B: Package.json Override
Add to `package.json`:
```json
"overrides": {
  "@prisma/client": {
    "sideEffects": true
  }
}
```

**Risk:** Low - Only affects Prisma client, minimal bundle size impact

---

### 🟡 MEDIUM: Use Dynamic Imports for RuntimeEnums

**Action:** Convert `RuntimeEnums` to lazy-loaded getters using dynamic imports

**Rationale:** Dynamic imports cannot be statically analyzed by webpack, preventing tree-shaking

**Implementation:**
```typescript
export const RuntimeEnums = {
  get AssetType() {
    return Object.values(require("@prisma/client").AssetType);
  },
  // ... other enums
};
```

**Risk:** Medium - Changes API surface, requires testing all DTO usages

---

### 🟡 MEDIUM: Mark @prisma/client as External

**Action:** Configure webpack to treat `@prisma/client` as external dependency

**Rationale:** External dependencies are not bundled, preventing webpack from optimizing them

**Implementation:**
```javascript
externals: {
  "@prisma/client": "commonjs @prisma/client"
}
```

**Risk:** High - Requires `@prisma/client` to be available at runtime, may break Docker builds

---

### 🟢 LOW: Switch to TypeScript Compiler (tsc) Instead of Webpack

**Action:** Disable webpack bundling, use TypeScript compiler directly

**Rationale:** `tsc` doesn't perform tree-shaking, preserving all imports

**Implementation:**
1. Set `nest-cli.json` → `"webpack": false`
2. Ensure `tsconfig.build.json` compiles correctly
3. Test production build

**Risk:** High - May break existing build process, requires extensive testing

---

### 🟢 LOW: Use Hardcoded Enum Arrays

**Action:** Replace `RuntimeEnums` with hardcoded string arrays

**Rationale:** Hardcoded arrays cannot be tree-shaken

**Implementation:**
```typescript
export const RuntimeEnums = {
  AssetType: ["IMAGE", "AUDIO", "VIDEO", "DOCUMENT", "OTHER"],
  // ... other enums
};
```

**Risk:** High - Requires manual synchronization with Prisma schema, error-prone

---

## Diagnostic Steps to Identify Specific Enum

### 1. Add Per-Enum Error Logging

**Location:** `runtime-enums.ts:93-111`

**Modification:**
```typescript
RuntimeEnums = {
  AssetType: (() => {
    try {
      return validateEnum(AssetType, "AssetType");
    } catch (e) {
      console.error("[RuntimeEnums] AssetType failed:", e);
      throw e;
    }
  })(),
  // Repeat for each enum
};
```

**Purpose:** Identify which specific enum is undefined in production

---

### 2. Inspect Webpack Bundle

**Command:**
```bash
cd backend
npm run build
npx webpack-bundle-analyzer dist/main.js
```

**Purpose:** Visualize which Prisma enum exports are included/excluded in bundle

---

### 3. Check Prisma Package Side Effects

**Command:**
```bash
cat node_modules/@prisma/client/package.json | grep -A 5 sideEffects
```

**Purpose:** Verify if Prisma declares side effects (likely doesn't)

---

## Verification Checklist

After implementing any recommendation:

- [ ] Build succeeds: `npm run build`
- [ ] Local production test: `NODE_ENV=production node dist/main.js`
- [ ] Docker build test: `docker build -t test . && docker run test`
- [ ] Fly.io deployment succeeds
- [ ] Application starts without enum errors
- [ ] DTO validation works correctly
- [ ] Bundle size increase is acceptable (< 10% increase)

---

## Conclusion

The Prisma enum tree-shaking issue persists because webpack's static analysis determines enum imports are unused, even with `sideEffects` markers. The most reliable solution is to create a custom webpack configuration that explicitly preserves Prisma enum imports or disables tree-shaking for the `@prisma/client` module.

**Recommended Next Step:** Implement **CRITICAL** recommendation (custom webpack config) as it provides the most control and least risk of breaking changes.

---

## References

- [Webpack Tree Shaking Documentation](https://webpack.js.org/guides/tree-shaking/)
- [Webpack Side Effects](https://webpack.js.org/guides/tree-shaking/#mark-the-file-as-side-effect-free)
- [NestJS Webpack Configuration](https://docs.nestjs.com/cli/monorepo#webpack)
- [Prisma Client Generation](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/generating-prisma-client)

