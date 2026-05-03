import { Module, forwardRef } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "../auth/auth.module";
import { EventsController } from "./events.controller";
import { EventsAliasController } from "./events-alias.controller";
import { EventsService } from "./events.service";
import { EventsDiscoveryService } from "./events-discovery.service";
import { EventReminderService } from "./event-reminder.service";
import { EventRoleGuard } from "./guards/event-role.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { RegistrationsModule } from "../registrations/registrations.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { EscrowModule } from "../escrow/escrow.module";
import { ClipsModule } from "../clips/clips.module";
import { TicketsModule } from "../tickets/tickets.module";

@Module({
  imports: [
    ScheduleModule,
    AuthModule,
    forwardRef(() => RegistrationsModule),
    NotificationsModule,
    EscrowModule,
    ClipsModule,
    TicketsModule,
  ],
  controllers: [EventsController, EventsAliasController],
  providers: [EventsService, EventsDiscoveryService, EventReminderService, EventRoleGuard, PrismaService],
  exports: [EventsService],
})
export class EventsModule {}

