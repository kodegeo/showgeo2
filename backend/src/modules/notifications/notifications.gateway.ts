import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { notifications as Notification } from "@prisma/client";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Local fallback type — avoids Prisma User errors
type User = any;

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: "*",
    credentials: true,
  },
  namespace: "/notifications",
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private userSockets: Map<string, Set<string>> = new Map();
  private supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const url = configService.get<string>("SUPABASE_URL")!;
    const serviceRoleKey =
      configService.get<string>("SUPABASE_SERVICE_ROLE_KEY")!;

    this.supabase = createClient(url, serviceRoleKey);
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token?.toString();

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // Validate JWT with Supabase
      const { data, error } = await this.supabase.auth.getUser(token);

      if (error || !data?.user) {
        this.logger.warn(`Invalid Supabase token from client ${client.id}`);
        client.disconnect();
        return;
      }

      //
      // ❗ FIXED: Supabase returns "data.user.id" — not "data.app_users.id"
      //
      const userId = data.user.id;

      // Attach userId to socket
      client.userId = userId;

      // Register socket mapping
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      this.logger.log(`Client ${client.id} connected for user ${userId}`);

      client.emit("connected", {
        userId,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.error(`Connection error for ${client.id}`, err);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const sockets = this.userSockets.get(client.userId);

      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(client.userId);
        }
      }

      this.logger.log(
        `Client ${client.id} disconnected for user ${client.userId}`,
      );
    }
  }

  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    client.emit("pong", { timestamp: new Date().toISOString() });
  }

  notifyUser(userId: string, notification: Notification) {
    const sockets = this.userSockets.get(userId);

    if (!sockets || sockets.size === 0) {
      this.logger.debug(
        `User ${userId} not connected; notification queued silently`,
      );
      return;
    }

    sockets.forEach((socketId) => {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) socket.emit("notification", notification);
    });

    this.logger.log(
      `Sent notification to user ${userId} via ${sockets.size} socket(s)`,
    );
  }

  notifyUnreadCount(userId: string, count: number) {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return;

    sockets.forEach((socketId) => {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) socket.emit("unread_count", { count });
    });
  }

  broadcastToUsers(userIds: string[], notification: Notification) {
    for (const userId of userIds) {
      this.notifyUser(userId, notification);
    }
  }
}
