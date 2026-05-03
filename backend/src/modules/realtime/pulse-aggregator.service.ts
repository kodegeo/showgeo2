import { Injectable } from "@nestjs/common";

interface TapBuffer {
  tapCount: number;
  windowStart: number;
}

/**
 * In-memory tap aggregator per event.
 * Accepts raw tap inputs and produces pulse aggregates on demand.
 *
 * TODO(Phase 2C): replace in-memory map with Redis hash keyed by eventId.
 *   Use HINCRBY for atomic tap increments across multiple instances.
 *   Use GETDEL pattern for atomic consume-and-reset.
 */
@Injectable()
export class PulseAggregatorService {
  private readonly buffers = new Map<string, TapBuffer>();
  private readonly activeEvents = new Set<string>();

  markEventActive(eventId: string): void {
    this.activeEvents.add(eventId);
    if (!this.buffers.has(eventId)) {
      this.buffers.set(eventId, { tapCount: 0, windowStart: Date.now() });
    }
  }

  recordTap(eventId: string): void {
    const buf = this.buffers.get(eventId);
    if (!buf) return;
    buf.tapCount++;
  }

  /**
   * Consume accumulated taps for an event window.
   * Resets the counter after reading.
   * Returns null if no taps occurred — caller should skip broadcast.
   */
  consume(eventId: string): { energy: number; tapCount: number; windowMs: number } | null {
    const buf = this.buffers.get(eventId);
    if (!buf || buf.tapCount === 0) return null;

    const now = Date.now();
    const windowMs = now - buf.windowStart;
    const tapCount = buf.tapCount;

    // Logarithmic energy curve: 1 tap → ~25, 10 taps → ~58, 50 taps → ~98, 100+ → 100
    const energy = Math.min(100, Math.round(Math.log1p(tapCount) * 25));

    buf.tapCount = 0;
    buf.windowStart = now;

    return { energy, tapCount, windowMs };
  }

  listActiveEvents(): string[] {
    return [...this.activeEvents];
  }
}
