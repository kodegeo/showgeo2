import { useCallback, useEffect, useReducer, useRef } from "react";
import { useEvent } from "@/hooks/useEvents";
import { useAuth } from "@/hooks/useAuth";
import { isLivePhase } from "@/utils/isLivePhase";
import { getBackendEventSocket } from "@/lib/event-client/backend-socket";
import {
  streamingService,
  StreamingTokenError,
  CODE_OF_CONDUCT_REQUIRED,
  type StreamingTokenErrorCode,
} from "@/services";
import { usersService } from "@/services/users.service";
import type { Event } from "@/types/event.types";
import type { RealtimeRole } from "@shared/types/realtime.types";

// ── Status enum ─────────────────────────────────────────────────────────────
// Single source of truth for what the viewer should render at any moment.
export type ExperienceStatus =
  | "IDLE"
  | "LOADING_EVENT"
  | "NOT_LIVE"
  | "ACCESS_DENIED"
  | "CONNECTING_SOCKET"
  | "REQUIRES_COC"
  | "REQUESTING_TOKEN"
  | "READY"
  | "ERROR";

export interface ExperienceData {
  event: Event | null;
  role: RealtimeRole;
  token: string | null;
  livekitUrl: string | null;
  errorMessage: string | null;
  errorCode: StreamingTokenErrorCode | null;
  /** True once Socket.IO has connected and we received `event:joined`. */
  socketJoined: boolean;
}

export interface UseEventExperienceJoinOptions {
  /**
   * Stream role passed to the backend token endpoint.
   * Inferred from `role` if absent: audience → VIEWER, others → BROADCASTER.
   */
  streamRole?: "VIEWER" | "BROADCASTER";
  /** Ticket id from URL query (audience). */
  ticketId?: string;
  /** Access code from URL query (audience or guest). */
  accessCode?: string;
  /**
   * If false, the hook stays in IDLE until `join()` is called explicitly.
   * Defaults to true — auto-start when the event loads.
   */
  autoJoin?: boolean;
}

export interface UseEventExperienceJoinResult {
  status: ExperienceStatus;
  data: ExperienceData;
  isLoading: boolean;
  join: () => void;
  retry: () => void;
  acceptCodeOfConduct: () => Promise<void>;
  leave: () => void;
}

// ── Reducer ─────────────────────────────────────────────────────────────────

type Action =
  | { type: "RESET" }
  | { type: "EVENT_LOADING" }
  | { type: "EVENT_LOADED"; event: Event }
  | { type: "EVENT_NOT_LIVE"; event: Event }
  | { type: "SOCKET_CONNECTING" }
  | { type: "SOCKET_JOINED" }
  | { type: "TOKEN_REQUESTING" }
  | { type: "TOKEN_OK"; token: string; livekitUrl: string }
  | {
      type: "TOKEN_FAIL";
      code: StreamingTokenErrorCode;
      message: string;
    }
  | { type: "GENERIC_ERROR"; message: string };

interface State {
  status: ExperienceStatus;
  data: ExperienceData;
}

