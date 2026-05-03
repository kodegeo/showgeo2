import { useMemo, useEffect, type ReactNode } from "react";
import { EventClient } from "../EventClient";
import { EventClientProvider } from "../context/EventClientProvider";

export type EventLifecycleManagerProps = {
  eventId: string | undefined | null;
  children: ReactNode;
};

/**
 * Manages creation and destruction of an EventClient for the given eventId.
 * - On mount: creates EventClient(eventId), calls joinEvent() (connects websocket, joins event).
 * - On unmount (or eventId change): calls leaveEvent() (disconnects socket, resets state).
 * Provides the client via EventClientProvider so children can use useEventClient().
 * When eventId is missing, renders children without a client (useEventClient() will return null).
 */
export function EventLifecycleManager({ eventId, children }: EventLifecycleManagerProps) {
  const client = useMemo(() => {
    if (!eventId) return null;
    return new EventClient(eventId);
  }, [eventId]);

  useEffect(() => {
    if (!client) return;
    client.joinEvent();
    return () => {
      client.leaveEvent();
    };
  }, [client]);

  if (!eventId) {
    return <>{children}</>;
  }

  return <EventClientProvider client={client}>{children}</EventClientProvider>;
}
