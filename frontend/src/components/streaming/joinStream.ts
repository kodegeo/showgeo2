import { Room } from "livekit-client";

export async function joinStream(params: {
  token: string;
  serverUrl: string;
}) {
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });

  await room.connect(params.serverUrl, params.token);
  return room;
}
