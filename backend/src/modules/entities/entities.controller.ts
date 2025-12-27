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
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from "@nestjs/swagger";
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

  @Post("creator-apply")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: "Apply to become a creator",
    description: "Creates an Entity with PENDING status. User must wait for admin approval."
  })
  @ApiResponse({ status: 201, description: "Creator application submitted successfully" })
  @ApiResponse({ status: 400, description: "Bad request - user already has pending application" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 409, description: "Entity with this brand name already exists" })
  async creatorApply(@Body() applicationDto: CreatorApplicationDto, @CurrentUser() user: User) {
    assertFullUser(user);
    return this.entitiesService.createCreatorApplication(applicationDto, user.id);
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
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "type", required: false, enum: ["INDIVIDUAL", "ORGANIZATION"] })
  @ApiQuery({ name: "isVerified", required: false, type: Boolean })
  @ApiQuery({ name: "isPublic", required: false, type: Boolean })
  @ApiQuery({ name: "location", required: false, type: String })
  @ApiQuery({ name: "tag", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "List of entities" })
  findAll(@Query() query: EntityQueryDto) {
    return this.entitiesService.findAll(query);
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

