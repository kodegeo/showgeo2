import { useState, useEffect, useCallback, useRef } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { entitiesService } from "@/services";
import type { Entity } from "../../../packages/shared/types";

const CURRENT_ENTITY_KEY = "showgeo_current_entity_id";

// simple timeout helper
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let t: any;
  const timeout = new Promise<never>((_, reject) => {
    t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

export function useEntityContext() {
  const [currentEntityId, setCurrentEntityId] = useLocalStorage<string | null>(CURRENT_ENTITY_KEY, null);
  const [currentEntity, setCurrentEntity] = useState<Entity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prevent stale async updates & duplicate loads
  const inFlightIdRef = useRef<string | null>(null);
  const requestSeqRef = useRef(0);

  const loadEntity = useCallback(
    async (entityId: string) => {
      if (!entityId) return;

      // Deduplicate same request
      if (inFlightIdRef.current === entityId) return;

      const seq = ++requestSeqRef.current;
      inFlightIdRef.current = entityId;

      try {
        setIsLoading(true);
        setError(null);

        const entity = await withTimeout(
          entitiesService.getById(entityId),
          12_000,
          `GET /entities/${entityId}`,
        );

        // Ignore stale responses
        if (requestSeqRef.current !== seq) return;

        setCurrentEntity(entity);
      } catch (err) {
        if (requestSeqRef.current !== seq) return;

        const msg = err instanceof Error ? err.message : "Failed to load entity";
        setError(msg);

        // If currentEntityId is invalid, clear it so we stop looping
        setCurrentEntity(null);
        setCurrentEntityId(null);
      } finally {
        if (requestSeqRef.current === seq) {
          setIsLoading(false);
          inFlightIdRef.current = null;
        }
      }
    },
    [setCurrentEntityId],
  );

  // Load entity when entityId changes
  useEffect(() => {
    if (!currentEntityId) {
      setCurrentEntity(null);
      setError(null);
      return;
    }

    // If already loaded, don't refetch
    if (currentEntity?.id === currentEntityId) return;

    loadEntity(currentEntityId);
  }, [currentEntityId, currentEntity?.id, loadEntity]);

  const switchToEntity = useCallback(
    async (entityId: string) => {
      if (!entityId) return;

      // If switching to what we already have, do nothing
      if (currentEntity?.id === entityId && currentEntityId === entityId) return;

      setError(null);

      // Set ID first; the effect will load it (single source of truth)
      setCurrentEntityId(entityId);
    },
    [currentEntity?.id, currentEntityId, setCurrentEntityId],
  );

  const switchToUser = useCallback(() => {
    setCurrentEntity(null);
    setCurrentEntityId(null);
    setError(null);
  }, [setCurrentEntityId]);

  const setEntity = useCallback(
    (entity: Entity | null) => {
      setCurrentEntity(entity);
      setCurrentEntityId(entity?.id || null);
      setError(null);
    },
    [setCurrentEntityId],
  );

  return {
    currentEntity,
    currentEntityId,
    isLoading,
    error,
    switchToEntity,
    switchToUser,
    setCurrentEntity: setEntity,
  };
}













