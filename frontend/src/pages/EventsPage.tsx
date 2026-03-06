import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiClient } from "@/services/api";
import Navigation from "@/components/Navigation/Navigation";
import { Footer } from "@/components/Footer";
import { Search, ChevronLeft, ChevronRight, Calendar, Ticket } from "lucide-react";

interface EventEntity {
  id: string;
  name: string;
  slug: string;
  thumbnail?: string | null;
}

interface Event {
  id: string;
  name: string;
  description?: string | null;
  thumbnail?: string | null;
  startTime: string;
  location?: string | null;
  isVirtual?: boolean;
  entities_events_entityIdToentities?: EventEntity | null;
  _count?: {
    tickets?: number;
  };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const SORT_OPTIONS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "newest", label: "Newest" },
  { value: "trending", label: "Trending" },
];

function formatStartTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);

  const q = searchParams.get("q") ?? "";
  const virtual = searchParams.get("virtual") ?? "";
  const sort = searchParams.get("sort") ?? "upcoming";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(24, Math.max(1, parseInt(searchParams.get("limit") ?? "12", 10)));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params: Record<string, string | number> = {
      page,
      limit,
      sort: sort || "upcoming",
    };
    if (q.trim()) params.q = q.trim();
    if (virtual === "true") params.virtual = "true";

    const queryString = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString();

    apiClient
      .get<{ data: Event[]; pagination?: Pagination; meta?: Pagination }>(`/events?${queryString}`)
      .then((res) => {
        if (cancelled) return;
        setEvents(res.data.data ?? []);
        setPagination(res.data.pagination ?? res.data.meta ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setEvents([]);
          setPagination(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [q, virtual, sort, page, limit]);

  const updateParams = (updates: Record<string, string | number | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });
    if (!("page" in updates)) {
      next.delete("page");
    }
    setSearchParams(next, { replace: true });
  };

  const setPage = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(Math.max(1, newPage)));
    setSearchParams(next, { replace: true });
  };

  const totalPages = pagination?.totalPages ?? 0;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pt-20 md:pt-24">
      <Navigation />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Events
        </h1>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              placeholder="Search events..."
              value={q}
              onChange={(e) => updateParams({ q: e.target.value || null })}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-red focus:border-transparent"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={virtual === "true"}
              onChange={(e) => updateParams({ virtual: e.target.checked ? "true" : null })}
              className="rounded border-gray-300 text-brand-red focus:ring-brand-red"
            />
            Virtual only
          </label>
          <select
            value={sort}
            onChange={(e) => updateParams({ sort: e.target.value || null })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-red focus:border-transparent"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <p className="text-gray-500 dark:text-gray-400">Loading events...</p>
          </div>
        )}

        {/* Empty */}
        {!loading && events.length === 0 && (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No events found. Try adjusting your filters.</p>
          </div>
        )}

        {/* Grid */}
        {!loading && events.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {events.map((event) => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="group block rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden hover:shadow-lg hover:border-brand-red/30 transition-all duration-200"
                >
                  <div className="aspect-video bg-gray-100 dark:bg-gray-700 overflow-hidden">
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
                  </div>
                  <div className="p-4">
                    <h2 className="font-semibold text-gray-900 dark:text-white truncate">
                      {event.name}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {formatStartTime(event.startTime)}
                    </p>
                    {event.entities_events_entityIdToentities && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-500 truncate">
                        {event.entities_events_entityIdToentities.name}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Ticket className="w-3.5 h-3.5" />
                        {event._count?.tickets ?? 0} tickets
                      </span>
                      {event.isVirtual && (
                        <span className="text-brand-red">Virtual</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination && totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setPage(page - 1)}
                  disabled={!hasPrev}
                  className="inline-flex items-center gap-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(page + 1)}
                  disabled={!hasNext}
                  className="inline-flex items-center gap-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
