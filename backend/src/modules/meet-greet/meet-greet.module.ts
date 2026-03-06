import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ConfigModule } from "@nestjs/config";
import { MeetGreetController } from "./meet-greet.controller";
import { MeetGreetFanController } from "./meet-greet.fan.controller";
import { MeetGreetService } from "./meet-greet.service";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  imports: [AuthModule, ConfigModule],
  controllers: [MeetGreetController, MeetGreetFanController],
  providers: [MeetGreetService, PrismaService],
  exports: [MeetGreetService],
})
export class MeetGreetModule {}

