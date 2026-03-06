import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { CurrentUser } from "../../common/decorators";
import { assertFullUser } from "../../common/guards/assert-full-user";
import { MeetGreetService, MeetGreetSession } from "./meet-greet.service";
import { FanVipJoinResponseDto } from "./dto";

type User = any;

@ApiTags("meet-greet")
@Controller()
export class MeetGreetFanController {
  constructor(private readonly meetGreetService: MeetGreetService) {}

  /**
   * GET /api/meet-greet/sessions/my?eventId=...
   * Get the fan's session for an event
   */
  @Get("meet-greet/sessions/my")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get fan's meet & greet session for an event" })
  @ApiQuery({ name: "eventId", type: String, required: true })
  @ApiResponse({ status: 200, description: "Session or null" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getMySession(
    @Query("eventId") eventId: string,
    @CurrentUser() user: User,
  ): Promise<{ session: MeetGreetSession | null; currentActiveSession?: MeetGreetSession | null }> {
    assertFullUser(user);

    // Get fan's session
    const session = await this.meetGreetService.getFanSession(eventId, user.id);

    // Get current active session for UX context (optional)
    const currentActiveSession = await this.meetGreetService.getCurrentSession(eventId);

    return {
      session,
      currentActiveSession: currentActiveSession || undefined,
    };
  }

  /**
   * POST /api/meet-greet/sessions/:sessionId/join
   * Mark fan as having joined the VIP room
   */
  @Post("meet-greet/sessions/:sessionId/join")
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Join VIP meet & greet room" })
  @ApiParam({ name: "sessionId", type: String })
  @ApiResponse({ status: 200, description: "Session joined successfully" })
  @ApiResponse({ status: 400, description: "Bad request - session not active or ended" })
  @ApiResponse({ status: 403, description: "Forbidden - not your session" })
  @ApiResponse({ status: 404, description: "Session not found" })
  async join(
    @Param("sessionId") sessionId: string,
    @CurrentUser() user: User,
  ): Promise<MeetGreetSession> {
    assertFullUser(user);
    return this.meetGreetService.markFanJoined(sessionId, user.id);
  }

  /**
   * POST /api/meet-greet/sessions/:sessionId/join-vip
   * Generate LiveKit token for fan to join VIP room (Phase 4D)
   */
  @Post("meet-greet/sessions/:sessionId/join-vip")
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Generate LiveKit token for VIP room (fan)" })
  @ApiParam({ name: "sessionId", type: String })
  @ApiResponse({
    status: 200,
    description: "VIP room token generated successfully",
    type: FanVipJoinResponseDto,
  })
  @ApiResponse({ status: 400, description: "Bad request - session not active or ended" })
  @ApiResponse({ status: 403, description: "Forbidden - not your session" })
  @ApiResponse({ status: 404, description: "Session not found" })
  @ApiResponse({ status: 500, description: "Internal server error - LiveKit not configured" })
  async joinVip(
    @Param("sessionId") sessionId: string,
    @CurrentUser() user: User,
  ): Promise<FanVipJoinResponseDto> {
    assertFullUser(user);
    return this.meetGreetService.generateFanVipToken(sessionId, user.id);
  }
}

