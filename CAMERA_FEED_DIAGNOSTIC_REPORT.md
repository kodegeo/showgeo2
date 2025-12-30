# Camera Feed Diagnostic Report
**Date**: 2025-01-28  
**Issue**: Camera feed shows black screen when enabled during live stream

## Executive Summary
The camera feed is not displaying when `setCameraEnabled(true)` is called. The track is being published to LiveKit, but the video element is not receiving or displaying the track data.

## Flow Analysis

### 1. Camera Enable Flow
**Location**: `BroadcasterControls.tsx:109-136`

```typescript
await room.localParticipant.setCameraEnabled(newState);
```

**Current Behavior**:
- ✅ Room connection state is checked (`ConnectionState.Connected`)
- ✅ `setCameraEnabled(true)` is called successfully
- ✅ Video track publication count increases after enable
- ⚠️ **ISSUE**: Logging only happens in development mode (`isDevelopment` check)

**Potential Issues**:
1. **Missing Logs**: If `isDevelopment` is false, no logs are generated, making debugging impossible
2. **No Error Handling**: If `setCameraEnabled` fails silently, no error is surfaced
3. **No Track Availability Check**: Code doesn't verify that track is actually available after enable

### 2. Track Detection Flow
**Location**: `LiveKitStage.tsx:44-255`

**Current Behavior**:
- ✅ Effect runs when room changes
- ✅ Local participant is checked
- ✅ Event listeners are registered for `trackPublished`, `trackUnpublished`, `trackMuted`, `trackUnmuted`
- ✅ `updateLocalVideo()` is called on events
- ⚠️ **ISSUE**: Track detection logic has several potential failure points

**Critical Issues Identified**:

#### Issue #1: Track Source Detection
**Location**: `LiveKitStage.tsx:98-102`

```typescript
const cameraPub = allVideoPubs.find(
  (pub) => pub.kind === Track.Kind.Video &&
  (pub as any).source !== "screen_share" &&
  (pub as any).source !== Track.Source?.ScreenShare
);
```

**Problem**: 
- Camera tracks might not have a `source` property set
- If `source` is `undefined`, the check `source !== "screen_share"` will be `true`, but if `source` is `null` or empty string, behavior is undefined
- LiveKit camera tracks typically have `source === Track.Source.Camera` or `source === "camera"`, but this isn't being checked

**Evidence**: The code only excludes screen share, but doesn't explicitly check for camera source.

#### Issue #2: Track Availability Timing
**Location**: `LiveKitStage.tsx:114-143`

```typescript
if (videoPub.track) {
  // Track is available - use it
} else {
  // Track publication exists but track is not yet available
  console.warn(`[LiveKitStage] Video publication exists (${source}) but track not yet available`);
  // Don't clear existing track - wait for it to become available
}
```

**Problem**:
- When `setCameraEnabled(true)` is called, the publication is created immediately
- However, the `track` property might be `null` initially
- The code logs a warning but doesn't actively wait for the track to become available
- The `setTimeout` in `handleTrackPublished` (100ms delay) might not be sufficient
- If the track never becomes available, the state never updates and video remains black

**Evidence**: The code path for "track not yet available" doesn't trigger any retry mechanism or additional checks.

#### Issue #3: Track State Update Logic
**Location**: `LiveKitStage.tsx:118-134`

```typescript
setLocalVideo((prev) => {
  // If trackSid is the same, don't update (same track, avoid detach/attach)
  if (prev.trackSid === trackSid) {
    console.log(`[LiveKitStage] Track ${trackSid} unchanged, skipping state update`);
    return prev;
  }
  // ... update state
});
```

**Problem**:
- If `trackSid` is the same but `track` object reference changed, state is not updated
- This could prevent a new track from being attached if the trackSid hasn't changed
- The check prevents necessary updates when track object is recreated with same SID

#### Issue #4: Event Handler Timing
**Location**: `LiveKitStage.tsx:165-180`

```typescript
const handleTrackPublished = (publication: any) => {
  console.log("[LiveKitStage] trackPublished event", {...});
  updateLocalVideo();
  setTimeout(() => {
    updateLocalVideo();
  }, 100);
};
```

**Problem**:
- `updateLocalVideo()` is called immediately, but track might not be available yet
- 100ms delay might not be sufficient for track to become available
- No verification that track actually became available after delay
- If track is still not available after 100ms, no further action is taken

### 3. Video Element Attachment
**Location**: `LiveKitStage.tsx:460-490` (LocalVideo component)

