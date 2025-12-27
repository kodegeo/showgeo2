# Diagnostic Report: LiveKit Camera Flash-to-Black Issue (Part 2)

**Date:** 2025-01-27  
**Issue:** Livestream feed flashes and returns to black, with React render warnings and publishing timeout errors.

## Critical Issues Found

### 1. **React Render Violation: `navigate()` Called During Render** ⚠️ CRITICAL

**Location:** `StreamingPanel.tsx:652`

**Problem:**
```typescript
if (connected && room) {
    console.log("[StreamingPanel] Connected but still on panel, redirecting to live page");
    navigate(`/events/${eventId}/live`);  // ❌ CALLED DURING RENDER
    return (
      <div className="border border-[#CD000E] bg-[#0B0B0B] p-6 rounded-lg">
        <p className="text-gray-400">Redirecting to live page...</p>
      </div>
    );
  }
```

**Impact:**
- React warning: "Cannot update a component (`BrowserRouter`) while rendering a different component (`StreamingPanel`)"
- This can cause:
  - Unpredictable re-renders
  - State synchronization issues
  - Component lifecycle violations
  - Potential race conditions with LiveKit connection state

**Root Cause:**
- `navigate()` is a side effect that should be in `useEffect`, not in render logic
- The redirect should happen after render completes, not during render

**Fix Required:**
- Move `navigate()` call to a `useEffect` that watches `connected` and `room` state
- Or remove this fallback redirect entirely (redirect already happens in `onGoLive` at line 445)

---

### 2. **Publishing Before Engine Connection** ⚠️ CRITICAL

**Location:** `StreamingPanel.tsx:307` → `publishLocal.ts:34`

**Error Message:**
```
[onJoin] Publish failed: PublishTrackError: publishing rejected as engine not connected within timeout
```

**Problem Sequence:**
1. `joinStream()` completes and returns room (line 271-274)
2. `setRoom(lkRoom)` is called (line 279)
3. `publishLocal(lkRoom)` is called immediately (line 307)
4. `publishLocal` calls `ensureConnected()` which checks `room.state === ConnectionState.Connected`
5. **BUT:** `room.connect()` may have resolved before the engine is fully ready
6. `publishTrack()` fails because the engine isn't connected yet

**Root Cause:**
- `joinStream()` waits for `ConnectionState.Connected` (line 94 in joinStream.ts)
- However, `ConnectionState.Connected` may be set before the WebRTC engine is fully initialized
- There's a gap between "connected" state and "engine ready" state
- `publishLocal`'s `ensureConnected()` check passes, but publishing still fails

**Evidence:**
- Error: "publishing rejected as engine not connected within timeout"
- This suggests the room reports as connected, but the underlying engine isn't ready

**Fix Required:**
- Add additional wait after `joinStream()` returns before calling `publishLocal()`
- Or enhance `ensureConnected()` to wait for engine readiness, not just connection state
- Or add retry logic with exponential backoff for `publishTrack()`

---

### 3. **Race Condition: State Updates During Render** ⚠️ HIGH

**Location:** Multiple locations in `StreamingPanel.tsx`

**Problem:**
- Multiple `setState` calls happen in rapid succession:
  - Line 279: `setRoom(lkRoom)` 
  - Line 308: `setLocalTracks(tracks)`
  - Line 312: `setIsBroadcasting(true)`
- These state updates can trigger re-renders while LiveKit is still initializing
- The component may re-render with new state before LiveKit tracks are fully attached

**Impact:**
- Component re-renders can interrupt track attachment/detachment cycles
- `LiveKitStage` may receive new room/track references before previous ones are cleaned up
- This can cause the flash-to-black behavior

---

### 4. **Auto-Join Effect Dependencies** ⚠️ MEDIUM

**Location:** `StreamingPanel.tsx:342-368`

**Problem:**
```typescript
useEffect(() => {
    // ... auto-join logic
}, [canManageStream, session?.id, session?.active, loading, connected, joining]);
```

**Issues:**
- `onJoin` is not in the dependency array (eslint-disable comment on line 367)
- This means `onJoin` may use stale closures
- If `onJoin` changes, the effect won't re-run
- The effect may call an outdated version of `onJoin`

**Impact:**
- Auto-join may use stale state or callbacks
- This could contribute to connection/publishing issues

---

### 5. **Track Publishing Timing Issue** ⚠️ HIGH

**Location:** `StreamingPanel.tsx:303-319`

**Problem:**
```typescript
if (shouldPublish) {
    console.log("[onJoin] Publishing local tracks...");
    setPublishing(true);
    try {
      const tracks = await publishLocal(lkRoom);  // ❌ Called immediately after connect
      setLocalTracks(tracks);
      console.log("[onJoin] Published", tracks.length, "tracks");
      setIsBroadcasting(true);
    } catch (publishError) {
      // Error handling
    }
}
```

