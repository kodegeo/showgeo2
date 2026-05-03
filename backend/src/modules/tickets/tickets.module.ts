import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PaymentsModule } from "../payments/payments.module";
import { TicketsController } from "./tickets.controller";
import { MeTicketsController } from "./me-tickets.controller";
import { TicketsService } from "./tickets.service";
import { TicketTypesController } from "./ticket-types.controller";
import { TicketTypesService } from "./ticket-types.service";
import { AccessPassesController } from "./access-passes.controller";
import { AccessPassesService } from "./access-passes.service";
import { EventTicketLifecycleService } from "./event-ticket-lifecycle.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { EscrowModule } from "../escrow/escrow.module";
import { MessagesModule } from "../messages/messages.module";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    EscrowModule,
    ConfigModule,
    EmailModule,
    MessagesModule,
    forwardRef(() => PaymentsModule),
  ],
  controllers: [
    TicketsController,
    MeTicketsController,
    TicketTypesController,
    AccessPassesController,
  ],
  providers: [
    TicketsService,
    TicketTypesService,
    AccessPassesService,
    EventTicketLifecycleService,
  ],
  exports: [
    TicketsService,
    TicketTypesService,
    AccessPassesService,
    EventTicketLifecycleService,
  ],
})
export class TicketsModule {}
