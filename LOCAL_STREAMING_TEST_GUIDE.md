# Local Streaming Test Guide

## Overview
This guide explains how to test the LiveKit streaming functionality locally with multiple users (broadcaster + viewers).

## Prerequisites

1. **Backend running** on `http://localhost:3000`
2. **Frontend running** on `http://localhost:5173`
3. **LiveKit server** configured (either LiveKit Cloud or local LiveKit server)
4. **Environment variables** set in `frontend/.env`:
   ```env
   VITE_LIVEKIT_URL=wss://your-project.livekit.cloud
   # OR for local LiveKit server:
   # VITE_LIVEKIT_URL=ws://localhost:7880
   ```

## Test Setup

### Step 1: Create Test Users

You'll need at least 2 user accounts:

1. **Broadcaster** (Entity/Admin/Coordinator role):
   - Can create events
   - Can start streaming sessions
   - Can publish camera/mic

2. **Viewer** (Regular user):
   - Can watch streams
   - Cannot publish

### Step 2: Create an Event

1. Log in as the **Broadcaster** user
2. Navigate to `/creator/events`
3. Create a new event or use an existing one
4. Note the event ID from the URL (e.g., `/creator/events/abc123`)

### Step 3: Start a Streaming Session

1. As the **Broadcaster**, navigate to the event detail page
2. Click "Go Live" button (this creates a streaming session)
3. You should be redirected to `/events/:eventId/live`
4. The page should show the broadcaster interface with controls

### Step 4: Join as Viewer (Multiple Browser Windows)

To test multiple users joining:

#### Option A: Multiple Browser Windows (Same Browser)
1. Open a **new window** (not tab) in the same browser
2. Log in as a **different user** (Viewer account)
3. Navigate to `/events/:eventId/watch`
4. The viewer should see the broadcaster's stream

#### Option B: Incognito/Private Window (Recommended)
1. Open an **incognito/private window**
2. Log in as a **Viewer** user
3. Navigate to `/events/:eventId/watch`
4. This simulates a completely separate user session

#### Option C: Different Browser
1. Open a **different browser** (Chrome vs Firefox vs Safari)
2. Log in as a **Viewer** user
3. Navigate to `/events/:eventId/watch`

#### Option D: Multiple Incognito Windows
1. Open **multiple incognito windows**
2. Log in as **different Viewer users** in each
3. Navigate to `/events/:eventId/watch` in each
4. This allows testing multiple concurrent viewers

## Testing Checklist

### Broadcaster Flow (`/events/:eventId/live`)

- [ ] Page loads without errors
- [ ] "Go Live" creates a streaming session
- [ ] Redirects to `/events/:eventId/live` after "Go Live"
- [ ] Room connects successfully (check console for `[EventLivePage] Room connected`)
- [ ] Camera button shows "Camera Off" initially
- [ ] Clicking "Camera Off" turns it yellow ("Starting...")
- [ ] Button turns green ("Camera Live") when camera is ready
- [ ] Video feed appears in the center area
- [ ] Top indicator shows "🔴 You are Live" when camera is on
- [ ] Microphone toggle works
- [ ] Screen share toggle works
- [ ] Viewer count updates when viewers join
- [ ] "End Stream" button works

### Viewer Flow (`/events/:eventId/watch`)

- [ ] Page loads without errors
- [ ] Shows "This event is not live yet" if session is not active
- [ ] Automatically connects when session becomes active
- [ ] Shows broadcaster's video feed
- [ ] Shows broadcaster's audio
- [ ] Viewer count is accurate
- [ ] Can see reactions/emojis (if implemented)
- [ ] Can leave stream (back button)

### Multi-User Testing

- [ ] Multiple viewers can join simultaneously
- [ ] Broadcaster sees correct viewer count
- [ ] All viewers see the same broadcaster feed
- [ ] When broadcaster turns camera off, all viewers see "Camera is off"
- [ ] When broadcaster turns camera on, all viewers see the feed
- [ ] When broadcaster pauses, viewers see screensaver
- [ ] When broadcaster resumes, viewers see feed again

