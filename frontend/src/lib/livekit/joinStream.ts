import { Room } from "livekit-client";

interface JoinStreamParams {
  token: string;
  roomName: string;
  serverUrl: string;
}

export async function joinStream({
  token,
  roomName,
  serverUrl,
}: JoinStreamParams) {
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });

  await room.connect(serverUrl, token);

  console.log("✅ Connected to LiveKit room:", roomName);

  return room;
}
