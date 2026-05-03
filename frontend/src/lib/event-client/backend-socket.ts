import { io, type Socket } from "socket.io-client";
import { getSocketIoOrigin } from "@/lib/apiBase";

// Connects to the NestJS backend's /events WebSocket namespace.
// Set `VITE_API_URL` (absolute) or `VITE_WS_URL` so the origin can be resolved.

let shared: Socket | null = null;

export function getBackendEventSocket(): Socket {
  if (!shared) {
    const origin = getSocketIoOrigin();
    if (!origin) {
      throw new Error(
        "Socket origin not configured: set VITE_API_URL (absolute URL) or VITE_WS_URL for production.",
      );
    }
    shared = io(`${origin}/events`, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2_000,
      withCredentials: true,
    });
  }
  return shared;
}

/** Alias — same singleton as {@link getBackendEventSocket}. */
export const getEventSocket = getBackendEventSocket;
