// frontend/src/components/streaming/StreamingLiveLayout.tsx
import { useState, useEffect } from "react";
import type { Room } from "livekit-client";
import type { StreamingSession } from "@/hooks/useStreaming";
import { LiveStatusOverlay } from "./LiveStatusOverlay";
import { LiveKitStage } from "./LiveKitStage";
import { ViewerSidebar } from "./ViewerSidebar";
import { ReactionOverlay } from "./ReactionOverlay";
import { BroadcasterControls } from "./BroadcasterControls";

type StreamingLiveLayoutProps = {
  room: Room;
  session: StreamingSession;
  isBroadcaster: boolean;
  onEndStream?: () => void;
};

export function StreamingLiveLayout({
  room,
  session,
  isBroadcaster,
  onEndStream,
}: StreamingLiveLayoutProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);

  // Update viewer count from room participants
  useEffect(() => {
    if (!room) return;

    const updateViewerCount = () => {
      // Count remote participants (viewers)
      const remoteCount = room.remoteParticipants.size;
      setViewerCount(remoteCount);
    };

    updateViewerCount();

    room.on("participantConnected", updateViewerCount);
    room.on("participantDisconnected", updateViewerCount);

    return () => {
      room.off("participantConnected", updateViewerCount);
      room.off("participantDisconnected", updateViewerCount);
    };
  }, [room]);

  const handlePause = async () => {
    if (!room || !isBroadcaster) return;

    try {
      // Mute camera and mic
      await room.localParticipant.setCameraEnabled(false);
      await room.localParticipant.setMicrophoneEnabled(false);
      setIsPaused(true);
    } catch (error) {
      console.error("[StreamingLiveLayout] Failed to pause:", error);
    }
  };

  const handleResume = async () => {
    if (!room || !isBroadcaster) return;

    try {
      // Re-enable camera and mic
      await room.localParticipant.setCameraEnabled(true);
      await room.localParticipant.setMicrophoneEnabled(true);
      setIsPaused(false);
    } catch (error) {
      console.error("[StreamingLiveLayout] Failed to resume:", error);
    }
  };

  return (
    <div className="relative w-full h-full bg-black">
      {/* Status Overlay - Top Left */}
      <LiveStatusOverlay
        isLive={!isPaused}
        viewerCount={viewerCount}
      />

      {/* Main Stage Area */}
      <div className="flex h-full">
        {/* Center Stage */}
        <div className="flex-1 relative">
          <LiveKitStage room={room} isPaused={isPaused} />
        </div>

        {/* Viewer Sidebar - Right Side */}
        <ViewerSidebar room={room} />
      </div>

      {/* Reaction Overlay */}
      <ReactionOverlay room={room} />

      {/* Broadcaster Controls - Bottom Bar (Creator Only) */}
      {isBroadcaster && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-t border-gray-800 p-4">
          <BroadcasterControls
            room={room}
            isPaused={isPaused}
            onPause={handlePause}
            onResume={handleResume}
            onEndStream={onEndStream}
          />
        </div>
      )}
    </div>
  );
}

