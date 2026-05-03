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

/**
 * Prefer screen share, then a camera publication that already has a `track`.
 * Using the first non-screen pub without a track caused preview to stay empty while
 * BroadcasterControls showed "Camera Live" (another pub in the map had the real track).
 */
function selectPrimaryLocalVideoPublication(
  allVideoPubs: LocalTrackPublication[],
): { pub: LocalTrackPublication; source: "camera" | "screen" } | null {
  const screenPub = allVideoPubs.find(
    (pub) =>
      pub.kind === Track.Kind.Video &&
      ((pub as { source?: unknown }).source === "screen_share" ||
        (pub as { source?: unknown }).source === Track.Source?.ScreenShare),
  );
  const nonScreen = allVideoPubs.filter((pub) => {
    if (pub.kind !== Track.Kind.Video) return false;
    const s = (pub as { source?: unknown }).source;
    if (
      s === "screen_share" ||
      s === Track.Source?.ScreenShare ||
      s === Track.Source?.ScreenShareAudio
    ) {
      return false;
    }
    return true;
  });
  const cameraPub = nonScreen.find((p) => p.track) ?? nonScreen[0];
  const videoPub = screenPub ?? cameraPub;
  if (!videoPub) return null;
  const isScreen =
    !!screenPub && (videoPub.trackSid === screenPub.trackSid || videoPub === screenPub);
  return { pub: videoPub, source: isScreen ? "screen" : "camera" };
}

