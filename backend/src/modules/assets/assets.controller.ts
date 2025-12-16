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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiConsumes, ApiBody } from "@nestjs/swagger";
import { AssetsService } from "./assets.service";
import { UploadAssetDto, AssetQueryDto, UploadCreatorMediaDto, BulkUploadDto } from "./dto";
import { RolesGuard } from "../../common/guards";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { Roles, CurrentUser, Public } from "../../common/decorators";
import type { app_users as User } from "@prisma/client";
import type { Express } from "express-serve-static-core";
import { AssetUploadDebug } from "../../debug/asset-upload-debug";

const multerOptions = {
  limits: {
    fileSize: 500 * 1024 * 1024,
  },
};

@ApiTags("assets")
@Controller("assets")
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  // --------------------------------------------------------------------------
  // UPLOAD (USER AVATAR, BANNER, ETC.)
  // --------------------------------------------------------------------------
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
  @CurrentUser() user: User,
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

  if (!file) {
    throw new BadRequestException("File is required");
  }

  return this.assetsService.uploadAsset(file, uploadDto, user.id, user.role);
}
  // --------------------------------------------------------------------------
  // LIST
  // --------------------------------------------------------------------------
  @Get()
  @Public()
  async list(@Query() query: AssetQueryDto, @CurrentUser() user?: User) {
    return this.assetsService.listAssets(query, user?.id);
  }

  // --------------------------------------------------------------------------
  // GET BY ID
  // --------------------------------------------------------------------------
  @Get(":id")
  @Public()
  async getById(@Param("id") id: string, @CurrentUser() user?: User) {
    return this.assetsService.getAssetById(id, user?.id);
  }

  // --------------------------------------------------------------------------
  // GET URL
  // --------------------------------------------------------------------------
  @Get(":id/url")
  @Public()
  async getUrl(@Param("id") id: string, @CurrentUser() user?: User) {
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
  async delete(@Param("id") id: string, @CurrentUser() user: User) {
    return this.assetsService.deleteAsset(id, user.id, user.role);
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
    @CurrentUser() user: User,
  ) {
    if (!file) throw new BadRequestException("File is required");
    return this.assetsService.uploadCreatorMedia(file, uploadDto, user.id, user.role);
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
    @CurrentUser() user?: User,
  ) {
    if (!files?.files?.length) {
      throw new BadRequestException("Files are required");
    }

    let items: BulkUploadDto["items"];
    try {
      items = JSON.parse(itemsString);
    } catch {
      throw new BadRequestException("Invalid items JSON");
    }

    const bulkDto: BulkUploadDto = { entityId, items, isPublic };
    return this.assetsService.bulkUploadCreatorMedia(files.files, bulkDto, user!.id, user!.role);
  }

  // --------------------------------------------------------------------------
  // CREATOR GALLERY
  // --------------------------------------------------------------------------
  @Get("creator/:entityId/gallery")
  @Public()
  async getCreatorGallery(
    @Param("entityId") entityId: string,
    @Query() query: AssetQueryDto,
    @CurrentUser() user?: User,
  ) {
    return this.assetsService.getCreatorGallery(entityId, query, user?.id);
  }
}
