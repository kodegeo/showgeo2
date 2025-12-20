import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly config: ConfigService) {
    // Fallback to process.env if ConfigService hasn't loaded yet (production mode)
    let databaseUrl = config.get<string>("DATABASE_URL") || process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is missing (ConfigService and process.env both empty)");
    }

    // Strip quotes if present (ConfigService or .env file might include them)
    databaseUrl = databaseUrl.trim().replace(/^["']+|["']+$/g, "");

    // Validate URL format
    if (!databaseUrl.startsWith("postgresql://")) {
      throw new Error(`DATABASE_URL must start with postgresql://. Got: ${JSON.stringify(databaseUrl.substring(0, 60))}...`);
    }

    // Detect and warn about duplication
    const postgresqlMatches = databaseUrl.match(/postgresql:\/\//g);
    if (postgresqlMatches && postgresqlMatches.length > 1) {
      console.error(`⚠️ WARNING: DATABASE_URL appears to be duplicated (found ${postgresqlMatches.length} instances of 'postgresql://')`);
      console.error(`⚠️ DATABASE_URL length: ${databaseUrl.length} characters`);
      console.error(`⚠️ First 100 chars: ${databaseUrl.substring(0, 100)}`);
      console.error(`⚠️ This will cause database connection failures. Please fix your .env file.`);
      // Extract only the first URL
      const firstUrlMatch = databaseUrl.match(/^(postgresql:\/\/[^\s]+)/);
      if (firstUrlMatch) {
        databaseUrl = firstUrlMatch[1];
        console.warn(`⚠️ Using first URL only: ${databaseUrl.substring(0, 60)}...`);
      }
    }

    super({
      datasources: {
        db: { url: databaseUrl },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
