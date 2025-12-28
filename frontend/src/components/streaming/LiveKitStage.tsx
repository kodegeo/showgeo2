// frontend/src/components/streaming/LiveKitStage.tsx
import { useEffect, useMemo, useState, useRef } from "react";
import { Track } from "livekit-client";
import type {
  Room,
  RemoteTrack,
  RemoteTrackPublication,
  TrackPublication,
  LocalTrackPublication,
  LocalVideoTrack,
} from "livekit-client";
import { ScreensaverPlayer } from "./ScreensaverPlayer";
import { isDevelopment } from "@/utils/env";

type LiveKitStageProps = {
  room: Room;
  isPaused: boolean;
};

type RemoteMedia = {
  id: string;
  kind: "video" | "audio";
  track: RemoteTrack;
  participantIdentity?: string;
  source?: string; // Track source (camera, screen, etc.)
};

type LocalVideoState = {
  track: LocalVideoTrack | null;
  trackSid: string | null;
  source: "camera" | "screen" | null;
  isEnabled: boolean;
};

export function LiveKitStage({ room, isPaused }: LiveKitStageProps) {
  const [remoteMedia, setRemoteMedia] = useState<RemoteMedia[]>([]);
  const [localVideo, setLocalVideo] = useState<LocalVideoState>({
    track: null,
    trackSid: null,
    source: null,
    isEnabled: false,
  });

  // Get broadcaster's local video tracks (camera and screen share)
  // Note: isPaused only affects UI (screensaver), not track state
  useEffect(() => {
    if (!room) {
      setLocalVideo({ track: null, trackSid: null, source: null, isEnabled: false });
      return;
    }

    const localParticipant = room.localParticipant;
    if (!localParticipant) return;

    const updateLocalVideo = () => {
      // Priority: screen share > camera
      const allVideoPubs = Array.from(localParticipant.videoTrackPublications.values());
                  
      if (isDevelopment) {
        console.log("[LiveKitStage] updateLocalVideo called", {
          videoPubCount: allVideoPubs.length,
          pubs: allVideoPubs.map(p => ({
            trackSid: p.trackSid,
            hasTrack: !!p.track,
            isMuted: p.isMuted,
            source: (p as any).source,
          })),
        });
      }
      
      // Check for screen share first (screen share has source property)
      // Screen share source is typically "screen_share" or Track.Source.ScreenShare
      const screenPub = allVideoPubs.find(
        (pub) => pub.track && 
        pub.kind === Track.Kind.Video &&
        ((pub as any).source === "screen_share" || 
         (pub as any).source === Track.Source?.ScreenShare)
      );
      
      // Then check for camera (not screen share)
      const cameraPub = allVideoPubs.find(
        (pub) => pub.track && 
        pub.kind === Track.Kind.Video &&
        (pub as any).source !== "screen_share" &&
        (pub as any).source !== Track.Source?.ScreenShare
      );

      const videoPub = screenPub || cameraPub;

      if (videoPub?.track) {
        const localTrack = videoPub.track as LocalVideoTrack;
        const trackSid = videoPub.trackSid;
        const source = screenPub ? "screen" : "camera";
        
        // Only update state if trackSid has changed (prevents unnecessary re-renders)
        setLocalVideo((prev) => {
          // If trackSid is the same, don't update (same track, avoid detach/attach)
          if (prev.trackSid === trackSid) {
            if (isDevelopment) {
              console.log(`[LiveKitStage] Track ${trackSid} unchanged, skipping state update`);
            }
            return prev;
          }
          
          if (isDevelopment) {
            console.log(`[LiveKitStage] Local ${source} track set`, {
              source,
              isMuted: videoPub.isMuted,
              trackSid,
              previousTrackSid: prev.trackSid,
              trackId: (localTrack as any).mediaStreamTrack?.id || "unknown",
            });
          }
          
          return { track: localTrack, trackSid, source, isEnabled: true };
        });
      } else {
        // Only clear if there's really no track
        setLocalVideo((prev) => {
          // Only update if we actually need to clear (avoid unnecessary re-renders)
          if (prev.track === null && prev.trackSid === null) return prev;
          
          if (isDevelopment) {
            console.warn("[LiveKitStage] No video track found, clearing", {
              videoTrackCount: allVideoPubs.length,
              previousTrackSid: prev.trackSid,
              allPubs: allVideoPubs.map(p => ({
                trackSid: p.trackSid,
                hasTrack: !!p.track,
                source: (p as any).source,
              })),
            });
          }
          
          return { track: null, trackSid: null, source: null, isEnabled: true };
        });
      }
    };

    updateLocalVideo();

    // Single event handler with inline debug logging
    const handleTrackPublished = (publication: any) => {
      if (isDevelopment) {
        console.log("[LiveKitStage] trackPublished event", {
          trackSid: publication?.trackSid,
          kind: publication?.kind,
          source: publication?.source,
        });
      }
      updateLocalVideo();
    };

    const handleTrackUnpublished = (publication: any) => {
      if (isDevelopment) {
        console.log("[LiveKitStage] trackUnpublished event", {
          trackSid: publication?.trackSid,
          kind: publication?.kind,
        });
      }
      updateLocalVideo();
    };

    // Only listen to published/unpublished - muted/unmuted don't remove tracks
    localParticipant.on("trackPublished", handleTrackPublished);
    localParticipant.on("trackUnpublished", handleTrackUnpublished);
    
    // Note: We don't listen to trackMuted/trackUnmuted because muted tracks should still be displayed

    return () => {
      localParticipant.off("trackPublished", handleTrackPublished);
      localParticipant.off("trackUnpublished", handleTrackUnpublished);
    };
  }, [room]);

  // Get remote participants' video tracks
  useEffect(() => {
    if (!room) return;

    // ✅ Named handler functions for proper cleanup
    // Using named functions ensures the same reference is used in both on() and off()
    const onTrackSubscribed = (
      track: RemoteTrack,
      pub: RemoteTrackPublication,
      participant: { identity?: string }
    ) => {
      const kind = pub.kind === Track.Kind.Video ? "video" : "audio";
      const id = pub.trackSid;
      const participantIdentity = participant?.identity;
      const source = (pub as any).source || "unknown";
    
      setRemoteMedia((prev) => {
        if (prev.some((p) => p.id === id)) return prev;
        return [...prev, { id, kind, track, participantIdentity, source }];
      });
    };
    
    const onTrackUnsubscribed = (
      track: RemoteTrack,
      pub: RemoteTrackPublication,
      participant: { identity?: string }
    ) => {
      setRemoteMedia((prev) => prev.filter((p) => p.id !== pub.trackSid));
    };

    room.on("trackSubscribed", onTrackSubscribed);
    room.on("trackUnsubscribed", onTrackUnsubscribed);

    // Capture already subscribed tracks
    room.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((pub) => {
        if (pub.isSubscribed && pub.track) {
          onTrackSubscribed(pub.track, pub as RemoteTrackPublication, participant);
        }
      });
    });
    
    return () => {
      // ✅ Use same function references for cleanup
      room.off("trackSubscribed", onTrackSubscribed);
      room.off("trackUnsubscribed", onTrackUnsubscribed);
    };
  }, [room]);

  const remoteVideoTracks = useMemo(
    () => remoteMedia.filter((m) => m.kind === "video"),
    [remoteMedia]
  );

  const remoteAudioTracks = useMemo(
    () => remoteMedia.filter((m) => m.kind === "audio"),
    [remoteMedia]
  );

  // Determine which remote video track to show (screen share > camera)
  const primaryRemoteVideoTrack = useMemo<RemoteMedia | null>(() => {
    // Check for remote screen share first
    const remoteScreen = remoteVideoTracks.find(
      (v) => v.source === "screen_share" || 
             v.source === Track.Source?.ScreenShare
    );
    if (remoteScreen) {
      return remoteScreen;
    }
    
    // Then remote camera
    if (remoteVideoTracks[0]) {
      return remoteVideoTracks[0];
    }
    
    return null;
  }, [remoteVideoTracks]);

  // Determine visual state
  const hasLocalVideo = !!localVideo.track && !!localVideo.trackSid && !!localVideo.source;
  const hasRemoteVideo = !!primaryRemoteVideoTrack;
  const hasVideo = hasLocalVideo || hasRemoteVideo;
  
  // Determine source and screen share status based on which track type we're using
  const isScreenShare = hasLocalVideo 
    ? localVideo.source === "screen"
    : (primaryRemoteVideoTrack?.source === "screen_share" || 
       primaryRemoteVideoTrack?.source === Track.Source?.ScreenShare);
  
  // Camera off state: only show if we have a local camera track but it's muted
  // ✅ Fix: Use useMemo instead of IIFE to avoid side effects during render
  const cameraOff = useMemo(() => {
    if (!hasLocalVideo || localVideo.source !== "camera") return false;
    if (!room?.localParticipant) return false;
    
    const videoPubs = Array.from(room.localParticipant.videoTrackPublications.values());
    const cameraPub = videoPubs.find(
      (pub) => pub.track && 
      pub.kind === Track.Kind.Video &&
      (pub as any).source !== "screen_share" &&
      (pub as any).source !== Track.Source?.ScreenShare
    );
    return cameraPub?.isMuted ?? false;
  }, [hasLocalVideo, localVideo.source, room, room?.localParticipant]);

  // Dev diagnostics
  useEffect(() => {
    if (!isDevelopment) return;
    
    if (hasVideo) {
      console.log("[LiveKitStage] Primary video:", {
        isLocal: hasLocalVideo,
        source: hasLocalVideo ? localVideo.source : (primaryRemoteVideoTrack?.source || "unknown"),
        hasLocalCamera: !!localVideo.track,
        remoteCount: remoteVideoTracks.length,
      });
    } else {
      console.warn("[LiveKitStage] No video tracks available while LIVE");
    }
  }, [hasVideo, hasLocalVideo, localVideo.track, localVideo.source, primaryRemoteVideoTrack, remoteVideoTracks.length]);

  return (
    <div className="w-full h-full relative bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
      {/* Audio tracks (invisible, required for sound) */}
      {remoteAudioTracks.map((a) => (
        <RemoteAudio key={a.id} track={a.track} />
      ))}

      {/* PRIMARY VIDEO AREA - Center, Large */}
      <div className="w-full h-full flex items-center justify-center relative">
        {hasLocalVideo && localVideo.track && localVideo.trackSid && localVideo.source ? (
          <>
            <LocalVideo track={localVideo.track} trackSid={localVideo.trackSid} />
            
            {/* Visual State Overlays */}
            {isScreenShare && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/70 backdrop-blur-sm rounded-full border border-gray-600">
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  📺 Screen Share
                </span>
              </div>
            )}
            
            {cameraOff && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/70 backdrop-blur-sm rounded-full border border-gray-600">
                <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  📷 Camera is off
                </span>
              </div>
            )}
          </>
        ) : hasRemoteVideo && primaryRemoteVideoTrack ? (
          <>
            <RemoteVideo 
              track={primaryRemoteVideoTrack.track}
              source={isScreenShare ? "screen" : "camera"}
            />
            
            {/* Visual State Overlays */}
            {isScreenShare && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/70 backdrop-blur-sm rounded-full border border-gray-600">
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  📺 Screen Share
                </span>
              </div>
            )}
          </>
        ) : (
          /* Friendly placeholder when no video available */
          <div className="text-center px-8">
            <div className="mb-4">
              <div className="w-24 h-24 mx-auto rounded-full bg-gray-800/50 flex items-center justify-center border-2 border-gray-700">
                <svg
                  className="w-12 h-12 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-gray-400 text-lg font-medium mb-2">Waiting for broadcaster</p>
            <p className="text-gray-500 text-sm">The stream will appear here when the broadcaster starts their camera</p>
          </div>
        )}
      </div>

      {/* Screensaver Overlay - Only shown when paused, video tracks remain attached */}
      {isPaused && (
        <div className="absolute inset-0 z-50">
          <ScreensaverPlayer />
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
function LocalVideo({ track, trackSid }: { track: LocalVideoTrack; trackSid: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !trackSid) return;

    // Attach track only when trackSid changes (stable identity)
    // track object is in scope from props - we only react to trackSid changes
    track.attach(video);

    if (isDevelopment) {
      console.log(`[LocalVideo] Attached track ${trackSid} to video element`);
    }

    return () => {
      track.detach(video);
      if (isDevelopment) {
        console.log(`[LocalVideo] Detached track ${trackSid} from video element`);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackSid]); // Only trackSid - track object is stable for same trackSid due to state update prevention

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
function RemoteVideo({ track, source }: { track: RemoteTrack; source: "camera" | "screen" }) {
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
