import { Calendar, CheckCircle2, Info, Ticket } from "lucide-react";
import type { Event } from "@/types/event.types";
import type { EventAccessStatus } from "@/services/events.service";

interface Props {
  event: Event;
  accessStatus: EventAccessStatus;
}

export function TicketInstructions({ event }: Props) {
  return (
    <div className="rounded-xl border border-green-800/50 bg-green-950/30 p-6 space-y-5">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0" aria-hidden />
        <div>
          <p className="text-green-400 font-semibold text-lg leading-tight">
            You&apos;re all set — your ticket is active
          </p>
          {event.startTime && (
            <p className="text-white/50 text-sm mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" aria-hidden />
              {new Date(event.startTime).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-white/70 text-sm font-medium uppercase tracking-wide flex items-center gap-2">
          <Ticket className="w-4 h-4 text-white/40" aria-hidden />
          How to join
        </p>
        <ul className="space-y-1.5 text-sm text-white/60 pl-6 list-disc">
          <li>Return to this event page at the scheduled time</li>
          <li>You must be logged into your account</li>
          <li>Access will unlock automatically when the event begins</li>
        </ul>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 space-y-1.5">
        <p className="text-white/50 text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" aria-hidden />
          Important
        </p>
        <ul className="space-y-1 text-xs text-white/45 pl-5 list-disc">
          <li>Your ticket is tied to your account — no code needed</li>
          <li>Do not share your account or access may be revoked</li>
          <li>Access is limited to this event only</li>
        </ul>
      </div>
    </div>
  );
}