type LiveKitStageProps = {
  room: Room;
  isPaused: boolean;
  isBroadcaster?: boolean;
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

export function LiveKitStage({ room, isPaused, isBroadcaster = false }: LiveKitStageProps) {
  const [remoteMedia, setRemoteMedia] = useState<RemoteMedia[]>([]);
  const [localVideo, setLocalVideo] = useState<LocalVideoState>({
    track: null,
    trackSid: null,
    source: null,
    isEnabled: false,
  });
  // ✅ Track if camera has ever been enabled (to hide guidance after first use)
  const [cameraHasBeenEnabled, setCameraHasBeenEnabled] = useState(false);

  // LiveKit mutates localParticipant (e.g. isCameraEnabled) without React state.
  // BroadcasterControls polls + updates its own state, so the button can show "Camera Live"
  // while this component never re-rendered. A light tick keeps overlays / cameraEnabled in sync.
  const [lkUiTick, setLkUiTick] = useState(0);
  const devPreviewWarnAt = useRef(0);
  useEffect(() => {
    if (!isBroadcaster || !room) return;
    const id = window.setInterval(() => setLkUiTick((n) => n + 1), 400);
    return () => window.clearInterval(id);
  }, [isBroadcaster, room]);

  // Reconcile React preview state with LiveKit on a timer. Publications can gain
  // `track` without firing trackPublished in some cases; cameraReady then goes true
  // while localVideo state never updated (listeners only run inside [room] effect).
  useEffect(() => {
    if (!isBroadcaster || !room?.localParticipant) return;
    void lkUiTick;
    const all = Array.from(
      room.localParticipant.videoTrackPublications.values(),
    ) as LocalTrackPublication[];
    const picked = selectPrimaryLocalVideoPublication(all);
    if (!picked?.pub?.track) return;
    const { pub, source } = picked;
    const localTrack = pub.track as LocalVideoTrack;
    setLocalVideo((prev) => {
      if (prev.trackSid === pub.trackSid && prev.track === localTrack) return prev;
      return {
        track: localTrack,
        trackSid: pub.trackSid,
        source,
        isEnabled: true,
      };
    });
  }, [room, isBroadcaster, lkUiTick]);

  // Get broadcaster's local video tracks (camera and screen share)
  // Note: isPaused only affects UI (screensaver), not track state
  useEffect(() => {
    console.log("[LiveKitStage] Local video effect running", {
      hasRoom: !!room,
      roomState: room?.state,
      hasLocalParticipant: !!room?.localParticipant,
    });
    
    if (!room) {
      console.warn("[LiveKitStage] No room available");
      setLocalVideo({ track: null, trackSid: null, source: null, isEnabled: false });
      return;
    }

    const localParticipant = room.localParticipant;
    if (!localParticipant) {
      console.warn("[LiveKitStage] No localParticipant available");
      return;
    }
    
    console.log("[LiveKitStage] Local participant found", {
      identity: localParticipant.identity,
      videoTrackCount: localParticipant.videoTrackPublications.size,
      audioTrackCount: localParticipant.audioTrackPublications.size,
    });
    
    // Store polling intervals for cleanup
    const pollingIntervals: NodeJS.Timeout[] = [];

    const updateLocalVideo = () => {
      // Priority: screen share > camera
      const allVideoPubs = Array.from(localParticipant.videoTrackPublications.values());
      
      // ✅ FIX #3: If camera is enabled but no video publication found, wait a bit
      const isCameraEnabled = localParticipant.isCameraEnabled;
      if (isCameraEnabled && allVideoPubs.length === 0) {
        console.warn("[LiveKitStage] Camera is enabled but no video publications found - waiting...", {
          isCameraEnabled,
          videoPubCount: allVideoPubs.length,
          participantIdentity: localParticipant.identity,
        });
        // Wait a bit and try again - publication might not be in map yet
        setTimeout(() => updateLocalVideo(), 200);
        return;
      }
                  
      // Always log to debug black screen issue
      console.log("[LiveKitStage] updateLocalVideo called", {
        videoPubCount: allVideoPubs.length,
        isCameraEnabled,
        pubs: allVideoPubs.map(p => ({
          trackSid: p.trackSid,
          hasTrack: !!p.track,
          isMuted: p.isMuted,
          source: (p as any).source,
          sourceType: typeof (p as any).source,
          kind: p.kind,
        })),
      });
      
      const picked = selectPrimaryLocalVideoPublication(
        allVideoPubs as LocalTrackPublication[],
      );

      if (picked) {
        const videoPub = picked.pub;
        const trackSid = videoPub.trackSid;
        const source = picked.source;

        if (videoPub.track) {
          const localTrack = videoPub.track as LocalVideoTrack;
          
          // Only update state if trackSid has changed (prevents unnecessary re-renders)
          setLocalVideo((prev) => {
            // Same sid + same track object: skip to avoid detach/attach churn.
            // If sid matches but track was missing and is now available, we must update.
            if (prev.trackSid === trackSid && prev.track === localTrack) {
              console.log(`[LiveKitStage] Track ${trackSid} unchanged, skipping state update`);
              return prev;
            }

            console.log(`[LiveKitStage] Local ${source} track set`, {
              source,
              isMuted: videoPub.isMuted,
              trackSid,
              previousTrackSid: prev.trackSid,
              trackId: (localTrack as any).mediaStreamTrack?.id || "unknown",
            });
            
            return { track: localTrack, trackSid, source, isEnabled: true };
          });
        } else {
          // ✅ FIX #2: Track publication exists but track is not yet available
          // This can happen when setCameraEnabled(true) is called - publication is created but track is still initializing
          console.warn(`[LiveKitStage] Video publication exists (${source}) but track not yet available, trackSid: ${trackSid}`);
          
          // ✅ CRITICAL FIX: Actively poll for track to become available
          const maxAttempts = 20; // 2 seconds total (20 * 100ms)
          let attempts = 0;
          const pollInterval = setInterval(() => {
            attempts++;
            const pub = localParticipant.videoTrackPublications.get(trackSid);
            if (pub?.track) {
              console.log(`[LiveKitStage] Track ${trackSid} became available after ${attempts * 100}ms`);
              clearInterval(pollInterval);
              // Remove from tracking array
              const index = pollingIntervals.indexOf(pollInterval);
              if (index > -1) pollingIntervals.splice(index, 1);
              updateLocalVideo(); // Retry now that track is available
            } else if (attempts >= maxAttempts) {
              console.error(`[LiveKitStage] Track ${trackSid} never became available after ${maxAttempts * 100}ms`);
              clearInterval(pollInterval);
              // Remove from tracking array
              const index = pollingIntervals.indexOf(pollInterval);
              if (index > -1) pollingIntervals.splice(index, 1);
              // Still try to update in case something changed
              updateLocalVideo();
            }
          }, 100);
          
          // Store interval reference for cleanup
          pollingIntervals.push(pollInterval);
        }
      } else {
        setLocalVideo((prev) => {
          if (prev.track === null && prev.trackSid === null) return prev;

          console.warn("[LiveKitStage] No video publication found, clearing", {
            videoTrackCount: allVideoPubs.length,
            previousTrackSid: prev.trackSid,
            allPubs: allVideoPubs.map((p) => ({
              trackSid: p.trackSid,
              hasTrack: !!p.track,
              source: (p as any).source,
            })),
          });

          return { track: null, trackSid: null, source: null, isEnabled: true };
        });
      }
    };

    updateLocalVideo();

    // ✅ FIX #2: Improved track detection in trackPublished handler
    const handleTrackPublished = (publication: any) => {
      console.log("[LiveKitStage] trackPublished event", {
        trackSid: publication?.trackSid,
        kind: publication?.kind,
        source: publication?.source,
        hasTrack: !!publication?.track,
        trackType: publication?.track ? typeof publication.track : "null",
        publicationInMap: !!localParticipant.videoTrackPublications.get(publication?.trackSid),
      });
      
      // ✅ FIX: Check if this publication is already in the map
      const existingPub = localParticipant.videoTrackPublications.get(publication?.trackSid);
      if (existingPub) {
        // Publication is in map, update immediately
        console.log("[LiveKitStage] Publication already in map, updating immediately");
        updateLocalVideo();
      } else {
        // Publication not in map yet - wait a bit then check again
        console.warn("[LiveKitStage] Publication from event not yet in videoTrackPublications map, waiting...");
        setTimeout(() => {
          const stillMissing = !localParticipant.videoTrackPublications.get(publication?.trackSid);
          if (stillMissing) {
            console.error("[LiveKitStage] Publication still not in map after 50ms delay");
          }
          updateLocalVideo();
        }, 50);
      }
      
      // Also check again after longer delay in case track becomes available asynchronously
      setTimeout(() => {
        updateLocalVideo();
      }, 200);
    };

    const handleTrackUnpublished = (publication: any) => {
      console.log("[LiveKitStage] trackUnpublished event", {
        trackSid: publication?.trackSid,
        kind: publication?.kind,
      });
      updateLocalVideo();
    };

    // ✅ Also listen to trackMuted/trackUnmuted to catch when track becomes available
    // Sometimes the track becomes available when it's unmuted
    const handleTrackMuted = (publication: any) => {
      console.log("[LiveKitStage] trackMuted event", {
        trackSid: publication?.trackSid,
        hasTrack: !!publication?.track,
      });
      // Track might have become available, update
      updateLocalVideo();
    };

    const handleTrackUnmuted = (publication: any) => {
      console.log("[LiveKitStage] trackUnmuted event", {
        trackSid: publication?.trackSid,
        hasTrack: !!publication?.track,
      });
      // Track is definitely available now, update
      updateLocalVideo();
    };

    // Listen to published/unpublished and muted/unmuted events
    console.log("[LiveKitStage] Registering event listeners for local participant");
    localParticipant.on("trackPublished", handleTrackPublished);
    localParticipant.on("trackUnpublished", handleTrackUnpublished);
    localParticipant.on("trackMuted", handleTrackMuted);
    localParticipant.on("trackUnmuted", handleTrackUnmuted);
    
    // Also check for already-published tracks
    console.log("[LiveKitStage] Checking for already-published tracks");
    localParticipant.videoTrackPublications.forEach((pub) => {
      console.log("[LiveKitStage] Found existing video publication", {
        trackSid: pub.trackSid,
        hasTrack: !!pub.track,
        source: (pub as any).source,
        kind: pub.kind,
      });
    });

    return () => {
      console.log("[LiveKitStage] Cleaning up event listeners and polling intervals");
      localParticipant.off("trackPublished", handleTrackPublished);
      localParticipant.off("trackUnpublished", handleTrackUnpublished);
      localParticipant.off("trackMuted", handleTrackMuted);
      localParticipant.off("trackUnmuted", handleTrackUnmuted);
      
      // Clean up any active polling intervals
      pollingIntervals.forEach(interval => clearInterval(interval));
      pollingIntervals.length = 0;
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
  
  // ✅ Check if camera is enabled but not ready (for broadcaster guidance)
  // These values match BroadcasterControls logic exactly - ONLY camera state, NOT pause state
  const cameraEnabled = room?.localParticipant?.isCameraEnabled ?? false;
  // cameraReady: track exists, is not muted, and is camera (not screen share)
  // This is computed using useMemo to match BroadcasterControls exactly
  const cameraReady = useMemo(() => {
    if (!room?.localParticipant) return false;
    const videoPubs = Array.from(room.localParticipant.videoTrackPublications.values());
    const cameraPub = videoPubs.find(
      (pub) => {
        if (!pub.track || pub.kind !== Track.Kind.Video) return false;
        const source = (pub as any).source;
        const isScreenShare = source === "screen_share" || source === Track.Source?.ScreenShare;
        return !isScreenShare;
      }
    );
    // Track is ready if it exists AND is not muted
    return !!cameraPub?.track && !cameraPub?.isMuted;
    // lkUiTick: publications map mutates in place; tick forces recompute after camera toggles.
  }, [room?.localParticipant, lkUiTick]);
  
  // ✅ Track if camera has been enabled at least once (hide guidance after first use)
  useEffect(() => {
    if (cameraEnabled && !cameraHasBeenEnabled) {
      setCameraHasBeenEnabled(true);
    }
  }, [cameraEnabled, cameraHasBeenEnabled]);
  
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

  // Dev diagnostics (throttled — lkUiTick fires every 400ms)
  useEffect(() => {
    if (!isDevelopment) return;

    if (hasVideo) {
      console.log("[LiveKitStage] Primary video:", {
        isLocal: hasLocalVideo,
        source: hasLocalVideo ? localVideo.source : (primaryRemoteVideoTrack?.source || "unknown"),
        hasLocalCamera: !!localVideo.track,
        remoteCount: remoteVideoTracks.length,
      });
    } else if (isBroadcaster && cameraEnabled && !hasLocalVideo) {
      const now = Date.now();
      if (now - devPreviewWarnAt.current > 5000) {
        devPreviewWarnAt.current = now;
        console.warn(
          "[LiveKitStage] Camera on but no preview attach yet (sync runs on room events + timer).",
          { cameraReady, hasLocalTrackInState: !!localVideo.track },
        );
      }
    } else if (!isBroadcaster || !cameraEnabled) {
      console.warn("[LiveKitStage] No video tracks available while LIVE");
    }
  }, [
    hasVideo,
    hasLocalVideo,
    localVideo.track,
    localVideo.source,
    primaryRemoteVideoTrack,
    remoteVideoTracks.length,
    isBroadcaster,
    cameraEnabled,
    cameraReady,
  ]);

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
            
            {/* ✅ Phase 1: Show initial guidance overlay only before first camera enable */}
            {cameraOff && isBroadcaster && !cameraHasBeenEnabled && !cameraReady ? (
              /* ✅ Phase 1: Initial guidance overlay - shows before camera is enabled for first time */
              null
            ) : isBroadcaster && hasLocalVideo && localVideo.source === "camera" && !isPaused ? (
              /* ✅ Phase 2: Top indicators only - no guidance overlays after first use */
              /* Match BroadcasterControls button states exactly */
              !cameraEnabled ? (
                /* Camera Off button (gray) → Show "To Go Live, Turn Camera On" */
                <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-gradient-to-r from-[#CD000E]/90 to-[#CD000E]/70 backdrop-blur-sm rounded-full border-2 border-[#CD000E] shadow-lg z-20">
                  <span className="text-sm font-bold text-white uppercase tracking-wider">
                    🎬 To Go Live, Turn Camera On
                  </span>
                </div>
              ) : cameraEnabled && cameraReady ? (
                /* Camera Live button (green) → Show "You are Live" */
                <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-gradient-to-r from-green-600/90 to-green-500/70 backdrop-blur-sm rounded-full border-2 border-green-400 shadow-lg z-20">
                  <span className="text-sm font-bold text-white uppercase tracking-wider">
                    🔴 You are Live
                  </span>
                </div>
              ) : null
            ) : cameraOff && !isPaused ? (
              /* Fallback for non-broadcasters or other states */
              <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/70 backdrop-blur-sm rounded-full border border-gray-600">
                <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  📷 Camera is off
                </span>
              </div>
            ) : null}
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
        ) : isBroadcaster ? (
          /* ✅ Broadcaster-specific guidance when no video */
          <div className="text-center px-8 max-w-2xl mx-auto">
            <div className="mb-6">
              <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-[#CD000E]/20 to-[#CD000E]/5 flex items-center justify-center border-2 border-[#CD000E]/30">
                <svg
                  className="w-16 h-16 text-[#CD000E]"
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
            
            {!cameraEnabled ? (
              /* ✅ Phase 1: Initial guidance - only show before first camera enable */
              !cameraHasBeenEnabled ? (
                <>
                  <h2 className="text-white text-2xl font-bold mb-3">Ready to Go Live!</h2>
                  <p className="text-gray-300 text-lg mb-4">
                    Click the <span className="font-semibold text-white">"Camera Off"</span> button below to start your camera
                  </p>
                  <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <p className="text-gray-400 text-sm mb-2">💡 Quick Start:</p>
                    <ol className="text-left text-gray-300 text-sm space-y-2 list-decimal list-inside">
                      <li>Click <span className="font-semibold text-white">"Camera Off"</span> button <span className="font-semibold text-yellow-400">once</span> at the bottom</li>
                      <li>The button will turn <span className="font-semibold text-yellow-400">yellow</span> and show "Starting..." - it will be <span className="font-semibold text-yellow-400">disabled</span> during this time</li>
                      <li>Wait for the button to automatically turn <span className="font-semibold text-green-400">green</span> and show "Camera Live" - your video feed will appear here</li>
                      <li className="text-yellow-400 font-semibold">✅ The button is disabled while starting - you can't click it by accident!</li>
                    </ol>
                  </div>
                </>
              ) : null
            ) : !cameraReady ? (
              <>
                <h2 className="text-white text-2xl font-bold mb-3">Starting Camera...</h2>
                <div className="mb-4">
                  <div className="w-16 h-16 mx-auto border-4 border-gray-600 border-t-[#CD000E] rounded-full animate-spin" />
                </div>
                <p className="text-gray-300 text-lg mb-2">
                  Your camera is initializing
                </p>
                <p className="text-gray-400 text-sm">
                  The video feed will appear here shortly
                </p>
              </>
            ) : (
              <>
                <h2 className="text-white text-2xl font-bold mb-3">Connecting preview…</h2>
                <div className="mb-4">
                  <div className="w-16 h-16 mx-auto border-4 border-gray-600 border-t-green-500 rounded-full animate-spin" />
                </div>
                <p className="text-gray-300 text-lg mb-2">
                  Your camera is active; attaching video to this screen.
                </p>
                <p className="text-gray-500 text-sm">
                  If this message stays up, check camera permissions, another tab using the camera, or the browser console.
                </p>
              </>
            )}
          </div>
        ) : (
          /* Viewer placeholder when no video available */
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
      {/* ✅ z-index lower than control bar (z-30) so controls remain accessible */}
      {isPaused && (
        <div className="absolute inset-0 z-10 pointer-events-none">
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
    if (!video || !trackSid || !track) {
      console.warn(`[LocalVideo] Cannot attach track - missing video element, trackSid, or track`, {
        hasVideo: !!video,
        hasTrackSid: !!trackSid,
        hasTrack: !!track,
      });
      return;
    }

    // ✅ FIX #4: Add track attachment verification
    console.log(`[LocalVideo] Attaching track ${trackSid} to video element`);
    
    try {
      track.attach(video);
      
      // Verify attachment
      const stream = video.srcObject;
      if (!stream) {
        console.error(`[LocalVideo] Track attached but video.srcObject is null`);
      } else if (stream instanceof MediaStream) {
        const videoTracks = stream.getVideoTracks();
        console.log(`[LocalVideo] Track attached successfully`, {
          trackSid,
          streamId: stream.id,
          videoTrackCount: videoTracks.length,
          trackEnabled: videoTracks[0]?.enabled,
          trackReadyState: videoTracks[0]?.readyState,
          trackId: videoTracks[0]?.id,
        });
        
        // Verify track is actually enabled and live
        if (videoTracks.length === 0) {
          console.error(`[LocalVideo] No video tracks in stream after attachment`);
        } else if (!videoTracks[0].enabled) {
          console.warn(`[LocalVideo] Video track is not enabled`);
        } else if (videoTracks[0].readyState !== "live") {
          console.warn(`[LocalVideo] Video track readyState is "${videoTracks[0].readyState}", expected "live"`);
        }
      } else {
        console.warn(`[LocalVideo] video.srcObject is not a MediaStream`, { type: typeof stream });
      }
    } catch (error) {
      console.error(`[LocalVideo] Failed to attach track:`, error);
    }

    return () => {
      console.log(`[LocalVideo] Detaching track ${trackSid}`);
      if (video && track) {
        try {
          track.detach(video);
        } catch (error) {
          console.error(`[LocalVideo] Error detaching track:`, error);
        }
      }
    };
  }, [trackSid, track]); // ✅ FIX #4: Include track in dependencies to handle track object changes

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
