import { createContext, useContext, useMemo, useEffect, type ReactNode } from "react";
import { EventClient } from "../EventClient";

const EventClientContext = createContext<EventClient | null>(null);

export type EventClientProviderProps = {
  /** When provided, this client is used and no lifecycle is run (e.g. when used by EventLifecycleManager). */
  client?: EventClient | null;
  /** When client is not provided, create and manage an EventClient for this eventId. */
  eventId?: string | undefined | null;
  children: ReactNode;
};

/**
 * Provides an EventClient via context.
 * - If `client` is provided (e.g. by EventLifecycleManager), that client is used and no lifecycle is run.
 * - If only `eventId` is provided, creates an EventClient, joinEvent on mount, leaveEvent on unmount.
 */
export function EventClientProvider({
  client: clientProp,
  eventId,
  children,
}: EventClientProviderProps) {
  const createdClient = useMemo(() => {
    if (clientProp != null || !eventId) return null;
    return new EventClient(eventId);
  }, [eventId, clientProp]);

  useEffect(() => {
    if (clientProp != null || !createdClient) return;
    createdClient.joinEvent();
    return () => createdClient.leaveEvent();
  }, [clientProp, createdClient]);

  const client = clientProp ?? createdClient ?? null;

  return <EventClientContext.Provider value={client}>{children}</EventClientContext.Provider>;
}

export function useEventClient(): EventClient | null {
  return useContext(EventClientContext);
}
