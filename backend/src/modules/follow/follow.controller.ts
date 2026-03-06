import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from "@nestjs/swagger";
import { FollowService } from "./follow.service";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { assertFullUser } from "../../common/guards/assert-full-user";
import { CurrentUser, Public } from "../../common/decorators";

type User = any;

@ApiTags("follow")
@Controller("follow")
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  // ---------- Event follow (must be before :entityId to avoid "event" captured as entityId) ----------
  @Post("event/:eventId")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Follow an event (like / bookmark)" })
  @ApiParam({ name: "eventId", type: String })
  @ApiResponse({ status: 201, description: "Follow ensured" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Event not found" })
  followEvent(@Param("eventId") eventId: string, @CurrentUser() user: User) {
    assertFullUser(user);
    return this.followService.followEvent(user.id, eventId);
  }
  
  @Delete("event/:eventId")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Unfollow an event" })
  @ApiParam({ name: "eventId", type: String })
  @ApiResponse({ status: 204, description: "Unfollow ensured" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async unfollowEvent(@Param("eventId") eventId: string, @CurrentUser() user: User) {
    assertFullUser(user);
    await this.followService.unfollowEvent(user.id, eventId);
  }

  @Get("event/status/:eventId")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Check if current user follows event and notify preference" })
  @ApiParam({ name: "eventId", type: String })
  @ApiResponse({ status: 200, description: "Follow status" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getEventFollowStatus(@Param("eventId") eventId: string, @CurrentUser() user: User) {
    assertFullUser(user);
    const status = await this.followService.getEventFollowStatus(user.id, eventId);
    return { eventId, userId: user.id, ...status };
  }

  @Patch("event/:eventId/notify")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Set notify/reminder preference" })
  @ApiParam({ name: "eventId", type: String })
  @ApiResponse({ status: 200, description: "Notify preference updated" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  setEventNotify(
    @Param("eventId") eventId: string,
    @Body("notify") notify: boolean,
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    return this.followService.setEventNotify(user.id, eventId, !!notify);
  }
  
  // ---------- Entity follow ----------
  @Post(":entityId")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Follow an entity" })
  @ApiParam({ name: "entityId", type: String })
  @ApiResponse({ status: 201, description: "Follow ensured" })
  @ApiResponse({ status: 400, description: "Cannot follow own entity" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Entity not found" })
  followEntity(@Param("entityId") entityId: string, @CurrentUser() user: User) {
    assertFullUser(user);
    return this.followService.followEntity(user.id, entityId);
  }

  @Delete(":entityId")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Unfollow an entity" })
  @ApiParam({ name: "entityId", type: String })
  @ApiResponse({ status: 204, description: "Unfollow ensured" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  unfollowEntity(@Param("entityId") entityId: string, @CurrentUser() user: User) {
    assertFullUser(user);
    return this.followService.unfollowEntity(user.id, entityId);
  }

  @Get(":entityId/followers")
  @Public()
  @ApiOperation({ summary: "Get followers for entity (public)" })
  @ApiParam({ name: "entityId", type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "List of followers" })
  @ApiResponse({ status: 404, description: "Entity not found" })
  getFollowers(
    @Param("entityId") entityId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.followService.getFollowers(entityId, pageNum, limitNum);
  }

  @Get("user/:userId")
  @Public()
  @ApiOperation({ summary: "Get entities followed by user (public)" })
  @ApiParam({ name: "userId", type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "List of followed entities" })
  @ApiResponse({ status: 404, description: "User not found" })
  getFollowing(
    @Param("userId") userId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.followService.getFollowing(userId, pageNum, limitNum);
  }

  @Get("status/:entityId")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Check if current user follows entity (authenticated)" })
  @ApiParam({ name: "entityId", type: String })
  @ApiResponse({ status: 200, description: "Follow status" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async isFollowing(@Param("entityId") entityId: string, @CurrentUser() user: User) {
    assertFullUser(user);
    const isFollowing = await this.followService.isFollowing(user.id, entityId);
    return {
      isFollowing,
      userId: user.id,
      entityId,
    };
  }

  @Get("counts/entity/:entityId")
  @Public()
  @ApiOperation({ summary: "Get follower count for entity (public)" })
  @ApiParam({ name: "entityId", type: String })
  @ApiResponse({ status: 200, description: "Follower count" })
  @ApiResponse({ status: 404, description: "Entity not found" })
  async getEntityFollowCounts(@Param("entityId") entityId: string) {
    const counts = await this.followService.getFollowCounts(entityId, "entity");
    return {
      entityId,
      ...counts,
    };
  }

  @Get("counts/user/:userId")
  @Public()
  @ApiOperation({ summary: "Get following count for user (public)" })
  @ApiParam({ name: "userId", type: String })
  @ApiResponse({ status: 200, description: "Following count" })
  @ApiResponse({ status: 404, description: "User not found" })
  async getUserFollowCounts(@Param("userId") userId: string) {
    const counts = await this.followService.getFollowCounts(userId, "user");
    return {
      userId,
      ...counts,
    };
  }
}

