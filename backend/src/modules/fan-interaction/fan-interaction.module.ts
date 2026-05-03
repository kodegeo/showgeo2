import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { FanInteractionController } from "./fan-interaction.controller";
import { FanInteractionService } from "./fan-interaction.service";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [FanInteractionController],
  providers: [FanInteractionService],
  exports: [FanInteractionService],
})
export class FanInteractionModule {}
