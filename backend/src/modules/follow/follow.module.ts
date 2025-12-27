import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { FollowController } from "./follow.controller";
import { FollowAliasController } from "./follow-alias.controller";
import { FollowService } from "./follow.service";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  imports: [AuthModule],
  controllers: [FollowController, FollowAliasController],
  providers: [FollowService, PrismaService],
  exports: [FollowService], // Export for NotificationsModule integration
})
export class FollowModule {}

