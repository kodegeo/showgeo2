import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEntityContext } from "@/hooks/useEntityContext";
import { useUserEntities } from "@/hooks/useUsers";
import { isCreator } from "@/utils/creator";
import { CreatorProviders } from "@/components/creator/CreatorProviders";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useEffect, useMemo } from "react";


interface CreatorRouteProps {
  children: React.ReactNode;
  requireEntity?: boolean;
}

/**
 * Route guard for creator dashboard pages.
 * Requires authentication, creator role (ENTITY) or entities, and optionally an active entity context.
 */

export function CreatorRoute({ children, requireEntity = true }: CreatorRouteProps) {
  const location = useLocation();

  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const {
    currentEntity,
    isLoading: entityLoading,
    switchToEntity,
  } = useEntityContext();

  const userId = user?.id ?? "";

  // ✅ MOVE THIS UP
  const { data: entitiesData, isLoading: entitiesLoading } =
    useUserEntities(userId);

  const hasEntities =
    !!entitiesData &&
    (entitiesData.owned?.length > 0 || entitiesData.managed?.length > 0);

  const userIsCreator = isCreator(user, hasEntities);

  // ✅ NOW this is safe
  const firstEntityId = useMemo(() => {
    return (
      entitiesData?.owned?.[0]?.id ||
      entitiesData?.managed?.[0]?.id ||
      null
    );
  }, [entitiesData]);

  useEffect(() => {
    if (
      requireEntity &&
      hasEntities &&
      !currentEntity &&
      firstEntityId
    ) {
      switchToEntity(firstEntityId);
    }
  }, [
    requireEntity,
    hasEntities,
    currentEntity,
    firstEntityId,
    switchToEntity,
  ]);

  console.log("[CreatorRoute]", {
    isAuthenticated,
    user,
    hasEntities,
    currentEntity,
    entitiesData,
    userIsCreator,
    pathname: location.pathname,
  });

  // ⬇️ rest of your guards stay exactly the same

  // 1️⃣ Still loading auth or entity data
  if (authLoading || entityLoading || entitiesLoading) {
    return <LoadingScreen message="Loading…" />;
  }

  // 2️⃣ Session validated but user not hydrated yet
  if (isAuthenticated && !user) {
    return <LoadingScreen message="Loading user…" />;
  }

  // 3️⃣ Not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // 4️⃣ Authenticated but not a creator
  if (!userIsCreator) {
    return <Navigate to="/dashboard" replace />;
  }

  // 5️⃣ Creator but no entity exists
  if (requireEntity && !hasEntities) {
    return <Navigate to="/profile/setup" replace />;
  }

  // 6️⃣ Creator has entities but none selected
  if (requireEntity && !currentEntity && hasEntities) {
    const firstEntity =
      entitiesData?.owned?.[0] || entitiesData?.managed?.[0];
  
    if (firstEntity) {
      switchToEntity(firstEntity.id);
      return <LoadingScreen message="Setting up your creator workspace…" />;
    }
  }
  
  // ✅ All good
  return <CreatorProviders>{children}</CreatorProviders>;
}
