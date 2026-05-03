import { useEffect, useState, useCallback } from "react";
import { getBackendEventSocket } from "@/lib/event-client/backend-socket";

export type EventRoomRole = "audience" | "creator";

/**
 * Nest `/events` namespace: emit `event:join` when phase is LIVE, wait for `event:joined` ack.
 * Uses the shared backend socket singleton (no extra instances).
 */
export function useEventRoomConnection(
  eventId: string | undefined,
  isLive: boolean,
  role: EventRoomRole,
): { roomJoined: boolean } {
  const socket = getBackendEventSocket();
  const [roomJoined, setRoomJoined] = useState(false);

  const emitJoin = useCallback(() => {
    if (!eventId || !isLive) return;
    socket.emit("event:join", { eventId, role });
  }, [socket, eventId, isLive, role]);

  useEffect(() => {
    if (!eventId || !isLive) {
      setRoomJoined(false);
      return;
    }

    const onJoined = (payload: unknown) => {
      const p = payload as { eventId?: string };
      if (p?.eventId === eventId) {
        setRoomJoined(true);
      }
    };

    const onConnect = () => {
      emitJoin();
    };

    socket.on("event:joined", onJoined);
    socket.on("connect", onConnect);

    if (socket.connected) {
      emitJoin();
    }

    return () => {
      socket.off("event:joined", onJoined);
      socket.off("connect", onConnect);
      socket.emit("event:leave", { eventId });
      setRoomJoined(false);
    };
  }, [socket, eventId, isLive, role, emitJoin]);

  return { roomJoined };
}
