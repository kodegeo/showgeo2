import { useState, useEffect, useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { entitiesService } from "@/services";
import type { Entity } from "../../../packages/shared/types";

const CURRENT_ENTITY_KEY = "showgeo_current_entity_id";

export function useEntityContext() {
  const [currentEntityId, setCurrentEntityId] = useLocalStorage<string | null>(CURRENT_ENTITY_KEY, null);
  const [currentEntity, setCurrentEntity] = useState<Entity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load entity when entityId changes
  useEffect(() => {
    if (currentEntityId) {
      loadEntity(currentEntityId);
    } else {
      setCurrentEntity(null);
    }
  }, [currentEntityId]);

  const loadEntity = useCallback(async (entityId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const entity = await entitiesService.getById(entityId);
      setCurrentEntity(entity);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load entity");
      setCurrentEntity(null);
      setCurrentEntityId(null);
    } finally {
      setIsLoading(false);
    }
  }, [setCurrentEntityId]);

  const switchToEntity = useCallback(
    async (entityId: string) => {
      try {
        setIsLoading(true);
        setError(null);
        const entity = await entitiesService.getById(entityId);
        setCurrentEntity(entity);
        setCurrentEntityId(entityId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to switch to entity");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [setCurrentEntityId],
  );

  const switchToUser = useCallback(() => {
    setCurrentEntity(null);
    setCurrentEntityId(null);
  }, [setCurrentEntityId]);

  return {
    currentEntity,
    currentEntityId,
    isLoading,
    error,
    switchToEntity,
    switchToUser,
    setCurrentEntity: useCallback((entity: Entity | null) => {
      setCurrentEntity(entity);
      setCurrentEntityId(entity?.id || null);
    }, [setCurrentEntityId]),
  };
}













