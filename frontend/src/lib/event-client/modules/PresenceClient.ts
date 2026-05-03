import type { EventState } from "../EventState";

export class PresenceClient {
  constructor(private state: EventState) {}

  getViewerCount(): number {
    return this.state.getViewerCount();
  }

  getFans() {
    return this.state.getFans();
  }
}
