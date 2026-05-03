import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation/Navigation";
import { Footer } from "@/components/Footer";
import { Ticket, Loader2, CalendarDays, ArrowRight, Radio } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ticketsService } from "@/services/tickets.service";
import { EventCard } from "@/components/events/EventCard";

function statusBadge(status: "UPCOMING" | "LIVE" | "ENDED") {
  if (status === "LIVE") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#CD000E] text-white text-xs font-semibold">
        <Radio className="w-3 h-3" aria-hidden /> Live
      </span>
    );
  }
  if (status === "ENDED") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 text-xs font-semibold">
        Ended
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-300 text-xs font-semibold">
      Upcoming
    </span>
  );
}

export function TicketsPage() {
  const {
    data: ticketsData,
    isLoading: ticketsLoading,
    error: ticketsError,
  } = useQuery({
    queryKey: ["tickets", "my"],
    queryFn: () => ticketsService.getMyTickets(),
  });

  const { data: passData, isLoading: passLoading } = useQuery({
    queryKey: ["me", "tickets"],
    queryFn: () => ticketsService.getMyAccessPassTickets(),
  });

  const tickets = ticketsData?.tickets ?? [];
  const accessPasses = passData?.tickets ?? [];
  const isLoading = ticketsLoading || passLoading;

  return (
    <div className="min-h-screen bg-black text-white pt-20 md:pt-24">
      <Navigation />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
          <Ticket className="w-7 h-7 text-[#CD000E]" aria-hidden />
          My Tickets
        </h1>
        <p className="text-white/50 mb-8 text-sm">
          Your event tickets and invitations. Return to any event page when the stream is live.
        </p>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-[#CD000E]" aria-hidden />
          </div>
        )}

        {ticketsError && (
          <div className="rounded-lg border border-red-800 bg-red-900/20 p-4 text-red-300 text-sm mb-6">
            Failed to load tickets. Please try again.
          </div>
        )}

        {!isLoading && tickets.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">
              Active Tickets
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {tickets.map(ticket => {
                const eventStarted = new Date(ticket.startTime).getTime() <= Date.now();
                return (
                  <EventCard
                    key={ticket.id}
                    eventId={ticket.eventId}
                    eventName={ticket.eventName}
                    entityName={ticket.entityName ?? "Event"}
                    startTime={ticket.startTime}
                    thumbnail={ticket.thumbnail}
                    isLive={eventStarted}
                    watchTicketId={ticket.id}
                    watchButtonLabel="Watch Event"
                  />
                );
              })}
            </div>
          </section>
        )}

        {!isLoading && accessPasses.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">
              Invitations &amp; Access Passes
            </h2>
            <div className="space-y-3">
              {accessPasses.map(pass => (
                <div
                  key={pass.accessPassId}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{pass.eventTitle}</p>
                    <p className="text-white/45 text-sm flex items-center gap-1.5 mt-0.5">
                      <CalendarDays className="w-3.5 h-3.5 shrink-0" aria-hidden />
                      {new Date(pass.startTime).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {statusBadge(pass.status)}
                    <Link
                      to={`/events/${pass.eventId}`}
                      className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white transition-colors"
                    >
                      Go to event
                      <ArrowRight className="w-4 h-4" aria-hidden />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!isLoading && tickets.length === 0 && accessPasses.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-12 text-center">
            <Ticket className="w-10 h-10 mx-auto mb-4 text-white/20" aria-hidden />
            <p className="text-white/50 mb-5">You don&apos;t have any tickets yet.</p>
            <Link
              to="/events"
              className="inline-block px-4 py-2 bg-[#CD000E] hover:bg-[#860005] text-white text-sm font-medium rounded-lg transition"
            >
              Explore events
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
