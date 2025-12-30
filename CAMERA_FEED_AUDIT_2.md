# Camera Feed Diagnostic Audit #2
**Date**: 2025-01-28  
**Issue**: Camera feed still shows black screen after all fixes  
**User Report**: "It's still black. Can we default with the camera on? Maybe that's the issue. Before, when it worked, the camera on/off function was not there."

## Key Insight from User
**Critical Information**: The camera worked BEFORE the camera toggle controls were added. This suggests:
1. Auto-enabling camera on join was the working pattern
2. Manual toggle might be introducing timing/race condition issues
3. The track might be getting published but not detected/displayed correctly

## Current Flow Analysis

### 1. Join Flow (EventLivePage.tsx)
**Current State**: 
- ✅ Room connects successfully
- ❌ Camera is NOT auto-enabled (removed in previous refactor)
- ❌ User must manually click camera button

**Previous Working State** (before toggle controls):
- ✅ Room connects
- ✅ Camera automatically enabled on join
- ✅ Track immediately available and displayed

### 2. Camera Enable Flow (BroadcasterControls.tsx)
**Current State**:
- User clicks camera button
- `setCameraEnabled(true)` is called
- Track publication is created
- **ISSUE**: Track might not be immediately available
- **ISSUE**: Track detection might fail

### 3. Track Detection Flow (LiveKitStage.tsx)
**Current State**:
- Listens to `trackPublished` event
- Calls `updateLocalVideo()` immediately
- If track not available, polls for up to 2 seconds
- Updates state when track found

**Potential Issues**:
1. **Timing Issue**: `trackPublished` event might fire before track is actually attached to publication
2. **Source Detection**: Camera source might not match expected values
3. **State Update Race**: Multiple rapid state updates might cause issues
4. **Track Attachment**: Track might be available but not attaching to video element

## Root Cause Hypotheses

### Hypothesis #1: Track Published Event Timing
**Theory**: `trackPublished` event fires, but `publication.track` is still `null` at that moment. The polling mechanism should catch this, but might not be working correctly.

**Evidence**:
- Code has polling mechanism (lines 147-172)
- Polling checks `pub?.track` every 100ms
- But polling is only triggered when `videoPub.track` is null in `updateLocalVideo()`

**Problem**: If `trackPublished` event fires and `updateLocalVideo()` is called, but the publication isn't found in `allVideoPubs` yet, the polling never starts.

### Hypothesis #2: Publication Not in videoTrackPublications Yet
**Theory**: When `setCameraEnabled(true)` is called, the publication might not be immediately added to `videoTrackPublications`. The `trackPublished` event fires, but when `updateLocalVideo()` queries `videoTrackPublications`, the publication isn't there yet.

**Evidence**:
- `updateLocalVideo()` queries `localParticipant.videoTrackPublications.values()`
- `trackPublished` event handler calls `updateLocalVideo()` immediately
- Race condition: event fires before publication is in the map

### Hypothesis #3: Track Source Mismatch
**Theory**: The camera track's `source` property doesn't match any of the expected values, so `cameraPub` is never found.

**Evidence**:
- Code checks for `Track.Source.Camera`, `"camera"`, or non-screen-share
- But LiveKit might use different source values
- If source is `undefined` or unexpected value, track won't be found

### Hypothesis #4: Track Object Reference Issue
**Theory**: The track object exists but the reference changes, causing `LocalVideo` component to not re-attach.

**Evidence**:
- `LocalVideo` depends on `[trackSid, track]`
- If track object reference changes but trackSid stays same, might cause issues
- Track attachment verification might be failing silently

### Hypothesis #5: Video Element Not Ready
**Theory**: The video element isn't ready when track is attached, or attachment fails silently.

**Evidence**:
- `LocalVideo` checks `if (!video || !trackSid || !track) return;`
- But video element might not be mounted yet
- `track.attach(video)` might fail but error is caught

## Recommended Fixes

### Fix #1: Auto-Enable Camera on Join (IMMEDIATE)
**Priority**: CRITICAL  
**Location**: `EventLivePage.tsx:89-94`

```typescript
// After room connects, auto-enable camera for broadcasters
if (isBroadcaster && lkRoom.localParticipant) {
  await new Promise(resolve => setTimeout(resolve, 300)); // Wait for room to be ready
  await lkRoom.localParticipant.setCameraEnabled(true);
}
```

**Rationale**: Restore the working pattern from before toggle controls were added.

### Fix #2: Improve Track Detection in trackPublished Handler
**Priority**: HIGH  
**Location**: `LiveKitStage.tsx:198-215`

**Current Code**:
```typescript
const handleTrackPublished = (publication: any) => {
  updateLocalVideo();
  setTimeout(() => updateLocalVideo(), 100);
};
```

**Problem**: If publication isn't in `videoTrackPublications` yet, `updateLocalVideo()` won't find it.

