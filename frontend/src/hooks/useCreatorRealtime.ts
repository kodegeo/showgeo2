import { useEffect, useRef, useState } from "react";
import { getBackendEventSocket } from "@/lib/event-client/backend-socket";
import type { AudiencePulseAggregate, ChatMessageEvent } from "@shared/types/realtime.types";

const MAX_MESSAGES = 50;
// Exponential smoothing: energy = prev * SMOOTH_DECAY + incoming * (1 - SMOOTH_DECAY)
// 0.7 keeps the display stable without lagging behind real bursts.
const SMOOTH_DECAY = 0.7;

export interface CreatorRealtimeState {
  energy: number;
  messages: ChatMessageEvent[];
  isConnected: boolean;
}

export function useCreatorRealtime(
  eventId: string | undefined,
  /** When false, skip `event:join` until the event is in LIVE phase. */
  joinEnabled = true,
): CreatorRealtimeState {
  const socket = getBackendEventSocket();
  const [energy, setEnergy] = useState(0);
  const [messages, setMessages] = useState<ChatMessageEvent[]>([]);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const energyRef = useRef(0);

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  useEffect(() => {
    if (!eventId || !joinEnabled) return;

    socket.emit("event:join", { eventId, role: "creator" });

    const onPulse = (pulse: AudiencePulseAggregate) => {
      if (pulse.eventId !== eventId) return;
      const smoothed = energyRef.current * SMOOTH_DECAY + pulse.energy * (1 - SMOOTH_DECAY);
      energyRef.current = smoothed;
      setEnergy(smoothed);
    };

    const onChat = (msg: ChatMessageEvent) => {
      if (msg.eventId !== eventId) return;
      setMessages(prev => {
        const next = [...prev, msg];
        return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
      });
    };

    socket.on("event:pulse", onPulse);
    socket.on("event:chat", onChat);

    return () => {
      socket.emit("event:leave", { eventId });
      socket.off("event:pulse", onPulse);
      socket.off("event:chat", onChat);
      energyRef.current = 0;
      setEnergy(0);
      setMessages([]);
    };
  }, [socket, eventId, joinEnabled]);

  return { energy, messages, isConnected };
}
