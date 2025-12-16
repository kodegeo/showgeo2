import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  forwardRef,
  Inject,
  Optional,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import {
  AssetType,
  AssetOwnerType,
  StorageProvider,
  UserRole,
  EntityRoleType,
  Prisma,
} from "@prisma/client";
// Use Prisma's generated type for assets model
type Asset = Prisma.assetsGetPayload<{}>;
import {
  UploadAssetDto,
  AssetQueryDto,
  UploadCreatorMediaDto,
  BulkUploadDto,
  MediaPurpose,
} from "./dto";
import * as path from "path";
import * as crypto from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { EntitiesService } from "../entities/entities.service";
import { AssetUploadDebug } from "../../debug/asset-upload-debug";

// Type definitions for Express Multer files
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  private readonly supabase: SupabaseClient | null;
  private readonly supabaseBucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Optional()
    @Inject(forwardRef(() => EntitiesService))
    private readonly entitiesService: EntitiesService,

  ) {
    const supabaseUrl = this.configService.get<string>("SUPABASE_URL");
    const supabaseKey = this.configService.get<string>("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      this.logger.warn(
        "Supabase configuration missing (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY). Supabase uploads will fail.",
      );
      this.supabase = null;
    } else {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    // Bucket name – can be overridden via env, defaults to "showgeo-assets"
    this.supabaseBucket = this.configService.get<string>("SUPABASE_STORAGE_BUCKET", "showgeo-assets");
  }

  /**
   * Upload an asset file
   * This handles ownership validation, path generation, storage upload & DB record.
   */
  async uploadAsset(
    file: MulterFile,
    uploadDto: UploadAssetDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Asset> {
    this.logger.log(
      `Uploading asset: type=${uploadDto.type}, ownerType=${uploadDto.ownerType}, ownerId=${uploadDto.ownerId}`,
    );
    
    // Debug DTO + file using existing helper
    AssetUploadDebug.multerResult(file, uploadDto);

    try {
      // Validate file
      this.validateFile(file, uploadDto.type);

      // Validate ownership/permissions
      await this.validateOwnership(uploadDto.ownerType, uploadDto.ownerId, userId, userRole);

      // Generate unique file path
      const fileExtension = path.extname(file.originalname).toLowerCase();
      const fileName = `${crypto.randomUUID()}${fileExtension}`;
      const folderPath = this.generateFolderPath(uploadDto.ownerType, uploadDto.ownerId);
      const filePath = `${folderPath}/${fileName}`;

      this.logger.debug(`Generated file path: ${filePath}`);

      // Determine storage provider
      const providerConfig = this.configService.get<string>("STORAGE_PROVIDER") ?? "SUPABASE";
      const provider =
        typeof providerConfig === "string"
          ? (providerConfig.toUpperCase() as StorageProvider)
          : providerConfig ?? StorageProvider.SUPABASE;

      // Upload to storage
      const publicUrl = await this.uploadToStorage(file, filePath, provider);


      // Extract metadata
      const metadata = await this.extractMetadata(file, uploadDto.type);

      // Merge custom metadata
      const finalMetadata: Record<string, any> = {
        ...metadata,
        ...(uploadDto.metadata || {}),
      };

      AssetUploadDebug.prismaInsert({
        ownerId: uploadDto.ownerId,
        ownerType: uploadDto.ownerType,
        path: filePath,
        metadata: finalMetadata,
      });
            
      // Atomic DB write
      const asset = await this.prisma.$transaction(async (tx) => {
        const createdAsset = await (tx as any).assets.create({
          data: {
            ownerId: uploadDto.ownerId,
            ownerType: uploadDto.ownerType,
            url: publicUrl,
            path: filePath,
            type: uploadDto.type,
            mimeType: file.mimetype,
            size: file.size,
            width: metadata.width,
            height: metadata.height,
            duration: metadata.duration,
            metadata: JSON.parse(JSON.stringify(finalMetadata)) as Prisma.InputJsonValue,
            isPublic: uploadDto.isPublic ?? false,
            storageProvider: provider,
          },
        });

        // Auto-update user profile avatar/banner
        if (uploadDto.ownerType === AssetOwnerType.USER && uploadDto.metadata?.purpose) {
          const purpose = uploadDto.metadata.purpose;
          if (purpose === "avatar" || purpose === "banner") {
            await this.updateUserProfileImageInternal(tx, uploadDto.ownerId, purpose, publicUrl);
          }
        }

        return createdAsset;
      });

      this.logger.log(`Asset uploaded successfully: id=${asset.id}, url=${asset.url}`);
      return asset;
    } catch (error) {
      AssetUploadDebug.finalError(error);
      this.logger.error(
        `Failed to upload asset: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
    
  }

  /**
   * Update user profile image (avatar or banner) inside transaction
   */
  private async updateUserProfileImageInternal(
    tx: Prisma.TransactionClient,
    userId: string,
    purpose: string,
    imageUrl: string,
  ): Promise<void> {
    try {
      const updateData: Record<string, string> = {};
      if (purpose === "avatar") {
        updateData.avatarUrl = imageUrl;
      } else if (purpose === "banner") {
        updateData.bannerUrl = imageUrl;
      } else {
        this.logger.warn(`Unknown profile image purpose: ${purpose}`);
        return;
      }

      if (Object.keys(updateData).length === 0) return;

      const profile = await (tx as any).user_profiles.findUnique({
        where: { userId },
      });

      if (profile) {
        await (tx as any).user_profiles.update({
          where: { userId },
          data: updateData,
        });
        this.logger.debug(`Updated user profile ${purpose} for userId=${userId}`);
      } else {
        await (tx as any).user_profiles.create({
          data: {
            userId,
            ...updateData,
          },
        });
        this.logger.debug(`Created user profile with ${purpose} for userId=${userId}`);
      }
    } catch (error) {
      // Log but don't fail upload
      this.logger.error(
        `Failed to update user profile image: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Upload creator media (entity) with optional profile updates
   */
  async uploadCreatorMedia(
    file: MulterFile,
    uploadDto: UploadCreatorMediaDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Asset> {
    this.logger.log(
      `Uploading creator media: entityId=${uploadDto.entityId}, type=${uploadDto.type}, purpose=${uploadDto.purpose}`,
    );

    const uploadAssetDto: UploadAssetDto = {
      type: uploadDto.type,
      ownerType: AssetOwnerType.ENTITY,
      ownerId: uploadDto.entityId,
      isPublic: uploadDto.isPublic ?? true,
      metadata: {
        purpose: uploadDto.purpose || MediaPurpose.GALLERY,
        ...(uploadDto.metadata || {}),
      },
    };

    const asset = await this.uploadAsset(file, uploadAssetDto, userId, userRole);

    if (uploadDto.purpose === MediaPurpose.THUMBNAIL || uploadDto.purpose === MediaPurpose.BANNER) {
      await this.updateEntityProfileImage(uploadDto.entityId, uploadDto.purpose, asset.url, userId, userRole);
    }

    return asset;
  }

  /**
   * Bulk upload creator media (multiple files)
   */
  async bulkUploadCreatorMedia(
    files: MulterFile[],
    bulkDto: BulkUploadDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Asset[]> {
    this.logger.log(`Bulk uploading ${files.length} files for entityId=${bulkDto.entityId}`);

    if (!files || files.length === 0) {
      throw new BadRequestException("No files provided");
    }

    if (files.length !== bulkDto.items.length) {
      throw new BadRequestException(
        `Number of files (${files.length}) must match number of items (${bulkDto.items.length})`,
      );
    }

    const uploadedAssets: Asset[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const file = files[i];
        const item = bulkDto.items[i];

        const uploadDto: UploadCreatorMediaDto = {
          type: item.type,
          entityId: bulkDto.entityId,
          purpose: item.purpose || MediaPurpose.GALLERY,
          isPublic: bulkDto.isPublic ?? true,
          metadata: item.metadata,
        };

        const asset = await this.uploadCreatorMedia(file, uploadDto, userId, userRole);
        uploadedAssets.push(asset);
        this.logger.debug(`Bulk upload item ${i + 1}/${files.length} completed`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({ index: i, error: errorMessage });
        this.logger.error(`Failed to upload file ${i + 1}/${files.length}: ${errorMessage}`);
      }
    }

    if (errors.length > 0) {
      this.logger.warn(
        `Bulk upload completed with ${errors.length} errors out of ${files.length} files`,
      );
      if (uploadedAssets.length === 0) {
        throw new BadRequestException(
          `All files failed to upload. Errors: ${errors
            .map((e) => `File ${e.index + 1}: ${e.error}`)
            .join("; ")}`,
        );
      }
    }

    this.logger.log(
      `Bulk upload completed: ${uploadedAssets.length}/${files.length} files uploaded successfully`,
    );
    return uploadedAssets;
  }

  /**
   * Update entity profile image (thumbnail/banner)
   */
  private async updateEntityProfileImage(
    entityId: string,
    purpose: MediaPurpose,
    imageUrl: string,
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    if (purpose !== MediaPurpose.THUMBNAIL && purpose !== MediaPurpose.BANNER) return;

    try {
      const updateData: any = {};
      if (purpose === MediaPurpose.THUMBNAIL) {
        updateData.thumbnail = imageUrl;
      } else if (purpose === MediaPurpose.BANNER) {
        updateData.bannerImage = imageUrl;
      }

      if (this.entitiesService && typeof this.entitiesService.updateEntity === "function") {
        await this.entitiesService.updateEntity(entityId, updateData, userId, userRole);
      } else {
        await this.prisma.entities.update({
          where: { id: entityId },
          data: updateData,
        });
      }
          } catch (error) {
      this.logger.error(
        `Failed to update entity profile image: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Get creator gallery
   */
  async getCreatorGallery(
    entityId: string,
    query: AssetQueryDto,
    userId?: string,
  ): Promise<{ data: Asset[]; total: number; page: number; limit: number }> {
    return this.listAssets(
      {
        ...query,
        ownerType: AssetOwnerType.ENTITY,
        ownerId: entityId,
      },
      userId,
    );
  }

  /**
   * Get asset by ID
   */
  async getAssetById(id: string, userId?: string): Promise<Asset> {
    const asset = await (this.prisma as any).assets.findUnique({
      where: { id },
    });

    if (!asset) {
      throw new NotFoundException("Asset not found");
    }

    if (!asset.isPublic) {
      if (!userId && asset.ownerType === AssetOwnerType.USER) {
        throw new ForbiddenException("You do not have access to this asset");
      }

      if (asset.ownerType === AssetOwnerType.USER && asset.ownerId !== userId) {
        throw new ForbiddenException("You do not have access to this asset");
      }

      if (asset.ownerType === AssetOwnerType.ENTITY) {
        const hasAccess = userId ? await this.checkEntityAccess(asset.ownerId, userId) : false;
        if (!hasAccess) {
          throw new ForbiddenException("You do not have access to this asset");
        }
      }
    }

    return asset;
  }

  /**
   * List assets with filters
   */
  async listAssets(
    query: AssetQueryDto,
    userId?: string,
  ): Promise<{ data: Asset[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.type) where.type = query.type;
    if (query.ownerType) where.ownerType = query.ownerType;
    if (query.ownerId) where.ownerId = query.ownerId;
    if (query.isPublic !== undefined) where.isPublic = query.isPublic;

    if (!userId) {
      where.isPublic = true;
    } else {
      const publicOrOwned = {
        OR: [{ isPublic: true }, { ownerId: userId, ownerType: AssetOwnerType.USER }],
      };
      where.AND = [publicOrOwned];
    }

    const [data, total] = await Promise.all([
      this.prisma.assets.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      (this.prisma as any).assets.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Delete asset
   */
  async deleteAsset(id: string, userId: string, userRole: UserRole): Promise<void> {
    const asset = await (this.prisma as any).assets.findUnique({
      where: { id },
    });

    if (!asset) {
      throw new NotFoundException("Asset not found");
    }

    if (asset.ownerType === AssetOwnerType.USER) {
      if (asset.ownerId !== userId && userRole !== UserRole.ADMIN) {
        throw new ForbiddenException("You do not have permission to delete this asset");
      }
    } else if (asset.ownerType === AssetOwnerType.ENTITY) {
      const hasAccess = await this.checkEntityAccess(asset.ownerId, userId);
      if (!hasAccess && userRole !== UserRole.ADMIN) {
        throw new ForbiddenException("You do not have permission to delete this asset");
      }
    }

    try {
      await this.deleteFromStorage(asset.path, asset.storageProvider);
    } catch (e) {
      this.logger.warn(`Storage deletion failed but DB delete will continue: ${e.message}`);
    }
    
    await this.prisma.assets.delete({ where: { id } });
  }
    
  /**
   * Get asset URL
   */
  async getAssetUrl(id: string, userId?: string): Promise<string | null> {
    const asset = await this.getAssetById(id, userId);
    return asset.url ?? null;
  }
  
  /**
   * Validate file against type constraints
   */
  private validateFile(file: MulterFile, type: AssetType): void {
    if (!file || !file.buffer || !file.originalname) {
      throw new BadRequestException("Invalid file: file buffer or name is missing");
    }

    if (file.size === 0) {
      throw new BadRequestException("File is empty");
    }

    const allowedMimeTypes: Record<AssetType, string[]> = {
      [AssetType.IMAGE]: [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg",
      ],
      [AssetType.AUDIO]: [
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/ogg",
        "audio/mp4",
        "audio/webm",
        "audio/x-m4a",
      ],
      [AssetType.VIDEO]: [
        "video/mp4",
        "video/webm",
        "video/ogg",
        "video/quicktime",
        "video/x-msvideo",
      ],
      [AssetType.DOCUMENT]: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ],
      [AssetType.OTHER]: [],
    };

    const maxSizes: Record<AssetType, number> = {
      [AssetType.IMAGE]: 5 * 1024 * 1024,
      [AssetType.AUDIO]: 50 * 1024 * 1024,
      [AssetType.VIDEO]: 500 * 1024 * 1024,
      [AssetType.DOCUMENT]: 10 * 1024 * 1024,
      [AssetType.OTHER]: 100 * 1024 * 1024,
    };

    if (type !== AssetType.OTHER) {
      const allowed = allowedMimeTypes[type];
      if (type === AssetType.IMAGE && file.mimetype.startsWith("video/")) {
        throw new BadRequestException("Video file cannot be uploaded as an image.");
      }      
    }

    const maxSize = maxSizes[type];
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / 1024 / 1024).toFixed(1);
      const actualSizeMB = (file.size / 1024 / 1024).toFixed(1);
      throw new BadRequestException(
        `File size (${actualSizeMB}MB) exceeds maximum for ${type} (${maxSizeMB}MB)`,
      );
    }

    this.logger.debug(
      `File validation passed: ${file.originalname}, type=${type}, size=${file.size} bytes, mime=${file.mimetype}`,
    );
  }

  /**
   * Validate ownership and permissions
   */
  private async validateOwnership(
    ownerType: AssetOwnerType,
    ownerId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    if (ownerType === AssetOwnerType.USER) {
      if (ownerId !== userId && userRole !== UserRole.ADMIN) {
        throw new ForbiddenException("You can only upload assets for your own account");
      }
    } else if (ownerType === AssetOwnerType.ENTITY) {
      const entity = await (this.prisma as any).entities.findUnique({
        where: { id: ownerId },
        include: { roles: true },
      });

      if (!entity) {
        throw new NotFoundException("Entity not found");
      }

      const allowedRoles: EntityRoleType[] = [
        EntityRoleType.OWNER,
        EntityRoleType.ADMIN,
        EntityRoleType.MANAGER,
      ];
      const hasAccess =
        entity.ownerId === userId ||
        entity.roles.some((role) => role.userId === userId && allowedRoles.includes(role.role)) ||
        userRole === UserRole.ADMIN;

      if (!hasAccess) {
        throw new ForbiddenException(
          "You do not have permission to upload assets for this entity",
        );
      }
    }
  }

  /**
   * Check if user has access to entity
   */
  private async checkEntityAccess(entityId: string, userId: string): Promise<boolean> {
    const entity = await (this.prisma as any).entities.findUnique({
      where: { id: entityId },
      include: { roles: true },
    });

    if (!entity) return false;

    const allowedRoles: EntityRoleType[] = [
      EntityRoleType.OWNER,
      EntityRoleType.ADMIN,
      EntityRoleType.MANAGER,
    ];
    return (
      entity.ownerId === userId ||
      entity.roles.some((role) => role.userId === userId && allowedRoles.includes(role.role))
    );
  }

  /**
   * Generate folder path for asset
   */
  private generateFolderPath(ownerType: AssetOwnerType, ownerId: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    if (ownerType === AssetOwnerType.USER) {
      // => users/<userId>/<year>/<month>
      return `users/${ownerId}/${year}/${month}`;
    } else {
      // => entities/<entityId>/gallery/<year>/<month>
      return `entities/${ownerId}/gallery/${year}/${month}`;
    }
  }

  /**
   * Upload file to storage provider
   */
  private async uploadToStorage(
    file: MulterFile,
    filePath: string,
    provider: StorageProvider,
  ): Promise<string> {
    this.logger.debug(`Uploading to ${provider}: ${filePath} (${file.size} bytes)`);

    try {
      switch (provider) {
        case StorageProvider.SUPABASE:
          return await this.uploadToSupabase(file, filePath);
        case StorageProvider.AWS_S3:
          return await this.uploadToS3(file, filePath);
        case StorageProvider.CLOUDFLARE_R2:
          return await this.uploadToR2(file, filePath);
        case StorageProvider.LOCAL:
          return await this.uploadToLocal(file, filePath);
        default: {
          this.logger.warn(`Unknown storage provider: ${provider}, using LOCAL fallback URL`);
          const baseUrl =
            this.configService.get<string>("LOCAL_STORAGE_URL") || "http://localhost:3000/uploads";
          return `${baseUrl}/${filePath}`;
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to upload to ${provider}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        `Failed to upload file to storage: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * ✅ REAL Supabase upload
   */
  private async uploadToSupabase(file: MulterFile, filePath: string): Promise<string> {
    if (!this.supabase) {
      throw new InternalServerErrorException(
        "Supabase client is not configured. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      );
    }
  
    this.logger.debug(
      `Uploading to Supabase bucket="${this.supabaseBucket}", path="${filePath}", size=${file.size}`,
    );
  
    // Log config once per upload
    AssetUploadDebug.supabaseConfig({
      SUPABASE_URL: this.configService.get("SUPABASE_URL"),
      SUPABASE_SERVICE_ROLE_KEY: this.configService.get("SUPABASE_SERVICE_ROLE_KEY"),
      SUPABASE_STORAGE_BUCKET: this.supabaseBucket,
    });
  
    const { error } = await this.supabase.storage
      .from(this.supabaseBucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });
  
    if (error) {
      AssetUploadDebug.supabaseUploadResult(filePath, false, error);
      this.logger.error(`Supabase upload error: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Supabase upload failed: ${error.message}`);
    }
  
    AssetUploadDebug.supabaseUploadResult(filePath, true);
  
    const {
      data: { publicUrl },
    } = this.supabase.storage.from(this.supabaseBucket).getPublicUrl(filePath);
  
    this.logger.debug(`Supabase public URL: ${publicUrl}`);
    return publicUrl;
  }
  
  /**
   * AWS S3 placeholder
   */
  private async uploadToS3(file: MulterFile, filePath: string): Promise<string> {
    const bucket = this.configService.get<string>("AWS_S3_BUCKET", "showgeo-assets");
    const region = this.configService.get<string>("AWS_REGION", "us-east-1");
    this.logger.warn("uploadToS3 is not fully implemented. Returning computed public URL only.");
    return `https://${bucket}.s3.${region}.amazonaws.com/${filePath}`;
  }

  /**
   * Cloudflare R2 placeholder
   */
  private async uploadToR2(file: MulterFile, filePath: string): Promise<string> {
    const accountId = this.configService.get<string>("CLOUDFLARE_ACCOUNT_ID", "");
    const bucket = this.configService.get<string>("CLOUDFLARE_R2_BUCKET", "showgeo-assets");
    this.logger.warn("uploadToR2 is not fully implemented. Returning computed public URL only.");
    return `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${filePath}`;
  }

  /**
   * Local storage placeholder
   */
  private async uploadToLocal(file: MulterFile, filePath: string): Promise<string> {
    const baseUrl =
      this.configService.get<string>("LOCAL_STORAGE_URL") || "http://localhost:3000/uploads";
    this.logger.warn("uploadToLocal is not fully implemented (no actual write).");
    return `${baseUrl}/${filePath}`;
  }

  /**
   * Delete from storage provider
   */
  private async deleteFromStorage(filePath: string, provider: StorageProvider): Promise<void> {
    this.logger.debug(`Deleting from ${provider}: ${filePath}`);

    try {
      switch (provider) {
        case StorageProvider.SUPABASE:
          await this.deleteFromSupabase(filePath);
          break;
        case StorageProvider.AWS_S3:
          await this.deleteFromS3(filePath);
          break;
        case StorageProvider.CLOUDFLARE_R2:
          await this.deleteFromR2(filePath);
          break;
        case StorageProvider.LOCAL:
          await this.deleteFromLocal(filePath);
          break;
        default:
          this.logger.warn(`Unknown storage provider: ${provider}, skipping deletion`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to delete from ${provider}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Don't throw – DB delete should still proceed
    }
  }

  private async deleteFromSupabase(filePath: string): Promise<void> {
    if (!this.supabase) {
      this.logger.warn("Supabase client not configured; cannot delete from storage.");
      return;
    }

    const { error } = await this.supabase.storage
      .from(this.supabaseBucket)
      .remove([filePath]);

    if (error) {
      this.logger.error(`Supabase delete error: ${error.message}`, error.stack);
    }
  }

  private async deleteFromS3(filePath: string): Promise<void> {
    this.logger.warn("deleteFromS3 not implemented yet.");
  }

  private async deleteFromR2(filePath: string): Promise<void> {
    this.logger.warn("deleteFromR2 not implemented yet.");
  }

  private async deleteFromLocal(filePath: string): Promise<void> {
    this.logger.warn("deleteFromLocal not implemented yet.");
  }

  /**
   * Extract basic metadata
   */
  private async extractMetadata(
    file: MulterFile,
    type: AssetType,
  ): Promise<Record<string, any>> {
    const metadata: Record<string, any> = {
      originalName: file.originalname,
      uploadedAt: new Date().toISOString(),
      mimeType: file.mimetype,
    };

    // Hooks for future sharp/ffmpeg extraction
    switch (type) {
      case AssetType.IMAGE:
        // TODO: image dimensions via sharp
        break;
      case AssetType.VIDEO:
        // TODO: dimensions + duration via ffmpeg
        break;
      case AssetType.AUDIO:
        // TODO: duration via ffprobe
        break;
    }

    return metadata;
  }
}
