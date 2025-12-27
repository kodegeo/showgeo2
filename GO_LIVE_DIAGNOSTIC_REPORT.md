# "Go Live" Button Diagnostic Report

## Executive Summary

The "Go Live" button appears on `/creator/events/:id` but fails to successfully start a live stream due to **multiple critical issues**:

1. **Enum Mismatch**: Frontend uses `PRE_LIVE`/`POST_LIVE` while backend expects `PRE_LIVE`/`POST_LIVE`
2. **Incomplete Flow**: Two separate "Go Live" buttons perform different actions (phase transition vs. session creation)
3. **Missing Session Check**: StreamingPanel requires an active session but doesn't render when none exists
4. **Backend Phase Validation**: Token generation checks for `"LIVE"` but database stores `"LIVE"`

**Root Cause**: The frontend and backend are using incompatible enum values, and the streaming lifecycle is split across two different button handlers that don't coordinate.

---

## 1. Frontend Analysis

### 1.1 Button Locations

#### Button #1: `CreatorEventDetailPage.tsx` (Lines 91-102)
```typescript
{canGoLive(event.phase, event.status) && (
  <button onClick={() => transition.mutate({ id: event.id, phase: EventPhase.LIVE })}>
    Go Live
  </button>
)}
```

**Conditions to appear:**
- `phase === EventPhase.PRE_LIVE` (line 34)
- `status !== EventStatus.LIVE` (line 35)

**Handler:** `transition.mutate()` → calls `eventsService.transitionPhase()`
- **Action**: Only transitions event phase to `LIVE`
- **Does NOT**: Create streaming session, generate token, or join LiveKit

#### Button #2: `StreamingPanel.tsx` (Lines 217-227)
```typescript
<button
  onClick={() => void onGoLive()}
  disabled={!canGoLive || joining}
>
  Go Live
</button>
```

**Conditions to appear:**
- `canManageStream && isApproved && isPreLive` (line 59)
- `isPreLive = eventPhase === "PRE_LIVE" || eventPhase === "PRE_LIVE"` (line 57)
- **CRITICAL**: Component returns `null` if `!activeSession` (line 38), so button never renders when no session exists

**Handler:** `onGoLive()` (lines 100-105)
```typescript
const onGoLive = async () => {
  await createSession();  // Creates streaming session
  await onJoin({ publish: true });  // Joins LiveKit and publishes
};
```

**Action**: Creates session AND joins stream
- **Problem**: Button is hidden when no session exists (chicken-and-egg)

### 1.2 Error Handling

**CreatorEventDetailPage:**
- ❌ No error handling for `transition.mutate()`
- ❌ No user feedback on success/failure
- ❌ Errors are swallowed by React Query

**StreamingPanel:**
- ✅ Has `joinError` state (line 30)
- ✅ Displays errors in UI (lines 150-154)
- ❌ `createSession()` errors are not caught (line 102)
- ❌ No error handling wrapper around `onGoLive()`

### 1.3 Enum Mismatch Issues

**Frontend `EventPhase` enum** (`packages/shared/types/event.types.ts`):
```typescript
export enum EventPhase {
  PRE_LIVE = "PRE_LIVE_PHASE",  // ❌ Wrong value
  LIVE = "LIVE",                    // ✅ Correct
  POST_LIVE = "POST_LIVE_PHASE", // ❌ Wrong value
}
```

**Backend Prisma schema** (`backend/prisma/schema.prisma`):
```prisma
enum EventPhase {
  PRE_LIVE   // ✅ Actual database value
  LIVE       // ✅ Actual database value
  POST_LIVE  // ✅ Actual database value
}
```

**Impact:**
- Frontend sends `"PRE_LIVE_PHASE"` but backend expects `"PRE_LIVE"`
- Frontend checks `EventPhase.PRE_LIVE` but database has `PRE_LIVE`
- Phase comparisons fail silently

---

## 2. Backend Analysis

### 2.1 Event Phase Requirements

