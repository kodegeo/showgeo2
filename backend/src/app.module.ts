import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./modules/auth/auth.module";
import { EventsModule } from "./modules/events/events.module";
import { UsersModule } from "./modules/users/users.module";
import { EntitiesModule } from "./modules/entities/entities.module";
import { FollowModule } from "./modules/follow/follow.module";
import { StoreModule } from "./modules/store/store.module";
import { StreamingModule } from "./modules/streaming/streaming.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { AssetsModule } from "./modules/assets/assets.module";
import { UploadModule } from "./modules/upload/upload.module";
import { SupabaseModule } from "./modules/supabase/supabase.module";
import { RegistrationsModule } from "./modules/registrations/registrations.module";
import { MeetGreetModule } from "./modules/meet-greet/meet-greet.module";
import { EventActivitiesModule } from "./modules/event-activities/event-activities.module";
import { ModerationModule } from "./modules/moderation/moderation.module";
import { AdminModule } from "./modules/admin/admin.module";
import { AdminReportsModule } from "./modules/admin-reports/admin-reports.module";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from "nestjs-pino";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      // In production, also read from process.env (Fly.io secrets, etc.)
      ignoreEnvFile: false,
      // Expand variables from process.env if .env file doesn't exist
      expandVariables: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 100,
      },
    ]),
        LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === "production" ? "info" : "debug",
      },
    }),
    AuthModule,
    EventsModule,
    UsersModule,
    EntitiesModule,
    FollowModule,
    StoreModule,
    StreamingModule,
    NotificationsModule,
    AnalyticsModule,
    PaymentsModule,
    AssetsModule,
    UploadModule,
    SupabaseModule,
    RegistrationsModule,
    MeetGreetModule,
    EventActivitiesModule,
    ModerationModule,
    AdminModule,
    AdminReportsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // If you want to enforce global auth guard:
    // {
    //   provide: APP_GUARD,
    //   useClass: SupabaseAuthGuard,
    // },
  ],
})
export class AppModule {}
