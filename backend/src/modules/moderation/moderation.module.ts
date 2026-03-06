import { Module } from "@nestjs/common";
import { ModerationService } from "./moderation.service";
import { ModerationController } from "./moderation.controller";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [ModerationController],
  providers: [ModerationService, PrismaService],
  exports: [ModerationService],
})
export class ModerationModule {}

