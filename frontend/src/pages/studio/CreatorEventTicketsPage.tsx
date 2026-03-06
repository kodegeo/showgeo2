import { useParams, Link } from "react-router-dom";
import { useEvent, useUpdateEvent } from "@/hooks/useEvents";
import { CreatorDashboardLayout } from "@/components/creator/CreatorDashboardLayout";
import { TicketTypeModal } from "@/components/TicketTypeModal";
import { useState, useEffect } from "react";
import type { EventTicketType } from "../../../../packages/shared/types/event.types";

export function CreatorEventTicketsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: event } = useEvent(id!);
  const updateEvent = useUpdateEvent();

  const [tickets, setTickets] = useState<EventTicketType[]>([]);
  const [open, setOpen] = useState(false);

  // Hydrate from event
  useEffect(() => {
    if (!event?.ticketTypes) return;
  
    const mapped: EventTicketType[] = event.ticketTypes.map((t: any) => ({
      // If the API uses "type" + "availability"
      name: t.name ?? t.type ?? "General Admission",
      price: Number(t.price ?? 0),
      currency: (t.currency ?? "USD") as "USD",
      quantity: Number(t.quantity ?? t.availability ?? 0),
      accessLevel: (t.accessLevel ?? (t.type === "VIP" ? "VIP" : "GENERAL")) as
        | "GENERAL"
        | "VIP",
    }));
  
    setTickets(mapped);
  }, [event]);
  
  function handleSaveTicket(ticket: EventTicketType) {
    setTickets((prev) => [...prev, ticket]);
  }

  function saveTickets() {
    if (!event) return;

    updateEvent.mutate({
      id: event.id,
      data: {
        ticketTypes: tickets,
      },
    });
  }

  return (
    <CreatorDashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold text-white">Ticket Types</h1>
          <Link
            to={`/creator/events/${event?.id}`}
            className="text-sm text-white/60 hover:text-white"
          >
            ← Back
          </Link>
        </div>

        {tickets.length === 0 ? (
          <p className="text-white/60">No ticket types yet.</p>
        ) : (
          <div className="space-y-3">
            {tickets.map((t, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center bg-white/5 p-3 rounded"
              >
                <div>
                  <div className="text-white font-semibold">{t.name}</div>
                  <div className="text-sm text-white/50">
                    {t.price === 0 ? "Free" : `$${t.price}`} · {t.accessLevel}
                  </div>
                </div>

                <button
                  onClick={() =>
                    setTickets((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            onClick={() => setOpen(true)}
            className="px-4 py-2 bg-[#CD000E] rounded text-white"
          >
            Add Ticket
          </button>

          <button
            onClick={saveTickets}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-white"
          >
            Save Changes
          </button>
        </div>

        <TicketTypeModal
          isOpen={open}
          onClose={() => setOpen(false)}
          onSave={handleSaveTicket}
        />
      </div>
    </CreatorDashboardLayout>
  );
}
