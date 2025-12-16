import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { EventsController } from "./events.controller";
import { EventsService } from "./events.service";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  imports: [
    AuthModule,     // ← REQUIRED
  ],
  controllers: [EventsController],
  providers: [EventsService, PrismaService],
  exports: [EventsService],
})
export class EventsModule {}

