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
import { Injectable, UseGuards, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Notification } from "@prisma/client";
import { ConfigService } from "@nestjs/config";

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: "*", // In production, configure this properly
    credentials: true,
  },
  namespace: "/notifications",
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake query or auth header
      const token =
        client.handshake.auth?.token || client.handshake.query?.token?.toString();

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>("JWT_SECRET"),
      });

      if (!payload || !payload.sub) {
        this.logger.warn(`Invalid token for client ${client.id}`);
        client.disconnect();
        return;
      }

      // Attach userId to socket
      client.userId = payload.sub;

      // Track user socket
      if (!this.userSockets.has(client.userId)) {
        this.userSockets.set(client.userId, new Set());
      }
      this.userSockets.get(client.userId)!.add(client.id);

      this.logger.log(`Client ${client.id} connected for user ${client.userId}`);

      // Send connection confirmation
      client.emit("connected", {
        userId: client.userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`, error);
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
      this.logger.log(`Client ${client.id} disconnected for user ${client.userId}`);
    }
  }

  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    client.emit("pong", { timestamp: new Date().toISOString() });
  }

  /**
   * Notify a specific user about a new notification
   */
  notifyUser(userId: string, notification: Notification) {
    const sockets = this.userSockets.get(userId);
    if (sockets && sockets.size > 0) {
      sockets.forEach((socketId) => {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit("notification", notification);
        }
      });
      this.logger.log(`Sent notification to user ${userId} via ${sockets.size} socket(s)`);
    } else {
      this.logger.debug(`User ${userId} not connected, notification will be delivered when they reconnect`);
    }
  }

  /**
   * Notify user about unread count update
   */
  notifyUnreadCount(userId: string, count: number) {
    const sockets = this.userSockets.get(userId);
    if (sockets && sockets.size > 0) {
      sockets.forEach((socketId) => {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit("unread_count", { count });
        }
      });
    }
  }

  /**
   * Broadcast notification to multiple users
   */
  broadcastToUsers(userIds: string[], notification: Notification) {
    userIds.forEach((userId) => {
      this.notifyUser(userId, notification);
    });
  }
}