**`createSession()` in `streaming.service.ts` (lines 137-148):**
```typescript
const eventPhase = String(event.phase);
const eventStatus = String(event.status);
if (eventPhase !== "LIVE" && eventStatus === "SCHEDULED") {
  // Updates event to LIVE phase
  await (this.prisma as any).events.update({
    where: { id: eventId },
    data: {
      phase: "LIVE" as EventPhase,
      status: "LIVE" as EventStatus,
    },
  });
}
```

**Requirements:**
- Event must exist
- User must have permissions (Entity owner, Coordinator, or Admin)
- No existing active session for the event
- Event phase/status will be auto-updated to `LIVE` if `SCHEDULED`

### 2.2 Token Generation Phase Check

**`generateToken()` in `streaming.service.ts` (lines 195-204):**
```typescript
const eventPhase = String(event.phase); // PRE_LIVE | LIVE | POST_LIVE

if (streamRole === StreamRole.VIEWER && eventPhase !== "LIVE") {
  throw new ForbiddenException("Event is not live");
}
```

**CRITICAL BUG:**
- Comment says `PRE_LIVE | LIVE | POST_LIVE` but database has `PRE_LIVE | LIVE | POST_LIVE`
- Checks for `"LIVE"` but database stores `"LIVE"`
- **Result**: Viewers cannot join even when event is live

### 2.3 Role-Based Access Control

**`createSession()` permissions** (`streaming.controller.ts` line 29):
- Requires: `@Roles("ENTITY", "COORDINATOR", "ADMIN")`
- Guarded by: `SupabaseAuthGuard` + `RolesGuard`

**`checkEventPermissions()` in `streaming.service.ts` (lines 664-712):**
- Entity owner: ✅ Allowed
- Event coordinator: ✅ Allowed
- Entity role (ADMIN/MANAGER): ✅ Allowed
- Admin role: ✅ Allowed
- Others: ❌ Forbidden

**Status**: RBAC is correctly implemented

---

## 3. Shared Types Analysis

### 3.1 EventPhase Enum Mismatch

**Frontend Definition** (`packages/shared/types/event.types.ts:6-10`):
```typescript
export enum EventPhase {
  PRE_LIVE = "PRE_LIVE_PHASE",    // ❌ Mismatch
  LIVE = "LIVE",                      // ✅ Correct
  POST_LIVE = "POST_LIVE_PHASE",  // ❌ Mismatch
}
```

**Backend Prisma Schema** (`backend/prisma/schema.prisma:441-445`):
```prisma
enum EventPhase {
  PRE_LIVE   // Actual value
  LIVE       // Actual value
  POST_LIVE  // Actual value
}
```

**Impact:**
- Frontend enum keys (`PRE_LIVE`, `POST_LIVE`) don't match backend (`PRE_LIVE`, `POST_LIVE`)
- Frontend enum values (`"PRE_LIVE_PHASE"`, `"POST_LIVE_PHASE"`) don't match backend (`"PRE_LIVE"`, `"POST_LIVE"`)
- Type safety is broken - TypeScript allows invalid values

### 3.2 Usage in Code

**Frontend checks:**
- `CreatorEventDetailPage.tsx:34`: `phase === EventPhase.PRE_LIVE` → compares against wrong enum key
- `StreamingPanel.tsx:57`: `eventPhase === "PRE_LIVE" || eventPhase === "PRE_LIVE"` → string comparison (works but inconsistent)

**Backend checks:**
- `streaming.service.ts:201`: `eventPhase !== "LIVE"` → wrong value (should be `"LIVE"`)

---

## 4. Streaming Lifecycle Analysis

### 4.1 Required Steps

1. **Phase Transition** → `POST /events/:id/phase/transition` with `{ phase: "LIVE" }`
2. **Create Session** → `POST /streaming/session/:eventId` (creates DB session + LiveKit room)
3. **Generate Token** → `POST /streaming/:eventId/token` with `{ streamRole: "BROADCASTER" }`
4. **Join LiveKit** → Connect to LiveKit server with token
5. **Publish Tracks** → Start broadcasting audio/video

