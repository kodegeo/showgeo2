import { Room, createLocalTracks, ConnectionState } from "livekit-client";

/**
 * Wait for room to be connected and engine ready before publishing
 * ✅ Fix 3: Enhanced to wait for localParticipant readiness, not just connection state
 */
async function ensureConnected(room: Room): Promise<void> {
  if (room.state === ConnectionState.Connected) {
    // Additional check: wait for localParticipant to be ready
    // ConnectionState.Connected doesn't guarantee engine readiness
    let attempts = 0;
    while (attempts < 10 && !room.localParticipant) {
      await new Promise(resolve => setTimeout(resolve, 50));
      attempts++;
    }
    if (room.localParticipant) {
      return;
    }
  }

  // Wait up to 5 seconds for connection
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      room.off("connectionStateChanged", handler);
      reject(new Error(`Room not connected: state is ${room.state}`));
    }, 5000);

    const handler = (state: ConnectionState) => {
      if (state === ConnectionState.Connected) {
        clearTimeout(timeout);
        room.off("connectionStateChanged", handler);
        
        // Wait for localParticipant after connection
        let attempts = 0;
        const checkParticipant = async () => {
          while (attempts < 10 && !room.localParticipant) {
            await new Promise(r => setTimeout(r, 50));
            attempts++;
          }
          if (room.localParticipant) {
            resolve();
          } else {
            reject(new Error("Room connected but localParticipant not available"));
          }
        };
        checkParticipant();
      } else if (state === ConnectionState.Disconnected) {
        clearTimeout(timeout);
        room.off("connectionStateChanged", handler);
        reject(new Error("Room disconnected before publishing"));
      }
    };

    room.on("connectionStateChanged", handler);
  });
}

export async function publishLocal(room: Room) {
  // Ensure room is connected and engine ready before publishing
  await ensureConnected(room);

  const tracks = await createLocalTracks({
    audio: true,
    video: true,
  });

  // ✅ Fix 4: Add retry logic for publishTrack() to handle transient failures
  for (const track of tracks) {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        await room.localParticipant.publishTrack(track);
        break; // Success
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          console.error(`[publishLocal] Failed to publish track after ${maxAttempts} attempts:`, error);
          throw error;
        }
        // Exponential backoff: 100ms, 200ms
        const delay = 100 * attempts;
        console.warn(`[publishLocal] Publish attempt ${attempts} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  return tracks;
}
