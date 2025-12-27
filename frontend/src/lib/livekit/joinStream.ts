import { Room, ConnectionState } from "livekit-client";

/**
 * NOTE: Media flows directly to LiveKit Cloud. Fly handles signaling only.
 * 
 * Architecture:
 * - Fly.io backend: Handles auth + token generation via /api/streaming/* endpoints
 * - LiveKit Cloud: Handles all WebRTC media traffic via wss://*.livekit.cloud
 * - No Fly routing for WebRTC traffic - connections go directly to LiveKit
 * 
 * Join LiveKit room using token and server URL.
 * Room name is embedded in the token, so no roomName parameter is needed.
 */
interface JoinStreamParams {
  token: string;
  serverUrl: string; // Must be wss://*.livekit.cloud - never proxied through Fly
}

/**
 * Wait for room to reach connected state
 */
function waitForConnected(room: Room, timeoutMs: number = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    // If already connected, resolve immediately
    if (room.state === ConnectionState.Connected) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      room.off("connectionStateChanged", handler);
      reject(new Error(`Room connection timeout: state is ${room.state} after ${timeoutMs}ms`));
    }, timeoutMs);

    const handler = (state: ConnectionState) => {
      console.log("[joinStream] connectionStateChanged:", {
        state,
        stateName: state,
        roomName: room.name,
      });

      if (state === ConnectionState.Connected) {
        clearTimeout(timeout);
        room.off("connectionStateChanged", handler);
        resolve();
      } else if (state === ConnectionState.Disconnected || state === ConnectionState.Reconnecting) {
        // Don't reject on reconnecting, but log it
        if (state === ConnectionState.Disconnected) {
          clearTimeout(timeout);
          room.off("connectionStateChanged", handler);
          reject(new Error(`Room disconnected before fully connecting: ${state}`));
        }
      }
    };

    room.on("connectionStateChanged", handler);
  });
}

export async function joinStream({
  token,
  serverUrl,
}: JoinStreamParams) {
  // Assert serverUrl starts with wss:// and points to LiveKit Cloud
  // This ensures media traffic goes directly to LiveKit, never through Fly proxy
  if (!serverUrl.startsWith("wss://")) {
    throw new Error(
      `Invalid LiveKit serverUrl: must start with "wss://" (got: ${serverUrl})`
    );
  }
  
  // Ensure we're connecting to LiveKit Cloud, not a Fly URL
  if (serverUrl.includes("fly.dev") || serverUrl.includes("fly.io")) {
    throw new Error(
      `Invalid LiveKit serverUrl: must point to LiveKit Cloud (wss://*.livekit.cloud), not Fly.io (got: ${serverUrl})`
    );
  }

  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });

  // Connect to room
  console.log("[joinStream] Connecting to LiveKit room...", {
    serverUrl,
    roomName: "embedded in token",
    hasToken: !!token,
  });

  await room.connect(serverUrl, token);

  // Wait for room to be fully connected before returning
  // waitForConnected will handle connectionStateChanged logging
  console.log("[joinStream] room.connect() completed, waiting for connected state...", {
    currentState: room.state,
    stateName: room.state,
  });

  await waitForConnected(room, 15000);

  console.log("✅ Connected to LiveKit room", {
    roomName: room.name,
    state: room.state,
    stateName: room.state,
    localParticipant: room.localParticipant?.identity,
  });

  return room;
}
