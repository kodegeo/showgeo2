import { Module } from "@nestjs/common";
import { StoreController } from "./store.controller";
import { StoreService } from "./store.service";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  controllers: [StoreController],
  providers: [StoreService, PrismaService],
  exports: [StoreService], // Export for PaymentsModule integration (future)
})
export class StoreModule {}

