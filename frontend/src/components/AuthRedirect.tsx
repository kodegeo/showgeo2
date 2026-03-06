import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "../../../packages/shared/types";

/**
 * AuthRedirect - Centralized post-authentication redirect handler
 * 
 * This component handles role-based redirects after successful authentication.
 * It is intentionally separate from route guards (AdminRoute, CreatorRoute) to
 * avoid redirect loops and provide a single source of truth for post-auth navigation.
 * 
 * Rules:
 * - Only redirects when user is on "/" or "/login" (entry points)
 * - Only redirects when authentication is fully resolved (user object exists)
 * - Respects deep links (does not override if user navigates to protected routes)
 * - Uses replace navigation to avoid cluttering browser history
 * - Redirects based on app_users.role from /auth/me:
 *   - ADMIN → /admin/dashboard
 *   - ENTITY → /studio/dashboard
 *   - USER → /profile
 * 
 * This ensures:
 * - Admins land on admin dashboard after login
 * - Non-admins never see admin pages (guards still enforce access)
 * - Users are directed to appropriate landing pages based on role
 */
export function AuthRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    // Reset redirect flag when authentication state changes (e.g., logout)
    if (!isAuthenticated) {
      hasRedirectedRef.current = false;
      return;
    }

    // Don't redirect if:
    // 1. Auth is still loading
    // 2. User object is not yet loaded (waiting for /auth/me)
    // 3. We've already redirected in this session
    // 4. User is not on an entry point ("/" or "/login")
    if (
      isLoading ||
      !user ||
      hasRedirectedRef.current ||
      (location.pathname !== "/" && location.pathname !== "/login")
    ) {
      return;
    }

    // Determine redirect target based on user role
    let redirectPath: string;

    switch (user.role) {
      case UserRole.ADMIN:
        redirectPath = "/admin/dashboard";
        break;
      case UserRole.ENTITY:
        redirectPath = "/studio/dashboard";
        break;
      case UserRole.USER:
      case UserRole.MANAGER:
      case UserRole.COORDINATOR:
      default:
        redirectPath = "/profile";
        break;
    }

    // Perform redirect only once per session
    hasRedirectedRef.current = true;
    navigate(redirectPath, { replace: true });
  }, [isAuthenticated, isLoading, user, location.pathname, navigate]);

  // This component doesn't render anything
  return null;
}






