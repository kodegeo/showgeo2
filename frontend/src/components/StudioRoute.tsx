import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEntityContext } from "@/hooks/useEntityContext";
import { useUserEntities } from "@/hooks/useUsers";
import { useMyApplications } from "@/hooks/useEntities";
import { isCreator } from "@/utils/creator";
import { CreatorProviders } from "@/components/creator/CreatorProviders";
import { LoadingScreen } from "@/components/LoadingScreen";
import { UserRole } from "../../../packages/shared/types";

interface StudioRouteProps {
  children: React.ReactNode;
  requireEntity?: boolean;
}

export function StudioRoute({
  children,
  requireEntity = true,
}: StudioRouteProps) {
  const location = useLocation();

  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { currentEntity, isLoading: entityLoading, switchToEntity } =
    useEntityContext();

  const userId = user?.id ?? null;

  const {
    data: entitiesData,
    isLoading: entitiesLoading,
    error: entitiesError,
  } = useUserEntities(userId);

  const {
    data: applicationsData,
    isLoading: applicationsLoading,
  } = useMyApplications();

  const hasEntities =
    !!entitiesData &&
    ((entitiesData.owned?.length ?? 0) > 0 ||
      (entitiesData.managed?.length ?? 0) > 0);

  const userHasCreatorFlag =
    user?.isEntity === true || user?.role === UserRole.ENTITY;

  const userIsCreator = isCreator(user, hasEntities);

  const shouldWaitForEntities = !userHasCreatorFlag;

  const firstEntityId = useMemo(() => {
    return (
      entitiesData?.owned?.[0]?.id ??
      entitiesData?.managed?.[0]?.id ??
      null
    );
  }, [entitiesData]);

  const didAutoSelectRef = useRef(false);
  const lastFirstEntityIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (firstEntityId !== lastFirstEntityIdRef.current) {
      didAutoSelectRef.current = false;
      lastFirstEntityIdRef.current = firstEntityId;
    }
  }, [firstEntityId]);

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
  }, [
    requireEntity,
    isAuthenticated,
    userId,
    hasEntities,
    currentEntity,
    firstEntityId,
    switchToEntity,
  ]);

  console.log("[StudioRoute]", {
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
    entitiesError: entitiesError
      ? {
          message:
            entitiesError instanceof Error
              ? entitiesError.message
              : String(entitiesError),
          status: (entitiesError as any)?.response?.status,
          data: (entitiesError as any)?.response?.data,
        }
      : null,
    userIsCreator,
    currentEntity: currentEntity?.id,
    entityLoading,
    requireEntity,
  });

  const latestApplication = useMemo(() => {
    if (!applicationsData?.data || applicationsData.data.length === 0) {
      return null;
    }
    return applicationsData.data[0];
  }, [applicationsData]);

  const applicationStatus = latestApplication?.status;

  const waitingForEntities =
    shouldWaitForEntities && userId && entitiesLoading;

  if (
    authLoading ||
    (isAuthenticated && !user) ||
    waitingForEntities ||
    entityLoading ||
    (isAuthenticated && userId && applicationsLoading)
  ) {
    return <LoadingScreen message="Loading…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (user?.role === UserRole.ADMIN) {
    // continue
  } else {
    if (applicationStatus === "PENDING") {
      if (location.pathname !== "/studio/status" && location.pathname !== "/studio/application") {
        return <Navigate to="/studio/status" replace />;
      }
    }

    if (applicationStatus === "BANNED") {
      if (location.pathname !== "/studio/application") {
        return <Navigate to="/studio/application?banned=true" replace />;
      }
    }
  }

  const entitiesQueryCompleted = !entitiesLoading && !entitiesError;

  console.log("[StudioRoute] Entities check:", {
    hasEntities,
    entitiesLoading,
    entitiesQueryCompleted,
    entitiesError: entitiesError ? "Query failed" : "No error",
    decision: entitiesQueryCompleted && !hasEntities
      ? "REDIRECT to /studio/application"
      : "ALLOW (has entities or query incomplete/failed)",
  });

  if (entitiesQueryCompleted && !hasEntities) {
    return <Navigate to="/studio/application" replace />;
  }

  return <CreatorProviders>{children}</CreatorProviders>;
}
