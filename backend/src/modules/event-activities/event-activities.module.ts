import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { EventActivitiesController } from "./event-activities.controller";
import { EventActivitiesService } from "./event-activities.service";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  imports: [AuthModule],
  controllers: [EventActivitiesController],
  providers: [EventActivitiesService, PrismaService],
  exports: [EventActivitiesService],
})
export class EventActivitiesModule {}

