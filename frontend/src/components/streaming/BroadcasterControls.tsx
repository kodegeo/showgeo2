// frontend/src/components/streaming/BroadcasterControls.tsx
import { useMemo, useState } from "react";
import type { Room } from "livekit-client";

type BroadcasterControlsProps = {
  room: Room;
  disabled?: boolean;
};

export function BroadcasterControls({ room, disabled }: BroadcasterControlsProps) {
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

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={toggleMic}
        disabled={disabled || busy === "mic"}
        className="px-3 py-2 rounded bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {micEnabled ? "Mute Mic" : "Unmute Mic"}
      </button>

      <button
        onClick={toggleCam}
        disabled={disabled || busy === "cam"}
        className="px-3 py-2 rounded bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {camEnabled ? "Stop Cam" : "Start Cam"}
      </button>

      <button
        onClick={toggleScreen}
        disabled={disabled || busy === "screen"}
        className="px-3 py-2 rounded bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {screenEnabled ? "Stop Share" : "Share Screen"}
      </button>
    </div>
  );
}
