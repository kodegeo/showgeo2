// frontend/src/components/streaming/StreamingNotLive.tsx
type StreamingNotLiveProps = {
    canManageStream: boolean;
    canGoLive: boolean;
    scheduledStart?: Date | null;
    onGoLive: () => void;
    onCancel: () => void;
  };
  
  export function StreamingNotLive({
    canManageStream,
    canGoLive,
    scheduledStart,
    onGoLive,
    onCancel,
  }: StreamingNotLiveProps) {
    return (
      <div className="border border-gray-800 bg-[#0B0B0B] p-6 rounded-lg space-y-4">
        <p className="text-[#9A9A9A] font-body">
          This event is not live yet.
        </p>
  
        {scheduledStart && (
          <p className="text-xs text-gray-400">
            Scheduled to start at{" "}
            <span className="text-white">
              {scheduledStart.toLocaleString()}
            </span>
          </p>
        )}
  
        {canManageStream && (
          <div className="flex gap-3">
            <button
              onClick={onGoLive}
              disabled={!canGoLive}
              className={`px-5 py-2 rounded-lg font-heading uppercase tracking-wide ${
                canGoLive
                  ? "bg-[#CD000E] hover:bg-[#860005] text-white"
                  : "bg-gray-700 text-gray-400 cursor-not-allowed"
              }`}
            >
              Go Live
            </button>
  
            <button
              onClick={onCancel}
              className="px-5 py-2 bg-transparent border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  }
  