import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ConfigModule } from "@nestjs/config";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  imports: [AuthModule, ConfigModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PrismaService],
  exports: [PaymentsService], // Export for AnalyticsModule revenue integration
})
export class PaymentsModule {}

