// frontend/src/components/streaming/LiveStatusOverlay.tsx
type LiveStatusOverlayProps = {
  isLive: boolean;
  viewerCount: number;
};

export function LiveStatusOverlay({ isLive, viewerCount }: LiveStatusOverlayProps) {
  return (
    <div className="absolute top-4 left-4 z-50 flex items-center gap-3">
      {/* Status Badge */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-semibold text-sm ${
          isLive
            ? "bg-[#CD000E] text-white"
            : "bg-gray-700 text-gray-300"
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${isLive ? "bg-white animate-pulse" : "bg-gray-400"}`} />
        <span className="uppercase tracking-wide">
          {isLive ? "🔴 LIVE" : "⏸ PAUSED"}
        </span>
      </div>

      {/* Viewer Count */}
      <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-sm">
        👀 {viewerCount} {viewerCount === 1 ? "viewer" : "viewers"}
      </div>
    </div>
  );
}

