import {
  Controller,
  Get,
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
import { CreateUserProfileDto, UpdateUserProfileDto } from "./dto";
import { JwtAuthGuard, RolesGuard } from "../../common/guards";
import { Roles, CurrentUser, Public } from "../../common/decorators";
import { User, UserRole } from "@prisma/client";

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all entities owned or followed by user" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "User entities" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  findEntities(@Param("id") id: string, @CurrentUser() user: User) {
    // Users can only view their own entities
    if (user.id !== id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("You can only view your own entities");
    }
    return this.usersService.findEntities(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
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

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
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

