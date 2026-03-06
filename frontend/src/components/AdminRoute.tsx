import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/LoadingScreen";
import { UserRole } from "../../../packages/shared/types";

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * AdminRoute - Route guard for SHOWGEO ADMIN / SUPERUSER access only
 * 
 * IMPORTANT: Authorization is based on app_users.role from the database,
 * NOT Supabase session metadata. The user object comes from /auth/me
 * which returns the Prisma app_users record.
 * 
 * Rules:
 * - Only app_users.role === ADMIN may access /admin/* routes
 * - ENTITY, MANAGER, COORDINATOR, USER must NOT access /admin/*
 * - No entity context required
 * - No creator logic required
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  // 1) Auth is loading OR user data is not yet loaded → show LoadingScreen
  // We need to wait for both authentication state AND user data from app_users
  if (authLoading || (isAuthenticated && !user)) {
    return <LoadingScreen message="Loading authentication…" />;
  }

  // 2) Not authenticated → redirect /
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // 3) User data loaded but role !== ADMIN (from app_users.role) → redirect /profile
  // The user object comes from /auth/me which returns the Prisma app_users record
  // This ensures we're checking app_users.role, not Supabase session metadata
  if (!user || user.role !== UserRole.ADMIN) {
    console.warn(
      `[AdminRoute] User ${user?.id || "unknown"} (${user?.email || "unknown"}) with role ${user?.role || "unknown"} attempted to access admin route. Redirecting to /profile.`
    );
    return <Navigate to="/profile" replace />;
  }

  // 4) Authenticated + app_users.role === ADMIN → allow access
  return <>{children}</>;
}

