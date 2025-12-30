# Vercel Production Readiness Audit

## 🚨 CRITICAL ISSUES

### 1. Missing VITE_LIVEKIT_URL Environment Variable
**File:** `frontend/src/components/streaming/StreamingPanel.tsx:251`  
**Why it works locally:** Vite dev server reads `.env` file, variable is set  
**Why it fails on Vercel:** Environment variable not configured in Vercel dashboard  
**Impact:** Streaming completely broken - `joinStream()` throws error  
**Fix:**
```typescript
// Current (line 251):
const serverUrl = import.meta.env.VITE_LIVEKIT_URL;
if (!serverUrl) {
  throw new Error("LiveKit server URL not configured...");
}

// ✅ Ensure VITE_LIVEKIT_URL is set in Vercel environment variables
// Value should be: wss://your-project.livekit.cloud
```

**Action Required:** Add `VITE_LIVEKIT_URL=wss://your-project.livekit.cloud` to Vercel environment variables

---

### 2. WebSocket URL Fallback to localhost in Production
**File:** `frontend/src/hooks/useNotifications.ts:8`  
**Why it works locally:** Falls back to `ws://localhost:3000` when `VITE_WS_URL` is missing  
**Why it fails on Vercel:** Falls back to empty string `""` in production, but if `VITE_WS_URL` is undefined, WebSocket connection fails silently  
**Impact:** Notifications WebSocket won't connect, but app doesn't crash  
**Fix:**
```typescript
// Current (line 8):
const WS_URL = import.meta.env.VITE_WS_URL || (isDevelopment ? "ws://localhost:3000" : "");

// ✅ Better: Explicit error or use relative WebSocket URL
const WS_URL = import.meta.env.VITE_WS_URL;
if (!WS_URL && !isDevelopment) {
  console.error("VITE_WS_URL not configured - WebSocket notifications disabled");
}
```

**Action Required:** Either:
- Add `VITE_WS_URL=wss://backend-solitary-forest-2422.fly.dev` to Vercel env vars, OR
- Remove WebSocket notifications feature in production

---

### 3. Inconsistent LiveKit URL Resolution
**File:** `frontend/src/pages/creator/events/EventLivePage.tsx:63-66` vs `frontend/src/components/streaming/StreamingPanel.tsx:251`  
**Why it works locally:** Both paths work if env var is set  
**Why it fails on Vercel:** Different fallback strategies - EventLivePage tries token response first, StreamingPanel only uses env  
**Impact:** EventLivePage might work while StreamingPanel fails, causing inconsistent behavior  
**Fix:**
```typescript
// EventLivePage.tsx (lines 63-66) - has fallback chain:
const serverUrl = (tokenResponse as any).livekitUrl || 
                 (tokenResponse as any).url || 
                 (tokenResponse as any).wsUrl || 
                 import.meta.env.VITE_LIVEKIT_URL;

// StreamingPanel.tsx (line 251) - only env:
const serverUrl = import.meta.env.VITE_LIVEKIT_URL;

// ✅ Standardize: Use token response first, then env (EventLivePage approach)
// OR: Always use env (StreamingPanel approach) - but backend must return URL
```

**Action Required:** Standardize LiveKit URL resolution across both files

---

### 4. Missing VITE_SUPABASE Environment Variables
**File:** `frontend/src/lib/supabase.ts:6-7`  
**Why it works locally:** `.env` file contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`  
**Why it fails on Vercel:** Variables not set in Vercel dashboard  
**Impact:** App crashes on load - Supabase client initialization throws error  
**Fix:**
```typescript
// Current (lines 13-18):
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// ✅ Ensure both are set in Vercel:
// VITE_SUPABASE_URL=https://your-project.supabase.co
// VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Action Required:** Add both Supabase environment variables to Vercel

---

## ⚠️ RISKY ISSUES

### 5. Vercel Rewrite Configuration May Not Handle All Routes
**File:** `frontend/vercel.json:3-12`  
**Why it works locally:** Vite dev server handles all routes via React Router  
**Why it fails on Vercel:** Direct navigation to `/events/:id/live` or refresh on deep routes may return 404 if rewrite doesn't match  
**Impact:** 404s on route refresh, broken deep linking  
**Fix:**
```json
{
  "cleanUrls": false,
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://backend-solitary-forest-2422.fly.dev/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Status:** ✅ Configuration looks correct - catch-all rewrite should handle React Router  
**Action Required:** Test route refresh on production (e.g., `/events/123/live`)

---

### 6. API Client Uses Relative Paths - Depends on Vercel Rewrite
**File:** `frontend/src/services/api.ts:7`  
**Why it works locally:** Vite proxy rewrites `/api` to `http://localhost:3000`  
**Why it fails on Vercel:** Depends on `vercel.json` rewrite to Fly.io backend  
**Impact:** If rewrite fails, all API calls return 404  
**Fix:**
```typescript
// Current (line 7):
baseURL: "/api",

// ✅ This is correct - vercel.json handles rewrite
// But verify rewrite is working in production
```

**Action Required:** Verify API calls work in production (check network tab)

---

