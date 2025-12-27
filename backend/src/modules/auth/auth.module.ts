import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { AuthAliasController } from "./auth-alias.controller";
import { AuthService } from "./auth.service";
import { PrismaService } from "../../prisma/prisma.service";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { DevOnlyGuard } from "../../common/guards/dev-only.guard";

@Module({
  imports: [ConfigModule],
  // Register real controller first to ensure /api/auth/* routes are matched before alias routes
  controllers: [AuthController, AuthAliasController],
  providers: [AuthService, PrismaService, SupabaseAuthGuard, DevOnlyGuard],
  exports: [AuthService],
})
export class AuthModule {}
