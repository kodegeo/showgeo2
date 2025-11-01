import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { StreamingController } from "./streaming.controller";
import { StreamingService } from "./streaming.service";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  imports: [ConfigModule],
  controllers: [StreamingController],
  providers: [StreamingService, PrismaService],
  exports: [StreamingService], // Export for real-time metrics integration
})
export class StreamingModule {}

