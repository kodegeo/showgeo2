// frontend/src/components/streaming/StreamingLive.tsx
import type { StreamingSession } from "@/hooks/useStreaming";

type StreamingLiveProps = {
  session: StreamingSession;
  canManageStream: boolean;
  onJoin: () => void;
  onEnd: () => void;
};

export function StreamingLive({
  session,
  canManageStream,
  onJoin,
  onEnd,
}: StreamingLiveProps) {
  return (
    <div className="border border-[#CD000E] bg-[#0B0B0B] p-6 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#CD000E] animate-pulse" />
          <span className="text-[#CD000E] font-heading font-semibold uppercase text-sm">
            Live Now
          </span>
        </div>

        <span className="text-xs text-gray-400">
          👀 {session.viewers ?? 0} watching
        </span>
      </div>

      <p className="text-white font-body">
        This event is currently live.
      </p>

      <div className="flex gap-3">
        <button
          onClick={onJoin}
          className="px-5 py-2 bg-[#CD000E] hover:bg-[#860005] text-white rounded-lg font-heading uppercase tracking-wide"
        >
          Join Stream
        </button>

        {canManageStream && (
          <button
            onClick={onEnd}
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            End Stream
          </button>
        )}
      </div>
    </div>
  );
}