**Fix**: Check publication directly from event, not just from map:
```typescript
const handleTrackPublished = (publication: any) => {
  console.log("[LiveKitStage] trackPublished event", {...});
  
  // ✅ FIX: Check if this publication is already in the map
  const existingPub = localParticipant.videoTrackPublications.get(publication?.trackSid);
  if (existingPub) {
    // Publication is in map, update immediately
    updateLocalVideo();
  } else {
    // Publication not in map yet - wait a bit then check again
    setTimeout(() => {
      updateLocalVideo();
      // Also check directly from event publication
      if (publication?.track) {
        // Track is available on event publication, use it
        const allVideoPubs = Array.from(localParticipant.videoTrackPublications.values());
        // If still not in map, manually check the event publication
        if (!allVideoPubs.find(p => p.trackSid === publication.trackSid)) {
          console.warn("[LiveKitStage] Publication from event not in videoTrackPublications map");
        }
      }
    }, 50);
  }
  
  // Also check again after longer delay
  setTimeout(() => updateLocalVideo(), 200);
};
```

### Fix #3: Add Direct Publication Check
**Priority**: HIGH  
**Location**: `LiveKitStage.tsx:74-88` (updateLocalVideo function)

**Current Code**:
```typescript
const allVideoPubs = Array.from(localParticipant.videoTrackPublications.values());
```

**Fix**: Also check if there are any pending publications by querying `isCameraEnabled`:
```typescript
const updateLocalVideo = () => {
  const allVideoPubs = Array.from(localParticipant.videoTrackPublications.values());
  
  // ✅ FIX: If camera is enabled but no video publication found, wait a bit
  const isCameraEnabled = localParticipant.isCameraEnabled;
  if (isCameraEnabled && allVideoPubs.length === 0) {
    console.warn("[LiveKitStage] Camera is enabled but no video publications found - waiting...");
    setTimeout(() => updateLocalVideo(), 200);
    return;
  }
  
  // ... rest of function
};
```

### Fix #4: Enhanced Source Detection
**Priority**: MEDIUM  
**Location**: `LiveKitStage.tsx:102-109`

**Current Code**: Checks for `Track.Source.Camera`, `"camera"`, or non-screen-share

**Fix**: Log all source values to see what LiveKit actually uses:
```typescript
const cameraPub = allVideoPubs.find((pub) => {
  const source = (pub as any).source;
  console.log("[LiveKitStage] Checking publication source", {
    trackSid: pub.trackSid,
    source,
    sourceType: typeof source,
    isVideo: pub.kind === Track.Kind.Video,
    hasTrack: !!pub.track,
  });
  
  return pub.kind === Track.Kind.Video &&
    (source === Track.Source?.Camera ||
     source === "camera" ||
     source === Track.Source?.Camera ||
     (source !== "screen_share" && 
      source !== Track.Source?.ScreenShare &&
      source !== Track.Source?.ScreenShareAudio &&
      source !== undefined)); // ✅ Accept undefined as camera
});
```

### Fix #5: Add Comprehensive Debugging
**Priority**: MEDIUM  
**Location**: Throughout `LiveKitStage.tsx`

Add logging at every critical point:
1. When `trackPublished` fires - log publication details
2. When `updateLocalVideo` is called - log all publications
3. When camera publication is found/not found - log why
4. When track is set in state - log track details
5. When `LocalVideo` receives track - log attachment attempt
6. When track is attached - verify MediaStream

## Testing Plan

1. **Test Auto-Enable**: Join as broadcaster, verify camera auto-enables
2. **Test Track Detection**: Check console logs for track detection flow
3. **Test Source Values**: Log all publication sources to see actual values
4. **Test Timing**: Add timestamps to logs to see timing issues
5. **Test Video Element**: Verify video element is mounted before track attachment

## Expected Console Output (When Working)

```
[EventLivePage] Room connected { roomState: "connected" }
[EventLivePage] Auto-enabling camera for broadcaster
[EventLivePage] Camera auto-enabled successfully
[LiveKitStage] trackPublished event { trackSid: "TR_xxx", hasTrack: true, source: "camera" }
[LiveKitStage] updateLocalVideo called { videoPubCount: 1, pubs: [{ trackSid: "TR_xxx", hasTrack: true, source: "camera" }] }
[LiveKitStage] Local camera track set { trackSid: "TR_xxx" }
[LocalVideo] Attaching track TR_xxx to video element
[LocalVideo] Track attached successfully { streamId: "xxx", videoTrackCount: 1, trackEnabled: true, trackReadyState: "live" }
```

## Current Console Output (When Broken)

Need to verify what logs are actually appearing. The user said "Nothing on the console logs" earlier, which suggests:
- Either logging is disabled
- Or events aren't firing
- Or code isn't reaching logging statements

With auto-enable and enhanced logging, we should see exactly where the flow breaks.

