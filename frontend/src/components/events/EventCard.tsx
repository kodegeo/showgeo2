import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "lucide-react";
import { getAuthToken } from "@/lib/supabase";
import type { ProfileEvent } from "../../../../packages/shared/types/event.views";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface EventCardProps {
  event: ProfileEvent & { entityId?: string };
}

export function EventCard({ event }: EventCardProps) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [following, setFollowing] = useState(false);
  const [notifyEnabled, setNotifyEnabled] = useState(false);

  const entityId = event.entity?.id ?? event.entityId;
  const entityName = event.entity?.name ?? "Creator";

  const handleLike = () => setLiked((prev) => !prev);

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!entityId) return;
    const token = await getAuthToken();
    if (!token) {
      console.error("Follow: Missing Authorization (no Supabase session)");
      return;
    }
    try {
      const method = following ? "DELETE" : "POST";
      await fetch(`${API}/api/follow/${entityId}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });
      setFollowing((prev) => !prev);
    } catch (err) {
      console.error("Follow error", err);
    }
  };

  const handleNotify = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const token = await getAuthToken();
    if (!token) {
      console.error("Notify: Missing Authorization (no Supabase session)");
      return;
    }
    try {
      const nextNotify = !notifyEnabled;
      await fetch(`${API}/api/follow/event/${event.id}/notify`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notify: nextNotify }),
        credentials: "include",
      });
      setNotifyEnabled(nextNotify);
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
    <div className="block bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6 hover:border-[#CD000E]/50 transition-colors">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-xl font-heading font-semibold text-white mb-2 uppercase tracking-tight line-clamp-2">
          {event.name}
        </h3>

        {entityId && (
          <span
            className="creator-link text-sm text-[#9A9A9A] font-body cursor-pointer"
            onClick={goToCreator}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && goToCreator(e as unknown as React.MouseEvent)}
          >
            {entityName}
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-[#9A9A9A] font-body">
          <Calendar className="w-4 h-4" />
          <span>{new Date(event.startTime).toLocaleDateString()}</span>
        </div>

        <span
          className={`
            inline-block px-2 py-1 rounded text-xs font-heading font-semibold uppercase tracking-wider
            ${
              event.status === "LIVE"
                ? "bg-green-900/30 text-green-300"
                : event.status === "COMPLETED"
                ? "bg-gray-800 text-gray-400"
                : event.status === "SCHEDULED"
                ? "bg-blue-900/30 text-blue-300"
                : "bg-yellow-900/30 text-yellow-300"
            }
          `}
        >
          {event.status}
        </span>
      </div>

      {/* Action bar */}
      <div className="event-actions">
        <button type="button" onClick={handleLike} className={liked ? "active" : ""} aria-label="Like event">
          ❤️
        </button>
        <button type="button" onClick={handleFollow} className={following ? "active" : ""} aria-label={following ? "Unfollow creator" : "Follow creator"}>
          ➕
        </button>
        <button type="button" onClick={handleNotify} className={notifyEnabled ? "active" : ""} aria-label={notifyEnabled ? "Notifications on" : "Notifications off"}>
          🔔
        </button>
        <button type="button" onClick={goToEvent} aria-label="Event landing page">
          🎟
        </button>
      </div>
    </div>
  );
}
