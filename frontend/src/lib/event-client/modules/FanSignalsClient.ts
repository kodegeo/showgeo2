import type { EventSocket } from "../EventSocket";
import type { EventState } from "../EventState";

export class FanSignalsClient {
  constructor(private eventId: string, private socket: EventSocket, private state: EventState) {}

  send(signal: { type: string; intensity?: number; [key: string]: unknown }): void {
    this.socket.emit("fan:signal", { eventId: this.eventId, ...signal });
  }

  getFans() {
    return this.state.getFans();
  }
}
