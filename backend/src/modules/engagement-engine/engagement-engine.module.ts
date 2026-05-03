import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { EngagementEngineController } from "./engagement-engine.controller";
import { EngagementEngineService } from "./engagement-engine.service";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [EngagementEngineController],
  providers: [EngagementEngineService],
  exports: [EngagementEngineService],
})
export class EngagementEngineModule {}
