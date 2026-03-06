import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, Heart, UserPlus, Bell } from "lucide-react";
import { eventsService } from "@/services/events.service";
import { followService } from "@/services/follow.service";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

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
          <div className="border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-2">Tickets</h2>
            <p className="text-gray-400 text-sm mb-4">
              This event requires a ticket. Purchase or validate your ticket to attend.
            </p>
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-[#CD000E] text-white font-semibold hover:bg-[#860005] transition-colors"
            >
              Get tickets (placeholder)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
