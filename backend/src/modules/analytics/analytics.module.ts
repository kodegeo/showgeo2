import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ScheduleModule } from "@nestjs/schedule";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [AuthModule, ScheduleModule.forRoot(), PrismaModule], // Enable scheduler for cron jobs
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService], // Export for integration with other modules
})
export class AnalyticsModule {}