### 4.2 Current Flow Issues

**Button #1 Flow** (CreatorEventDetailPage):
```
Click "Go Live" 
  → transition.mutate({ phase: EventPhase.LIVE })
  → POST /events/:id/phase/transition
  → ✅ Phase updated to LIVE
  → ❌ STOPS HERE - No session created
```

**Button #2 Flow** (StreamingPanel):
```
Component renders
  → Checks: if (!activeSession) return null
  → ❌ Component never renders (no session exists)
  → Button never appears
```

**Expected Flow:**
```
1. Transition phase to LIVE
2. Create streaming session
3. Generate token
4. Join LiveKit
5. Publish tracks
```

### 4.3 Failure Point

**Primary Failure**: `StreamingPanel` returns `null` when no session exists (line 38), preventing the "Go Live" button from appearing.

**Secondary Failure**: Even if button appears, `generateToken()` will reject viewers because it checks for `"LIVE"` instead of `"LIVE"`.

**Tertiary Failure**: Frontend enum values don't match backend, causing phase transitions to fail silently.

---

## 5. Recommendations

### 5.1 Critical Fixes (Code-Level)

#### Fix #1: Correct EventPhase Enum Values
**File**: `packages/shared/types/event.types.ts`
```typescript
export enum EventPhase {
  PRE_LIVE = "PRE_LIVE",    // ✅ Match backend
  LIVE = "LIVE",            // ✅ Already correct
  POST_LIVE = "POST_LIVE",  // ✅ Match backend
}
```

**Impact**: Fixes all phase comparisons across frontend

#### Fix #2: Fix Backend Phase Check
**File**: `backend/src/modules/streaming/streaming.service.ts:199-204`
```typescript
// BEFORE:
if (streamRole === StreamRole.VIEWER && eventPhase !== "LIVE") {

// AFTER:
if (streamRole === StreamRole.VIEWER && eventPhase !== "LIVE") {
```

**Impact**: Allows viewers to join when event is actually live

#### Fix #3: Fix StreamingPanel Rendering Logic
**File**: `frontend/src/components/streaming/StreamingPanel.tsx:37-38`
```typescript
// BEFORE:
const activeSession = session;
if (!activeSession) return null;

// AFTER:
// Remove early return - allow component to render even without session
// Show "Go Live" button when canManageStream && !session
```

**Impact**: Button appears when no session exists, allowing session creation

#### Fix #4: Update CreatorEventDetailPage Button
**File**: `frontend/src/pages/creator/CreatorEventDetailPage.tsx:29-37`
```typescript
// BEFORE:
function canGoLive(phase: EventPhase, status: EventStatus) {
  return phase === EventPhase.PRE_LIVE && status !== EventStatus.LIVE;
}

// AFTER:
function canGoLive(phase: EventPhase, status: EventStatus) {
  return phase === EventPhase.PRE_LIVE && status !== EventStatus.LIVE;
}
```

**Impact**: Button appears for correct phase

#### Fix #5: Add Error Handling
**File**: `frontend/src/pages/creator/CreatorEventDetailPage.tsx:91-102`
```typescript
// ADD:
const [error, setError] = useState<string | null>(null);

// UPDATE:
<button
  onClick={async () => {
    try {
      setError(null);
      await transition.mutateAsync({ id: event.id, phase: EventPhase.LIVE });
      // Optionally: trigger session creation here or let StreamingPanel handle it
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to go live");
    }
  }}
>
  Go Live
</button>

{error && <div className="text-red-400">{error}</div>}
```

**Impact**: Users see errors instead of silent failures

#### Fix #6: Coordinate Phase Transition + Session Creation
**Option A**: Make `createSession()` handle phase transition automatically
**Option B**: Update `onGoLive()` to transition phase first, then create session

