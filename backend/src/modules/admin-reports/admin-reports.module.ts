import { Module } from "@nestjs/common";
import { AdminReportsController, AdminReportsAdminController } from "./admin-reports.controller";
import { AdminReportsService } from "./admin-reports.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminReportsController, AdminReportsAdminController],
  providers: [AdminReportsService],
  exports: [AdminReportsService],
})
export class AdminReportsModule {}

