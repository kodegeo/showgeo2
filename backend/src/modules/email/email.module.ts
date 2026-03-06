import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EmailService } from "./email.service";

/**
 * Email Module
 * 
 * Provides email sending capabilities for the application.
 * Email is secondary to mailbox notifications and must never block execution.
 */
@Module({
  imports: [ConfigModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}


