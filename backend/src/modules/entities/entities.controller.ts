import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor, FileFieldsInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiConsumes } from "@nestjs/swagger";
import { EntitiesService } from "./entities.service";
import { CreateEntityDto, UpdateEntityDto, AddCollaboratorDto, EntityQueryDto, CreatorApplicationDto } from "./dto";
import { RolesGuard } from "../../common/guards";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { assertFullUser } from "../../common/guards/assert-full-user";
import { Roles, CurrentUser, Public } from "../../common/decorators";

type User = any;

@ApiTags("entities")
@Controller("entities")
export class EntitiesController {
  constructor(private readonly entitiesService: EntitiesService) {}

  @Get("my-applications")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: "Get current user's entity applications",
    description: "Returns all entity applications for the authenticated user"
  })
  @ApiResponse({ status: 200, description: "User's entity applications" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getMyApplications(@CurrentUser() user: User) {
    assertFullUser(user);
    return this.entitiesService.getUserApplications(user.id);
  }

  @Post("creator-apply")
  @UseGuards(SupabaseAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([
    { name: "proof", maxCount: 1 },
    { name: "businessDoc", maxCount: 1 },
    { name: "trademarkDoc", maxCount: 1 },
  ], {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max per file
    },
    // FileFieldsInterceptor is optional - files will be undefined if not present
  }))
  @ApiBearerAuth()
  @ApiConsumes("multipart/form-data", "application/json")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: "Apply to become a creator",
    description: "Creates an Entity with PENDING status. User must wait for admin approval. Supports both JSON and multipart/form-data (with optional proof, businessDoc, and trademarkDoc files)."
  })
  @ApiResponse({ status: 201, description: "Creator application submitted successfully" })
  @ApiResponse({ status: 400, description: "Bad request - validation error, missing terms acceptance, or file upload failure" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 409, description: "Entity with this brand name already exists" })
  async creatorApply(
    @Body() applicationDto: CreatorApplicationDto,
    @UploadedFiles() files: { proof?: Express.Multer.File[], businessDoc?: Express.Multer.File[], trademarkDoc?: Express.Multer.File[] } | undefined,
    @CurrentUser() user: User
  ) {
    assertFullUser(user);
    // Extract files from the files object (FileFieldsInterceptor returns an object with arrays)
    const proofFile = files?.proof?.[0];
    const businessDocFile = files?.businessDoc?.[0];
    const trademarkDocFile = files?.trademarkDoc?.[0];
    
    // Files will be undefined if:
    // 1. Request is JSON (application/json)
    // 2. Request is multipart but no file field is present
    // Service handles both cases gracefully
    return this.entitiesService.createCreatorApplication(
      applicationDto, 
      user.id, 
      proofFile,
      businessDocFile,
      trademarkDocFile
    );
  }

  @Post()
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new entity" })
  @ApiResponse({ status: 201, description: "Entity created successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 409, description: "Entity with this slug/name already exists" })
  create(@Body() createEntityDto: CreateEntityDto, @CurrentUser() user: User) {
    assertFullUser(user);
    return this.entitiesService.createEntity(createEntityDto, user.id);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: "Browse all entities (public)" })
  @ApiQuery({ name: "q", required: false, type: String, description: "Search query (name or tags)" })
  @ApiQuery({ name: "genre", required: false, type: String })
  @ApiQuery({ name: "verified", required: false, type: String })
  @ApiQuery({ name: "hasEvents", required: false, type: String })
  @ApiQuery({ name: "sort", required: false, enum: ["newest", "most_followed", "trending"] })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "type", required: false, enum: ["INDIVIDUAL", "ORGANIZATION"] })
  @ApiQuery({ name: "isVerified", required: false, type: Boolean })
  @ApiQuery({ name: "isPublic", required: false, type: Boolean })
  @ApiQuery({ name: "location", required: false, type: String })
  @ApiQuery({ name: "tag", required: false, type: String })
  @ApiResponse({ status: 200, description: "List of entities" })
  async findAll(
    @Query("q") q?: string,
    @Query("genre") genre?: string,
    @Query("verified") verified?: string,
    @Query("hasEvents") hasEvents?: string,
    @Query("sort") sort?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query() query?: EntityQueryDto,
  ) {
    return this.entitiesService.findAll({
      q: q ?? query?.search,
      genre: genre ?? query?.tag,
      verified: verified ?? (query?.isVerified !== undefined ? String(query.isVerified) : undefined),
      hasEvents,
      sort,
      page: page ? parseInt(page, 10) : query?.page ?? 1,
      limit: limit ? parseInt(limit, 10) : query?.limit ?? 12,
      isPublic: query?.isPublic,
      location: query?.location,
      type: query?.type,
    });
  }

  @Get("slug/:slug")
  @Public()
  @ApiOperation({ summary: "Get entity by slug (public)" })
  @ApiParam({ name: "slug", type: String })
  @ApiResponse({ status: 200, description: "Entity details" })
  @ApiResponse({ status: 404, description: "Entity not found" })
  findBySlug(@Param("slug") slug: string) {
    return this.entitiesService.findBySlug(slug);
  }

  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Get entity by ID (public)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Entity details" })
  @ApiResponse({ status: 404, description: "Entity not found" })
  findOne(@Param("id") id: string) {
    return this.entitiesService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update entity (Owner or Manager)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Entity updated successfully" })
  @ApiResponse({ status: 404, description: "Entity not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Owner or Manager only" })
  update(
    @Param("id") id: string,
    @Body() updateEntityDto: UpdateEntityDto,
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    return this.entitiesService.updateEntity(id, updateEntityDto, user.id, user.role);
  }

  @Delete(":id")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete entity (Admin or Owner)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 204, description: "Entity deleted successfully" })
  @ApiResponse({ status: 404, description: "Entity not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin or Owner only" })
  remove(@Param("id") id: string, @CurrentUser() user: User) {
    assertFullUser(user);
    // Owner check is done in service
    return this.entitiesService.delete(id, user.id, user.role);
  }

  @Post(":id/collaborators")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Add collaborator to entity (Owner/Manager)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 201, description: "Collaborator added successfully" })
  @ApiResponse({ status: 404, description: "Entity or user not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Owner/Manager only" })
  @ApiResponse({ status: 409, description: "User is already a collaborator" })
  addCollaborator(
    @Param("id") id: string,
    @Body() addCollaboratorDto: AddCollaboratorDto,
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    return this.entitiesService.addCollaborator(id, addCollaboratorDto, user.id, user.role);
  }

  @Delete(":id/collaborators/:userId")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove collaborator from entity (Owner/Manager)" })
  @ApiParam({ name: "id", type: String })
  @ApiParam({ name: "userId", type: String })
  @ApiResponse({ status: 204, description: "Collaborator removed successfully" })
  @ApiResponse({ status: 404, description: "Entity or collaborator not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Owner/Manager only" })
  removeCollaborator(@Param("id") id: string, @Param("userId") userId: string, @CurrentUser() user: User) {
    assertFullUser(user);
    return this.entitiesService.removeCollaborator(id, userId, user.id, user.role);
  }

  @Get(":id/collaborators")
  @Public()
  @ApiOperation({ summary: "List all collaborators for entity" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "List of collaborators" })
  @ApiResponse({ status: 404, description: "Entity not found" })
  getCollaborators(@Param("id") id: string) {
    return this.entitiesService.getCollaborators(id);
  }
}

