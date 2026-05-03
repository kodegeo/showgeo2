import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Mail, Link2, Loader2, Copy, Check } from "lucide-react";
import { eventsService } from "@/services/events.service";
import { handleApiError } from "@/services/api";
import { toast } from "sonner";

type Props = {
  eventId: string;
};

/**
 * Event dashboard: invite followers, email list, or copy a shareable registration link.
 * Uses {@link eventsService} for catalog, invites, and access code (no registrationsService).
 */
export function InviteAudienceSection({ eventId }: Props) {
  const queryClient = useQueryClient();
  const [emailText, setEmailText] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [ticketTypeId, setTicketTypeId] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);

  const { data: ticketTypes = [], isLoading: catalogLoading } = useQuery({
    queryKey: ["ticket-types", eventId],
    queryFn: async () => {
      const rows = await eventsService.getTicketTypes(eventId);
      if (import.meta.env.DEV) {
        console.log("[InviteAudienceSection] ticket_types", {
          eventId,
          count: rows.length,
          sample: rows[0],
        });
      }
      return rows;
    },
    enabled: !!eventId,
  });

  useEffect(() => {
    if (ticketTypes.length > 0 && !ticketTypeId) {
      setTicketTypeId(ticketTypes[0].id);
    }
  }, [ticketTypes, ticketTypeId]);

  const inviteMutation = useMutation({
    mutationFn: (payload: { type: "FOLLOWERS" | "EMAIL"; emails?: string[] }) =>
      eventsService.inviteToEvent(eventId, {
        ...payload,
        ticketTypeId,
      }),
    onSuccess: (data, variables) => {
      toast.success(
        typeof data?.created === "number" ? `Invites sent (${data.created})` : "Invites sent",
      );
      queryClient.invalidateQueries({ queryKey: ["mailbox"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-types", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      if (variables.type === "EMAIL") setEmailText("");
    },
    onError: (e: unknown) => toast.error(handleApiError(e)),
  });

  function inviteFollowers() {
    if (!ticketTypeId) {
      toast.error("Add a ticket type on the Access page first, or wait for catalog to load.");
      return;
    }
    inviteMutation.mutate({ type: "FOLLOWERS" });
  }

  function inviteByEmail() {
    const emails = emailText
      .split(/[\s,;]+/)
      .map(s => s.trim())
      .filter(Boolean);
    if (emails.length === 0) {
      toast.error("Enter at least one email address.");
      return;
    }
    if (!ticketTypeId) {
      toast.error("Select a ticket type once catalog is loaded.");
      return;
    }
    inviteMutation.mutate({ type: "EMAIL", emails });
  }

  async function generateShareLink() {
    try {
      setLinkLoading(true);
      const { accessCode } = await eventsService.getEventAccessCode(eventId);
      const base = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${base}/events/${eventId}?code=${encodeURIComponent(accessCode)}`;
      setShareUrl(url);
      toast.success("Share link ready — copy below.");
    } catch (e) {
      toast.error(handleApiError(e));
    } finally {
      setLinkLoading(false);
    }
  }

  async function copyShare() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  const pending = inviteMutation.isPending;

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-4">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        <Users className="w-5 h-5 text-[#CD000E]" />
        Invite audience
      </h2>
      <p className="text-sm text-white/60">
        Invite your followers, add emails, or share a link. Invites create access passes for the
        selected ticket type. For full controls, use{" "}
        <Link
          to={`/studio/events/${eventId}/manage?tab=audience`}
          className="text-[#CD000E] hover:underline"
        >
          Manage
        </Link>
        .
      </p>

      {catalogLoading ? (
        <p className="text-sm text-white/50 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading ticket types…
        </p>
      ) : ticketTypes.length === 0 ? (
        <p className="text-sm text-amber-400/90">
          No <code className="text-white/80">ticket_types</code> rows yet. Add ticket types under
          Studio → Manage → Tickets.
        </p>
      ) : (
        <div className="mb-2">
          <label className="block text-xs font-medium text-white/70 mb-1">
            Ticket type for invites
          </label>
          <select
            value={ticketTypeId}
            onChange={e => setTicketTypeId(e.target.value)}
            className="w-full max-w-md px-3 py-2 rounded-lg bg-[#0B0B0B] border border-white/10 text-white text-sm"
          >
            {ticketTypes.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
                {Number(t.price ?? 0) > 0 ? ` · $${Number(t.price ?? 0)}` : " · Free"}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            type="button"
            onClick={inviteFollowers}
            disabled={pending || !!linkLoading || ticketTypes.length === 0 || !ticketTypeId}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#CD000E] text-white text-sm font-medium hover:bg-[#860005] disabled:opacity-50"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            Invite followers
          </button>
          <span className="text-xs text-white/40">
            Creates access passes for everyone following your creator profile.
          </span>
        </div>

        <div className="border-t border-white/10 pt-3">
          <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
            <Mail className="w-4 h-4" />
            Invite by email
          </label>
          <textarea
            value={emailText}
            onChange={e => setEmailText(e.target.value)}
            placeholder="one@email.com, other@email.com"
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-[#0B0B0B] border border-white/10 text-white text-sm placeholder:text-white/30"
          />
          <button
            type="button"
            onClick={inviteByEmail}
            disabled={pending || !!linkLoading || ticketTypes.length === 0 || !ticketTypeId}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 text-white text-sm hover:bg-white/5 disabled:opacity-50"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Send email invites
          </button>
        </div>

        <div className="border-t border-white/10 pt-3">
          <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
            <Link2 className="w-4 h-4" />
            Share link
          </label>
          <button
            type="button"
            onClick={generateShareLink}
            disabled={!!pending || linkLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 text-white text-sm hover:bg-white/5 disabled:opacity-50"
          >
            {linkLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
            Generate share link
          </button>
          {shareUrl && (
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 rounded-lg bg-[#0B0B0B] border border-white/10 text-white text-xs font-mono"
              />
              <button
                type="button"
                onClick={copyShare}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/15"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}
          <p className="text-xs text-white/40 mt-2">
            Anyone with this link can open registration and use the code from the URL.
          </p>
        </div>
      </div>
    </section>
  );
}
