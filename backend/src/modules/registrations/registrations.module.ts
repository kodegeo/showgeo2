import { Module, forwardRef } from "@nestjs/common";
import { RegistrationsController, MailboxController } from "./registrations.controller";
import { RegistrationsService } from "./registrations.service";
import { PrismaService } from "../../prisma/prisma.service";
import { EventsModule } from "../events/events.module";
import { AuthModule } from "../auth/auth.module";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [forwardRef(() => EventsModule), AuthModule, EmailModule],
  controllers: [RegistrationsController, MailboxController],
  providers: [RegistrationsService, PrismaService],
  exports: [RegistrationsService],
})
export class RegistrationsModule {}

