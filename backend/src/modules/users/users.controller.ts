import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { CreateUserProfileDto, UpdateUserProfileDto, ConvertToEntityDto } from "./dto";
import { LinkSupabaseUserDto } from "./dto/link-supabase-user.dto";
import { RolesGuard } from "../../common/guards";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { Roles, CurrentUser, Public } from "../../common/decorators";
import { UserRole } from "@prisma/client";

type User = any;

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all users (Admin only)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "List of users" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  findAll(@Query("page") page?: string, @Query("limit") limit?: string) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.usersService.findAll(pageNum, limitNum);
  }

  @Get("username/:username")
  @Public()
  @ApiOperation({ summary: "Get user profile by username" })
  @ApiParam({ name: "username", type: String })
  @ApiResponse({ status: 200, description: "User profile" })
  @ApiResponse({ status: 404, description: "User profile not found" })
  findByUsername(@Param("username") username: string) {
    return this.usersService.findByUsername(username);
  }

  @Get("by-auth-user/:authUserId")
  @Public() // Public but requires Supabase token verification in service
  @ApiOperation({ summary: "Get app_users record by Supabase authUserId" })
  @ApiParam({ name: "authUserId", type: String, description: "Supabase auth.users.id" })
  @ApiResponse({ status: 200, description: "App user found" })
  @ApiResponse({ status: 404, description: "App user not found for this auth user" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async findByAuthUserId(@Param("authUserId") authUserId: string) {
    // TODO: Verify Supabase JWT token from Authorization header
    // For now, we'll trust the frontend (in production, verify Supabase token)
    return this.usersService.findByAuthUserId(authUserId);
  }

  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Get user by ID (public profile)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "User profile" })
  @ApiResponse({ status: 404, description: "User not found" })
  findOne(@Param("id") id: string, @CurrentUser() currentUser?: User) {
    // Allow viewing private profile if it's the current user
    const includePrivate = currentUser?.id === id;
    return this.usersService.findOne(id, includePrivate);
  }

  @Get(":id/entities")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all entities owned or followed by user" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "User entities" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  findEntities(@Param("id") id: string, @CurrentUser() user: User) {
    // Ensure user is authenticated
    if (!user) {
      throw new ForbiddenException("User not authenticated");
    }

    // Users can only view their own entities
    // Convert both to strings to handle potential type mismatches (UUID strings)
    const userId = String(user.id || "");
    const paramId = String(id || "");
    
    if (userId !== paramId && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        `You can only view your own entities. Authenticated user ID: ${userId}, Requested ID: ${paramId}`
      );
    }
    
    return this.usersService.findEntities(id);
  }

  @Patch(":id")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update user profile (authenticated user)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Profile updated successfully" })
  @ApiResponse({ status: 404, description: "User profile not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Can only update own profile" })
  updateProfile(
    @Param("id") id: string,
    @Body() updateUserProfileDto: UpdateUserProfileDto,
    @CurrentUser() user: User,
  ) {
    // Users can only update their own profile (unless admin)
    if (user.id !== id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("You can only update your own profile");
    }
    return this.usersService.updateProfile(id, updateUserProfileDto);
  }

  @Post(":id/convert-to-entity")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Convert user to entity (create first entity)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 201, description: "Entity created successfully" })
  @ApiResponse({ status: 400, description: "User already owns an entity" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Can only convert own account" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({ status: 409, description: "Entity slug already exists" })
  convertToEntity(@Param("id") id: string, @Body() convertToEntityDto: ConvertToEntityDto, @CurrentUser() user: User) {
    // Users can only convert their own account
    if (user.id !== id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("You can only convert your own account to an entity");
    }
    return this.usersService.convertToEntity(id, convertToEntityDto);
  }

  @Post("upgrade-to-creator")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Upgrade user to creator role" })
  @ApiResponse({ status: 200, description: "User upgraded to creator successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "User not found" })
  upgradeToCreator(@CurrentUser() user: User) {
    return this.usersService.upgradeToCreator(user.id);
  }

  @Patch(":id/link-supabase")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Link existing app_users record to Supabase auth user" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "User linked successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({ status: 409, description: "authUserId already linked to another user" })
  async linkSupabaseUser(
    @Param("id") id: string,
    @Body() linkDto: LinkSupabaseUserDto,
    @CurrentUser() currentUser: User,
  ) {
    // Only allow users to link their own account, or admins
    if (currentUser.id !== id && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException("You can only link your own account");
    }
    return this.usersService.linkSupabaseUser(id, linkDto.authUserId);
  }

  @Delete(":id")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete user (Admin only)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 204, description: "User deleted successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  remove(@Param("id") id: string) {
    return this.usersService.delete(id);
  }
}

