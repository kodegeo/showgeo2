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

function wsToHttpOrigin(url: string): string {
  const t = url.trim().replace(/\/$/, "");
  if (t.startsWith("wss://")) return `https://${t.slice("wss://".length)}`;
  if (t.startsWith("ws://")) return `http://${t.slice("ws://".length)}`;
  return t;
}

/**
 * HTTP(S) origin for Socket.IO (no path). Uses `VITE_WS_URL` when set, otherwise derives
 * from an absolute `VITE_API_URL`.
 */
export function getSocketIoOrigin(): string | undefined {
  const ws = import.meta.env.VITE_WS_URL?.trim();
  if (ws) {
    try {
      const httpish = wsToHttpOrigin(ws);
      return new URL(httpish).origin;
    } catch {
      return undefined;
    }
  }
  const api = import.meta.env.VITE_API_URL?.trim();
  if (api && !api.startsWith("/")) {
    try {
      return new URL(api).origin;
    } catch {
      return undefined;
    }
  }
  // Local dev: same origin as the Vite app; proxy `/socket.io` to the NestJS server (see vite.config).
  if (import.meta.env.DEV && typeof window !== "undefined") {
    return window.location.origin;
  }
  return undefined;
}
