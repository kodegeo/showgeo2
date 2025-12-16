import { useEffect, useState } from "react";

import { useParams } from "react-router-dom";
import { EventPhase } from "@shared/types";
import { useEvent } from "@/hooks/useEvents";

export default function EventLivePage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { data: event, isLoading } = useEvent(eventId!);

  const [countdown, setCountdown] = useState<string | null>(null);
  
  useEffect(() => {
    // 🔒 Guard: event may be undefined when hooks run
    if (!event || !event.startTime || event.phase !== EventPhase.PRE_LIVE) {
      setCountdown(null);
      return;
    }
  
    const updateCountdown = () => {
      setCountdown(getTimeRemaining(event.startTime!));
    };
  
    updateCountdown(); // run immediately
  
    const interval = setInterval(updateCountdown, 1000);
  
    return () => clearInterval(interval);
  }, [event?.startTime, event?.phase]);

  if (isLoading) {
    return <div className="p-6 text-white">Loading event…</div>;
  }

  if (!event) {
    return <div className="p-6 text-red-400">Event not found</div>;
  }

  function getTimeRemaining(startTime: string) {
    const diff = new Date(startTime).getTime() - Date.now();
    if (diff <= 0) return null;
  
    const minutes = Math.floor(diff / 1000 / 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return `${minutes}m ${seconds}s`;
  }
  

  // 🌍 Geo restriction guard
  if (event.geoRestricted) {
    const userCountry = "US";
    const allowed = event.geoRegions?.includes(userCountry);

    if (!allowed) {
      return (
        <div className="p-6 text-white">
          <h1 className="text-xl font-heading">{event.name}</h1>
          <p className="text-red-400 mt-2">
            This event is not available in your region.
          </p>
        </div>
      );
    }
  }

  // 🎬 Phase rendering (INSIDE the function)
  switch (event.phase) {
    case EventPhase.PRE_LIVE: {
      const countdown = event.startTime
        ? getTimeRemaining(event.startTime)
        : null;

      return (
        <div className="p-6 text-white space-y-4">
          <h1 className="text-2xl font-heading">{event.name}</h1>
          <p className="text-gray-400">Pre-LIVE</p>

          <div className="rounded-lg border border-gray-800 p-4 space-y-2">
            <p className="text-sm text-gray-400">
              The event will begin soon
            </p>

            {countdown ? (
              <p className="text-xl font-semibold text-[#CD000E]">
                Starts in {countdown}
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                Waiting for coordinator…
              </p>
            )}
          </div>
        </div>
      );
    }

    case EventPhase.LIVE:
      return (
        <div className="p-6 text-white space-y-4">
          <h1 className="text-2xl font-heading">{event.name}</h1>
          <p className="text-red-500 font-semibold uppercase tracking-wider">
            Live Now
          </p>

          <div className="aspect-video bg-black rounded-lg flex items-center justify-center border border-gray-800">
            <span className="text-gray-500">
              Live stream loading…
            </span>
          </div>
        </div>
      );

    case EventPhase.POST_LIVE:
      return (
        <div className="p-6 text-white space-y-4">
          <h1 className="text-2xl font-heading">{event.name}</h1>
          <p className="text-gray-400">Event Ended</p>

          <div className="rounded-lg border border-gray-800 p-4">
            <p className="text-sm text-gray-400">
              Thanks for attending!
            </p>
          </div>
        </div>
      );

    default:
      return (
        <div className="p-6 text-white">
          Event has not started yet.
        </div>
      );
  }
}
