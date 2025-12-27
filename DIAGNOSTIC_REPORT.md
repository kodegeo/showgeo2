# Camera Feed Flash-Then-Black Bug - Diagnostic Report

## Problem Summary
Camera feed flashes on briefly, then screen turns black. This indicates tracks are being attached then immediately detached.

## Root Cause Analysis

### Issue #1: Track Reference Instability in LocalVideo Component
**Location**: `LiveKitStage.tsx:399-423` (LocalVideo component)

**Problem**:
- `LocalVideo` uses `useEffect(() => {...}, [track])` 
- When `track` prop changes (even if it's the same logical track but a new object reference), React:
  1. Runs cleanup: `track.detach(video)` → **BLACK SCREEN**
  2. Runs effect: `track.attach(video)` → **FLASH ON**
  3. If track reference changes again → cycle repeats

**Evidence**:
- Line 93: `setLocalVideo({ track: localTrack, source, isEnabled: true })` creates new state object
- Line 89: `const localTrack = videoPub.track as LocalVideoTrack` - track reference may change
- When `setCameraEnabled(true)` is called, LiveKit may create a NEW track object with different reference
- Even if same track, if `updateLocalVideo()` is called multiple times, it creates new state objects

### Issue #2: Multiple Rapid State Updates
**Location**: `LiveKitStage.tsx:125-146`

**Problem**:
- `updateLocalVideo()` is called:
  1. On mount (line 125)
  2. On `trackPublished` event (line 135)
  3. On `trackUnpublished` event (line 145)
- When camera is enabled:
  - `setCameraEnabled(true)` → LiveKit publishes track
  - `trackPublished` event fires → `updateLocalVideo()` → `setLocalVideo()` 
  - This may fire MULTIPLE times if LiveKit emits multiple events
  - Each call creates new state: `{ track: localTrack, ... }`
  - Even if `localTrack` is same object, React sees new state object → re-render

**Evidence**:
- Line 93: Direct state update without checking if track actually changed
- No memoization or reference comparison before updating state
- Multiple event listeners (main + debug) both trigger updates

### Issue #3: Track Object Reference Changes
**Location**: `LiveKitStage.tsx:88-93`

**Problem**:
- `videoPub.track` reference may change between calls to `updateLocalVideo()`
- When `setCameraEnabled(true)`:
  - LiveKit may unpublish old track and publish new track
  - Or reuse same track but publication object changes
  - `videoPub.track` gets new reference → `localTrack` is new object
  - `setLocalVideo({ track: localTrack, ... })` → new state → `LocalVideo` re-renders
  - `useEffect` sees new `track` prop → detaches old, attaches new

**Evidence**:
- Line 55: `Array.from(localParticipant.videoTrackPublications.values())` - gets fresh array each time
- Line 88: `videoPub.track` - track reference may be different each call
- No tracking of trackSid or stable identifier to prevent unnecessary updates

### Issue #4: Duplicate Event Listeners
**Location**: `LiveKitStage.tsx:148-150` and `160-182`

**Problem**:
- TWO separate `useEffect` hooks both listen to `trackPublished`/`trackUnpublished`:
  1. Main effect (lines 148-150): Calls `updateLocalVideo()`
  2. Debug effect (lines 175-176): Just logs
- Both fire on same events → potential race conditions
- Main effect may fire multiple times for same event

**Evidence**:
- Line 149: `localParticipant.on("trackPublished", handleTrackPublished)`
- Line 175: `lp.on("trackPublished", onTrackPublished)`
- Both registered on same participant → duplicate handlers

### Issue #5: No Track Reference Stability Check
**Location**: `LiveKitStage.tsx:88-93`

**Problem**:
- `setLocalVideo()` is called unconditionally when `videoPub?.track` exists
- No check if track reference actually changed
- No check if trackSid changed (same track, different object)
- Always creates new state object → always triggers re-render

**Evidence**:
- Line 93: `setLocalVideo({ track: localTrack, source, isEnabled: true })`
- No comparison: `if (prev.track !== localTrack)` before updating
- No tracking of trackSid to detect if it's the same track

## Sequence of Events (Bug Reproduction)

1. User clicks "Camera On"
2. `BroadcasterControls.toggleCam()` → `setCameraEnabled(true)`
3. LiveKit publishes camera track → `trackPublished` event fires
4. `handleTrackPublished()` → `updateLocalVideo()` called
5. `updateLocalVideo()` finds track → `setLocalVideo({ track: newTrackRef, ... })`
6. React re-renders → `LocalVideo` receives new `track` prop
7. `LocalVideo.useEffect` sees new `track` → cleanup runs: `oldTrack.detach(video)` → **BLACK**
8. Effect runs: `newTrack.attach(video)` → **FLASH ON**
9. If track reference changes again (another event, state update) → cycle repeats

## Critical Code Sections

### Problematic Code #1: Unconditional State Update
```typescript
// Line 88-93
if (videoPub?.track) {
  const localTrack = videoPub.track as LocalVideoTrack;
  const source = screenPub ? "screen" : "camera";
  
  // ❌ PROBLEM: Always creates new state, even if track unchanged
  setLocalVideo({ track: localTrack, source, isEnabled: true });
}
```

### Problematic Code #2: Track-Dependent Effect
```typescript
// Line 402-412 (LocalVideo component)
useEffect(() => {
  const video = videoRef.current;
  if (!video) return;

  track.attach(video);

  return () => {
    track.detach(video); // ❌ PROBLEM: Detaches on every track reference change
  };
}, [track]); // ❌ PROBLEM: Dependency on track object reference
```

### Problematic Code #3: Multiple Event Handlers
```typescript
// Line 148-150: Main handler
localParticipant.on("trackPublished", handleTrackPublished);

// Line 175-176: Debug handler (duplicate)
lp.on("trackPublished", onTrackPublished);
```

## Recommended Fixes

1. **Track Reference Stability**: Use `trackSid` or track ID to detect if track actually changed
2. **Conditional State Updates**: Only call `setLocalVideo()` if track reference or trackSid changed
3. **Stable Track Reference**: Store trackSid and compare before updating
4. **Remove Duplicate Listeners**: Consolidate debug logging into main handler
5. **Memoize Track**: Use `useMemo` or ref to maintain stable track reference

## Files to Fix

1. `frontend/src/components/streaming/LiveKitStage.tsx`
   - Lines 88-93: Add track reference stability check
   - Lines 148-182: Remove duplicate event listeners
   - Lines 402-412: Consider using trackSid instead of track object as dependency
