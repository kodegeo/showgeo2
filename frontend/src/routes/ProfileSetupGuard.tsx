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
  const isProfilePage = pathname === "/profile";
  const isSetupPage = pathname === "/profile/setup";

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user) return;

    // 🔹 ENTITY USERS:
    // They are allowed to access /profile
    // They should NOT be forced into /entity/profile
    if (user.isEntity) {
      // Only block profile setup, not profile itself
      if (isSetupPage) {
        navigate("/entity/profile", { replace: true });
      }
      return;
    }

    // 🔹 REGULAR USERS:
    // (If you later reintroduce profile completeness checks, they go here)

  }, [user, isAuthenticated, isLoading, isProfilePage, isSetupPage, navigate]);

  return <>{children}</>;
}
