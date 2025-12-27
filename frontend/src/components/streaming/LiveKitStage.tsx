// frontend/src/components/streaming/LiveKitStage.tsx
import { useEffect, useMemo, useState, useRef } from "react";
import type { Room, Track, RemoteTrack, RemoteTrackPublication, TrackPublication } from "livekit-client";
import { ScreensaverPlayer } from "./ScreensaverPlayer";

type LiveKitStageProps = {
  room: Room;
  isPaused: boolean;
};

type RemoteMedia = {
  id: string;
  kind: "video" | "audio";
  track: RemoteTrack;
  participantIdentity?: string;
};

export function LiveKitStage({ room, isPaused }: LiveKitStageProps) {
  const [media, setMedia] = useState<RemoteMedia[]>([]);
  const [localVideoTrack, setLocalVideoTrack] = useState<MediaStreamTrack | null>(null);

  // Get broadcaster's video track (local participant)
  useEffect(() => {
    if (!room || isPaused) {
      setLocalVideoTrack(null);
      return;
    }

    const localParticipant = room.localParticipant;
    if (!localParticipant) return;

    const updateLocalVideo = () => {
      const videoPub = Array.from(localParticipant.videoTrackPublications.values()).find(
        (pub) => pub.track && pub.kind === Track.Kind.Video
      );

      if (videoPub?.track) {
        // Get MediaStreamTrack from LocalVideoTrack
        const localTrack = videoPub.track as any;
        if (localTrack.mediaStreamTrack) {
          setLocalVideoTrack(localTrack.mediaStreamTrack);
        } else if (localTrack.mediaStream) {
          // Fallback: get track from MediaStream
          const stream = localTrack.mediaStream as MediaStream;
          const videoTracks = stream.getVideoTracks();
          if (videoTracks.length > 0) {
            setLocalVideoTrack(videoTracks[0]);
          }
        }
      } else {
        setLocalVideoTrack(null);
      }
    };

    updateLocalVideo();

    const handleTrackPublished = () => {
      updateLocalVideo();
    };

    const handleTrackUnpublished = () => {
      setLocalVideoTrack(null);
    };

    localParticipant.on("trackPublished", handleTrackPublished);
    localParticipant.on("trackUnpublished", handleTrackUnpublished);

    return () => {
      localParticipant.off("trackPublished", handleTrackPublished);
      localParticipant.off("trackUnpublished", handleTrackUnpublished);
    };
  }, [room, isPaused]);

  // Get remote participants' video tracks
  useEffect(() => {
    if (!room) return;

    const addTrack = (track: RemoteTrack, pub: TrackPublication) => {
      const kind = pub.kind === Track.Kind.Video ? "video" : "audio";
      const id = pub.trackSid;
      const participantIdentity = pub.participant?.identity;

      setMedia((prev) => {
        if (prev.some((p) => p.id === id)) return prev;
        return [...prev, { id, kind, track, participantIdentity }];
      });
    };

    const removeTrack = (pub: RemoteTrackPublication) => {
      setMedia((prev) => prev.filter((p) => p.id !== pub.trackSid));
    };

    room.on("trackSubscribed", addTrack);
    room.on("trackUnsubscribed", (_t, pub) => removeTrack(pub));

    // Capture already subscribed tracks
    room.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((pub) => {
        if (pub.isSubscribed && pub.track) {
          addTrack(pub.track, pub);
        }
      });
    });

    return () => {
      room.off("trackSubscribed", addTrack);
      room.off("trackUnsubscribed", (_t, pub) => removeTrack(pub));
    };
  }, [room]);

  const videoTracks = useMemo(
    () => media.filter((m) => m.kind === "video"),
    [media]
  );

  const audioTracks = useMemo(
    () => media.filter((m) => m.kind === "audio"),
    [media]
  );

  // Show screensaver when paused
  if (isPaused) {
    return <ScreensaverPlayer />;
  }

  // Show broadcaster's video if available, otherwise show remote participants
  const primaryVideo = localVideoTrack || videoTracks[0]?.track;

  return (
    <div className="w-full h-full relative bg-black">
      {/* Audio tracks (invisible, required for sound) */}
      {audioTracks.map((a) => (
        <RemoteAudio key={a.id} track={a.track} />
      ))}

      {/* Primary Video Display */}
      {primaryVideo ? (
        <div className="w-full h-full flex items-center justify-center">
          {localVideoTrack ? (
            <LocalVideo track={localVideoTrack} />
          ) : (
            <RemoteVideo track={primaryVideo} />
          )}
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-500">
          <div className="text-center">
            <p className="text-lg mb-2">Waiting for video...</p>
            <p className="text-sm">The broadcaster will appear here</p>
          </div>
        </div>
      )}

      {/* Grid view for multiple remote participants (if no local video) */}
      {!localVideoTrack && videoTracks.length > 1 && (
        <div className="absolute bottom-4 right-4 w-64 h-48 bg-black/80 rounded-lg overflow-hidden border border-gray-700">
          <div className="grid grid-cols-2 gap-1 p-1">
            {videoTracks.slice(1, 5).map((v) => (
              <div key={v.id} className="aspect-video bg-gray-900 rounded overflow-hidden">
                <RemoteVideo track={v.track} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────────── */
/* 🔊 Remote Audio */
/* ───────────────────────────────────── */
function RemoteAudio({ track }: { track: RemoteTrack }) {
  useEffect(() => {
    const el = document.createElement("audio");
    el.autoplay = true;
    track.attach(el);

    return () => {
      track.detach(el);
      el.remove();
    };
  }, [track]);

  return null;
}

/* ───────────────────────────────────── */
/* 🎥 Local Video (Broadcaster) */
/* ───────────────────────────────────── */
function LocalVideo({ track }: { track: MediaStreamTrack }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = new MediaStream([track]);

    return () => {
      if (video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        video.srcObject = null;
      }
    };
  }, [track]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-contain"
    />
  );
}

/* ───────────────────────────────────── */
/* 🎥 Remote Video */
/* ───────────────────────────────────── */
function RemoteVideo({ track }: { track: RemoteTrack }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    track.attach(video);

    return () => {
      track.detach(video);
    };
  }, [track]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="w-full h-full object-contain"
    />
  );
}

