import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, MapPin, Heart, UserPlus, Bell, Ticket } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { eventsService } from "@/services/events.service";
import { followService } from "@/services/follow.service";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";

export function EventLandingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [followingCreator, setFollowingCreator] = useState(false);
  const [notify, setNotify] = useState(false);
  const [actionLoading, setActionLoading] = useState<"like" | "follow" | "notify" | null>(null);

  const isLoggedIn = !!user;

  const { data: event, isLoading, error } = useQuery({
    queryKey: ["event", id],
    queryFn: () => eventsService.getById(id!),
    enabled: !!id,
  });

  const entity = event && (event as any).entities_events_entityIdToentities
    ? (event as any).entities_events_entityIdToentities
    : event && (event as any).entity
      ? (event as any).entity
      : null;
  const creatorSlug = entity?.slug ?? "";
  const creatorId = event?.entityId ?? "";
  const creatorName = entity?.name ?? "Creator";
  const creatorThumbnail = entity?.thumbnail ?? null;

  const { data: eventStatus } = useQuery({
    queryKey: ["follow", "event", id],
    queryFn: () => followService.getEventFollowStatus(id!),
    enabled: isLoggedIn && !!id,
    staleTime: 60_000,
  });
  const { data: entityFollowing } = useQuery({
    queryKey: ["follow", "entity", creatorId],
    queryFn: () => followService.isFollowing(creatorId),
    enabled: isLoggedIn && !!creatorId,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (eventStatus) {
      setLiked(eventStatus.isFollowing);
      setNotify(eventStatus.notify ?? false);
    }
  }, [eventStatus]);
  useEffect(() => {
    if (entityFollowing !== undefined) setFollowingCreator(entityFollowing);
  }, [entityFollowing]);

  const [searchParams, setSearchParams] = useSearchParams();
  const codeFromUrl = searchParams.get("code") ?? "";
  const [inviteCodeField, setInviteCodeField] = useState(codeFromUrl);
  const [submittedInviteCode, setSubmittedInviteCode] = useState(codeFromUrl);
  const [ticketActionId, setTicketActionId] = useState<string | null>(null);

  useEffect(() => {
    setInviteCodeField(codeFromUrl);
    setSubmittedInviteCode(codeFromUrl);
  }, [codeFromUrl, id]);

  const { data: accessStatus, isLoading: accessLoading } = useQuery({
    queryKey: ["event-access-status", id, submittedInviteCode, user?.id ?? "anon"],
    queryFn: () =>
      eventsService.getAccessStatus(id!, {
        inviteCode: submittedInviteCode.trim() || undefined,
      }),
    enabled: !!id && !!event?.ticketRequired,
  });

  useEffect(() => {
    if (searchParams.get("payment") !== "success") return;
    toast.success("Payment complete — refreshing your access.");
    void queryClient.invalidateQueries({ queryKey: ["event-access-status", id] });
    const next = new URLSearchParams(searchParams);
    next.delete("payment");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, id, queryClient]);

  const effectivePassId =
    accessStatus?.claimedAccessPassId ?? accessStatus?.resolvedAccessPassIdFromCode ?? undefined;

  const codeForRegistration =
    submittedInviteCode.trim() || accessStatus?.accessCode?.trim() || undefined;

  const goToLoginForTickets = () => {
    const returnPath = `${window.location.pathname}${window.location.search}`;
    sessionStorage.setItem("showgeo_return_to", returnPath);
    navigate("/login");
  };

  const handleRegisterFree = async (ticketTypeId: string) => {
    if (!id || !isLoggedIn) return;
    setTicketActionId(ticketTypeId);
    try {
      await eventsService.registerFreeForEvent(id, {
        ticketTypeId,
        accessPassId: effectivePassId,
        accessCode: codeForRegistration,
      });
      toast.success("You're registered — you can watch when the event is live.");
      await queryClient.invalidateQueries({ queryKey: ["event-access-status", id] });
      await queryClient.invalidateQueries({ queryKey: ["event", id] });
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? (Array.isArray(e.response?.data?.message)
            ? e.response?.data?.message[0]
            : e.response?.data?.message) || e.message
        : e instanceof Error
          ? e.message
          : "Could not complete registration.";
      toast.error(String(msg));
    } finally {
      setTicketActionId(null);
    }
  };

  const handleCheckout = async (ticketTypeId: string) => {
    if (!id || !isLoggedIn) return;
    setTicketActionId(ticketTypeId);
    try {
      const res = await eventsService.createEventTicketCheckout(id, {
        ticketTypeId,
        accessPassId: effectivePassId,
        accessCode: codeForRegistration,
      });
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      if (res.message) {
        toast.message(String(res.message), { duration: 10_000 });
      } else {
        toast.error("Checkout is not available. Configure Stripe or use a free tier.");
      }
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? (Array.isArray(e.response?.data?.message)
            ? e.response?.data?.message[0]
            : e.response?.data?.message) || e.message
        : e instanceof Error
          ? e.message
          : "Checkout failed.";
      toast.error(String(msg));
    } finally {
      setTicketActionId(null);
    }
  };

  const handleCreatorClick = () => {
    if (creatorSlug) navigate(`/creators/${creatorSlug}`);
  };

  const toggleLike = async () => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    if (!id) return;
    setActionLoading("like");
    try {
      if (liked) {
        await followService.unfollowEvent(id);
        setLiked(false);
      } else {
        await followService.followEvent(id);
        setLiked(true);
      }
      queryClient.invalidateQueries({ queryKey: ["follow", "event", id] });
    } catch {
      setLiked((v) => !v);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleFollowCreator = async () => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    if (!creatorId) return;
    setActionLoading("follow");
    try {
      if (followingCreator) {
        await followService.unfollowEntity(creatorId);
        setFollowingCreator(false);
      } else {
        await followService.followEntity(creatorId);
        setFollowingCreator(true);
      }
      queryClient.invalidateQueries({ queryKey: ["follow", "entity", creatorId] });
    } catch {
      setFollowingCreator((v) => !v);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleNotify = async () => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    if (!id || !liked) return;
    setActionLoading("notify");
    try {
      await followService.setEventNotify(id, !notify);
      setNotify((v) => !v);
      queryClient.invalidateQueries({ queryKey: ["follow", "event", id] });
    } catch {
      setNotify((v) => !v);
    } finally {
      setActionLoading(null);
    }
  };

  if (!id) {
    navigate("/");
    return null;
  }
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading event...</div>
      </div>
    );
  }
  if (error || !event) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-400">Event not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Thumbnail */}
        {event.thumbnail && (
          <div className="aspect-video rounded-xl overflow-hidden mb-6">
            <img
              src={event.thumbnail}
              alt={event.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <h1 className="text-3xl font-heading font-bold uppercase tracking-tight mb-4">
          {event.name}
        </h1>

        {/* Creator section - click to profile */}
        <button
          type="button"
          onClick={handleCreatorClick}
          className="flex items-center gap-3 mb-6 p-3 rounded-lg hover:bg-white/5 transition-colors text-left w-full"
        >
          {creatorThumbnail ? (
            <img
              src={creatorThumbnail}
              alt=""
              className="w-12 h-12 rounded-full object-cover border border-gray-700"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-lg font-semibold">
              {creatorName[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <span className="text-[#9A9A9A] hover:text-white transition-colors">
            {creatorName}
          </span>
        </button>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mb-6" data-action>
          <button
            type="button"
            aria-label={liked ? "Unlike event" : "Like event"}
            onClick={toggleLike}
            disabled={!!actionLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${liked ? "border-[#CD000E] text-[#CD000E]" : "border-gray-600 text-gray-400 hover:border-white hover:text-white"}`}
          >
            <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
            {liked ? "Liked" : "Like"}
          </button>
          <button
            type="button"
            aria-label={followingCreator ? "Unfollow creator" : "Follow creator"}
            onClick={toggleFollowCreator}
            disabled={!!actionLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${followingCreator ? "border-[#CD000E] text-[#CD000E]" : "border-gray-600 text-gray-400 hover:border-white hover:text-white"}`}
          >
            <UserPlus className={`w-4 h-4 ${followingCreator ? "fill-current" : ""}`} />
            {followingCreator ? "Following" : "Follow creator"}
          </button>
          <button
            type="button"
            aria-label={notify ? "Turn off reminders" : "Get reminders"}
            onClick={toggleNotify}
            disabled={!!actionLoading || !liked}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${notify ? "border-[#F49600] text-[#F49600]" : "border-gray-600 text-gray-400 hover:border-white hover:text-white"} ${!liked ? "opacity-50" : ""}`}
          >
            <Bell className={`w-4 h-4 ${notify ? "fill-current" : ""}`} />
            {notify ? "Reminders on" : "Remind me"}
          </button>
        </div>

        {event.description && (
          <p className="text-gray-300 leading-relaxed mb-6 whitespace-pre-wrap">
            {event.description}
          </p>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-[#9A9A9A] mb-6">
          {event.startTime && (
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date(event.startTime).toLocaleString()}
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {event.location}
            </span>
          )}
          <span
            className={`px-2 py-1 rounded-full font-semibold uppercase ${
              event.status === "LIVE"
                ? "bg-[#CD000E] text-white"
                : event.status === "SCHEDULED"
                  ? "bg-[#F49600] text-white"
                  : "bg-gray-700 text-white"
            }`}
          >
            {event.status}
          </span>
        </div>

        {event.ticketRequired && (
          <div className="border border-gray-800 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-[#CD000E]" />
              <h2 className="text-lg font-semibold">Tickets &amp; registration</h2>
            </div>
            <p className="text-gray-400 text-sm">
              This event requires a ticket. Register below, or open the invitation in your inbox and use
              the Register link (it may include an access code in the URL).
            </p>

            {accessLoading ? (
              <p className="text-gray-500 text-sm">Loading ticket options…</p>
            ) : accessStatus?.hasAccess && accessStatus?.hasTicket ? (
              <div className="rounded-lg bg-green-950/40 border border-green-800/50 p-4 space-y-3">
                <p className="text-green-200 text-sm font-medium">You have an active ticket for this event.</p>
                <Link
                  to={
                    accessStatus?.activeTicketId
                      ? `/events/${id}/live?ticketId=${encodeURIComponent(accessStatus.activeTicketId)}`
                      : `/events/${id}/live`
                  }
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#CD000E] text-white font-semibold hover:bg-[#860005] transition-colors"
                >
                  Watch live
                </Link>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label htmlFor="invite-code" className="text-xs text-gray-500 uppercase tracking-wide">
                    Invite / access code (optional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      id="invite-code"
                      type="text"
                      value={inviteCodeField}
                      onChange={(e) => setInviteCodeField(e.target.value)}
                      placeholder="Paste code from your email"
                      className="flex-1 min-w-[200px] bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#CD000E]/40"
                    />
                    <button
                      type="button"
                      onClick={() => setSubmittedInviteCode(inviteCodeField.trim())}
                      className="px-4 py-2 rounded-lg border border-gray-600 text-sm text-white hover:bg-white/5"
                    >
                      Apply code
                    </button>
                  </div>
                  {accessStatus?.inviteCodeStatus === "valid" && (
                    <p className="text-green-400 text-xs">Invite code applied.</p>
                  )}
                  {accessStatus?.inviteCodeStatus === "invalid" && (
                    <p className="text-red-400 text-xs">That code is not valid for this event.</p>
                  )}
                  {accessStatus?.inviteCodeStatus === "used" && (
                    <p className="text-amber-400 text-xs">This code was already used.</p>
                  )}
                </div>

                {!isLoggedIn ? (
                  <div className="rounded-lg bg-white/5 border border-gray-800 p-4 space-y-3">
                    <p className="text-gray-300 text-sm">Sign in to claim or purchase a ticket.</p>
                    <button
                      type="button"
                      onClick={goToLoginForTickets}
                      className="px-4 py-2 rounded-lg bg-[#CD000E] text-white font-semibold hover:bg-[#860005] transition-colors"
                    >
                      Sign in to continue
                    </button>
                  </div>
                ) : !accessStatus?.availableTicketTypes?.length ? (
                  <p className="text-amber-400 text-sm">
                    No ticket types are configured yet. Check back later or contact the host.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {accessStatus.availableTicketTypes.map((tt) => {
                      const price = Number(tt.price ?? 0);
                      const isFree = price <= 0;
                      const needsInvite = !!tt.requires_invite;
                      const hasPass = !!effectivePassId;
                      const blocked = needsInvite && !hasPass && accessStatus.inviteCodeStatus !== "valid";
                      const busy = ticketActionId === tt.id;
                      return (
                        <li
                          key={tt.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg bg-white/5 border border-gray-800 p-4"
                        >
                          <div>
                            <p className="font-semibold text-white">{tt.name}</p>
                            <p className="text-sm text-gray-400">
                              {isFree
                                ? "Free"
                                : `${price.toFixed(2)} ${tt.currency || "USD"}`}
                              {needsInvite ? " · Invite only" : ""}
                            </p>
                            {blocked ? (
                              <p className="text-xs text-amber-400 mt-1">
                                Use the access code from your invitation, or Apply code above.
                              </p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            disabled={busy || blocked}
                            onClick={() =>
                              isFree ? void handleRegisterFree(tt.id) : void handleCheckout(tt.id)
                            }
                            className="shrink-0 px-4 py-2 rounded-lg bg-[#CD000E] text-white text-sm font-semibold hover:bg-[#860005] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {busy ? "…" : isFree ? "Register free" : "Purchase"}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
