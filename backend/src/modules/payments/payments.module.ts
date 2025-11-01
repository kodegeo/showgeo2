import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  imports: [ConfigModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PrismaService],
  exports: [PaymentsService], // Export for AnalyticsModule revenue integration
})
export class PaymentsModule {}

