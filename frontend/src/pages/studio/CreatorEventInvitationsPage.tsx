import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEvent } from "@/hooks/useEvents";
import { registrationsService } from "@/services";
import type { InvitationRow, SearchUserItem } from "@/services/registrations.service";
import { useState } from "react";
import { Users, Mail, Copy, Search, Loader2, UserPlus, KeyRound, Send } from "lucide-react";

/**
 * Legacy invitations UI (lists `event_registrations`, POST …/invitations, user search).
 * Access passes & ticket-type invites: use `/studio/events/:id/manage?tab=audience` and `eventsService` only.
 */
export function CreatorEventInvitationsPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: event, isLoading: eventLoading } = useEvent(eventId!);

  const { data: invitationsData, isLoading: listLoading } = useQuery({
    queryKey: ["event-invitations", eventId],
    queryFn: () => registrationsService.listInvitations(eventId!),
    enabled: !!eventId,
  });

  const { data: accessCodeData, refetch: refetchAccessCode } = useQuery({
    queryKey: ["event-access-code", eventId],
    queryFn: () => registrationsService.getEventAccessCode(eventId!),
    enabled: !!eventId,
  });

  const [emailInput, setEmailInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUserItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [copied, setCopied] = useState(false);

  const inviteAllFollowers = useMutation({
    mutationFn: () =>
      registrationsService.sendInvitations(eventId!, { audience: "FOLLOWERS", invitees: [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-invitations", eventId] });
    },
  });

  const inviteByEmail = useMutation({
    mutationFn: (email: string) =>
      registrationsService.sendInvitations(eventId!, {
        invitees: [{ email: email.trim() }],
      }),
    onSuccess: () => {
      setEmailInput("");
      queryClient.invalidateQueries({ queryKey: ["event-invitations", eventId] });
    },
  });

  const inviteUser = useMutation({
    mutationFn: (userId: string) =>
      registrationsService.sendInvitations(eventId!, {
        invitees: [{ userId }],
      }),
    onSuccess: () => {
      setSearchQuery("");
      setSearchResults([]);
      queryClient.invalidateQueries({ queryKey: ["event-invitations", eventId] });
    },
  });

  const invitations: InvitationRow[] = invitationsData?.invitations ?? [];

  const doSearch = async () => {
    if (!eventId || searchQuery.trim().length < 2) return;
    setSearching(true);
    try {
      const res = await registrationsService.searchUsersToInvite(eventId, searchQuery.trim());
      setSearchResults(res.users);
    } finally {
      setSearching(false);
    }
  };

  const copyAccessCode = () => {
    const code = accessCodeData?.accessCode;
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (eventLoading || !eventId) {
    return <div className="p-6 text-white/60">Loading…</div>;
  }

  if (!event) {
    return (
      <div className="p-6 space-y-2">
        <div className="text-red-400">Event not found.</div>
        <Link to="/studio/events" className="text-[#CD000E] hover:underline">
          Back to events
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-4xl">
      <div className="rounded-lg border border-amber-900/40 bg-amber-950/25 px-4 py-3 text-sm text-amber-100/90">
        <strong className="text-amber-200">Access hub:</strong> For access passes and ticket-type
        distribution, use{" "}
        <Link
          to={`/studio/events/${eventId}/manage?tab=audience`}
          className="text-[#F49600] hover:underline font-medium"
        >
          Studio → Manage → Audience
        </Link>
        . This page uses legacy registration APIs for listing, search, and older flows.
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white uppercase tracking-tight">
            Invitations
          </h1>
          <p className="text-[#9A9A9A] font-body mt-1">{event.name}</p>
        </div>
        <Link to={`/studio/events/${eventId}`} className="text-sm text-white/60 hover:text-white">
          ← Back to event
        </Link>
      </div>

      {/* 1. Invite All Followers */}
      <section className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-heading font-semibold text-white mb-2 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#CD000E]" />
          Invite Followers
        </h2>
        <p className="text-sm text-[#9A9A9A] mb-4">
          Send an invitation to everyone who follows your creator profile.
        </p>
        <button
          type="button"
          onClick={() => inviteAllFollowers.mutate()}
          disabled={inviteAllFollowers.isPending}
          className="px-4 py-2 bg-[#CD000E] hover:bg-[#860005] text-white font-heading font-semibold rounded-lg uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"
        >
          {inviteAllFollowers.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          Invite All Followers
        </button>
        {inviteAllFollowers.isSuccess && (
          <p className="mt-2 text-sm text-green-400">
            Invitations sent. {inviteAllFollowers.data?.created ?? 0} created,{" "}
            {inviteAllFollowers.data?.skipped ?? 0} already invited.
          </p>
        )}
      </section>

      {/* 2. Invite Specific Users */}
      <section className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-heading font-semibold text-white mb-2 flex items-center gap-2">
          <Search className="w-5 h-5 text-[#CD000E]" />
          Invite by User
        </h2>
        <p className="text-sm text-[#9A9A9A] mb-4">
          Search by username or email to invite specific people.
        </p>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doSearch()}
            placeholder="Search users (min 2 characters)"
            className="flex-1 px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:border-[#CD000E] focus:ring-1 focus:ring-[#CD000E]"
          />
          <button
            type="button"
            onClick={doSearch}
            disabled={searchQuery.trim().length < 2 || searching}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {searching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Search
          </button>
        </div>
        {searchResults.length > 0 && (
          <ul className="space-y-2">
            {searchResults.map(u => (
              <li
                key={u.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-900/50 border border-gray-800"
              >
                <span className="text-white font-body">
                  {u.displayName}
                  {u.email && <span className="text-[#9A9A9A] text-sm ml-2">{u.email}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => inviteUser.mutate(u.id)}
                  disabled={inviteUser.isPending}
                  className="px-3 py-1.5 bg-[#CD000E] hover:bg-[#860005] text-white text-sm font-semibold rounded flex items-center gap-1 disabled:opacity-50"
                >
                  {inviteUser.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                  Invite
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 3. Invite by Email */}
      <section className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-heading font-semibold text-white mb-2 flex items-center gap-2">
          <Mail className="w-5 h-5 text-[#CD000E]" />
          Invite by Email
        </h2>
        <p className="text-sm text-[#9A9A9A] mb-4">
          Enter an email address to send an invitation. They will receive a link and optional access
          code.
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            onKeyDown={e =>
              e.key === "Enter" && emailInput.trim() && inviteByEmail.mutate(emailInput)
            }
            placeholder="email@example.com"
            className="flex-1 px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:border-[#CD000E] focus:ring-1 focus:ring-[#CD000E]"
          />
          <button
            type="button"
            onClick={() => emailInput.trim() && inviteByEmail.mutate(emailInput)}
            disabled={!emailInput.trim() || inviteByEmail.isPending}
            className="px-4 py-2 bg-[#CD000E] hover:bg-[#860005] text-white font-heading font-semibold rounded-lg uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"
          >
            {inviteByEmail.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Invite
          </button>
        </div>
        {inviteByEmail.isSuccess && <p className="mt-2 text-sm text-green-400">Invitation sent.</p>}
      </section>

      {/* 4. Access Code */}
      <section className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-heading font-semibold text-white mb-2 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-[#CD000E]" />
          Event Access Code
        </h2>
        <p className="text-sm text-[#9A9A9A] mb-4">
          Share this code with invitees so they can register without an email invite. One code works
          for the event.
        </p>
        <div className="flex items-center gap-3">
          <code className="flex-1 px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white font-mono text-lg">
            {accessCodeData?.accessCode ?? "…"}
          </code>
          <button
            type="button"
            onClick={copyAccessCode}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </section>

      {/* 5. Invitations Table */}
      <section className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg overflow-hidden">
        <h2 className="text-lg font-heading font-semibold text-white p-6 pb-2">Invitations</h2>
        <p className="text-sm text-[#9A9A9A] px-6 pb-4">Invited users and their status.</p>
        {listLoading ? (
          <div className="p-8 text-center text-[#9A9A9A] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading…
          </div>
        ) : invitations.length === 0 ? (
          <div className="p-8 text-center text-[#9A9A9A]">
            No invitations yet. Use the options above to invite followers or specific users.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-t border-b border-gray-800 bg-gray-900/50">
                  <th className="px-6 py-3 text-xs font-heading font-semibold text-[#9A9A9A] uppercase tracking-wider">
                    User / Email
                  </th>
                  <th className="px-6 py-3 text-xs font-heading font-semibold text-[#9A9A9A] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-heading font-semibold text-[#9A9A9A] uppercase tracking-wider">
                    Invited
                  </th>
                </tr>
              </thead>
              <tbody>
                {invitations.map(inv => (
                  <tr key={inv.id} className="border-b border-gray-800/50">
                    <td className="px-6 py-3 text-white font-body">
                      {inv.displayName ?? inv.email ?? inv.userId ?? "—"}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex px-2 py-1 rounded text-xs font-heading font-semibold uppercase ${
                          inv.status === "REGISTERED"
                            ? "bg-green-900/40 text-green-300 border border-green-800/50"
                            : inv.status === "CANCELLED"
                            ? "bg-gray-800 text-gray-400 border border-gray-700"
                            : "bg-amber-900/40 text-amber-300 border border-amber-800/50"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-[#9A9A9A] text-sm">
                      {inv.createdAt ? new Date(inv.createdAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
