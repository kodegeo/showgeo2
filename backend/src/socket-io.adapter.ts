import { IoAdapter } from "@nestjs/platform-socket.io";
import type { ServerOptions } from "socket.io";
import { buildSocketIoCors } from "./modules/realtime/socket.config";

/**
 * Drops gateway-supplied `cors` (can be incomplete) and always applies
 * {@link buildSocketIoCors} so Engine.IO never merges with `cors` defaults
 * (`origin: "*"`) while `credentials: true` is set.
 */
export class AppSocketIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions) {
    const { cors: _ignored, ...rest } = (options ?? {}) as ServerOptions & {
      cors?: unknown;
    };
    return super.createIOServer(port, {
      ...rest,
      cors: buildSocketIoCors(),
    });
  }
}
