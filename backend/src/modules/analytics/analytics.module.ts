import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  imports: [ScheduleModule.forRoot()], // Enable scheduler for cron jobs
  controllers: [AnalyticsController],
  providers: [AnalyticsService, PrismaService],
  exports: [AnalyticsService], // Export for integration with other modules
})
export class AnalyticsModule {}

