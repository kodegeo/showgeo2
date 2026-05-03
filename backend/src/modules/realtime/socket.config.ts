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

/**
 * CORS config for Socket.IO / Engine.IO (and shared with HTTP `enableCors` in main).
 * Includes `FRONTEND_URL` and `SOCKET_IO_CORS_ORIGINS` (comma-separated) when set.
 */
export function buildSocketIoCors(): { origin: string[]; credentials: true } {
  const origins = new Set<string>([
    ...DEFAULT_ORIGINS,
    ...originFromUrlEnv("FRONTEND_URL"),
    ...originsFromCommaEnv("SOCKET_IO_CORS_ORIGINS"),
  ]);
  return {
    origin: [...origins],
    credentials: true,
  };
}

/** Snapshot at load time for `@WebSocketGateway({ cors: SOCKET_CORS })` metadata. */
export const SOCKET_CORS = buildSocketIoCors();
