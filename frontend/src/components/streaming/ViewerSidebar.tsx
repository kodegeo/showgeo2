// frontend/src/components/streaming/ViewerSidebar.tsx
import { useEffect, useState, useMemo } from "react";
import type { Room, RemoteParticipant } from "livekit-client";

type ViewerSidebarProps = {
  room: Room;
};

type ViewerInfo = {
  identity: string;
  name?: string;
  avatar?: string;
};

export function ViewerSidebar({ room }: ViewerSidebarProps) {
  const [viewers, setViewers] = useState<ViewerInfo[]>([]);

  useEffect(() => {
    if (!room) return;

    const updateViewers = () => {
      const remoteParticipants = Array.from(room.remoteParticipants.values());
      const viewerList: ViewerInfo[] = remoteParticipants.map((participant) => {
        const identity = participant.identity || "Unknown";
        // Try to extract name from metadata if available
        let metadata = {};
        if (participant.metadata) {
          try {
            metadata = JSON.parse(participant.metadata);
          } catch (e) {
            // Metadata is not valid JSON, ignore
            console.warn("[ViewerSidebar] Failed to parse participant metadata:", e);
          }
        }
        
        return {
          identity,
          name: (metadata as any).name || identity,
          avatar: (metadata as any).avatar,
        };
      });

      setViewers(viewerList);
    };

    updateViewers();

    room.on("participantConnected", updateViewers);
    room.on("participantDisconnected", updateViewers);

    return () => {
      room.off("participantConnected", updateViewers);
      room.off("participantDisconnected", updateViewers);
    };
  }, [room]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="w-64 bg-black/60 backdrop-blur-sm border-l border-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wide">
          Viewers ({viewers.length})
        </h3>
      </div>

      {/* Viewer List */}
      <div className="flex-1 overflow-y-auto p-2">
        {viewers.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            <p>No viewers yet</p>
            <p className="text-xs mt-1">Waiting for participants...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {viewers.map((viewer) => (
              <div
                key={viewer.identity}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
              >
                {/* Avatar */}
                {viewer.avatar ? (
                  <img
                    src={viewer.avatar}
                    alt={viewer.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#CD000E] flex items-center justify-center text-white font-semibold text-sm">
                    {getInitials(viewer.name || viewer.identity)}
                  </div>
                )}

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {viewer.name || viewer.identity}
                  </p>
                  {viewer.name && viewer.name !== viewer.identity && (
                    <p className="text-gray-400 text-xs truncate">
                      {viewer.identity}
                    </p>
                  )}
                </div>

                {/* Online Indicator */}
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