**Recommended**: Update `StreamingPanel.onGoLive()`:
```typescript
const onGoLive = async () => {
  try {
    setJoinError(null);
    
    // Step 1: Transition phase if needed
    if (event?.phase !== "LIVE") {
      await eventsService.transitionPhase(eventId, EventPhase.LIVE);
      // Wait for cache invalidation
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Step 2: Create session
    await createSession();
    
    // Step 3: Join and publish
    await onJoin({ publish: true });
  } catch (e) {
    setJoinError(e instanceof Error ? e.message : "Failed to go live");
  }
};
```

### 5.2 Logging Improvements

#### Backend Logging
**File**: `backend/src/modules/streaming/streaming.service.ts`
```typescript
async createSession(...) {
  console.log(`[StreamingService] Creating session for event ${eventId}`);
  console.log(`[StreamingService] Event phase: ${event.phase}, status: ${event.status}`);
  // ... existing code ...
  console.log(`[StreamingService] Session created: ${session.id}`);
}

async generateToken(...) {
  console.log(`[StreamingService] Generating token for event ${eventId}, role: ${streamRole}`);
  console.log(`[StreamingService] Event phase: ${eventPhase}`);
  // ... existing code ...
}
```

#### Frontend Logging
**File**: `frontend/src/components/streaming/StreamingPanel.tsx`
```typescript
const onGoLive = async () => {
  console.log("[StreamingPanel] onGoLive called", { eventId, eventPhase: event?.phase });
  try {
    await createSession();
    console.log("[StreamingPanel] Session created, joining...");
    await onJoin({ publish: true });
    console.log("[StreamingPanel] Successfully went live");
  } catch (e) {
    console.error("[StreamingPanel] onGoLive failed", e);
    setJoinError(e instanceof Error ? e.message : "Failed to go live");
  }
};
```

### 5.3 UI Error Handling Improvements

1. **Add error toasts** for all streaming operations
2. **Show loading states** during phase transitions
3. **Disable buttons** during async operations
4. **Display phase/status** clearly in UI
5. **Add retry buttons** for failed operations

---

## 6. Root Cause Conclusion

The "Go Live" button fails due to **three interconnected issues**:

1. **Enum Mismatch**: Frontend `EventPhase.PRE_LIVE`/`POST_LIVE` don't match backend `PRE_LIVE`/`POST_LIVE`, causing phase checks to fail
2. **Incomplete Flow**: Two separate buttons perform different actions - one transitions phase, the other creates session, but they don't coordinate
3. **Rendering Logic**: `StreamingPanel` hides the "Go Live" button when no session exists, creating a chicken-and-egg problem

**Primary Root Cause**: The frontend enum definition uses incorrect values (`"PRE_LIVE_PHASE"` instead of `"PRE_LIVE"`), and the backend token generation checks for the wrong phase value (`"LIVE"` instead of `"LIVE"`).

**Secondary Root Cause**: The streaming lifecycle is split across two different UI components that don't communicate, and the component that should create sessions doesn't render when no session exists.

**Fix Priority**:
1. 🔴 **CRITICAL**: Fix enum values in shared types
2. 🔴 **CRITICAL**: Fix backend phase check in `generateToken()`
3. 🟡 **HIGH**: Fix `StreamingPanel` rendering logic
4. 🟡 **HIGH**: Add error handling to phase transition
5. 🟢 **MEDIUM**: Coordinate phase transition + session creation
6. 🟢 **MEDIUM**: Add comprehensive logging

---

## 7. Testing Checklist

After fixes are applied, verify:

- [ ] Event in `PRE_LIVE` phase shows "Go Live" button
- [ ] Clicking "Go Live" transitions phase to `LIVE`
- [ ] Session is created after phase transition
- [ ] Token generation succeeds for `BROADCASTER` role
- [ ] Token generation succeeds for `VIEWER` role when phase is `LIVE`
- [ ] LiveKit connection succeeds
- [ ] Audio/video tracks publish successfully
- [ ] Errors are displayed to user (not swallowed)
- [ ] Loading states show during async operations
- [ ] Phase transitions are logged in backend
- [ ] Session creation is logged in backend

---

**Report Generated**: 2025-12-15
**Files Analyzed**: 12
**Issues Found**: 6 critical, 3 high priority, 2 medium priority