### 7. WebSocket Connection Uses Absolute URL
**File:** `frontend/src/hooks/useNotifications.ts:73`  
**Why it works locally:** `WS_URL` is `ws://localhost:3000` or from env  
**Why it fails on Vercel:** If `VITE_WS_URL` is not set, WebSocket fails  
**Impact:** Real-time notifications don't work  
**Fix:**
```typescript
// Current (line 73):
const newSocket = io(`${WS_URL}/notifications`, {
  // ...
});

// ✅ Ensure VITE_WS_URL is set to wss://backend-solitary-forest-2422.fly.dev
// OR: Use relative WebSocket URL if backend supports it
```

**Action Required:** Configure `VITE_WS_URL` or disable WebSocket in production

---

### 8. Hardcoded Backend URL in vercel.json
**File:** `frontend/vercel.json:6`  
**Why it works locally:** Not used locally (Vite proxy handles it)  
**Why it fails on Vercel:** If Fly.io backend URL changes, all API calls fail  
**Impact:** Complete API failure if backend is redeployed or URL changes  
**Fix:**
```json
// Current:
"destination": "https://backend-solitary-forest-2422.fly.dev/api/$1"

// ✅ Consider using environment variable for backend URL
// But vercel.json doesn't support env vars directly
// Alternative: Use VITE_API_URL and make apiClient use it
```

**Action Required:** Document backend URL dependency, or refactor to use `VITE_API_URL`

---

### 9. Error Messages Reference localhost
**File:** `frontend/src/services/api.ts:52`  
**Why it works locally:** Error message is accurate  
**Why it fails on Vercel:** Confusing error message for users in production  
**Impact:** Poor UX, but doesn't break functionality  
**Fix:**
```typescript
// Current (line 52):
? 'Backend unavailable. Is the server running on http://localhost:3000?'

// ✅ Better:
? 'Backend unavailable. Please try again later.'
```

**Action Required:** Update error message for production

---

### 10. LiveKit URL Validation May Reject Valid URLs
**File:** `frontend/src/lib/livekit/joinStream.ts:66-77`  
**Why it works locally:** Validates `wss://` prefix and rejects Fly URLs  
**Why it fails on Vercel:** If backend accidentally returns Fly URL, connection fails  
**Impact:** Streaming fails if backend misconfigures LiveKit URL  
**Fix:**
```typescript
// Current (lines 66-77):
if (!serverUrl.startsWith("wss://")) {
  throw new Error(`Invalid LiveKit serverUrl: must start with "wss://"`);
}
if (serverUrl.includes("fly.dev") || serverUrl.includes("fly.io")) {
  throw new Error(`Invalid LiveKit serverUrl: must point to LiveKit Cloud`);
}

// ✅ This is correct - ensures media goes directly to LiveKit
// But ensure backend never returns Fly URL
```

**Action Required:** Verify backend always returns LiveKit Cloud URL

---

## ✅ SAFE - No Issues Found

### 11. React Router Configuration
**File:** `frontend/src/main.tsx:36-40`  
**Status:** ✅ Uses `BrowserRouter` with proper future flags  
**Note:** Works with `vercel.json` catch-all rewrite

---

### 12. API Client withCredentials
**File:** `frontend/src/services/api.ts:8`  
**Status:** ✅ `withCredentials: true` is correct for cross-domain cookies  
**Note:** Works in production if CORS is configured on backend

---

### 13. Environment Variable Access Pattern
**File:** Multiple files using `import.meta.env.VITE_*`  
**Status:** ✅ Correct Vite pattern - variables are replaced at build time  
**Note:** Ensure all `VITE_*` variables are set in Vercel before build

---

### 14. Window Location Checks
**File:** `frontend/src/utils/env.ts:8-11`  
**Status:** ✅ Properly guarded with `typeof window !== 'undefined'`  
**Note:** Safe for SSR/build time

---

## Summary of Required Actions

### Before Deploying to Vercel:

1. **Set Environment Variables in Vercel Dashboard:**
   - `VITE_LIVEKIT_URL=wss://your-project.livekit.cloud` (CRITICAL)
   - `VITE_SUPABASE_URL=https://your-project.supabase.co` (CRITICAL)
   - `VITE_SUPABASE_ANON_KEY=your-anon-key` (CRITICAL)
   - `VITE_WS_URL=wss://backend-solitary-forest-2422.fly.dev` (RISKY - or disable WebSocket)

2. **Standardize LiveKit URL Resolution:**
   - Choose one approach: token response first OR env var only
   - Update both `EventLivePage.tsx` and `StreamingPanel.tsx` to match

3. **Test in Production:**
   - Route refresh on deep routes (e.g., `/events/123/live`)
   - API calls (check network tab)
   - LiveKit streaming connection
   - WebSocket notifications (if enabled)

4. **Update Error Messages:**
   - Remove localhost references from production error messages

5. **Document Backend URL Dependency:**
   - If Fly.io backend URL changes, update `vercel.json`

---

## Testing Checklist

- [ ] All environment variables set in Vercel
- [ ] Route refresh works on `/events/:id/live`
- [ ] API calls succeed (check network tab)
- [ ] LiveKit streaming connects successfully
- [ ] Supabase auth works (login/logout)
- [ ] WebSocket notifications connect (if enabled)
- [ ] No console errors related to missing env vars
- [ ] Error messages don't reference localhost

---

**Generated:** 2025-01-27  
**Focus:** Production readiness for Vercel deployment

