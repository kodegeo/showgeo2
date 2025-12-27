import { Room, ConnectionState } from "livekit-client";

/**
 * Join LiveKit room using token and server URL.
 * Room name is embedded in the token, so no roomName parameter is needed.
 */
interface JoinStreamParams {
  token: string;
  serverUrl: string;
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
        stateName: ConnectionState[state],
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
          reject(new Error(`Room disconnected before fully connecting: ${ConnectionState[state]}`));
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
  // Assert serverUrl starts with wss://
  if (!serverUrl.startsWith("wss://")) {
    throw new Error(
      `Invalid LiveKit serverUrl: must start with "wss://" (got: ${serverUrl})`
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
    stateName: ConnectionState[room.state],
  });

  await waitForConnected(room, 15000);

  console.log("✅ Connected to LiveKit room", {
    roomName: room.name,
    state: room.state,
    stateName: ConnectionState[room.state],
    localParticipant: room.localParticipant?.identity,
  });

  return room;
}
