import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ConfigModule } from "@nestjs/config";
import { StreamingController } from "./streaming.controller";
import { LivekitWebhookController } from "./livekit-webhook.controller";
import { StreamingService } from "./streaming.service";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [AuthModule, ConfigModule, NotificationsModule],
  controllers: [StreamingController, LivekitWebhookController],
  providers: [StreamingService, PrismaService],
  exports: [StreamingService],
})
export class StreamingModule {}

