// src/components/UserRoute.tsx

import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface UserRouteProps {
  children: React.ReactNode;
}

export function UserRoute({ children }: UserRouteProps) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (user.role !== "USER") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
