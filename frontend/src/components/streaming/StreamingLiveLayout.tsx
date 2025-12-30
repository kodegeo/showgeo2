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
      
      setIsPaused(true);
    } catch (error) {
      console.error("[StreamingLiveLayout] Failed to pause:", error);
    }
  };

  const handleResume = async () => {
    if (!room || !isBroadcaster) return;

    try {
      // Re-enable camera and mic
      setIsPaused(false);
    } catch (error) {
      console.error("[StreamingLiveLayout] Failed to resume:", error);
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#0B0B0B] flex flex-col overflow-hidden">
      {/* Status Overlay - Top Left (over video) */}
      <div className="absolute top-0 left-0 z-20">
        <LiveStatusOverlay
          isLive={!isPaused}
          viewerCount={viewerCount}
        />
      </div>

      {/* Main Content Area - 3 Zone Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* PRIMARY VIDEO AREA - Center, Large */}
        <div className="flex-1 relative">
          <LiveKitStage 
            room={room} 
            isPaused={isPaused}
            isBroadcaster={isBroadcaster}
          />
        </div>

        {/* SIDEBAR - Right Side (Viewers/Reactions) */}
        <ViewerSidebar room={room} />
      </div>

      {/* Reaction Overlay - Floating emojis */}
      <ReactionOverlay room={room} />

      {/* CONTROL BAR - Bottom (Creator Only) */}
      {isBroadcaster && (
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/95 via-black/90 to-transparent backdrop-blur-sm border-t border-gray-800/50 p-4">
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