```typescript
function LocalVideo({ track, trackSid }: { track: LocalVideoTrack; trackSid: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !trackSid) return;

    track.attach(video);
    // ...
    return () => {
      track.detach(video);
    };
  }, [trackSid]); // Only trackSid - track object is stable for same trackSid
}
```

**Current Behavior**:
- ✅ Video element ref is created
- ✅ Track is attached when `trackSid` changes
- ✅ Track is detached on cleanup
- ⚠️ **ISSUE**: Effect only depends on `trackSid`, not `track` object

**Potential Issues**:
1. **Track Object Not in Dependencies**: If `track` object changes but `trackSid` stays the same, effect doesn't re-run
2. **No Error Handling**: If `track.attach()` fails, no error is caught or logged
3. **No Verification**: Code doesn't verify that video element actually received the track
4. **Missing Video Element Properties**: Video element might need additional properties (`muted`, `autoplay`, `playsInline`) to work correctly

### 4. Rendering Logic
**Location**: `LiveKitStage.tsx:350-410`

```typescript
{hasLocalVideo && localVideo.track && localVideo.trackSid && localVideo.source ? (
  <>
    <LocalVideo track={localVideo.track} trackSid={localVideo.trackSid} />
    {/* Overlays */}
  </>
) : (
  /* Placeholder */
)}
```

**Current Behavior**:
- ✅ Conditional rendering based on `hasLocalVideo`
- ✅ `LocalVideo` component is rendered when track exists
- ⚠️ **ISSUE**: Multiple conditions must all be true for video to render

**Potential Issues**:
1. **Strict Conditions**: All of `hasLocalVideo`, `localVideo.track`, `localVideo.trackSid`, and `localVideo.source` must be truthy
2. **Source Requirement**: If `source` is not set correctly, video won't render even if track exists
3. **No Fallback**: If any condition fails, placeholder is shown instead of attempting to render

## Root Cause Analysis

### Primary Hypothesis: Track Not Becoming Available
**Most Likely Cause**: When `setCameraEnabled(true)` is called:
1. LiveKit creates a publication immediately
2. Publication is added to `videoTrackPublications`
3. `trackPublished` event fires
4. **BUT**: The `track` property on the publication is still `null`
5. `updateLocalVideo()` finds the publication but sees `track === null`
6. Code logs warning but doesn't update state
7. State remains with `track: null`
8. `LocalVideo` component never receives a track
9. Video element remains black

**Why This Happens**:
- LiveKit's `setCameraEnabled()` is asynchronous
- Publication is created synchronously, but track creation is asynchronous
- There's a race condition between publication creation and track availability
- The 100ms `setTimeout` might not be sufficient
- No active polling or retry mechanism exists

### Secondary Hypothesis: Track Source Detection Failure
**Alternative Cause**: The camera track might not be detected because:
1. Track source is not set to expected values
2. Source check logic excludes the track incorrectly
3. Track is found but source is `null` or `undefined`, causing rendering to fail

### Tertiary Hypothesis: Video Element Attachment Failure
**Alternative Cause**: The track might be available but not attaching to video element:
1. `track.attach()` might be failing silently
2. Video element might not have required properties
3. Browser permissions might be blocking video display
4. Track might be attached but video element is not visible or sized correctly

## Recommended Fixes

### Fix #1: Improve Track Source Detection
**Priority**: HIGH  
**Location**: `LiveKitStage.tsx:98-102`

```typescript
// Explicitly check for camera source
const cameraPub = allVideoPubs.find(
  (pub) => pub.kind === Track.Kind.Video &&
  ((pub as any).source === Track.Source.Camera ||
   (pub as any).source === "camera" ||
   ((pub as any).source !== "screen_share" && 
    (pub as any).source !== Track.Source?.ScreenShare))
);
```

### Fix #2: Add Active Polling for Track Availability
**Priority**: CRITICAL  
**Location**: `LiveKitStage.tsx:135-143`

```typescript
} else {
  // Track publication exists but track is not yet available
  console.warn(`[LiveKitStage] Video publication exists (${source}) but track not yet available, trackSid: ${trackSid}`);
  
  // ✅ FIX: Actively poll for track to become available
  const maxAttempts = 20; // 2 seconds total
  let attempts = 0;
  const pollInterval = setInterval(() => {
    attempts++;
    const pub = localParticipant.videoTrackPublications.get(trackSid);
    if (pub?.track) {
      clearInterval(pollInterval);
      updateLocalVideo(); // Retry now that track is available
    } else if (attempts >= maxAttempts) {
      clearInterval(pollInterval);
      console.error(`[LiveKitStage] Track ${trackSid} never became available after ${maxAttempts * 100}ms`);
    }
  }, 100);
  
  // Store interval for cleanup
  // (Need to add cleanup in useEffect return)
}
```

