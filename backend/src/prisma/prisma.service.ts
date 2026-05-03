import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log: ["error", "warn"],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

/**
 * Some editors resolve `PrismaClient` / `PrismaService` without generated model delegates
 * until `npx prisma generate` runs and the TS server restarts. At runtime this is always a full client.
 */
export function asPrismaDb(client: PrismaService): any {
  return client;
}
