import {
  Controller,
  Get,
  Param,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { FollowService } from "./follow.service";
import { Public } from "../../common/decorators";

/**
 * Alias controller for legacy frontend routes.
 * Provides /follow/user/:userId endpoint without /api prefix for compatibility.
 * Reuses existing follow logic and guards.
 */
@ApiTags("follow")
@Controller() // No prefix - routes will be at root level
export class FollowAliasController {
  constructor(private readonly followService: FollowService) {}

  /**
   * Get entities followed by user (public).
   * Alias for /api/follow/user/:userId - same logic, same guards, same response.
   */
  @Get("follow/user/:userId")
  @Public()
  @ApiOperation({ summary: "Get entities followed by user (public) (legacy alias)" })
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
    // Reuse exact same logic as FollowController.getFollowing()
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.followService.getFollowing(userId, pageNum, limitNum);
  }
}

