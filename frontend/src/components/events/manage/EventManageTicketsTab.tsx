import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { EventTicketTypesSection } from "@/components/events/EventTicketTypesSection";
import type { Event } from "@/types/event.types";
import { eventsService } from "@/services/events.service";

export interface EventManageTicketsTabProps {
  eventId: string;
  event: Event;
  onTicketTypesUpdated: () => void;
}

/** Prefer DB catalog; fallback to legacy JSON on the event. */
function useTicketTypesForSummary(eventId: string, event: Event) {
  const { data: catalog = [] } = useQuery({
    queryKey: ["ticket-types", eventId],
    queryFn: () => eventsService.getTicketTypes(eventId),
  });

  return useMemo(() => {
    if (catalog.length > 0) {
      return catalog.map(t => ({
        price: Number(t.price ?? 0),
      }));
    }
    const raw = (event as { ticketTypes?: unknown[] }).ticketTypes;
    if (Array.isArray(raw)) {
      return raw.map(t => ({
        price: Number((t as { price?: number }).price ?? 0),
      }));
    }
    return [];
  }, [catalog, event]);
}

export function EventManageTicketsTab({
  eventId,
  event,
  onTicketTypesUpdated,
}: EventManageTicketsTabProps) {
  const ticketTypes = useTicketTypesForSummary(eventId, event);
  const freeCount = ticketTypes.filter(t => t.price === 0).length;
  const paidCount = ticketTypes.length - freeCount;

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-sm text-white/70">
        Define ticket tiers and capacity here. Public registration and invite-only flows both use
        these types — use the{" "}
        <Link
          to={`/studio/events/${eventId}/manage?tab=audience`}
          className="text-[#CD000E] hover:underline"
        >
          Audience
        </Link>{" "}
        tab to distribute passes.
      </p>

      {ticketTypes.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70 flex flex-wrap gap-4">
          <span>
            <strong className="text-white">{ticketTypes.length}</strong> ticket type
            {ticketTypes.length !== 1 ? "s" : ""}
          </span>
          <span>
            Free: <strong className="text-white">{freeCount}</strong>
          </span>
          <span>
            Paid: <strong className="text-white">{paidCount}</strong>
          </span>
        </div>
      )}

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <EventTicketTypesSection
          eventId={eventId}
          event={event as unknown as Record<string, unknown>}
          onUpdated={onTicketTypesUpdated}
        />
      </section>
    </div>
  );
}
