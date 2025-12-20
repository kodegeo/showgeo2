import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor, FileFieldsInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from "@nestjs/swagger";

import { AssetsService } from "./assets.service";
import {
  UploadAssetDto,
  AssetQueryDto,
  UploadCreatorMediaDto,
  BulkUploadDto,
} from "./dto";

import { RolesGuard } from "../../common/guards";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { Roles, CurrentUser, Public } from "../../common/decorators";

import { app_users as PrismaUser, UserRole as PrismaUserRole } from "@prisma/client";

import type { Express } from "express-serve-static-core";
import { AssetUploadDebug } from "../../debug/asset-upload-debug";

type CurrentUserShape = Pick<PrismaUser, "id" | "role"> & {
  // In case your CurrentUser decorator returns a lighter object:
  id: string;
  role: PrismaUserRole;
};

const multerOptions = {
  limits: {
    fileSize: 500 * 1024 * 1024,
  },
};

/**
 * Convert Prisma enum UserRole -> App enum UserRole.
 * This preserves strict typing without changing runtime behavior.
 */

export function toUserRole(
  role: PrismaUserRole | string | undefined | null,
): PrismaUserRole {
  if (!role) return PrismaUserRole.USER;

  // If it's already a valid Prisma enum value, return it
  if (Object.values(PrismaUserRole).includes(role as PrismaUserRole)) {
    return role as PrismaUserRole;
  }

  // Safe fallback
  return PrismaUserRole.USER;
}

@ApiTags("assets")
@Controller("assets")
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  // --------------------------------------------------------------------------
  // UPLOAD (USER AVATAR, BANNER, ETC.)
  // --------------------------------------------------------------------------
  @Post("upload")
  @UseGuards(SupabaseAuthGuard)
  @UseInterceptors(FileInterceptor("file", multerOptions))
  @ApiBearerAuth()
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload an asset file" })
  @ApiResponse({ status: 201, description: "Asset uploaded successfully" })
  @ApiResponse({ status: 400, description: "Bad request - invalid file or parameters" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - insufficient permissions" })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadAssetDto,
    @CurrentUser() user: CurrentUserShape,
  ) {
    // ---------------------------------------------------------------------
    // 🔥 FULL DEBUG INJECTION FOR UPLOAD ISSUES
    // ---------------------------------------------------------------------
    try {
      AssetUploadDebug.requestReceived({
        route: "POST /assets/upload",
        userId: user?.id,
        role: user?.role,
      });

      AssetUploadDebug.multerResult(file, uploadDto);

      AssetUploadDebug.supabaseConfig({
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET,
        SUPABASE_SERVICE_ROLE_KEY:
          process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 6) + "...(redacted)",
      });
    } catch (err) {
      console.error("🔥 DEBUG LOGGING FAILED:", err);
    }
    // ---------------------------------------------------------------------

    if (!file) throw new BadRequestException("File is required");

    // Convert Prisma role -> App role to match AssetsService signature
    const appRole = toUserRole(user?.role);

    return this.assetsService.uploadAsset(file, uploadDto, user.id, appRole);
  }

  // --------------------------------------------------------------------------
  // LIST
  // --------------------------------------------------------------------------
  @Get()
  @Public()
  async list(@Query() query: AssetQueryDto, @CurrentUser() user?: CurrentUserShape) {
    return this.assetsService.listAssets(query, user?.id);
  }

  // --------------------------------------------------------------------------
  // GET BY ID
  // --------------------------------------------------------------------------
  @Get(":id")
  @Public()
  async getById(@Param("id") id: string, @CurrentUser() user?: CurrentUserShape) {
    return this.assetsService.getAssetById(id, user?.id);
  }

  // --------------------------------------------------------------------------
  // GET URL
  // --------------------------------------------------------------------------
  @Get(":id/url")
  @Public()
  async getUrl(@Param("id") id: string, @CurrentUser() user?: CurrentUserShape) {
    const url = await this.assetsService.getAssetUrl(id, user?.id);
    return { url };
  }

  // --------------------------------------------------------------------------
  // DELETE
  // --------------------------------------------------------------------------
  @Delete(":id")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param("id") id: string, @CurrentUser() user: CurrentUserShape) {
    const appRole = toUserRole(user?.role);
    return this.assetsService.deleteAsset(id, user.id, appRole);
  }

  // --------------------------------------------------------------------------
  // CREATOR UPLOAD
  // --------------------------------------------------------------------------
  @Post("creator/upload")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "ADMIN")
  @UseInterceptors(FileInterceptor("file", multerOptions))
  @ApiBearerAuth()
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload creator media (entity only)" })
  async uploadCreatorMedia(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadCreatorMediaDto,
    @CurrentUser() user: CurrentUserShape,
  ) {
    if (!file) throw new BadRequestException("File is required");

    const appRole = toUserRole(user?.role);
    return this.assetsService.uploadCreatorMedia(file, uploadDto, user.id, appRole);
  }

  // --------------------------------------------------------------------------
  // CREATOR BULK UPLOAD
  // --------------------------------------------------------------------------
  @Post("creator/bulk-upload")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "ADMIN")
  @UseInterceptors(FileFieldsInterceptor([{ name: "files", maxCount: 10 }], multerOptions))
  @ApiBearerAuth()
  @ApiConsumes("multipart/form-data")
  async bulkUploadCreatorMedia(
    @UploadedFiles() files: { files?: Express.Multer.File[] },
    @Body("entityId") entityId: string,
    @Body("items") itemsString: string,
    @Body("isPublic") isPublic?: boolean,
    @CurrentUser() user?: CurrentUserShape,
  ) {
    if (!files?.files?.length) throw new BadRequestException("Files are required");
    if (!user?.id) throw new BadRequestException("User context is required");

    let items: BulkUploadDto["items"];
    try {
      items = JSON.parse(itemsString);
    } catch {
      throw new BadRequestException("Invalid items JSON");
    }

    const bulkDto: BulkUploadDto = { entityId, items, isPublic };

    const appRole = toUserRole(user?.role);
    return this.assetsService.bulkUploadCreatorMedia(files.files, bulkDto, user.id, appRole);
  }

  // --------------------------------------------------------------------------
  // CREATOR GALLERY
  // --------------------------------------------------------------------------
  @Get("creator/:entityId/gallery")
  @Public()
  async getCreatorGallery(
    @Param("entityId") entityId: string,
    @Query() query: AssetQueryDto,
    @CurrentUser() user?: CurrentUserShape,
  ) {
    return this.assetsService.getCreatorGallery(entityId, query, user?.id);
  }
}