## Debugging Tips

### Check Console Logs

**Broadcaster console:**
```
[EventLivePage] Joining LiveKit
[EventLivePage] Room connected
[LiveKitStage] Local video effect running
[BroadcasterControls] State updated
```

**Viewer console:**
```
[EventWatchPage] About to call generateToken
Connected to LiveKit room
[LiveKitStage] Remote video tracks available
```

### Common Issues

1. **"LiveKit server URL missing"**
   - Check `VITE_LIVEKIT_URL` in `.env`
   - Ensure it starts with `wss://` (or `ws://` for local)

2. **"Invalid token response"**
   - Check backend is running
   - Check backend logs for token generation errors
   - Verify user has correct permissions

3. **"Room not connected"**
   - Check LiveKit server is accessible
   - Check network tab for WebSocket connection
   - Verify token is valid (not expired)

4. **Camera feed not showing**
   - Check browser permissions (camera/mic)
   - Check console for track publishing errors
   - Verify `setCameraEnabled(true)` was called

5. **Viewers can't see broadcaster**
   - Verify broadcaster has camera enabled
   - Check broadcaster's console for track publishing
   - Verify viewers are subscribed to tracks

### Network Tab Inspection

1. Open DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. Look for connection to LiveKit server
4. Check for errors or failed connections

### LiveKit Room Inspector

If using LiveKit Cloud:
1. Go to LiveKit Cloud dashboard
2. Check "Rooms" section
3. Verify room exists with correct name: `event-{eventId}`
4. Check participants list
5. Verify tracks are being published/subscribed

## Quick Test Script

```bash
# Terminal 1: Start backend
cd backend
npm run start:dev

# Terminal 2: Start frontend
cd frontend
npm run dev

# Browser 1: Broadcaster
# - Login as entity/admin
# - Navigate to /creator/events
# - Create event or select existing
# - Click "Go Live"
# - Enable camera

# Browser 2 (Incognito): Viewer
# - Login as regular user
# - Navigate to /events/{eventId}/watch
# - Should see broadcaster's feed
```

## Testing Different Scenarios

### Scenario 1: Broadcaster Joins First
1. Broadcaster starts stream
2. Viewer joins after
3. **Expected:** Viewer sees broadcaster immediately

### Scenario 2: Viewer Joins First
1. Viewer navigates to watch page
2. Broadcaster starts stream
3. **Expected:** Viewer automatically connects when session becomes active

### Scenario 3: Broadcaster Leaves
1. Broadcaster and viewers connected
2. Broadcaster clicks "End Stream"
3. **Expected:** Viewers see "This event is not live yet"

### Scenario 4: Multiple Viewers
1. Broadcaster starts stream
2. Viewer 1 joins
3. Viewer 2 joins
4. Viewer 3 joins
5. **Expected:** Broadcaster sees viewer count = 3, all viewers see broadcaster

### Scenario 5: Camera Toggle
1. Broadcaster starts with camera off
2. Viewer joins (sees "Camera is off" or placeholder)
3. Broadcaster enables camera
4. **Expected:** Viewer sees feed appear

## Environment-Specific Notes

### Local LiveKit Server
If testing with local LiveKit server:
```env
VITE_LIVEKIT_URL=ws://localhost:7880
```
- Requires LiveKit server running locally
- May need to configure CORS
- WebSocket uses `ws://` not `wss://`

### LiveKit Cloud
If testing with LiveKit Cloud:
```env
VITE_LIVEKIT_URL=wss://your-project.livekit.cloud
```
- Requires LiveKit Cloud account
- WebSocket uses `wss://` (secure)
- No local server setup needed

## Next Steps

After local testing passes:
1. Test on staging environment
2. Verify environment variables are set correctly
3. Test with real network conditions
4. Load test with multiple concurrent viewers
5. Test on different devices/browsers

---

**Last Updated:** 2025-01-27  
**Related:** `VERCEL_PRODUCTION_AUDIT.md`



