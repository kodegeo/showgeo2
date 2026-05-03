const DEFAULT_ORIGINS = ["http://localhost:5173", "https://showgeo.vercel.app"];

function originsFromCommaEnv(name: string): string[] {
  const raw = process.env[name]?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function originFromUrlEnv(name: string): string[] {
  const raw = process.env[name]?.trim();
  if (!raw) return [];
  try {
    return [new URL(raw).origin];
  } catch {
    return [];
  }
}

function buildAllowedOriginSet(): Set<string> {
  return new Set<string>([
    ...DEFAULT_ORIGINS,
    ...originFromUrlEnv("FRONTEND_URL"),
    ...originsFromCommaEnv("SOCKET_IO_CORS_ORIGINS"),
  ]);
}

/**
 * Socket.IO / Engine.IO + Express CORS. Uses a dynamic `origin` callback so the
 * underlying `cors` package never applies its default `{ origin: "*" }` merge
 * (which breaks `credentials: true` in browsers).
 */
export function buildSocketIoCors(): {
  origin: (
    requestOrigin: string | undefined,
    callback: (err: Error | null, allow?: string | boolean) => void,
  ) => void;
  credentials: true;
} {
  const allowed = buildAllowedOriginSet();

  return {
    credentials: true,
    origin(requestOrigin, callback) {
      if (!requestOrigin) {
        return callback(null, false);
      }
      if (allowed.has(requestOrigin)) {
        return callback(null, requestOrigin);
      }
      callback(new Error(`CORS: origin not allowed (${requestOrigin})`));
    },
  };
}

/** Used by `@WebSocketGateway({ cors: SOCKET_CORS })` — same rules as HTTP + adapter. */
export const SOCKET_CORS = buildSocketIoCors();
