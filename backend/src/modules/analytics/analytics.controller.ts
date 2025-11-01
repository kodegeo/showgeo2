import { Controller, Get, Param, UseGuards, Query, Post, ForbiddenException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from "@nestjs/swagger";
import { AnalyticsService } from "./analytics.service";
import { JwtAuthGuard, RolesGuard } from "../../common/guards";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { User, UserRole } from "@prisma/client";

@ApiTags("analytics")
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("entity/:entityId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ENTITY", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get analytics for entity (Owner/Admin)" })
  @ApiParam({ name: "entityId", type: String })
  @ApiResponse({ status: 200, description: "Entity analytics metrics" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Owner or Admin only" })
  @ApiResponse({ status: 404, description: "Entity not found" })
  async getEntityAnalytics(@Param("entityId") entityId: string, @CurrentUser() user: User) {
    // Validate user is owner or manager of entity (unless admin)
    if (user.role !== UserRole.ADMIN) {
      await this.analyticsService.validateEntityAccess(entityId, user.id);
    }
    return this.analyticsService.aggregateMetrics(entityId);
  }

  @Get("event/:eventId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get analytics for event" })
  @ApiParam({ name: "eventId", type: String })
  @ApiResponse({ status: 200, description: "Event performance metrics" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Event not found" })
  getEventAnalytics(@Param("eventId") eventId: string) {
    return this.analyticsService.getEventPerformance(eventId);
  }

  @Get("user/:userId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get analytics for user (self/Admin)" })
  @ApiParam({ name: "userId", type: String })
  @ApiResponse({ status: 200, description: "User engagement metrics" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Only self or Admin" })
  @ApiResponse({ status: 404, description: "User not found" })
  getUserAnalytics(@Param("userId") userId: string, @CurrentUser() user: User) {
    // Only allow if user is requesting own analytics or is admin
    if (userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("You can only view your own analytics");
    }

    return this.analyticsService.getUserEngagement(userId);
  }

  @Get("overview")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Platform overview (Admin only)" })
  @ApiResponse({ status: 200, description: "Platform-wide analytics" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  getPlatformOverview() {
    return this.analyticsService.getPlatformOverview();
  }

  @Get("recommendations/:userId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get recommendations (authenticated user)" })
  @ApiParam({ name: "userId", type: String })
  @ApiResponse({ status: 200, description: "Personalized recommendations" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Only self" })
  @ApiResponse({ status: 404, description: "User not found" })
  getRecommendations(@Param("userId") userId: string, @CurrentUser() user: User) {
    // Only allow if user is requesting own recommendations
    if (userId !== user.id) {
      throw new ForbiddenException("You can only view your own recommendations");
    }

    return this.analyticsService.getRecommendations(userId);
  }

  @Post("update")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Manually trigger analytics update (Admin only)" })
  @ApiResponse({ status: 200, description: "Analytics update triggered" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  async updateAnalytics() {
    await this.analyticsService.updateAnalytics();
    return { message: "Analytics update completed" };
  }
}

