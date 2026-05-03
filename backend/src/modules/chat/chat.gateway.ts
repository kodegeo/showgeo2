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
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ChatService } from "./chat.service";

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@Injectable()
@WebSocketGateway({
  cors: { origin: "*", credentials: true },
  namespace: "/chat",
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private supabase: SupabaseClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly chatService: ChatService,
  ) {
    const url = this.configService.get<string>("SUPABASE_URL")!;
    const serviceRoleKey = this.configService.get<string>("SUPABASE_SERVICE_ROLE_KEY")!;
    this.supabase = createClient(url, serviceRoleKey);
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        (typeof client.handshake.query?.token === "string" ? client.handshake.query.token : null);

      if (!token) {
        this.logger.warn(`Chat client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      const { data, error } = await this.supabase.auth.getUser(token);
      if (error || !data?.user) {
        this.logger.warn(`Invalid chat token from client ${client.id}`);
        client.disconnect();
        return;
      }

      client.userId = data.user.id;
      this.logger.log(`Chat client ${client.id} connected for user ${client.userId}`);
    } catch (err) {
      this.logger.error(`Chat connection error for ${client.id}`, err);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Chat client ${client.id} disconnected`);
  }

  @SubscribeMessage("join_event")
  handleJoinEvent(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { eventId: string },
  ) {
    const eventId = payload?.eventId;
    if (eventId && typeof eventId === "string") {
      client.join(eventId);
      this.logger.debug(`Client ${client.id} joined room ${eventId}`);
    }
  }

  @SubscribeMessage("leave_event")
  handleLeaveEvent(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { eventId: string },
  ) {
    const eventId = payload?.eventId;
    if (eventId && typeof eventId === "string") {
      client.leave(eventId);
      this.logger.debug(`Client ${client.id} left room ${eventId}`);
    }
  }

  @SubscribeMessage("send_message")
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { eventId: string; message: string },
  ) {
    const eventId = payload?.eventId;
    const message = payload?.message;

    if (!eventId || typeof eventId !== "string" || typeof message !== "string") {
      return;
    }

    const userId = client.userId ?? null;
    try {
      const result = await this.chatService.sendMessage(eventId, userId, {
        message: message.trim(),
      });
      if (result.data) {
        this.server.to(eventId).emit("new_message", result.data);
      }
    } catch (err) {
      this.logger.warn(`send_message failed for event ${eventId}:`, err);
      client.emit("send_message_error", { message: "Failed to send message" });
    }
  }
}
