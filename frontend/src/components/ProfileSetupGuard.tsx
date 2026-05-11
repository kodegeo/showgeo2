import { ReactNode, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProfileSetupGuardProps {
  children: ReactNode;
}

export function ProfileSetupGuard({ children }: ProfileSetupGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const pathname = location.pathname;

  useEffect(() => {
    // 0️⃣ Never redirect while auth is settling
    if (isLoading) return;
    if (!isAuthenticated || !user) return;

    // 1️⃣ One-time bypass after profile save
    const bypass =
      typeof window !== "undefined" &&
      localStorage.getItem("profileJustCompleted") === "true";

    if (bypass) {
      // If profile now exists, clear bypass and allow navigation
      if (user.profile) {
        localStorage.removeItem("profileJustCompleted");
      }
      return;
    }

    // 2️⃣ ENTITY users: hub is /profile; allow /profile/setup without bouncing
    if (user.isEntity) {
      if (pathname !== "/profile" && pathname !== "/profile/setup") {
        navigate("/profile", { replace: true });
      }
      return;
    }

    // No forced /profile ↔ /profile/setup redirects: fans use /profile as hub and may open
    // /profile/setup voluntarily (e.g. first-time completion or later edits).
  }, [
    isLoading,
    isAuthenticated,
    user?.id,
    pathname,
    navigate,
  ]);

  return <>{children}</>;
}
