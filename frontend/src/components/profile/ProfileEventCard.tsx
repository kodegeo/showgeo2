// components/profile/ProfileEventCard.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, MapPin, Bookmark, Bell } from "lucide-react";
import { getAuthToken } from "@/lib/supabase";
import type { ProfileEvent } from "../../../../packages/shared/types/event.views";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface Props {
  event: ProfileEvent & { entityId?: string; entityName?: string };
}

export function ProfileEventCard({ event }: Props) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [notify, setNotify] = useState(false);
  const [loading, setLoading] = useState(false);

  const entityId = event.entity?.id ?? event.entityId;
  const entityName = event.entity?.name ?? event.entityName ?? "Creator";

  const fetchEventFollowStatus = async () => {
    const token = await getAuthToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/follow/event/status/${event.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      setIsFollowing(!!data.isFollowing);
      setNotify(data.notify ?? false);
    } catch (err) {
      console.error("Fetch event follow status error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventFollowStatus();
  }, [event.id]);

  const handleLike = () => {
    setLiked((prev) => !prev);
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const token = await getAuthToken();
    if (!token) {
      console.error("Follow: Missing Authorization (no Supabase session)");
      return;
    }
    try {
      if (isFollowing) {
        await fetch(`${API}/api/follow/event/${event.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        setIsFollowing(false);
        setNotify(false);
      } else {
        await fetch(`${API}/api/follow/event/${event.id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });
        setIsFollowing(true);
      }
    } catch (err) {
      console.error("Follow error", err);
    }
  };

  const handleNotify = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isFollowing) return;
    const token = await getAuthToken();
    if (!token) {
      console.error("Notify: Missing Authorization (no Supabase session)");
      return;
    }
    try {
      const nextNotify = !notify;
      const res = await fetch(`${API}/api/follow/event/${event.id}/notify`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notify: nextNotify }),
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotify(data.notify ?? nextNotify);
    } catch (err) {
      console.error("Notify error", err);
    }
  };

  const goToEvent = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/events/${event.id}`);
  };

  const goToCreator = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (entityId) navigate(`/creators/${entityId}`);
  };

  return (
    <div className="block rounded-lg overflow-hidden bg-white/5 hover:bg-white/10 transition">
      <div
        className="cursor-pointer"
        onClick={goToEvent}
        onKeyDown={(e) => e.key === "Enter" && goToEvent(e as unknown as React.MouseEvent)}
        role="button"
        tabIndex={0}
      >
        <div className="aspect-video bg-black/40">
          {event.thumbnail ? (
            <img
              src={event.thumbnail}
              alt={event.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/30">
              No Image
            </div>
          )}
        </div>

        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-white truncate">{event.name}</h3>

          {entityId && (
            <span
              className="creator-link text-sm text-white/70"
              onClick={goToCreator}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && goToCreator(e as unknown as React.MouseEvent)}
            >
              {entityName}
            </span>
          )}

          <div className="text-xs text-white/50">Status: {event.status}</div>

          <div className="flex flex-col gap-1 text-sm text-white/50">
            <div className="flex items-center gap-2">
              <Calendar size={14} />
              {new Date(event.startTime).toLocaleString()}
            </div>

            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin size={14} />
                {event.location}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4" onClick={(e) => e.stopPropagation()}>
        <div className="event-actions">
          <button type="button" onClick={handleLike} className={liked ? "active" : ""} aria-label="Like event">
            ❤️
          </button>
          <button
            type="button"
            onClick={handleFollow}
            disabled={loading}
            className={isFollowing ? "event-actions__follow--active" : ""}
            aria-label={isFollowing ? "Unfollow event" : "Follow event"}
          >
            <Bookmark size={18} strokeWidth={1.5} fill={isFollowing ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            onClick={handleNotify}
            disabled={!isFollowing || loading}
            className={notify ? "event-actions__notify--active" : ""}
            aria-label={notify ? "Notifications on" : "Notifications off"}
          >
            <Bell size={18} strokeWidth={1.5} fill={notify ? "currentColor" : "none"} />
          </button>
          <button type="button" onClick={goToEvent} aria-label="Event landing page">
            🎟
          </button>
        </div>
      </div>
    </div>
  );
}
