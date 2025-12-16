import { Module, forwardRef } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AssetsController } from "./assets.controller";
import { AssetsService } from "./assets.service";
import { PrismaService } from "../../prisma/prisma.service";
import { EntitiesModule } from "../entities/entities.module";

@Module({
  imports: [AuthModule, forwardRef(() => EntitiesModule)],
  controllers: [AssetsController],
  providers: [AssetsService, PrismaService],
  exports: [AssetsService], // Export for potential integration with other modules
})
export class AssetsModule {}

