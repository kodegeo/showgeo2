import type { EventWizardState } from "@/types/events";
import { Calendar, Image as ImageIcon, Ticket } from "lucide-react";

interface EventGoLiveProps {
  state: EventWizardState;
  onPrepareStreaming: () => void;
  onCancel: () => void;
  onFinish: () => void;
  isPreparing: boolean;
  error: string | null;
  streamKey: string | null;
  streamingStatus: string | null;
  rtmpUrl: string | null;
}

export function EventGoLive({
  state,
  onPrepareStreaming,
  onCancel,
  onFinish,
  isPreparing,
  error,
  streamKey,
  streamingStatus,
  rtmpUrl,
}: EventGoLiveProps) {
  const dateLabel = state.startTime
    ? new Date(state.startTime).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white uppercase tracking-tight">
        Step 3 — Go Live Preparation
      </h2>

      <div className="rounded-lg border border-white/10 bg-black/40 p-4 space-y-3">
        <h3 className="text-sm font-medium text-white/90">Preview Event Summary</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-white/50">Event name</span>
            <span className="text-white">{state.name || "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-white/50 shrink-0" />
            <span className="text-white">{dateLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-white/50 shrink-0" />
            <span className="text-white">
              {state.ticketPrice != null && state.ticketPrice > 0
                ? `$${state.ticketPrice}`
                : "Free"}
              {state.ticketQuantity > 0 && ` · ${state.ticketQuantity} spots`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-white/50 shrink-0" />
            <span className="text-white">
              {state.thumbnailUrl ? "Thumbnail set" : "No thumbnail"}
            </span>
          </div>
        </dl>
      </div>

      <div>
        <button
          type="button"
          onClick={onPrepareStreaming}
          disabled={isPreparing}
          className="px-4 py-2 bg-[#CD000E] hover:bg-[#860005] text-white font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPreparing ? "Preparing…" : "Prepare Streaming"}
        </button>
      </div>

      {(streamKey || rtmpUrl || streamingStatus) && (
        <div className="rounded-lg border border-white/10 bg-black/40 p-4 space-y-2">
          <h3 className="text-sm font-medium text-white/90">Streaming</h3>
          {rtmpUrl && (
            <div>
              <span className="text-white/50 text-xs block">RTMP URL</span>
              <p className="text-white font-mono text-sm break-all">{rtmpUrl}</p>
            </div>
          )}
          {streamKey && (
            <div>
              <span className="text-white/50 text-xs block">Stream Key</span>
              <p className="text-white font-mono text-sm break-all">{streamKey}</p>
            </div>
          )}
          {streamingStatus && (
            <div>
              <span className="text-white/50 text-xs block">Status</span>
              <p className="text-white text-sm">{streamingStatus}</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-white/80 hover:text-white border border-white/20 rounded-md"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onFinish}
          className="px-4 py-2 bg-[#CD000E] hover:bg-[#860005] text-white font-semibold rounded-md"
        >
          Finish & go to Event Studio
        </button>
      </div>
    </div>
  );
}
