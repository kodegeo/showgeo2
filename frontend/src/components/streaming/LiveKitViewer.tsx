// frontend/src/components/streaming/LiveKitViewer.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Room,
  Track,
  RemoteTrack,
  RemoteTrackPublication,
  TrackPublication,
} from "livekit-client";

type LiveKitViewerProps = {
  room: Room;
};

type RemoteMedia = {
  id: string;
  kind: "video" | "audio";
  track: RemoteTrack;
};

export function LiveKitViewer({ room }: LiveKitViewerProps) {
  const [media, setMedia] = useState<RemoteMedia[]>([]);

  const videoTracks = useMemo(
    () => media.filter((m) => m.kind === "video"),
    [media],
  );

  const audioTracks = useMemo(
    () => media.filter((m) => m.kind === "audio"),
    [media],
  );

  useEffect(() => {
    if (!room) return;

    const addTrack = (
      track: RemoteTrack,
      pub: TrackPublication,
    ) => {
      const kind =
        pub.kind === Track.Kind.Video ? "video" : "audio";

      const id = pub.trackSid;

      setMedia((prev) => {
        if (prev.some((p) => p.id === id)) return prev;
        return [...prev, { id, kind, track }];
      });
    };

    const removeTrack = (pub: RemoteTrackPublication) => {
      setMedia((prev) =>
        prev.filter((p) => p.id !== pub.trackSid),
      );
    };

    // Subscribe to new tracks
    room.on("trackSubscribed", addTrack);
    room.on("trackUnsubscribed", (_t, pub) =>
      removeTrack(pub),
    );

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
      room.off("trackUnsubscribed", (_t, pub) =>
        removeTrack(pub),
      );
    };
  }, [room]);

  return (
    <div className="space-y-4">
      {/* 🔊 Audio (invisible, required for sound) */}
      {audioTracks.map((a) => (
        <RemoteAudio key={a.id} track={a.track} />
      ))}

      {/* 🎥 Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {videoTracks.length === 0 ? (
          <div className="border border-gray-800 rounded-lg p-4 text-sm text-gray-400">
            Waiting for live video…
          </div>
        ) : (
          videoTracks.map((v) => (
            <RemoteVideo key={v.id} track={v.track} />
          ))
        )}
      </div>
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
/* 🎥 Remote Video */
/* ───────────────────────────────────── */
function RemoteVideo({ track }: { track: RemoteTrack }) {
  const ref = (el: HTMLVideoElement | null) => {
    if (!el) return;
    track.attach(el);
  };

  return (
    <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
      <video
        ref={ref}
        autoPlay
        playsInline
        className="w-full h-full object-contain"
      />
    </div>
  );
}
