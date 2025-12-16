import { Room, createLocalTracks } from "livekit-client";

export async function publishLocal(room: Room) {
  const tracks = await createLocalTracks({
    audio: true,
    video: true,
  });

  for (const track of tracks) {
    await room.localParticipant.publishTrack(track);
  }

  return tracks;
}
