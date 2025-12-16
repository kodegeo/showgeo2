import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { EntitiesController } from "./entities.controller";
import { EntitiesService } from "./entities.service";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  imports: [AuthModule],
  controllers: [EntitiesController],
  providers: [EntitiesService, PrismaService],
  exports: [EntitiesService],
})
export class EntitiesModule {}