**Issue:**
- `publishLocal()` is called immediately after `joinStream()` returns
- Even though `joinStream()` waits for `ConnectionState.Connected`, the engine may not be ready
- No additional delay or readiness check before publishing

**Fix Required:**
- Add a small delay (100-200ms) after `joinStream()` before calling `publishLocal()`
- Or add a more robust engine readiness check
- Or implement retry logic for `publishTrack()`

---

## Recent Changes Review

### Changes That May Have Contributed:

1. **`joinStream.ts` - Connection State Waiting:**
   - Added `waitForConnected()` function
   - Waits for `ConnectionState.Connected` before returning
   - **Issue:** `ConnectionState.Connected` may not mean engine is ready

2. **`publishLocal.ts` - Connection Check:**
   - Added `ensureConnected()` function
   - Checks `room.state === ConnectionState.Connected`
   - **Issue:** This check may pass, but engine still not ready

3. **`BroadcasterControls.tsx` - State Reading:**
   - Changed to read state from `room.localParticipant` instead of React state
   - **Good change:** Eliminates race conditions in toggles

4. **`LiveKitStage.tsx` - Track Stability:**
   - Added `trackSid` tracking to prevent unnecessary re-renders
   - **Good change:** Should help with flash-to-black

---

## Recommended Fixes (Priority Order)

### Fix 1: Move `navigate()` to `useEffect` (CRITICAL)
```typescript
// Remove navigate() from render (line 652)
// Add useEffect:
useEffect(() => {
  if (connected && room && canManageStream) {
    console.log("[StreamingPanel] Connected, redirecting to live page");
    navigate(`/events/${eventId}/live`, { replace: true });
  }
}, [connected, room, canManageStream, navigate, eventId]);
```

### Fix 2: Add Engine Readiness Wait (CRITICAL)
```typescript
// In onJoin, after joinStream():
lkRoom = await joinStream({ token, serverUrl });
setRoom(lkRoom);

// Add delay before publishing:
if (shouldPublish) {
  // Wait for engine to be ready (not just connected)
  await new Promise(resolve => setTimeout(resolve, 200));
  
  setPublishing(true);
  try {
    const tracks = await publishLocal(lkRoom);
    // ...
  }
}
```

### Fix 3: Enhance `ensureConnected()` to Wait for Engine (HIGH)
```typescript
// In publishLocal.ts, enhance ensureConnected():
async function ensureConnected(room: Room): Promise<void> {
  if (room.state === ConnectionState.Connected) {
    // Additional check: wait for localParticipant to be ready
    let attempts = 0;
    while (attempts < 10 && !room.localParticipant) {
      await new Promise(resolve => setTimeout(resolve, 50));
      attempts++;
    }
    if (room.localParticipant) {
      return;
    }
  }
  // ... existing wait logic
}
```

### Fix 4: Add Retry Logic for `publishTrack()` (HIGH)
```typescript
// In publishLocal.ts:
export async function publishLocal(room: Room) {
  await ensureConnected(room);

  const tracks = await createLocalTracks({
    audio: true,
    video: true,
  });

  // Retry logic for each track
  for (const track of tracks) {
    let attempts = 0;
    while (attempts < 3) {
      try {
        await room.localParticipant.publishTrack(track);
        break; // Success
      } catch (error) {
        attempts++;
        if (attempts >= 3) throw error;
        await new Promise(resolve => setTimeout(resolve, 100 * attempts));
      }
    }
  }

  return tracks;
}
```

### Fix 5: Fix Auto-Join Effect Dependencies (MEDIUM)
```typescript
// Add onJoin to dependencies or use useCallback properly
const onJoin = useCallback(async (opts?: {...}) => {
  // ... existing logic
}, [session, eventId, canManageStream, /* other deps */]);

// Then in useEffect:
useEffect(() => {
  // ... auto-join logic
}, [canManageStream, session?.id, session?.active, loading, connected, joining, onJoin]);
```

---

## Summary

**Primary Issues:**
1. ❌ `navigate()` called during render (React violation)
2. ❌ Publishing before engine is ready (timeout error)
3. ⚠️ Race conditions from rapid state updates

**Root Cause:**
- `ConnectionState.Connected` doesn't guarantee engine readiness
- No delay between connection and publishing
- React render violations causing state synchronization issues

**Expected Outcome After Fixes:**
- No React warnings
- Camera feed stays visible (no flash-to-black)
- Publishing succeeds on first attempt
- Smooth connection and track attachment flow

