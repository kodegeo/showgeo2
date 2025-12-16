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
import { SupabaseAuthGuard } from "./common/guards/supabase-auth.guard";
import { SupabaseModule } from "./modules/supabase/supabase.module";
import { PrismaService } from "./prisma/prisma.service";
// TODO: Add feature modules as they are implemented
// import { ToursModule } from "./modules/tours/tours.module";
// import { AiModule } from "./modules/ai/ai.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
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
    // TODO: Add feature modules as they are implemented
    // ToursModule,
    // AiModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService, // ✅ ADD THIS LINE
    // Optional: Make JWT guard global (uncomment if you want all routes protected by default)
    // {
    //   provide: APP_GUARD,
    //   useClass: SupabaseAuthGuard,
    // },
  ],
})
export class AppModule {}

