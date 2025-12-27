import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEntityContext } from "@/hooks/useEntityContext";
import { useUserEntities } from "@/hooks/useUsers";
import { isCreator } from "@/utils/creator";
import { CreatorProviders } from "@/components/creator/CreatorProviders";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useEffect, useMemo, useRef } from "react";
import { UserRole } from "../../../packages/shared/types";

interface CreatorRouteProps {
  children: React.ReactNode;
  requireEntity?: boolean;
}


export function CreatorRoute({ children, requireEntity = true }: CreatorRouteProps) {
  const location = useLocation();

  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { currentEntity, isLoading: entityLoading, switchToEntity } = useEntityContext();

  const userId = user?.id;

  // IMPORTANT: don't even run this query until userId exists
  const { data: entitiesData, isLoading: entitiesLoading, error: entitiesError } = useUserEntities(userId ?? null);

  const hasEntities =
    !!entitiesData && ((entitiesData.owned?.length ?? 0) > 0 || (entitiesData.managed?.length ?? 0) > 0);

  // If user has ENTITY role or isEntity flag, they're a creator regardless of entities query result
  // This prevents redirect when entities query fails (e.g., due to partial user guard or network issues)
  const userIsCreator = isCreator(user, hasEntities);
  
  // If user has isEntity flag or ENTITY role, allow access even if entities query failed
  const userHasCreatorFlag = user?.isEntity === true || user?.role === UserRole.ENTITY;
  
  // Don't block on entities query if user has creator flag - they're definitely a creator
  const shouldWaitForEntities = !userHasCreatorFlag;

  // Debug logging for creator route access
  console.log("[CreatorRoute]", {
    pathname: location.pathname,
    isAuthenticated,
    authLoading,
    userId,
    userRole: user?.role,
    userIsEntity: user?.isEntity,
    userHasCreatorFlag,
    shouldWaitForEntities,
    hasEntities,
    entitiesData,
    entitiesLoading,
    entitiesError: entitiesError ? {
      message: entitiesError instanceof Error ? entitiesError.message : String(entitiesError),
      status: (entitiesError as any)?.response?.status,
      data: (entitiesError as any)?.response?.data,
    } : null,
    userIsCreator,
    currentEntity: currentEntity?.id,
    entityLoading,
    requireEntity,
  });

  const firstEntityId = useMemo(() => {
    return entitiesData?.owned?.[0]?.id || entitiesData?.managed?.[0]?.id || null;
  }, [entitiesData]);

  // Avoid repeated auto-select loops
  const didAutoSelectRef = useRef(false);

  useEffect(() => {
    if (!requireEntity) return;
    if (!isAuthenticated) return;
    if (!userId) return;
    if (!hasEntities) return;
    if (currentEntity) return;
    if (!firstEntityId) return;
    if (didAutoSelectRef.current) return;

    didAutoSelectRef.current = true;
    switchToEntity(firstEntityId);
  }, [requireEntity, isAuthenticated, userId, hasEntities, currentEntity, firstEntityId, switchToEntity]);

  // 1) still loading auth or critical data
  // Only wait for entities if user doesn't have creator flag (isEntity or ENTITY role)
  const isWaitingForEntities = shouldWaitForEntities && userId && entitiesLoading;
  if (authLoading || (isAuthenticated && !user) || isWaitingForEntities || entityLoading) {
    return <LoadingScreen message="Loading…" />;
  }

  // 2) not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // 3) authenticated but not creator
  if (!userIsCreator) {
    return <Navigate to="/dashboard" replace />;
  }

  // 4) creator but requires entity and none exist
  // If user has creator flag (isEntity or ENTITY role), allow access even without entities query
  // They might be in the process of creating their first entity
  // Also allow if entities query failed (error) - don't block on query errors
  const entitiesQueryFailed = entitiesError !== null && entitiesError !== undefined;
  if (requireEntity && !hasEntities && !userHasCreatorFlag && !entitiesQueryFailed) {
    return <Navigate to="/profile/setup" replace />;
  }

  // 5) requires entity, has entities, but entity not selected yet
  if (requireEntity && hasEntities && !currentEntity) {
    return <LoadingScreen message="Setting up your creator workspace…" />;
  }

  return <CreatorProviders>{children}</CreatorProviders>;
}
