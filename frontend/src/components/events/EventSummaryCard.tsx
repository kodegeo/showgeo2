import type { EventWizardState } from "@/types/events";
import { Calendar, Image, Ticket, Globe, Radio } from "lucide-react";

interface EventSummaryCardProps {
  state: EventWizardState;
}

export function EventSummaryCard({ state }: EventSummaryCardProps) {
  const dateLabel = state.startTime
    ? new Date(state.startTime).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

  return (
    <div className="rounded-lg border border-white/10 bg-black/40 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wider">
        Event Summary
      </h3>
      <dl className="space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <span className="text-white/50 shrink-0">Name</span>
          <span className="text-white truncate">{state.name || "—"}</span>
        </div>
        <div className="flex items-start gap-2">
          <Calendar className="w-4 h-4 text-white/50 shrink-0 mt-0.5" />
          <span className="text-white">{dateLabel}</span>
        </div>
        <div className="flex items-start gap-2">
          <Ticket className="w-4 h-4 text-white/50 shrink-0 mt-0.5" />
          <span className="text-white">
            {state.ticketPrice != null && state.ticketPrice > 0 ? `$${state.ticketPrice}` : "Free"}
            {state.ticketQuantity > 0 && ` · ${state.ticketQuantity} spots`}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <Image className="w-4 h-4 text-white/50 shrink-0 mt-0.5" />
          <span className="text-white">
            {state.thumbnailUrl ? "Thumbnail set" : "No thumbnail"}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <Globe className="w-4 h-4 text-white/50 shrink-0 mt-0.5" />
          <span className="text-white capitalize">
            {state.visibility?.toLowerCase().replace("_", " ") ?? "—"}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <Radio className="w-4 h-4 text-white/50 shrink-0 mt-0.5" />
          <span className="text-white">
            {state.streamKey || state.streamingStatus ? "Streaming enabled" : "Not prepared"}
          </span>
        </div>
      </dl>
    </div>
  );
}
