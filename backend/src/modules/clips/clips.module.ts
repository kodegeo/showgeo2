import { Module } from "@nestjs/common";
import { ClipsController } from "./clips.controller";
import { ClipsService } from "./clips.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [ClipsController],
  providers: [ClipsService, PrismaService],
  exports: [ClipsService],
})
export class ClipsModule {}
