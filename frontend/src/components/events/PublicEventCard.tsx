import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Heart, UserPlus, Bell } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { followService } from "@/services/follow.service";
import { useAuth } from "@/hooks/useAuth";
import type { Event } from "@/types/event.types";

export interface PublicEventCardProps {
  event: Event | { id: string; name: string; startTime: string; status: string; thumbnail?: string | null; location?: string | null; description?: string; entityId: string };
  /** Creator (entity) slug for link to profile */
  creatorSlug: string;
  /** Creator entity id for follow entity API */
  creatorId: string;
  creatorName?: string;
  creatorThumbnail?: string | null;
}

export function PublicEventCard({
  event,
  creatorSlug,
  creatorId,
  creatorName,
  creatorThumbnail,
}: PublicEventCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(false);
  const [followingCreator, setFollowingCreator] = useState(false);
  const [notify, setNotify] = useState(false);
  const [actionLoading, setActionLoading] = useState<"like" | "follow" | "notify" | null>(null);

  const isLoggedIn = !!user;

  const { data: eventStatus } = useQuery({
    queryKey: ["follow", "event", event.id],
    queryFn: () => followService.getEventFollowStatus(event.id),
    enabled: isLoggedIn,
    staleTime: 60_000,
  });
  const { data: entityFollowing } = useQuery({
    queryKey: ["follow", "entity", creatorId],
    queryFn: () => followService.isFollowing(creatorId),
    enabled: isLoggedIn,
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

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-action]")) return;
    navigate(`/events/${event.id}`);
  };

  const handleCreatorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/creators/${creatorSlug}`);
  };

  const toggleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    setActionLoading("like");
    try {
      if (liked) {
        await followService.unfollowEvent(event.id);
        setLiked(false);
      } else {
        await followService.followEvent(event.id);
        setLiked(true);
      }
      queryClient.invalidateQueries({ queryKey: ["follow", "event", event.id] });
    } catch {
      // revert optimistic
      setLiked((v) => !v);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleFollowCreator = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
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

  const toggleNotify = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    if (!liked) return; // follow event first
    setActionLoading("notify");
    try {
      await followService.setEventNotify(event.id, !notify);
      setNotify((v) => !v);
      queryClient.invalidateQueries({ queryKey: ["follow", "event", event.id] });
    } catch {
      setNotify((v) => !v);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => e.key === "Enter" && handleCardClick(e as unknown as React.MouseEvent)}
      className="group block bg-[#0B0B0B] border border-gray-800 rounded-lg overflow-hidden hover:border-[#CD000E] transition-all duration-300 cursor-pointer"
    >
      {/* Thumbnail + content */}
      {event.thumbnail && (
        <div className="aspect-video overflow-hidden">
          <img
            src={event.thumbnail}
            alt={event.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      <div className="p-4">
        <h3 className="text-lg font-heading font-bold text-white mb-2 uppercase tracking-tighter line-clamp-2">
          {event.name}
        </h3>

        {/* Creator row - separate click target to profile */}
        <button
          type="button"
          data-action
          onClick={handleCreatorClick}
          className="flex items-center gap-2 mb-3 w-full text-left hover:opacity-90"
        >
          {creatorThumbnail ? (
            <img
              src={creatorThumbnail}
              alt=""
              className="w-8 h-8 rounded-full object-cover border border-gray-700"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm font-semibold">
              {(creatorName || "?")[0].toUpperCase()}
            </div>
          )}
          <span className="text-sm text-[#9A9A9A] font-body hover:text-white transition-colors">
            {creatorName || "Creator"}
          </span>
        </button>

        {"description" in event && event.description && (
          <p className="text-sm text-[#9A9A9A] font-body line-clamp-2 mb-3">
            {event.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs mb-3">
          {event.startTime && (
            <span className="text-[#9A9A9A] font-body flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(event.startTime).toLocaleDateString()}
            </span>
          )}
          <span
            className={`px-2 py-1 rounded-full font-heading font-semibold uppercase tracking-wider ${
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

        {/* Action icons */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-800" data-action>
          <button
            type="button"
            aria-label={liked ? "Unlike event" : "Like event"}
            onClick={toggleLike}
            disabled={!!actionLoading}
            className={`p-2 rounded-lg transition-colors ${liked ? "text-[#CD000E]" : "text-[#9A9A9A] hover:text-white"}`}
          >
            <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
          </button>
          <button
            type="button"
            aria-label={followingCreator ? "Unfollow creator" : "Follow creator"}
            onClick={toggleFollowCreator}
            disabled={!!actionLoading}
            className={`p-2 rounded-lg transition-colors ${followingCreator ? "text-[#CD000E]" : "text-[#9A9A9A] hover:text-white"}`}
          >
            <UserPlus className={`w-4 h-4 ${followingCreator ? "fill-current" : ""}`} />
          </button>
          <button
            type="button"
            aria-label={notify ? "Turn off reminders" : "Get reminders"}
            onClick={toggleNotify}
            disabled={!!actionLoading || !liked}
            className={`p-2 rounded-lg transition-colors ${notify ? "text-[#F49600]" : "text-[#9A9A9A] hover:text-white"} ${!liked ? "opacity-50" : ""}`}
          >
            <Bell className={`w-4 h-4 ${notify ? "fill-current" : ""}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
