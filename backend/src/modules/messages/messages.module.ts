import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { EmailModule } from "../email/email.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { MessagesService } from "./messages.service";

@Module({
  imports: [PrismaModule, EmailModule, NotificationsModule],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
