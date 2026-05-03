import { useParams, Link } from "react-router-dom";
import { useEvent } from "@/hooks/useEvents";
import { EventTicketTypesSection } from "@/components/events/EventTicketTypesSection";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eventsService } from "@/services/events.service";
import { handleApiError } from "@/services/api";
import { Layers, Mail, LayoutDashboard, Ticket, Users, Send, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

/**
 * Unified Access hub: ticket types, distribution (later), access overview (later).
 * Route: /studio/events/:id/access
 */
export function CreatorEventAccessPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: event, isLoading, error } = useEvent(eventId!);

  const [ticketTypeId, setTicketTypeId] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const ticketTypes = Array.isArray((event as { ticketTypes?: unknown[] } | undefined)?.ticketTypes)
    ? (event as { ticketTypes: unknown[] }).ticketTypes
        .map(t => {
          const ticket = t as Record<string, unknown>;
          const id = typeof ticket.id === "string" ? ticket.id : "";
          const name = typeof ticket.name === "string" ? ticket.name : "Ticket";
          const price = Number(ticket.price ?? 0);
          const capacity = Number(ticket.capacity ?? ticket.quantity ?? 0);
          if (!id) return null;
          return {
            id,
            name,
            price: Number.isFinite(price) ? price : 0,
            capacity: Number.isFinite(capacity) ? capacity : 0,
          };
        })
        .filter((t): t is { id: string; name: string; price: number; capacity: number } => !!t)
    : [];

  useEffect(() => {
    if (ticketTypes.length === 0) {
      if (ticketTypeId) setTicketTypeId("");
      return;
    }
    if (!ticketTypes.some(t => t.id === ticketTypeId)) {
      setTicketTypeId(ticketTypes[0].id);
    }
  }, [ticketTypes, ticketTypeId]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["event", eventId] });
  };

  const inviteMutation = useMutation({
    mutationFn: (payload: { type: "FOLLOWERS" | "EMAIL"; emails?: string[] }) =>
      eventsService.inviteToEvent(eventId!, {
        ...payload,
        ticketTypeId,
      }),
    onSuccess: (data: { created?: number }) => {
      toast.success(
        typeof data?.created === "number" ? `Invites sent (${data.created})` : "Invites sent",
      );
      queryClient.invalidateQueries({ queryKey: ["mailbox"] });
      invalidate();
    },
    onError: (e: unknown) => {
      toast.error(handleApiError(e));
    },
  });

  const handleInviteFollowers = () => {
    if (!ticketTypeId) {
      toast.error("Select a ticket type first.");
      return;
    }
    inviteMutation.mutate({ type: "FOLLOWERS" });
  };

  const handleEmailInvites = () => {
    if (!ticketTypeId) {
      toast.error("Select a ticket type first.");
      return;
    }
    const emails = emailInput
      .split(/[\s,;]+/)
      .map(e => e.trim())
      .filter(Boolean);
    if (emails.length === 0) {
      toast.error("Enter at least one email address.");
      return;
    }
    inviteMutation.mutate({ type: "EMAIL", emails });
  };

  if (!eventId) {
    return <div className="p-6 text-red-400">Invalid event</div>;
  }

  if (isLoading) {
    return <div className="p-6 text-white/60">Loading event…</div>;
  }

  if (error || !event) {
    return <div className="p-6 text-red-400">Event not found</div>;
  }

  return (
    <div className="p-6 space-y-10 max-w-4xl">
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-white">Access</h1>
          <p className="text-sm text-white/60 mt-1 max-w-xl">
            Ticket types, distribution, and who can join — manage how people get into{" "}
            <span className="text-white/90">{event.name}</span>.
          </p>
        </div>
        <Link
          to={`/studio/events/${eventId}`}
          className="text-sm text-white/60 hover:text-white shrink-0"
        >
          ← Event Studio
        </Link>
      </div>

      {/* Ticket Types */}
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Ticket className="w-5 h-5 text-[#CD000E]" />
          <h2 className="text-lg font-semibold text-white">Ticket Types</h2>
        </div>
        <EventTicketTypesSection
          eventId={eventId}
          event={event as unknown as Record<string, unknown>}
          onUpdated={invalidate}
        />
      </section>

      {/* Distribution */}
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-[#CD000E]" />
          <h2 className="text-lg font-semibold text-white">Distribution</h2>
        </div>
        <p className="text-sm text-white/55 mb-4">
          Send invitations as access passes. Followers get an in-app mailbox entry; email invites
          receive a code (no email is sent yet — you can share codes manually).
        </p>

        {ticketTypes.length === 0 ? (
          <p className="text-sm text-amber-400/90">
            Add at least one ticket type above before sending invites.
          </p>
        ) : (
          <div className="space-y-6 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">
                Ticket type for invites
              </label>
              <select
                value={ticketTypeId}
                onChange={e => setTicketTypeId(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white"
              >
                {ticketTypes.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-start">
              <button
                type="button"
                disabled={inviteMutation.isPending || !ticketTypeId}
                onClick={handleInviteFollowers}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#CD000E] text-white rounded-lg hover:bg-[#860005] disabled:opacity-50 text-sm font-medium"
              >
                {inviteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Users className="w-4 h-4" />
                )}
                {inviteMutation.isPending ? "Sending…" : "Invite followers"}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Email invites</label>
              <p className="text-xs text-white/45 mb-2">
                Separate addresses with commas, spaces, or new lines.
              </p>
              <textarea
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                rows={3}
                placeholder="fan@example.com, another@example.com"
                className="w-full px-3 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white text-sm placeholder:text-white/30"
              />
              <button
                type="button"
                disabled={inviteMutation.isPending || !ticketTypeId}
                onClick={handleEmailInvites}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 border border-gray-600 text-white rounded-lg hover:bg-white/5 disabled:opacity-50 text-sm font-medium"
              >
                {inviteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {inviteMutation.isPending ? "Sending…" : "Send email invites"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Access Overview — placeholder */}
      <section className="rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-6">
        <div className="flex items-center gap-2 mb-2">
          <LayoutDashboard className="w-5 h-5 text-white/40" />
          <h2 className="text-lg font-semibold text-white/80">Access Overview</h2>
        </div>
        <p className="text-sm text-white/45">
          A summary of registrations, passes, and entry rules will appear here.
        </p>
      </section>

      <p className="text-xs text-white/35 flex items-center gap-2">
        <Mail className="w-3.5 h-3.5" />
        Automated email delivery and push notifications are not enabled yet.
      </p>
    </div>
  );
}
