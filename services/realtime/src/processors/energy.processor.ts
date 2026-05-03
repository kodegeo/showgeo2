/**
 * Processes "energy" metrics for an event session (e.g. aggregate engagement).
 * Can be extended for viewer energy, activity levels, etc.
 */
export class EnergyProcessor {
  constructor(private readonly eventId: string) {}

  getEventId(): string {
    return this.eventId;
  }

  /** Process an incoming energy-related payload. Extend for real logic. */
  process(_payload: unknown): void {
    // Placeholder: aggregate or forward energy metrics
  }

  /**
   * Record a single tap from a socket.
   * Phase 2B: replace with pub/sub publish so aggregator can batch across instances.
   *
   * TODO(Phase 2B): increment tap counter in Redis keyed by eventId + windowBucket
   * TODO(Phase 2B): aggregator reads counter, computes energy/velocity, emits AudiencePulseAggregate
   */
  recordTap(_socketId: string): void {
    // In-process tap receipt acknowledged. Aggregation is a Phase 2B concern.
  }
}
