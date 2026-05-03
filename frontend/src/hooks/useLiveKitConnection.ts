import { useEffect, useMemo, useRef, useState } from "react";
import { ConnectionState, type Room } from "livekit-client";
import { joinStream } from "@/lib/livekit/joinStream";

/**
 * Backend issues a new JWT on every token request, but the LiveKit session identity
 * (url + room + participant) is unchanged. Keying the connection effect on the raw token
 * string disconnects the room on each refetch and drops published tracks.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad) b64 += "=".repeat(4 - pad);
    const json = atob(b64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function liveKitSessionSignature(token: string, serverUrl: string): string | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  const video = payload.video as { room?: string } | undefined;
  const roomName =
    (typeof video?.room === "string" && video.room) ||
    (typeof payload.room === "string" && payload.room) ||
    "";
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  if (!roomName || !sub) return null;
  return `${serverUrl}|${roomName}|${sub}`;
}

/** Stable key: same LiveKit identity + URL (JWT may rotate). */
export function getLiveKitAttemptKey(token: string, serverUrl: string): string {
  return liveKitSessionSignature(token, serverUrl) ?? `raw:${serverUrl}:${token}`;
}

interface State {
  room: Room | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
}

type SharedLiveKitSession = {
  consumers: number;
  joinPromise: Promise<Room> | null;
  room: Room | null;
};

const sessionsByAttemptKey = new Map<string, SharedLiveKitSession>();

function touchSession(attemptKey: string): SharedLiveKitSession {
  let s = sessionsByAttemptKey.get(attemptKey);
  if (!s) {
    s = { consumers: 0, joinPromise: null, room: null };
    sessionsByAttemptKey.set(attemptKey, s);
  }
  s.consumers += 1;
  return s;
}

function untouchSession(attemptKey: string): void {
  const s = sessionsByAttemptKey.get(attemptKey);
  if (!s) return;
  s.consumers -= 1;
  if (s.consumers > 0) return;

  if (s.room) {
    console.log("[useLiveKitConnection] disconnect cleanup", {
      attemptKey,
      reason: "last_consumer_left",
      roomName: s.room.name,
      state: s.room.state,
    });
    try {
      s.room.disconnect();
    } catch {
      /* ignore */
    }
    s.room = null;
  }

  if (!s.joinPromise) {
    sessionsByAttemptKey.delete(attemptKey);
  }
}

async function connectSharedRoom(
  attemptKey: string,
  token: string,
  serverUrl: string,
): Promise<Room> {
  const s = sessionsByAttemptKey.get(attemptKey);
  if (!s) {
    throw new Error("connectSharedRoom: missing session cell");
  }

  if (s.room?.state === ConnectionState.Connected) {
    console.warn("[useLiveKitConnection] duplicate connect skipped", {
      attemptKey,
      reason: "reuse_connected_room",
      roomName: s.room.name,
      state: s.room.state,
    });
    return s.room;
  }

  if (s.joinPromise) {
    console.warn("[useLiveKitConnection] duplicate connect skipped", {
      attemptKey,
      reason: "await_in_flight_join",
    });
    return await s.joinPromise;
  }

  console.log("[useLiveKitConnection] connect start", { attemptKey });

  s.joinPromise = (async () => {
    try {
      const room = await joinStream({ token, serverUrl });
      s.room = room;
      // StrictMode: cleanup may run between await and remount; defer so a new consumer can attach.
      queueMicrotask(() => {
        if (s.consumers > 0) return;
        if (s.room !== room) return;
        console.log("[useLiveKitConnection] disconnect cleanup", {
          attemptKey,
          reason: "no_subscribers_after_join",
          roomName: room.name,
        });
        try {
          room.disconnect();
        } catch {
          /* ignore */
        }
        s.room = null;
        sessionsByAttemptKey.delete(attemptKey);
      });
      return room;
    } finally {
      s.joinPromise = null;
    }
  })();

  return await s.joinPromise;
}

/**
 * Connect to a LiveKit room when a token + serverUrl pair are provided.
 * Singleton-safe per attempt key (url + room + participant from JWT): parallel joins and
 * React StrictMode remounts share one joinStream + one Room, avoiding DUPLICATE_IDENTITY.
 */
export function useLiveKitConnection(token: string | null, serverUrl: string | null): State {
  const [state, setState] = useState<State>({
    room: null,
    connected: false,
    connecting: false,
    error: null,
  });

  const generationRef = useRef(0);
  const instanceRoomRef = useRef<Room | null>(null);
  const lastAttemptKeyRef = useRef<string | null>(null);

  const connectSignature = useMemo(() => {
    if (!token || !serverUrl) return null;
    return getLiveKitAttemptKey(token, serverUrl);
  }, [token, serverUrl]);

  useEffect(() => {
    if (!token || !serverUrl) {
      generationRef.current += 1;
      if (lastAttemptKeyRef.current) {
        untouchSession(lastAttemptKeyRef.current);
        lastAttemptKeyRef.current = null;
      }
      instanceRoomRef.current = null;
      setState({ room: null, connected: false, connecting: false, error: null });
      return;
    }

    const attemptKey = connectSignature;
    lastAttemptKeyRef.current = attemptKey;

    const myGeneration = ++generationRef.current;
    touchSession(attemptKey);

    setState({ room: null, connected: false, connecting: true, error: null });

    void (async () => {
      try {
        const room = await connectSharedRoom(attemptKey, token, serverUrl);
        if (myGeneration !== generationRef.current) {
          return;
        }
        instanceRoomRef.current = room;
        setState({ room, connected: true, connecting: false, error: null });
        console.log("[useLiveKitConnection] connect success", {
          attemptKey,
          roomName: room.name,
          state: room.state,
        });
      } catch (err) {
        if (myGeneration !== generationRef.current) {
          return;
        }
        const message = err instanceof Error ? err.message : "Failed to connect to LiveKit";
        instanceRoomRef.current = null;
        setState({ room: null, connected: false, connecting: false, error: message });
      }
    })();

    return () => {
      generationRef.current += 1;
      untouchSession(attemptKey);
      instanceRoomRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- token/serverUrl folded into connectSignature
  }, [connectSignature]);

  return state;
}
