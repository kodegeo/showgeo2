import { Link, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation/Navigation";

/**
 * Shown when user cancels Stripe checkout.
 */
export function PaymentCancelPage() {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get("eventId");

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pt-20 md:pt-24">
      <Navigation />
      <main className="max-w-lg mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Checkout cancelled
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          You can try again from the event page or browse other events.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {eventId && (
            <Link
              to={`/events/${eventId}`}
              className="px-4 py-2 rounded-lg bg-[#CD000E] text-white font-medium hover:bg-[#860005] transition"
            >
              Back to event
            </Link>
          )}
          <Link
            to="/events"
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            Explore events
          </Link>
        </div>
      </main>
    </div>
  );
}
