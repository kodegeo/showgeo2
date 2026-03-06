import {
  Controller,
  Get,
  Post,
  Param,
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
} from "@nestjs/swagger";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles, CurrentUser } from "../../common/decorators";
import { assertFullUser } from "../../common/guards/assert-full-user";
import { MeetGreetService, MeetGreetSession } from "./meet-greet.service";
import { StartNextSessionResponseDto, ArtistVipJoinResponseDto } from "./dto";

type User = any;

@ApiTags("meet-greet")
@Controller()
export class MeetGreetController {
  constructor(private readonly meetGreetService: MeetGreetService) {}

  /**
   * GET /api/events/:eventId/meet-greet/queue
   * Get all sessions for an event, ordered by slotOrder
   */
  @Get("events/:eventId/meet-greet/queue")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "COORDINATOR", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get meet & greet queue for an event" })
  @ApiParam({ name: "eventId", type: String })
  @ApiResponse({ status: 200, description: "Queue of sessions" })
  @ApiResponse({ status: 403, description: "Forbidden - insufficient permissions" })
  @ApiResponse({ status: 404, description: "Event not found" })
  async getQueue(
    @Param("eventId") eventId: string,
    @CurrentUser() user: User,
  ): Promise<MeetGreetSession[]> {
    assertFullUser(user);
    await this.meetGreetService.checkEventPermissions(eventId, user.id);
    return this.meetGreetService.getQueue(eventId);
  }

  /**
   * GET /api/events/:eventId/meet-greet/current
   * Get the currently active session for an event
   */
  @Get("events/:eventId/meet-greet/current")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "COORDINATOR", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current active meet & greet session" })
  @ApiParam({ name: "eventId", type: String })
  @ApiResponse({ status: 200, description: "Current session or null" })
  @ApiResponse({ status: 403, description: "Forbidden - insufficient permissions" })
  @ApiResponse({ status: 404, description: "Event not found" })
  async getCurrent(
    @Param("eventId") eventId: string,
    @CurrentUser() user: User,
  ): Promise<MeetGreetSession | null> {
    assertFullUser(user);
    await this.meetGreetService.checkEventPermissions(eventId, user.id);
    return this.meetGreetService.getCurrentSession(eventId);
  }

  /**
   * POST /api/events/:eventId/meet-greet/start-next
   * Start the next pending session for an event
   */
  @Post("events/:eventId/meet-greet/start-next")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "COORDINATOR", "ADMIN")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Start the next pending meet & greet session" })
  @ApiParam({ name: "eventId", type: String })
  @ApiResponse({ status: 200, description: "Session started or no pending sessions", type: StartNextSessionResponseDto })
  @ApiResponse({ status: 400, description: "Bad request - active session already exists" })
  @ApiResponse({ status: 403, description: "Forbidden - insufficient permissions" })
  @ApiResponse({ status: 404, description: "Event not found" })
  async startNext(
    @Param("eventId") eventId: string,
    @CurrentUser() user: User,
  ): Promise<StartNextSessionResponseDto> {
    assertFullUser(user);
    await this.meetGreetService.checkEventPermissions(eventId, user.id);
    
    const session = await this.meetGreetService.startNextSession(eventId);
    
    if (session) {
      return {
        session,
        started: true,
        message: "Session started successfully",
      };
    }
    
    return {
      session: null,
      started: false,
      message: "No pending sessions available",
    };
  }

  /**
   * POST /api/meet-greet/sessions/:sessionId/complete
   * Mark a session as completed
   */
  @Post("meet-greet/sessions/:sessionId/complete")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "COORDINATOR", "ADMIN")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Mark a meet & greet session as completed" })
  @ApiParam({ name: "sessionId", type: String })
  @ApiResponse({ status: 200, description: "Session completed" })
  @ApiResponse({ status: 400, description: "Bad request - invalid state transition" })
  @ApiResponse({ status: 403, description: "Forbidden - insufficient permissions" })
  @ApiResponse({ status: 404, description: "Session not found" })
  async complete(
    @Param("sessionId") sessionId: string,
    @CurrentUser() user: User,
  ): Promise<MeetGreetSession> {
    assertFullUser(user);
    
    // Check authorization: get eventId from session, then verify permissions
    const eventId = await this.meetGreetService.getEventIdFromSession(sessionId);
    await this.meetGreetService.checkEventPermissions(eventId, user.id);
    
    return this.meetGreetService.markSessionCompleted(sessionId);
  }

  /**
   * POST /api/meet-greet/sessions/:sessionId/miss
   * Mark a session as missed
   */
  @Post("meet-greet/sessions/:sessionId/miss")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "COORDINATOR", "ADMIN")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Mark a meet & greet session as missed" })
  @ApiParam({ name: "sessionId", type: String })
  @ApiResponse({ status: 200, description: "Session marked as missed" })
  @ApiResponse({ status: 400, description: "Bad request - invalid state transition" })
  @ApiResponse({ status: 403, description: "Forbidden - insufficient permissions" })
  @ApiResponse({ status: 404, description: "Session not found" })
  async miss(
    @Param("sessionId") sessionId: string,
    @CurrentUser() user: User,
  ): Promise<MeetGreetSession> {
    assertFullUser(user);
    
    // Check authorization: get eventId from session, then verify permissions
    const eventId = await this.meetGreetService.getEventIdFromSession(sessionId);
    await this.meetGreetService.checkEventPermissions(eventId, user.id);
    
    return this.meetGreetService.markSessionMissed(sessionId);
  }

  /**
   * POST /api/events/:eventId/meet-greet/join-vip
   * Generate LiveKit token for artist to join VIP room (Phase 4D)
   */
  @Post("events/:eventId/meet-greet/join-vip")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "COORDINATOR", "ADMIN")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Generate LiveKit token for VIP room (artist)" })
  @ApiParam({ name: "eventId", type: String })
  @ApiResponse({
    status: 200,
    description: "VIP room token generated successfully",
    type: ArtistVipJoinResponseDto,
  })
  @ApiResponse({ status: 400, description: "Bad request - no active session" })
  @ApiResponse({ status: 403, description: "Forbidden - insufficient permissions" })
  @ApiResponse({ status: 404, description: "Event not found" })
  @ApiResponse({ status: 500, description: "Internal server error - LiveKit not configured" })
  async joinVip(
    @Param("eventId") eventId: string,
    @CurrentUser() user: User,
  ): Promise<ArtistVipJoinResponseDto> {
    assertFullUser(user);
    await this.meetGreetService.checkEventPermissions(eventId, user.id);
    return this.meetGreetService.generateArtistVipToken(eventId, user.id);
  }
}

