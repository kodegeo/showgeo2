import { io, type Socket } from "socket.io-client";

// Connects to the NestJS backend's /events WebSocket namespace.
// This is separate from the legacy realtime service (socket-shared.ts → port 3001).
//
// In development: connects directly to the backend (port 3000).
// In production: set VITE_BACKEND_URL to the deployed backend origin.
const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3000";

let shared: Socket | null = null;

export function getBackendEventSocket(): Socket {
  if (!shared) {
    shared = io(`${backendUrl}/events`, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2_000,
    });
  }
  return shared;
}

/** Alias — same singleton as {@link getBackendEventSocket}. */
export const getEventSocket = getBackendEventSocket;
