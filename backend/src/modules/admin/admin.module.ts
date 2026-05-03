import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { SupabaseModule } from "../supabase/supabase.module";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "../auth/auth.module";
import { EmailModule } from "../email/email.module";
import { StreamingModule } from "../streaming/streaming.module";

@Module({
  imports: [
    ScheduleModule,
    PrismaModule,
    SupabaseModule,
    ConfigModule,
    AuthModule,
    EmailModule,
    StreamingModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

