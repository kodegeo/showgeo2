import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationGateway } from "./notifications.gateway"
import { PrismaService } from "../../prisma/prisma.service";
import { FollowModule } from "../follow/follow.module";   // ← REQUIRED IMPORT

@Module({
  imports: [
    AuthModule,
    FollowModule,
  ],
  providers: [
    NotificationsService,
    NotificationGateway,
    PrismaService,
  ],
  controllers: [NotificationsController],
  exports: [NotificationsService, NotificationGateway],
})
export class NotificationsModule {}
