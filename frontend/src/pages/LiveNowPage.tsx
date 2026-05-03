import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { eventsService } from "@/services/events.service";
import type { ProfileEvent } from "@/types/event.types";
import Navigation from "@/components/Navigation/Navigation";
import { Footer } from "@/components/Footer";
import { Radio, Ticket } from "lucide-react";

function formatStartTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function LiveNowPage() {
  const [events, setEvents] = useState<ProfileEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    eventsService
      .getAll({ status: "LIVE", limit: 24, page: 1 })
      .then(res => {
        if (cancelled) return;
        const list = res.data ?? [];
        setEvents(list.filter(e => e.status === "LIVE"));
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pt-20 md:pt-24">
      <Navigation />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <Radio className="w-8 h-8 text-[#CD000E]" aria-hidden />
          Live Now
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Events streaming right now</p>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <p className="text-gray-500 dark:text-gray-400">Loading live events…</p>
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <Radio className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No events are live right now. Check back later or explore upcoming events.</p>
            <Link
              to="/events"
              className="mt-4 inline-block text-[#CD000E] hover:text-[#860005] font-medium"
            >
              Explore events →
            </Link>
          </div>
        )}

        {!loading && events.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {events.map(event => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="group block rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden hover:shadow-lg hover:border-[#CD000E]/30 transition-all duration-200"
              >
                <div className="relative aspect-video bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  {event.thumbnail ? (
                    <img
                      src={event.thumbnail}
                      alt={event.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-400 dark:text-gray-500">
                      {event.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <span className="absolute top-2 left-2 px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                  </span>
                </div>
                <div className="p-4">
                  <h2 className="font-semibold text-gray-900 dark:text-white truncate">
                    {event.name}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Started {formatStartTime(event.startTime)}
                  </p>
                  {event.entity && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-500 truncate">
                      {event.entity.name}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Ticket className="w-3.5 h-3.5" />
                      Watch
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
