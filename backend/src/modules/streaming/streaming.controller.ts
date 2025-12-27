import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from "@nestjs/swagger";
import { StreamingService } from "./streaming.service";
import { CreateSessionDto, GenerateTokenDto, UpdateMetricsDto, ValidateGeofenceDto } from "./dto";
import { RolesGuard } from "../../common/guards";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { Roles, CurrentUser, Public } from "../../common/decorators";

type User = any;

/**
 * Streaming Controller
 * 
 * All endpoints are under /api/streaming/* (via global prefix in main.ts)
 * 
 * NOTE: This controller handles ONLY signaling/auth endpoints.
 * Media traffic (WebRTC) flows directly to LiveKit Cloud (wss://*.livekit.cloud)
 * and is NEVER proxied through Fly.io.
 * 
 * Endpoints:
 * - POST /api/streaming/session/:eventId - Create session
 * - POST /api/streaming/:eventId/token - Generate LiveKit token
 * - GET  /api/streaming/active - List active sessions
 * - POST /api/streaming/session/:id/end - End session
 * - GET  /api/streaming/:id - Get session details
 * - POST /api/streaming/:id/metrics - Update metrics
 * - POST /api/streaming/validate-geofence - Validate geofence
 */
@ApiTags("streaming")
@Controller("streaming")
export class StreamingController {
  constructor(private readonly streamingService: StreamingService) {}

  @Post("session/:eventId")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "COORDINATOR", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create streaming session for event (Entity, Coordinator, Admin)" })
  @ApiParam({ name: "eventId", type: String })
  @ApiResponse({ status: 201, description: "Streaming session created successfully" })
  @ApiResponse({ status: 400, description: "Event already has active session" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Entity, Coordinator, or Admin only" })
  @ApiResponse({ status: 404, description: "Event not found" })
  createSession(
    @Param("eventId") eventId: string,
    @Body() createSessionDto: CreateSessionDto,
    @CurrentUser() user: User,
  ) {
    return this.streamingService.createSession(eventId, createSessionDto, user.id, user.role);
  }

  @Post(":eventId/token")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Generate LiveKit token for streaming (authenticated users)" })
  @ApiParam({ name: "eventId", type: String })
  @ApiResponse({ status: 200, description: "Token generated successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Event not live or geofence restriction" })
  @ApiResponse({ status: 404, description: "Event or active session not found" })
  async generateToken(
    @Param("eventId") eventId: string,
    @Body() generateTokenDto: GenerateTokenDto,
    @Req() req: any,
  )
  {
    const user = req.user;
    
    // ✅ Throw ForbiddenException if user is missing (shouldn't happen with guard, but safety check)
    if (!user || !user.id) {
      throw new ForbiddenException("Authentication required");
    }
  
    // 🔑 Populate eventId from route into DTO
    generateTokenDto.eventId = eventId;
  
    // ✅ Call service with EXACTLY two arguments
    return this.streamingService.generateToken(generateTokenDto, {
      id: user.id,
      email: user.email,
    });
  }
  @Post("session/:id/end")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "COORDINATOR", "ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "End streaming session (Entity, Coordinator, Admin)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Session ended successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Entity, Coordinator, or Admin only" })
  @ApiResponse({ status: 404, description: "Streaming session not found" })
  endSession(@Param("id") id: string, @CurrentUser() user: User) {
    return this.streamingService.endSession(id, user.id, user.role);
  }

  @Get("active")
  @Public()
  @ApiOperation({ summary: "List all active streaming sessions (public)" })
  @ApiResponse({ status: 200, description: "List of active sessions" })
  getActiveSessions() {
    return this.streamingService.getActiveSessions();
  }

  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Get streaming session details (public)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Session details with metrics" })
  @ApiResponse({ status: 404, description: "Streaming session not found" })
  getSessionDetails(@Param("id") id: string) {
    return this.streamingService.getSessionDetails(id);
  }

  @Post(":id/metrics")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("COORDINATOR", "ENTITY", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update live streaming metrics (Coordinator/Admin)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Metrics updated successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Coordinator or Admin only" })
  @ApiResponse({ status: 404, description: "Streaming session not found" })
  updateMetrics(
    @Param("id") id: string,
    @Body() updateMetricsDto: UpdateMetricsDto,
    @CurrentUser() user: User,
  ) {
    return this.streamingService.updateMetrics(id, updateMetricsDto, user.id);
  }

  @Post("validate-geofence")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Validate geofence access for session" })
  @ApiResponse({ status: 200, description: "Geofence validation result" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Access denied due to geofencing" })
  @ApiResponse({ status: 404, description: "Streaming session not found" })
  validateGeofence(@Body() validateGeofenceDto: ValidateGeofenceDto) {
    return this.streamingService.validateGeofence(validateGeofenceDto);
  }
}

