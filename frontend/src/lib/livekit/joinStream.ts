import { Room } from "livekit-client";

/**
 * Join LiveKit room using token and server URL.
 * Room name is embedded in the token, so no roomName parameter is needed.
 */
interface JoinStreamParams {
  token: string;
  serverUrl: string;
}

export async function joinStream({
  token,
  serverUrl,
}: JoinStreamParams) {
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });

  await room.connect(serverUrl, token);

  console.log("✅ Connected to LiveKit room (room name from token)");

  return room;
}
