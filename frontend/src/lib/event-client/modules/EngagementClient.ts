import type { EventState } from "../EventState";

export class EngagementClient {
  constructor(private state: EventState) {}

  getEnergySnapshots() {
    return this.state.getEnergySnapshots();
  }

  getHighlightMoments() {
    return this.state.getHighlightMoments();
  }
}
