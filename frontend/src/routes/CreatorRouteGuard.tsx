import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { isCreatorForRouting } from "@/utils/creator";

/**
 * Guard for /creator/* routes.
 * Unauthenticated → /login. Authenticated viewer → /home. Creator → rewrite to /studio/*.
 */
export function CreatorRouteGuard() {
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0B0B]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!isCreatorForRouting(user)) {
    return <Navigate to="/home" replace />;
  }

  const studioPath =
    location.pathname.replace(/^\/creator/, "/studio") +
    (location.search ?? "") +
    (location.hash ?? "");
  return <Navigate to={studioPath} replace />;
}
