import { Module, forwardRef } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { NotificationGateway } from "./notifications.gateway";
import { PrismaService } from "../../prisma/prisma.service";
import { FollowModule } from "../follow/follow.module";

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.get<string>("JWT_EXPIRES_IN") || "7d",
        },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => FollowModule), // Use forwardRef to avoid circular dependency
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationGateway, PrismaService],
  exports: [NotificationsService, NotificationGateway], // Export for integration with other modules
})
export class NotificationsModule {}
