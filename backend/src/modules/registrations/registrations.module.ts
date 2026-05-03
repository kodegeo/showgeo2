import { Module, forwardRef } from "@nestjs/common";
import { RegistrationsController, MailboxController } from "./registrations.controller";
import { RegistrationsService } from "./registrations.service";
import { EventAccessRulesService } from "./event-access-rules.service";
import { PrismaService } from "../../prisma/prisma.service";
import { EventsModule } from "../events/events.module";
import { AuthModule } from "../auth/auth.module";
import { EmailModule } from "../email/email.module";
import { MessagesModule } from "../messages/messages.module";

@Module({
  imports: [forwardRef(() => EventsModule), AuthModule, EmailModule, MessagesModule],
  controllers: [RegistrationsController, MailboxController],
  providers: [RegistrationsService, EventAccessRulesService, PrismaService],
  exports: [RegistrationsService],
})
export class RegistrationsModule {}

