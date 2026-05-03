import { useEffect, useRef, useState, useCallback } from "react";
import { getBackendEventSocket } from "@/lib/event-client/backend-socket";
import type {
  RealtimeRole,
  AudiencePulseAggregate,
  ChatMessageEvent,
  EventStateUpdate,
} from "@shared/types/realtime.types";

const TYPING_SAMPLE_MS = 2_000;
const MAX_MESSAGES = 200;

export interface EventRealtimeControls {
  /** Aggregated energy level 0–100, updated from server pulse broadcasts. */
  energy: number;
  /** Chat messages received from the event's chat topic room. */
  messages: ChatMessageEvent[];
  /** True when the socket is connected to the backend. */
  isConnected: boolean;
  /** Emit a tap input. NEVER results in a raw tap broadcast — server aggregates. */
  sendTap: () => void;
  /** Send a chat message to the event room. */
  sendChatMessage: (text: string, userId: string, displayName: string) => void;
  /** Emit a sampled typing presence signal (rate-limited to once per 2s). */
  sendTypingPresence: () => void;
  /** Subscribe to raw pulse events (supplemental; energy state is managed internally). */
  subscribeToPulse: (cb: (pulse: AudiencePulseAggregate) => void) => () => void;
  /** Subscribe to chat events (supplemental; messages state is managed internally). */
  subscribeToChat: (cb: (msg: ChatMessageEvent) => void) => () => void;
  /** Subscribe to event state changes (live status, viewer count, energy level). */
  subscribeToState: (cb: (state: EventStateUpdate) => void) => () => void;
}

export function useEventRealtime(
  eventId: string | undefined,
  role: RealtimeRole = "audience",
  /** When false, do not emit `event:join` (e.g. event not in LIVE phase). */
  joinEnabled = true,
): EventRealtimeControls {
  const socket = getBackendEventSocket();
  const [energy, setEnergy] = useState(0);
  const [messages, setMessages] = useState<ChatMessageEvent[]>([]);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const typingActiveRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track connection status
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

  // Join/leave the event room and wire managed state listeners
  useEffect(() => {
    if (!eventId || !joinEnabled) return;

    socket.emit("event:join", { eventId, role });

    const onPulse = (pulse: AudiencePulseAggregate) => {
      if (pulse.eventId !== eventId) return;
      setEnergy(pulse.energy);
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
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingActiveRef.current = false;
      setEnergy(0);
      setMessages([]);
    };
  }, [socket, eventId, role, joinEnabled]);

  const sendTap = useCallback(() => {
    if (!eventId) return;
    socket.emit("event:tap", { eventId, timestamp: Date.now() });
  }, [socket, eventId]);

  const sendChatMessage = useCallback(
    (text: string, userId: string, displayName: string) => {
      if (!eventId || !text.trim()) return;
      socket.emit("event:chat", { eventId, text, userId, displayName });
    },
    [socket, eventId],
  );

  const sendTypingPresence = useCallback(() => {
    if (!eventId || typingActiveRef.current) return;
    typingActiveRef.current = true;
    socket.emit("event:typing", { eventId });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      typingActiveRef.current = false;
    }, TYPING_SAMPLE_MS);
  }, [socket, eventId]);

  // Supplemental subscribe functions — for consumers that need callbacks
  // rather than the managed state. Note: these add extra listeners on top of
  // the internal ones; do not use both the state AND a subscribe callback for
  // the same data in the same component.
  const subscribeToPulse = useCallback(
    (cb: (pulse: AudiencePulseAggregate) => void): (() => void) => {
      socket.on("event:pulse", cb);
      return () => {
        socket.off("event:pulse", cb);
      };
    },
    [socket],
  );

  const subscribeToChat = useCallback(
    (cb: (msg: ChatMessageEvent) => void): (() => void) => {
      socket.on("event:chat", cb);
      return () => {
        socket.off("event:chat", cb);
      };
    },
    [socket],
  );

  const subscribeToState = useCallback(
    (cb: (state: EventStateUpdate) => void): (() => void) => {
      socket.on("event:state", cb);
      return () => {
        socket.off("event:state", cb);
      };
    },
    [socket],
  );

  return {
    energy,
    messages,
    isConnected,
    sendTap,
    sendChatMessage,
    sendTypingPresence,
    subscribeToPulse,
    subscribeToChat,
    subscribeToState,
  };
}
