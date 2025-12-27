import { Room, createLocalTracks, ConnectionState } from "livekit-client";

/**
 * Wait for room to be connected before publishing
 */
async function ensureConnected(room: Room): Promise<void> {
  if (room.state === ConnectionState.Connected) {
    return;
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
        resolve();
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
  // Ensure room is connected before publishing
  await ensureConnected(room);

  const tracks = await createLocalTracks({
    audio: true,
    video: true,
  });

  for (const track of tracks) {
    await room.localParticipant.publishTrack(track);
  }

  return tracks;
}
