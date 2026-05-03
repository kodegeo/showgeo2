import { useEffect, useRef, useState, useCallback } from "react";
import type { Room } from "livekit-client";

/**
 * Holds the LiveKit Room in React state so every render passes the same instance
 * to children (refs alone do not trigger re-renders and can leave props stale).
 */
export function useLiveKitRoom() {
  const [room, setRoomState] = useState<Room | null>(null);
  const roomRef = useRef<Room | null>(null);
  roomRef.current = room;

  const setRoom = useCallback((next: Room | null) => {
    setRoomState(next);
  }, []);

  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
    };
  }, []);

  return { room, setRoom, connected: !!room };
}
