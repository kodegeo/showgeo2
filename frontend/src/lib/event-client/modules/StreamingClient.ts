import type { EventState } from "../EventState";

/**
 * Placeholder for streaming-specific state (e.g. session id, live status).
 * EventClient can delegate streaming API calls here when needed.
 */
export class StreamingClient {
  constructor(private state: EventState) {}

  getViewerCount(): number {
    return this.state.getViewerCount();
  }
}
