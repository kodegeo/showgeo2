import { EventPhase } from "@/types/eventPhase";

/**
 * Normalize API / Prisma phase strings to the app enum (handles casing and separators).
 */
export function normalizeEventPhase(phase: unknown): EventPhase {
  const p = String(phase ?? "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "_");
  if (p === "LIVE") return EventPhase.LIVE;
  if (p === "POST_LIVE") return EventPhase.POST_LIVE;
  if (p === "PRE_LIVE") return EventPhase.PRE_LIVE;
  return EventPhase.PRE_LIVE;
}

/**
 * Single contract: event is in the live *phase* (broadcast window), per backend `events.phase`.
 * Do not infer from status, local flags, or session alone.
 */
export function isLivePhase(phase: unknown): boolean {
  return normalizeEventPhase(phase) === EventPhase.LIVE;
}
