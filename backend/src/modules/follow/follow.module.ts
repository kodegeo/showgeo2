import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { FollowController } from "./follow.controller";
import { FollowService } from "./follow.service";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  imports: [AuthModule],
  controllers: [FollowController],
  providers: [FollowService, PrismaService],
  exports: [FollowService], // Export for NotificationsModule integration
})
export class FollowModule {}

