import type { EventSocket } from "../EventSocket";
import type { EventState } from "../EventState";

export class ChatClient {
  constructor(private eventId: string, private socket: EventSocket, private state: EventState) {}

  send(message: string): void {
    this.socket.emit("event:chat", { eventId: this.eventId, text: message });
  }

  getMessages() {
    return this.state.getChatMessages();
  }
}
