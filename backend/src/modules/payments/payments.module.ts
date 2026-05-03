import { Module, forwardRef } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ConfigModule } from "@nestjs/config";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { EscrowModule } from "../escrow/escrow.module";
import { TicketsModule } from "../tickets/tickets.module";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  imports: [AuthModule, ConfigModule, EscrowModule, forwardRef(() => TicketsModule)],
  controllers: [PaymentsController],
  providers: [PaymentsService, PrismaService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

