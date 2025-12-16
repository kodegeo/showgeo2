import { createContext, useContext, ReactNode } from "react";
import type { Entity } from "../../../packages/shared/types";

interface EntityContextType {
  currentEntity: Entity | null;
  setCurrentEntity: (entity: Entity | null) => void;
  switchToEntity: (entityId: string) => Promise<void>;
  switchToUser: () => void;
}

const EntityContext = createContext<EntityContextType | undefined>(undefined);

export function EntityProvider({ children, value }: { children: ReactNode; value: EntityContextType }) {
  return <EntityContext.Provider value={value}>{children}</EntityContext.Provider>;
}

export function useEntityContext() {
  const context = useContext(EntityContext);
  if (context === undefined) {
    throw new Error("useEntityContext must be used within an EntityProvider");
  }
  return context;
}













