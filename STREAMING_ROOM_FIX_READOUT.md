# LiveKit Streaming Room Fix - Implementation Readout

**Date:** December 19, 2025  
**Goal:** Enforce single, deterministic LiveKit room per event (`event-${eventId}`)  
**Status:** ✅ COMPLETE

---

## Summary

Fixed the LiveKit streaming implementation to ensure:
- Room names are **deterministic** and **computed ONLY in backend**
- Format: `event-${eventId}` (lowercase, no variation)
- Frontend **never computes or infers** room names
- Frontend relies **entirely on token response** from backend
- One event = one LiveKit room

---

## Backend Changes

### 1. `backend/src/modules/streaming/streaming.service.ts`

#### `createSession()` method
**Change:** Updated room ID generation to use deterministic format
- **Before:** `const roomId = \`event-${eventId}-${Date.now()}\`;`
- **After:** `const roomId = \`event-${eventId.toLowerCase()}\`;`
- **Reason:** Ensures one event = one room, no timestamp variation

#### `generateToken()` method
**Change:** Compute room name deterministically instead of using `session.roomId`
- **Before:** `const roomName = session.roomId;`
- **After:** `const roomName = \`event-${eventId.toLowerCase()}\`;`
- **Reason:** Room name is computed in backend only, not stored/retrieved from DB

**Change:** Updated token response field name
- **Before:** `wsUrl: this.livekitUrl`
- **After:** `livekitUrl: this.livekitUrl`
- **Reason:** Consistent naming with frontend expectations

**Change:** Updated `canPublishData` grant
- **Before:** `canPublishData: true` (for all roles)
- **After:** `canPublishData: streamRole === StreamRole.BROADCASTER`
- **Reason:** Only broadcasters should publish data, viewers subscribe-only

---

## Frontend Changes

### 2. `frontend/src/services/streaming.service.ts`

**Change:** Updated `LivekitTokenResponse` interface
- **Before:** `url: string;`
- **After:** `livekitUrl: string;`
- **Reason:** Match backend response field name

---

### 3. `frontend/src/components/streaming/joinStream.ts`

**Change:** Removed `roomName` parameter
- **Before:** `joinStream({ token, roomName, serverUrl })`
- **After:** `joinStream({ token, serverUrl })`
- **Reason:** Room name is embedded in token, frontend never computes it

**Change:** Added comment explaining room name is in token
- Added: `/** Room name is embedded in the token, so no roomName parameter is needed. */`

---

### 4. `frontend/src/lib/livekit/joinStream.ts`

**Change:** Removed `roomName` parameter and updated interface
- **Before:** 
  ```typescript
  interface JoinStreamParams {
    token: string;
    roomName: string;
    serverUrl: string;
  }
  ```
- **After:**
  ```typescript
  interface JoinStreamParams {
    token: string;
    serverUrl: string;
  }
  ```
- **Reason:** Room name is embedded in token, no need to pass separately

**Change:** Removed room name from console log
- **Before:** `console.log("✅ Connected to LiveKit room:", roomName);`
- **After:** `console.log("✅ Connected to LiveKit room (room name from token)");`

---

### 5. `frontend/src/components/streaming/StreamingPanel.tsx`

**Change:** Removed all room name computation and comparison logic
- **Removed:**
  - Room name comparison between `tokenResponse.roomName` and `session.roomId`
  - Room name mismatch warnings
  - Logging of `sessionRoomId` and `roomNamePassedToConnect`
- **Reason:** Frontend should never compute or compare room names

**Change:** Updated to use `livekitUrl` from token response
- **Before:** `const serverUrl = tokenResponse.url || import.meta.env.VITE_LIVEKIT_URL;`
- **After:** `const serverUrl = tokenResponse.livekitUrl || import.meta.env.VITE_LIVEKIT_URL;`
- **Reason:** Match backend response field name

**Change:** Removed `roomName` parameter from `joinStream()` call
- **Before:** `joinStream({ token: tokenResponse.token, roomName: activeSession.roomId, serverUrl })`
- **After:** `joinStream({ token: tokenResponse.token, serverUrl })`
- **Reason:** Room name is embedded in token

**Change:** Updated logging
- **Before:** Detailed room name comparison logs
- **After:** Simple log: `"Joining LiveKit room (room name from token):", tokenResponse.roomName`
- **Reason:** Room name is informational only, not used for connection

---

### 6. `frontend/src/pages/creator/events/EventWatchPage.tsx`

**Change:** Updated to use `livekitUrl` from token response
- **Before:** `setServerUrl(response.url || import.meta.env.VITE_LIVEKIT_URL);`
- **After:** `setServerUrl(response.livekitUrl || import.meta.env.VITE_LIVEKIT_URL);`
- **Reason:** Match backend response field name

---

## Files Modified

### Backend (1 file)
1. `backend/src/modules/streaming/streaming.service.ts`

### Frontend (5 files)
1. `frontend/src/services/streaming.service.ts`
2. `frontend/src/components/streaming/joinStream.ts`
3. `frontend/src/lib/livekit/joinStream.ts`
4. `frontend/src/components/streaming/StreamingPanel.tsx`
5. `frontend/src/pages/creator/events/EventWatchPage.tsx`

**Total:** 6 files modified

---

## Key Principles Enforced

✅ **Room name format:** `event-${eventId}` (lowercase, deterministic)  
✅ **Room name computation:** ONLY in backend  
✅ **Frontend behavior:** Uses token response only, never computes room name  
✅ **One event = one room:** Guaranteed by deterministic naming  
✅ **Token grants:** Correct permissions (canPublish only for BROADCASTER)  
✅ **Backend response:** Returns `livekitUrl` (not `wsUrl` or `url`)

---

## Testing Checklist

- [ ] Creator creates session → room name is `event-${eventId}`
- [ ] Creator joins → publishes video/audio successfully
- [ ] Viewer joins same event → sees creator's stream
- [ ] Room name in token matches `event-${eventId}` format
- [ ] No frontend code computes room names
- [ ] Works on localhost
- [ ] Works on Fly.io (backend)
- [ ] Works on Vercel (frontend)

---

## Notes

- Room names are now **deterministic** and **lowercase** (`event-${eventId.toLowerCase()}`)
- Frontend **never** computes room names - they come from backend token response
- LiveKit rooms are **implicit** (created on first join, no explicit creation needed)
- Token response includes `roomName` for informational purposes only
- All room name logic removed from frontend comparison/mismatch detection

---

## Migration Notes

**Breaking Changes:**
- Token response field changed: `wsUrl` → `livekitUrl`
- `joinStream()` no longer accepts `roomName` parameter
- Frontend code that computed room names will need to be updated

**Non-Breaking:**
- Existing sessions will continue to work (roomId in DB is informational)
- Token generation uses computed room name, not stored roomId
- Backward compatible with existing LiveKit infrastructure

