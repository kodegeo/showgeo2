// frontend/src/components/streaming/BroadcasterControls.tsx
import { useMemo, useState } from "react";
import type { Room } from "livekit-client";

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

  const micEnabled = useMemo(
    () => !!room.localParticipant?.isMicrophoneEnabled,
    [room.localParticipant?.isMicrophoneEnabled]
  );
  const camEnabled = useMemo(
    () => !!room.localParticipant?.isCameraEnabled,
    [room.localParticipant?.isCameraEnabled]
  );
  const screenEnabled = useMemo(
    () => !!room.localParticipant?.isScreenShareEnabled,
    [room.localParticipant?.isScreenShareEnabled]
  );

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
      await room.localParticipant.setMicrophoneEnabled(!micEnabled);
    });

  const toggleCam = () =>
    safe("cam", async () => {
      await room.localParticipant.setCameraEnabled(!camEnabled);
    });

  const toggleScreen = () =>
    safe("screen", async () => {
      await room.localParticipant.setScreenShareEnabled(!screenEnabled);
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