function initialState(role: RealtimeRole): State {
  return {
    status: "IDLE",
    data: {
      event: null,
      role,
      token: null,
      livekitUrl: null,
      errorMessage: null,
      errorCode: null,
      socketJoined: false,
    },
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "RESET":
      return initialState(state.data.role);

    case "EVENT_LOADING":
      return { ...state, status: "LOADING_EVENT" };

    case "EVENT_LOADED":
      return {
        ...state,
        status: "CONNECTING_SOCKET",
        data: { ...state.data, event: action.event, errorMessage: null, errorCode: null },
      };

    case "EVENT_NOT_LIVE":
      return {
        ...state,
        status: "NOT_LIVE",
        data: { ...state.data, event: action.event },
      };

    case "SOCKET_CONNECTING":
      return {
        ...state,
        status: "CONNECTING_SOCKET",
        data: { ...state.data, socketJoined: false },
      };

    case "SOCKET_JOINED":
      // Socket can emit `event:joined` again after reconnect — do not leave READY or
      // clear LiveKit credentials (would tear down the studio player's connection).
      if (state.status === "READY" && state.data.token && state.data.livekitUrl) {
        return {
          ...state,
          data: { ...state.data, socketJoined: true },
        };
      }
      return {
        ...state,
        status: "REQUESTING_TOKEN",
        data: { ...state.data, socketJoined: true },
      };

    case "TOKEN_REQUESTING":
      return { ...state, status: "REQUESTING_TOKEN" };

    case "TOKEN_OK":
      return {
        ...state,
        status: "READY",
        data: {
          ...state.data,
          token: action.token,
          livekitUrl: action.livekitUrl,
          errorMessage: null,
          errorCode: null,
        },
      };

    case "TOKEN_FAIL": {
      let nextStatus: ExperienceStatus = "ERROR";
      if (action.code === "NOT_LIVE") nextStatus = "NOT_LIVE";
      else if (action.code === "ACCESS_DENIED") nextStatus = "ACCESS_DENIED";
      else if (action.code === "CODE_OF_CONDUCT_REQUIRED") nextStatus = "REQUIRES_COC";
      else if (action.code === "SESSION_NOT_READY") nextStatus = "ERROR";

      return {
        ...state,
        status: nextStatus,
        data: {
          ...state.data,
          token: null,
          livekitUrl: null,
          errorCode: action.code,
          errorMessage: action.message,
        },
      };
    }

    case "GENERIC_ERROR":
      return {
        ...state,
        status: "ERROR",
        data: { ...state.data, errorMessage: action.message, errorCode: null },
      };

    default:
      return state;
  }
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useEventExperienceJoin(
  eventId: string | undefined,
  role: RealtimeRole,
  options: UseEventExperienceJoinOptions = {},
): UseEventExperienceJoinResult {
  const { streamRole, ticketId, accessCode, autoJoin = true } = options;

  const { user, refetchUser } = useAuth();
  const { data: event, isLoading: eventLoading, refetch: refetchEvent } = useEvent(eventId);
  const [state, dispatch] = useReducer(reducer, role, initialState);

  const socket = getBackendEventSocket();

  // Refs to avoid stale closures and re-entrant requests
  const tokenInFlightRef = useRef(false);
  const cocRetryConsumedRef = useRef(false);
  const startedRef = useRef(false);
  const lastEventIdRef = useRef<string | undefined>(undefined);

  // Reset internal flags whenever the event changes — a new event is a new handshake.
  useEffect(() => {
    if (lastEventIdRef.current !== eventId) {
      lastEventIdRef.current = eventId;
      tokenInFlightRef.current = false;
      cocRetryConsumedRef.current = false;
      startedRef.current = false;
      dispatch({ type: "RESET" });
    }
  }, [eventId]);

  // ── Step 1: Load the event ──────────────────────────────────────────────
  useEffect(() => {
    if (!eventId) return;
    if (eventLoading) {
      dispatch({ type: "EVENT_LOADING" });
      return;
    }
    if (!event) return;

    if (!isLivePhase(event.phase)) {
      dispatch({ type: "EVENT_NOT_LIVE", event });
      return;
    }

    // Phase is LIVE — proceed to socket handshake unless we are already
    // past this step (e.g. token was successfully fetched).
    if (
      state.status === "IDLE" ||
      state.status === "LOADING_EVENT" ||
      state.status === "NOT_LIVE"
    ) {
      dispatch({ type: "EVENT_LOADED", event });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, event, eventLoading]);

  // ── Step 2: Socket handshake ─ emit event:join, wait for event:joined ──
  useEffect(() => {
    if (!eventId) return;
    if (state.status !== "CONNECTING_SOCKET") return;
    if (!autoJoin && !startedRef.current) return;

    let cancelled = false;

    const emitJoin = () => {
      socket.emit("event:join", { eventId, role });
    };

    const onJoined = (payload: unknown) => {
      const p = payload as { eventId?: string };
      if (cancelled) return;
      if (p?.eventId === eventId) {
        dispatch({ type: "SOCKET_JOINED" });
      }
    };

    const onConnect = () => {
      // Re-emit on reconnect
      emitJoin();
    };

    socket.on("event:joined", onJoined);
    socket.on("connect", onConnect);

    if (socket.connected) {
      emitJoin();
    }

    return () => {
      cancelled = true;
      socket.off("event:joined", onJoined);
      socket.off("connect", onConnect);
    };
  }, [socket, eventId, role, state.status, autoJoin]);

  // ── Step 3: Request streaming token after socket is joined ──────────────
  const requestToken = useCallback(async () => {
    if (!eventId) return;
    if (tokenInFlightRef.current) return;

    const resolvedStreamRole: "VIEWER" | "BROADCASTER" =
      streamRole ?? (role === "audience" ? "VIEWER" : "BROADCASTER");

    tokenInFlightRef.current = true;
    dispatch({ type: "TOKEN_REQUESTING" });

    try {
      const tokenResponse = await streamingService.generateToken(eventId, {
        streamRole: resolvedStreamRole,
        ...(ticketId ? { ticketId } : {}),
        ...(accessCode ? { accessCode } : {}),
      });

      const token =
        typeof tokenResponse?.token === "string" && tokenResponse.token.length > 0
          ? tokenResponse.token
          : null;

      const livekitUrl =
        (tokenResponse as unknown as { livekitUrl?: string; url?: string; wsUrl?: string })
          .livekitUrl ||
        (tokenResponse as unknown as { url?: string }).url ||
        (tokenResponse as unknown as { wsUrl?: string }).wsUrl ||
        (import.meta.env.VITE_LIVEKIT_URL as string | undefined) ||
        null;

      if (!token) {
        dispatch({
          type: "GENERIC_ERROR",
          message: "Streaming server returned an empty token.",
        });
        return;
      }
      if (!livekitUrl) {
        dispatch({
          type: "GENERIC_ERROR",
          message:
            "LiveKit server URL is not configured. Set VITE_LIVEKIT_URL or wait for the backend to return a livekitUrl.",
        });
        return;
      }

      dispatch({ type: "TOKEN_OK", token, livekitUrl });
    } catch (err: unknown) {
      // Legacy CoC marker (the streaming service still throws Error("CODE_OF_CONDUCT_REQUIRED"))
      if (err instanceof Error && err.message === CODE_OF_CONDUCT_REQUIRED) {
        dispatch({
          type: "TOKEN_FAIL",
          code: "CODE_OF_CONDUCT_REQUIRED",
          message: "Code of Conduct required to join.",
        });
        return;
      }

      if (err instanceof StreamingTokenError) {
        dispatch({
          type: "TOKEN_FAIL",
          code: err.code,
          message: err.message,
        });
        return;
      }

      const message = err instanceof Error ? err.message : "Failed to fetch streaming token.";
      dispatch({ type: "GENERIC_ERROR", message });
    } finally {
      tokenInFlightRef.current = false;
    }
  }, [eventId, role, streamRole, ticketId, accessCode]);

  useEffect(() => {
    if (state.status === "REQUESTING_TOKEN" && !state.data.token && !tokenInFlightRef.current) {
      void requestToken();
    }
  }, [state.status, state.data.token, requestToken]);

  // ── Cleanup: emit event:leave on unmount or eventId change ──────────────
  useEffect(() => {
    if (!eventId) return;
    return () => {
      socket.emit("event:leave", { eventId });
    };
  }, [socket, eventId]);

  // ── Public actions ──────────────────────────────────────────────────────

  const join = useCallback(() => {
    startedRef.current = true;
    if (state.status === "IDLE" || state.status === "ERROR") {
      // Force the load-event effect to re-evaluate
      if (event && isLivePhase(event.phase)) {
        dispatch({ type: "EVENT_LOADED", event });
      } else if (event) {
        dispatch({ type: "EVENT_NOT_LIVE", event });
      } else {
        dispatch({ type: "EVENT_LOADING" });
      }
    }
  }, [state.status, event]);

  const retry = useCallback(() => {
    cocRetryConsumedRef.current = false;
    tokenInFlightRef.current = false;
    void refetchEvent();
    if (event && isLivePhase(event.phase)) {
      dispatch({ type: "EVENT_LOADED", event });
    } else {
      dispatch({ type: "RESET" });
    }
  }, [event, refetchEvent]);

  const acceptCodeOfConduct = useCallback(async () => {
    if (cocRetryConsumedRef.current) {
      // Already retried once after acceptance — surface a clear error instead
      // of looping. User can hit Retry to attempt again manually.
      dispatch({
        type: "GENERIC_ERROR",
        message:
          "Code of Conduct is still required. Try again later or update preferences in your profile.",
      });
      return;
    }
    cocRetryConsumedRef.current = true;
    try {
      await usersService.acceptCodeOfConduct();
      await refetchUser?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not save Code of Conduct acceptance.";
      dispatch({ type: "GENERIC_ERROR", message });
      return;
    }
    // Re-attempt the token request once.
    tokenInFlightRef.current = false;
    dispatch({ type: "TOKEN_REQUESTING" });
  }, [refetchUser]);

  const leave = useCallback(() => {
    if (eventId) {
      socket.emit("event:leave", { eventId });
    }
    dispatch({ type: "RESET" });
  }, [socket, eventId]);

  // user is consumed for refetchUser only — keep the reference live so React
  // re-runs the callback when the auth state actually changes.
  void user;

  return {
    status: state.status,
    data: state.data,
    isLoading:
      state.status === "LOADING_EVENT" ||
      state.status === "CONNECTING_SOCKET" ||
      state.status === "REQUESTING_TOKEN",
    join,
    retry,
    acceptCodeOfConduct,
    leave,
  };
}
