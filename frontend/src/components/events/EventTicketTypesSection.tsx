import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ticket } from "lucide-react";
import { TicketTypeModal } from "@/components/TicketTypeModal";
import type { EventTicketType } from "../../../../packages/shared/types/event.types";
import { toast } from "sonner";
import { eventsService, type CatalogTicketType } from "@/services/events.service";

export interface EventTicketTypesSectionProps {
  eventId: string;
  event: Record<string, unknown>;
  onUpdated?: () => void;
  /** When true (e.g. in Event Studio wizard), show link to the full Access page */
  showLinkToAccessPage?: boolean;
}

function mapCatalogToTicketTypes(rows: CatalogTicketType[]): EventTicketType[] {
  return rows.map(r => ({
    name: r.name,
    price: Number(r.price ?? 0),
    currency: (r.currency ?? "USD") as string as "USD",
    quantity: r.capacity ?? 0,
    accessLevel: (r.requires_invite ? "VIP" : "GENERAL") as "GENERAL" | "VIP",
  }));
}

function mapJsonToTicketTypes(raw: unknown[]): EventTicketType[] {
  return raw.map(t => {
    const row = t as Record<string, unknown>;
    return {
      name: (row.name as string) ?? (row.type as string) ?? "General Admission",
      price: Number(row.price ?? 0),
      currency: ((row.currency as string) ?? "USD") as "USD",
      quantity: Number(row.quantity ?? row.availability ?? 0),
      accessLevel: ((row.accessLevel as string) ?? (row.type === "VIP" ? "VIP" : "GENERAL")) as
        | "GENERAL"
        | "VIP",
    };
  });
}

/**
 * Ticket tier editor: loads from `ticket_types` (GET) with fallback to `event.ticketTypes` JSON.
 * Saves via POST /events/:id/ticket-types (single source of truth in DB).
 */
export function EventTicketTypesSection({
  eventId,
  event,
  onUpdated,
  showLinkToAccessPage = false,
}: EventTicketTypesSectionProps) {
  const queryClient = useQueryClient();

  const { data: catalogRows = [] } = useQuery({
    queryKey: ["ticket-types", eventId],
    queryFn: () => eventsService.getTicketTypes(eventId),
  });

  const serverTickets = useMemo(() => {
    if (catalogRows.length > 0) {
      return mapCatalogToTicketTypes(catalogRows);
    }
    const json = event?.ticketTypes;
    if (Array.isArray(json) && json.length > 0) {
      return mapJsonToTicketTypes(json as unknown[]);
    }
    return [];
  }, [catalogRows, event?.ticketTypes]);

  const [tickets, setTickets] = useState<EventTicketType[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setTickets(serverTickets);
  }, [serverTickets]);

  const saveMutation = useMutation({
    mutationFn: (payload: EventTicketType[]) => eventsService.saveTicketTypes(eventId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-types", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      onUpdated?.();
      toast.success("Ticket types saved");
    },
    onError: (err: Error) => toast.error(err.message ?? "Save failed"),
  });

  function handleSaveTicket(ticket: EventTicketType) {
    setTickets(prev => [...prev, ticket]);
    setModalOpen(false);
  }

  function saveTickets() {
    saveMutation.mutate(tickets);
  }

  return (
    <div className="space-y-6 max-w-xl">
      <p className="text-sm text-white/70">
        Manage ticket tiers, prices, and capacity. Save when ready.
      </p>

      {tickets.length === 0 ? (
        <p className="text-white/50 text-sm">No ticket types yet. Add one below.</p>
      ) : (
        <ul className="space-y-3">
          {tickets.map((t, idx) => (
            <li
              key={idx}
              className="flex justify-between items-center bg-white/5 border border-white/10 rounded-lg p-3"
            >
              <div>
                <div className="font-medium text-white">{t.name}</div>
                <div className="text-sm text-white/50">
                  {t.price === 0 ? "Free" : `$${t.price}`} · {t.accessLevel}
                  {t.quantity > 0 && ` · ${t.quantity} available`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTickets(prev => prev.filter((_, i) => i !== idx))}
                className="text-sm text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#CD000E] text-white rounded-lg hover:bg-[#860005] text-sm font-medium"
        >
          <Ticket className="w-4 h-4" />
          Add ticket type
        </button>
        <button
          type="button"
          onClick={saveTickets}
          disabled={saveMutation.isPending || tickets.length === 0}
          className="px-4 py-2 border border-gray-600 text-white rounded-lg hover:bg-white/5 disabled:opacity-50 text-sm font-medium"
        >
          {saveMutation.isPending ? "Saving…" : "Save changes"}
        </button>
      </div>

      <TicketTypeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveTicket}
      />

      {showLinkToAccessPage && (
        <Link
          to={`/studio/events/${eventId}/manage?tab=audience`}
          className="inline-block text-sm text-white/50 hover:text-white/80"
        >
          Open Manage → Audience →
        </Link>
      )}
    </div>
  );
}
