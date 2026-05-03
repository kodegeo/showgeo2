import type { EventSocket } from "../EventSocket";
import type { EventState } from "../EventState";

export class ReactionsClient {
  constructor(private eventId: string, private socket: EventSocket, private state: EventState) {}

  send(type: string, payload?: Record<string, unknown>): void {
    this.socket.emit("fan:reaction", { eventId: this.eventId, type, ...payload });
  }

  getReactions() {
    return this.state.getReactions();
  }
}
