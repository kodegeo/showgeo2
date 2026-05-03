import { Navigate, useParams, useSearchParams } from "react-router-dom";

/**
 * Legacy route `/events/:id/register` — redirects to the event landing page (primary registration UX)
 * so access-status, ticket catalog, and Stripe checkout stay unified.
 * Preserves query string (e.g. `?code=` from email invites).
 */
export function EventRegisterPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  if (!eventId) {
    return <Navigate to="/" replace />;
  }

  const qs = searchParams.toString();
  const to = qs ? `/events/${eventId}?${qs}` : `/events/${eventId}`;
  return <Navigate to={to} replace />;
}
