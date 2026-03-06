import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireRole?: string[];
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requireRole,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  // Give it a bit more time to avoid race conditions after login
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect unauthenticated users to home (not /login)
  // Only redirect if we're sure the user is not authenticated (not just loading)
  if (requireAuth && !isLoading && !isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Check role requirements
  if (requireRole && user) {
    const userRole = user.role;
    if (!requireRole.includes(userRole)) {
      // User doesn't have required role, redirect to home
      return <Navigate to="/" replace />;
    }
  }

  // Authenticated users: Always render children and let downstream guards (ProfileSetupGuard, StudioRoute) handle routing
  // Do NOT redirect authenticated users to /dashboard or anywhere else
  return <>{children}</>;
}








