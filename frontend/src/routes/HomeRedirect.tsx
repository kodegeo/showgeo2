import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { isCreatorForRouting } from "@/utils/creator";

/**
 * /home – role-based redirect (no UI).
 * Unauthenticated → /. Creator → /creator/events. Viewer → /profile.
 */
export function HomeRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0B0B]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  if (isCreatorForRouting(user)) {
    return <Navigate to="/creator/events" replace />;
  }

  return <Navigate to="/profile" replace />;
}
