/**
 * Processes highlight moments (e.g. clip-worthy moments) for an event session.
 * Can be extended for timestamp-based highlights, voting, etc.
 */
export class HighlightProcessor {
  constructor(private readonly eventId: string) {}

  getEventId(): string {
    return this.eventId;
  }

  /** Process a highlight-related payload. Extend for real logic. */
  process(_payload: unknown): void {
    // Placeholder: record or broadcast highlight
  }
}
