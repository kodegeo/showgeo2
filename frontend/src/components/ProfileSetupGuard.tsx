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
  const isSetupPage = pathname === "/profile/setup";

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

    // 2️⃣ ENTITY users always go to profile
    if (user.isEntity) {
      if (pathname !== "/profile") {
        navigate("/profile", { replace: true });
      }
      return;
    }

    // 3️⃣ USER without profile → must complete setup
    const hasProfile = !!user.profile;

    if (!hasProfile && !isSetupPage) {
      navigate("/profile/setup", { replace: true });
      return;
    }

    // 4️⃣ USER with profile should not see setup page again
    if (hasProfile && isSetupPage) {
      navigate("/profile", { replace: true });
    }
  }, [
    isLoading,
    isAuthenticated,
    user?.id,          // stable dependency
    user?.profile,     // profile presence only
    pathname,
    navigate,
  ]);

  return <>{children}</>;
}
