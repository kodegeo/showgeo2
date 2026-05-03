import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, Mail, Users, Send, Loader2, Link2, ListChecks } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import type { Event } from "@/types/event.types";
import { eventsService } from "@/services/events.service";
import type { CatalogTicketType } from "@/services/events.service";
import { handleApiError } from "@/services/api";
import { registrationsService } from "@/services/registrations.service";
import "./EventManageAudienceTab.css";

export interface EventManageAudienceTabProps {
  eventId: string;
  event: Event;
}

export type AudienceTicketTypeRow = {
  id: string;
  name: string;
  price: number;
  capacity: number;
};

/** Map GET /events/:id `ticket_types` rows for the invite dropdown. */
function mapDbTicketTypesToRows(rows: CatalogTicketType[]): AudienceTicketTypeRow[] {
  return rows.map(t => ({
    id: t.id,
    name: t.name,
    price: Number(t.price ?? 0),
    capacity: t.capacity ?? 0,
  }));
}

export function EventManageAudienceTab({ eventId, event: _event }: EventManageAudienceTabProps) {
  const queryClient = useQueryClient();

  const [ticketTypeId, setTicketTypeId] = useState("");
  const [emailInput, setEmailInput] = useState("");

  const {
    data: ticketTypesRaw = [],
    isLoading: catalogLoading,
    isError: catalogError,
  } = useQuery({
    queryKey: ["ticket-types", eventId],
    queryFn: async () => {
      const rows = await eventsService.getTicketTypes(eventId);
      if (import.meta.env.DEV) {
        console.log("[EventManageAudienceTab] ticket_types", {
          eventId,
          count: rows.length,
          sample: rows[0],
        });
      }
      return rows;
    },
    enabled: !!eventId,
  });

  const ticketTypes = useMemo(() => mapDbTicketTypesToRows(ticketTypesRaw), [ticketTypesRaw]);
  const hasTickets = ticketTypes.length > 0;

  useEffect(() => {
    if (!hasTickets) {
      if (ticketTypeId) setTicketTypeId("");
      return;
    }
    if (!ticketTypes.some(t => t.id === ticketTypeId)) {
      setTicketTypeId(ticketTypes[0].id);
    }
  }, [hasTickets, ticketTypes, ticketTypeId]);

  const { data: accessCodePayload } = useQuery({
    queryKey: ["event", eventId, "access-code"],
    queryFn: () => eventsService.getEventAccessCode(eventId),
    enabled: !!eventId,
  });

  const {
    data: invitationsData,
    isLoading: invitationsLoading,
    isError: invitationsError,
  } = useQuery({
    queryKey: ["event-audience-invitations", eventId],
    queryFn: () => registrationsService.listInvitations(eventId),
    enabled: !!eventId && hasTickets,
  });

  const invitations = invitationsData?.invitations ?? [];

  const registrationUrl =
    typeof accessCodePayload?.accessCode === "string"
      ? `${window.location.origin}/events/${eventId}?code=${encodeURIComponent(
          accessCodePayload.accessCode,
        )}`
      : null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    queryClient.invalidateQueries({ queryKey: ["ticket-types", eventId] });
  };

  const inviteMutation = useMutation({
    mutationFn: (payload: { type: "FOLLOWERS" | "EMAIL"; emails?: string[] }) => {
      if (payload.type === "FOLLOWERS") {
        return eventsService.inviteFollowers(eventId, {
          ticketTypeId,
        });
      }
      return registrationsService.sendInvitations(eventId, {
        audience: "EMAIL_LIST",
        emails: payload.emails,
        ticketTypeId,
      });
    },
    onSuccess: (data, variables) => {
      toast.success(
        typeof data?.created === "number" ? `Invites sent (${data.created})` : "Invites sent",
      );
      queryClient.invalidateQueries({ queryKey: ["mailbox"] });
      queryClient.invalidateQueries({ queryKey: ["event-audience-invitations", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-invitations", eventId] });
      invalidate();
      if (variables.type === "EMAIL") setEmailInput("");
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

  const copyRegistrationLink = async () => {
    if (!registrationUrl) return;
    try {
      await navigator.clipboard.writeText(registrationUrl);
      toast.success("Registration link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  useEffect(() => {
    if (window.location.hash !== "#invite-audience") return;
    const inviteSection = document.getElementById("invite-audience");
    if (!inviteSection) return;
    inviteSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  if (catalogLoading) {
    return (
      <div className="max-w-2xl rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <p className="text-sm text-white/60">Loading ticket catalog…</p>
      </div>
    );
  }

  if (catalogError) {
    return (
      <div className="max-w-2xl rounded-xl border border-red-500/30 bg-red-950/20 p-6">
        <p className="text-sm text-red-300">Could not load ticket types. Refresh and try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {!hasTickets ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <p className="text-sm text-amber-200/90">
            No <code className="text-white/80">ticket_types</code> rows found for this event. Add
            ticket types under <strong className="text-white/80">Tickets</strong> and save so they
            are stored in the catalog.
          </p>
          <Link
            to={`/studio/events/${eventId}/manage?tab=tickets`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#CD000E] text-white rounded-lg hover:bg-[#860005] text-sm font-medium"
          >
            Go to Tickets
          </Link>
        </div>
      ) : (
        <>
          <section
            id="invite-audience"
            className="rounded-xl border border-white/10 bg-white/[0.03] p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-[#CD000E]" />
              <h2 className="text-lg font-semibold text-white">Distribution</h2>
            </div>
            <p className="text-sm text-white/55 mb-4">
              Send invitations as access passes. Followers get an in-app mailbox entry; email
              invites receive a code (you can share codes manually).
            </p>

            <div className="space-y-6">
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
                      {t.price > 0 ? ` · $${t.price}` : " · Free"}
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
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Email invites
                </label>
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
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center gap-2 mb-2">
              <ListChecks className="w-5 h-5 text-[#CD000E]" />
              <h2 className="text-lg font-semibold text-white">Invitations</h2>
            </div>
            <p className="text-sm text-white/55 mb-4">
              Delivery status for invites sent from this event (in-app message or mailbox).
            </p>
            {invitationsLoading ? (
              <div className="flex items-center gap-2 text-sm text-white/50 py-6">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading invitations…
              </div>
            ) : invitationsError ? (
              <p className="text-sm text-red-300/90 py-2">Could not load invitations.</p>
            ) : invitations.length === 0 ? (
              <p className="text-sm text-white/45 py-2">
                No invitations yet. Use the actions above to invite followers or emails.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.04]">
                      <th className="px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">
                        User / email
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">
                        Invited
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map(item => {
                      return (
                        <tr key={item.id} className="border-b border-white/5 last:border-0">
                          <td className="px-4 py-3 text-white/90">
                            {item.displayName ?? item.email ?? item.userId ?? "—"}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <span className={`status-badge ${item.status.toLowerCase()}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white/50 whitespace-nowrap">
                            {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-5 h-5 text-[#CD000E]" />
              <h2 className="text-lg font-semibold text-white">Registration link</h2>
            </div>
            <p className="text-sm text-white/55 mb-3">
              Share this link so people can register with your event access code.
            </p>
            {registrationUrl ? (
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <code className="flex-1 text-xs text-white/80 break-all rounded-lg bg-black/40 border border-white/10 px-3 py-2">
                  {registrationUrl}
                </code>
                <button
                  type="button"
                  onClick={copyRegistrationLink}
                  className="shrink-0 px-4 py-2 border border-gray-600 text-white rounded-lg hover:bg-white/5 text-sm"
                >
                  Copy link
                </button>
              </div>
            ) : (
              <p className="text-sm text-white/45">Loading access code…</p>
            )}
          </section>

          <p className="text-xs text-white/35 flex items-center gap-2">
            <Mail className="w-3.5 h-3.5" />
            Automated email delivery is not enabled yet.
          </p>
        </>
      )}
    </div>
  );
}
