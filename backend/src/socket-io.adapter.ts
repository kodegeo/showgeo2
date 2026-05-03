import { IoAdapter } from "@nestjs/platform-socket.io";
import type { ServerOptions } from "socket.io";
import { buildSocketIoCors } from "./modules/realtime/socket.config";

/**
 * Nest's first WebSocketGateway can win Server construction; merged options can
 * still yield Engine.IO `cors` that falls back to `origin: "*"`, which is
 * invalid with `credentials: true` (browser blocks). Force explicit origins
 * on every Socket.IO server instance.
 */
export class AppSocketIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, {
      ...(options ?? {}),
      cors: buildSocketIoCors(),
    });
  }
}
