// frontend/src/components/streaming/BroadcasterControls.tsx
import { useState, useEffect } from "react";
import { Room, ConnectionState } from "livekit-client";
import { isDevelopment } from "@/utils/env";

type BroadcasterControlsProps = {
  room: Room;
  disabled?: boolean;
  isPaused?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onEndStream?: () => void;
};

export function BroadcasterControls({
  room,
  disabled,
  isPaused = false,
  onPause,
  onResume,
  onEndStream,
}: BroadcasterControlsProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(false);
  const [camEnabled, setCamEnabled] = useState(false);
  const [screenEnabled, setScreenEnabled] = useState(false);

  // Reactively update state from room.localParticipant
  useEffect(() => {
    if (!room?.localParticipant) return;

    const updateState = () => {
      const mic = !!room.localParticipant?.isMicrophoneEnabled;
      const cam = !!room.localParticipant?.isCameraEnabled;
      const screen = !!room.localParticipant?.isScreenShareEnabled;
      
      setMicEnabled(mic);
      setCamEnabled(cam);
      setScreenEnabled(screen);

      if (isDevelopment) {
        const videoTrackCount = room.localParticipant.videoTrackPublications.size;
        const audioTrackCount = room.localParticipant.audioTrackPublications.size;
        console.log("[BroadcasterControls] State updated:", {
          mic,
          cam,
          screen,
          videoTrackCount,
          audioTrackCount,
        });
      }
    };

    updateState();

    // Listen for track changes
    room.localParticipant.on("trackPublished", updateState);
    room.localParticipant.on("trackUnpublished", updateState);
    room.localParticipant.on("trackMuted", updateState);
    room.localParticipant.on("trackUnmuted", updateState);

    return () => {
      room.localParticipant?.off("trackPublished", updateState);
      room.localParticipant?.off("trackUnpublished", updateState);
      room.localParticipant?.off("trackMuted", updateState);
      room.localParticipant?.off("trackUnmuted", updateState);
    };
  }, [room]);

  const safe = async (label: string, fn: () => Promise<void>) => {
    if (disabled) return;
    try {
      setBusy(label);
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const toggleMic = () =>
    safe("mic", async () => {
      // Ensure room is connected before publishing
      if (room.state !== ConnectionState.Connected) {
        throw new Error(`Room not connected: state is ${room.state}`);
      }

      // Read current state directly from LiveKit, not React state
      const currentState = !!room.localParticipant.isMicrophoneEnabled;
      const newState = !currentState;
      
      if (isDevelopment) {
        const beforeCount = room.localParticipant.audioTrackPublications.size;
        console.log(`[BroadcasterControls] ${newState ? "Enabling" : "Disabling"} microphone... (tracks before: ${beforeCount}, current LiveKit state: ${currentState})`);
      }
      
      try {
        await room.localParticipant.setMicrophoneEnabled(newState);
        
        if (isDevelopment) {
          const afterCount = room.localParticipant.audioTrackPublications.size;
          console.log(`[BroadcasterControls] Microphone ${newState ? "enabled" : "disabled"}, audio tracks: ${afterCount}`);
        }
      } catch (error) {
        console.error("[BroadcasterControls] Failed to toggle microphone:", error);
        throw error;
      }
    });

  const toggleCam = () =>
    safe("cam", async () => {
      // Ensure room is connected before publishing
      if (room.state !== ConnectionState.Connected) {
        throw new Error(`Room not connected: state is ${room.state}`);
      }

      // Read current state directly from LiveKit, not React state
      const currentState = !!room.localParticipant.isCameraEnabled;
      const newState = !currentState;
      
      if (isDevelopment) {
        const beforeCount = room.localParticipant.videoTrackPublications.size;
        console.log(`[BroadcasterControls] ${newState ? "Enabling" : "Disabling"} camera... (tracks before: ${beforeCount}, current LiveKit state: ${currentState})`);
      }
      
      try {
        await room.localParticipant.setCameraEnabled(newState);
        
        if (isDevelopment) {
          const afterCount = room.localParticipant.videoTrackPublications.size;
          console.log(`[BroadcasterControls] Camera ${newState ? "enabled" : "disabled"}, video tracks: ${afterCount}`);
        }
      } catch (error) {
        console.error("[BroadcasterControls] Failed to toggle camera:", error);
        throw error;
      }
    });

  const toggleScreen = () =>
    safe("screen", async () => {
      // Ensure room is connected before publishing
      if (room.state !== ConnectionState.Connected) {
        throw new Error(`Room not connected: state is ${room.state}`);
      }

      // Read current state directly from LiveKit, not React state
      const currentState = !!room.localParticipant.isScreenShareEnabled;
      const newState = !currentState;
      
      if (isDevelopment) {
        const beforeCount = room.localParticipant.videoTrackPublications.size;
        console.log(`[BroadcasterControls] ${newState ? "Starting" : "Stopping"} screen share... (tracks before: ${beforeCount}, current LiveKit state: ${currentState})`);
      }
      
      try {
        await room.localParticipant.setScreenShareEnabled(newState);
        
        if (isDevelopment) {
          const afterCount = room.localParticipant.videoTrackPublications.size;
          console.log(`[BroadcasterControls] Screen share ${newState ? "started" : "stopped"}, video tracks: ${afterCount}`);
        }
      } catch (error) {
        console.error("[BroadcasterControls] Failed to toggle screen share:", error);
        throw error;
      }
    });

  const handlePause = () => {
    if (onPause && !disabled && !busy) {
      onPause();
    }
  };

  const handleResume = () => {
    if (onResume && !disabled && !busy) {
      onResume();
    }
  };

  const handleEndStream = () => {
    if (onEndStream && !disabled && !busy) {
      onEndStream();
    }
  };

  return (
    <div className="flex items-center justify-center gap-3">
      {/* Camera Controls */}
      <button
        onClick={toggleCam}
        disabled={disabled || busy === "cam"}
        className="px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
        title={camEnabled ? "Turn off camera" : "Turn on camera"}
      >
        {camEnabled ? "📹" : "📷"}
        <span className="text-sm">{camEnabled ? "Camera On" : "Camera Off"}</span>
      </button>

      {/* Microphone Controls */}
      <button
        onClick={toggleMic}
        disabled={disabled || busy === "mic"}
        className="px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
        title={micEnabled ? "Mute microphone" : "Unmute microphone"}
      >
        {micEnabled ? "🎤" : "🔇"}
        <span className="text-sm">{micEnabled ? "Mic On" : "Mic Off"}</span>
      </button>

      {/* Screen Share */}
      <button
        onClick={toggleScreen}
        disabled={disabled || busy === "screen"}
        className="px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
        title={screenEnabled ? "Stop screen share" : "Share screen"}
      >
        {screenEnabled ? "🖥️" : "📺"}
        <span className="text-sm">{screenEnabled ? "Sharing" : "Share Screen"}</span>
      </button>

      {/* Divider */}
      <div className="w-px h-8 bg-gray-700" />

      {/* Pause/Resume */}
      {isPaused ? (
        <button
          onClick={handleResume}
          disabled={disabled || busy !== null}
          className="px-4 py-2 rounded-lg bg-[#CD000E] text-white hover:bg-[#860005] disabled:opacity-50 flex items-center gap-2 transition-colors"
          title="Resume stream"
        >
          ▶️
          <span className="text-sm font-semibold">Resume</span>
        </button>
      ) : (
        <button
          onClick={handlePause}
          disabled={disabled || busy !== null}
          className="px-4 py-2 rounded-lg bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          title="Pause stream (show screensaver)"
        >
          ⏸
          <span className="text-sm font-semibold">Pause</span>
        </button>
      )}

      {/* Divider */}
      <div className="w-px h-8 bg-gray-700" />

      {/* End Stream */}
      <button
        onClick={handleEndStream}
        disabled={disabled || busy !== null}
        className="px-4 py-2 rounded-lg bg-red-700 text-white hover:bg-red-800 disabled:opacity-50 flex items-center gap-2 transition-colors"
        title="End stream and disconnect"
      >
        ⏹
        <span className="text-sm font-semibold">End Stream</span>
      </button>

      {/* TODO: Future enhancements:
          - Recording toggle
          - Stream quality selector
          - Chat moderation controls
          - Viewer management (kick/ban)
      */}
    </div>
  );
}