### Fix #3: Always Log Camera Enable/Disable
**Priority**: MEDIUM  
**Location**: `BroadcasterControls.tsx:120-131`

```typescript
// Remove isDevelopment check - always log
const beforeCount = room.localParticipant.videoTrackPublications.size;
console.log(`[BroadcasterControls] ${newState ? "Enabling" : "Disabling"} camera...`, {
  beforeCount,
  currentState,
  roomState: room.state,
});

await room.localParticipant.setCameraEnabled(newState);

const afterCount = room.localParticipant.videoTrackPublications.size;
console.log(`[BroadcasterControls] Camera ${newState ? "enabled" : "disabled"}`, {
  afterCount,
  trackAdded: afterCount > beforeCount,
});
```

### Fix #4: Add Track Attachment Verification
**Priority**: HIGH  
**Location**: `LiveKitStage.tsx:460-490` (LocalVideo component)

```typescript
useEffect(() => {
  const video = videoRef.current;
  if (!video || !trackSid || !track) return;

  console.log(`[LocalVideo] Attaching track ${trackSid} to video element`);
  
  try {
    track.attach(video);
    
    // ✅ FIX: Verify attachment
    const stream = video.srcObject;
    if (!stream) {
      console.error(`[LocalVideo] Track attached but video.srcObject is null`);
    } else {
      const videoTracks = stream.getVideoTracks();
      console.log(`[LocalVideo] Track attached successfully`, {
        trackSid,
        streamId: stream.id,
        videoTrackCount: videoTracks.length,
        trackEnabled: videoTracks[0]?.enabled,
        trackReadyState: videoTracks[0]?.readyState,
      });
    }
  } catch (error) {
    console.error(`[LocalVideo] Failed to attach track:`, error);
  }

  return () => {
    console.log(`[LocalVideo] Detaching track ${trackSid}`);
    track.detach(video);
  };
}, [trackSid, track]); // ✅ FIX: Include track in dependencies
```

### Fix #5: Add Comprehensive Logging
**Priority**: MEDIUM  
**Location**: Throughout `LiveKitStage.tsx`

Add logging at every critical point:
- When effect runs
- When updateLocalVideo is called
- When tracks are found/not found
- When state is updated/not updated
- When LocalVideo component mounts/unmounts
- When track is attached/detached

## Testing Checklist

1. ✅ Verify room is connected before enabling camera
2. ✅ Verify localParticipant exists
3. ✅ Verify `setCameraEnabled(true)` completes without error
4. ✅ Verify `trackPublished` event fires
5. ✅ Verify publication is added to `videoTrackPublications`
6. ✅ Verify `track` property becomes available on publication
7. ✅ Verify `updateLocalVideo()` finds the track
8. ✅ Verify state is updated with track
9. ✅ Verify `LocalVideo` component receives track prop
10. ✅ Verify `track.attach()` succeeds
11. ✅ Verify video element has `srcObject` set
12. ✅ Verify video element is visible and sized correctly
13. ✅ Verify video track is enabled and in "live" readyState

## Next Steps

1. **Immediate**: Add comprehensive logging to identify which step is failing
2. **Short-term**: Implement Fix #2 (active polling for track availability)
3. **Short-term**: Implement Fix #4 (track attachment verification)
4. **Medium-term**: Improve track source detection (Fix #1)
5. **Long-term**: Add error boundaries and user-facing error messages

## Expected Console Output (When Working)

```
[BroadcasterControls] Enabling camera... { beforeCount: 0, currentState: false }
[BroadcasterControls] Camera enabled { afterCount: 1, trackAdded: true }
[LiveKitStage] trackPublished event { trackSid: "TR_xxx", kind: "video", source: "camera", hasTrack: true }
[LiveKitStage] updateLocalVideo called { videoPubCount: 1, pubs: [{ trackSid: "TR_xxx", hasTrack: true, source: "camera" }] }
[LiveKitStage] Local camera track set { trackSid: "TR_xxx", source: "camera" }
[LocalVideo] Attaching track TR_xxx to video element
[LocalVideo] Track attached successfully { trackSid: "TR_xxx", streamId: "xxx", videoTrackCount: 1, trackEnabled: true, trackReadyState: "live" }
```

## Current Console Output (When Broken)

Based on user report: "Nothing on the console logs" - this suggests:
- Either logging is disabled (`isDevelopment` is false)
- Or events are not firing at all
- Or code is not reaching the logging statements

This needs to be verified with the fixes above.

