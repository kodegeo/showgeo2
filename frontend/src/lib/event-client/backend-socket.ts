import type { Socket } from "socket.io-client";
import { createSocketIoClient } from "@/lib/apiBase";

// NestJS default Socket.IO namespace `/` (single gateway).

let shared: Socket | null = null;

export function getBackendEventSocket(): Socket {
  if (!shared) {
    shared = createSocketIoClient({
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
