import { useEffect, useRef, useState } from "react";
import type { Room } from "livekit-client";

export function useLiveKitRoom() {
  const roomRef = useRef<Room | null>(null);
  const [connected, setConnected] = useState(false);

  const setRoom = (room: Room | null) => {
    roomRef.current = room;
    setConnected(!!room);
  };

  useEffect(() => {
    return () => {
      // cleanup on unmount
      roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, []);

  return { room: roomRef.current, setRoom, connected };
}
