import { Link, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation/Navigation";
import { CheckCircle } from "lucide-react";

/**
 * Shown after successful Stripe checkout.
 * Query: session_id (Stripe), optionally eventId for deep link.
 */
export function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get("eventId");

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pt-20 md:pt-24">
      <Navigation />
      <main className="max-w-lg mx-auto px-4 py-12 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" aria-hidden />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Payment successful
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Your tickets are in your account. You can view them on My Tickets or open the event when
          it&apos;s live.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/tickets"
            className="px-4 py-2 rounded-lg bg-[#CD000E] text-white font-medium hover:bg-[#860005] transition"
          >
            My Tickets
          </Link>
          {eventId && (
            <Link
              to={`/events/${eventId}`}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition"
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
