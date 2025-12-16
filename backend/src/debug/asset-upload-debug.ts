// src/debug/asset-upload-debug.ts
import { Logger } from "@nestjs/common";

export class AssetUploadDebug {
  private static logger = new Logger("AssetUploadDebug");

  static requestReceived(req: any) {
    this.logger.debug("➡️ Upload request received", {
      headers: req?.headers ?? {},
      contentType: req?.headers?.["content-type"] ?? "unknown",
    });
  }
  
  static multerResult(file: any, body: any) {
    this.logger.debug("📦 Multer processed file", {
      hasFile: !!file,
      originalname: file?.originalname,
      mimetype: file?.mimetype,
      size: file?.size,
    });

    this.logger.debug("📨 Body received", body);
  }

  static supabaseConfig(cfg: any) {
    this.logger.debug("🔐 Supabase config check", {
      SUPABASE_URL: cfg.SUPABASE_URL ? "Present" : "Missing",
      SUPABASE_SERVICE_ROLE_KEY: cfg.SUPABASE_SERVICE_ROLE_KEY ? "Present" : "Missing",
      SUPABASE_STORAGE_BUCKET: cfg.SUPABASE_STORAGE_BUCKET,
    });
  }

  static supabaseUploadResult(filePath: string, success: boolean, error?: any) {
    this.logger.debug("☁️ Supabase upload result", {
      filePath,
      success,
      error: error?.message,
    });
  }

  static prismaInsert(data: any) {
    this.logger.debug("🧩 Prisma insert attempt", data);
  }

  static prismaError(error: any) {
    this.logger.error("❌ Prisma error", error);
  }

  static finalError(error: any) {
    this.logger.error("💥 Final error thrown", {
      message: error.message,
      stack: error.stack,
    });
  }
}
