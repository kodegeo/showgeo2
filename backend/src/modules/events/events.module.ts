import { Module, forwardRef } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { EventsController } from "./events.controller";
import { EventsAliasController } from "./events-alias.controller";
import { EventsService } from "./events.service";
import { EventRoleGuard } from "./guards/event-role.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { RegistrationsModule } from "../registrations/registrations.module";

@Module({
  imports: [
    AuthModule,     // ← REQUIRED
    forwardRef(() => RegistrationsModule),
  ],
  controllers: [EventsController, EventsAliasController],
  providers: [EventsService, EventRoleGuard, PrismaService],
  exports: [EventsService],
})
export class EventsModule {}

