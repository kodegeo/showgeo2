import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { isCreatorForRouting } from "@/utils/creator";
import { UserRole } from "../../../packages/shared/types";

/**
 * /home – role-based redirect (no UI).
 * Unauthenticated → /. Creators → /creator/events. Staff/admin → studio or admin.
 * Only plain USER fans → /profile (fan hub).
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

  if (user.role === UserRole.ADMIN) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (user.role === UserRole.COORDINATOR || user.role === UserRole.MANAGER) {
    return <Navigate to="/studio/overview" replace />;
  }

  if (isCreatorForRouting(user)) {
    return <Navigate to="/creator/events" replace />;
  }

  return <Navigate to="/profile" replace />;
}
