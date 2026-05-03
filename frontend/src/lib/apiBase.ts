import { io, type Socket } from "socket.io-client";

/**
 * REST API base URL (includes `/api` path when deployed).
 * Set `VITE_API_URL` on Vercel to your Fly backend, e.g. `https://api.example.com/api`.
 * Omit locally to use `/api` (Vite dev server proxies to the backend).
 */
export function getRestApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL?.trim();
  if (raw) {
    return raw.replace(/\/$/, "");
  }
  return "/api";
}

/**
 * Full URL for a path under the API base. `path` must start with `/` (e.g. `/streaming/active`).
 */
export function apiUrl(path: string): string {
  const base = getRestApiBaseUrl();
  const normalPath = path.startsWith("/") ? path : `/${path}`;
  if (base.startsWith("http://") || base.startsWith("https://")) {
    return `${base}${normalPath}`;
  }
  return `${base.replace(/\/$/, "")}${normalPath}`;
}

function wsToHttpUrl(url: string): string {
  const t = url.trim().replace(/\/$/, "");
  if (t.startsWith("wss://")) return `https://${t.slice("wss://".length)}`;
  if (t.startsWith("ws://")) return `http://${t.slice("ws://".length)}`;
  return t;
}

/**
 * HTTP(S) origin for Socket.IO (no path, no namespace).
 * Order: `VITE_WS_URL` → origin from absolute `VITE_API_URL` → `window.location.origin` (browser).
 * Matches `import.meta.env.VITE_WS_URL || window.location.origin` when env is unset in the browser.
 */
export function getSocketIoOrigin(): string {
  const ws = import.meta.env.VITE_WS_URL?.trim();
  if (ws) {
    try {
      return new URL(wsToHttpUrl(ws)).origin;
    } catch {
      // fall through
    }
  }
  const api = import.meta.env.VITE_API_URL?.trim();
  if (api && !api.startsWith("/")) {
    try {
      return new URL(api).origin;
    } catch {
      // fall through
    }
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

type SocketIoClientOptions = NonNullable<Parameters<typeof io>[1]>;

/**
 * Shared Socket.IO client: connects to {@link getSocketIoOrigin} on the default namespace `/`.
 * Always sets `withCredentials: true`. Pass options (e.g. `auth`, `reconnection`) as needed.
 */
export function createSocketIoClient(options?: SocketIoClientOptions): Socket {
  const origin = getSocketIoOrigin();
  if (!origin) {
    throw new Error(
      "Socket.IO origin unavailable: set VITE_WS_URL or absolute VITE_API_URL, or run in a browser.",
    );
  }
  return io(origin, {
    withCredentials: true,
    ...(options ?? {}),
  });
}
