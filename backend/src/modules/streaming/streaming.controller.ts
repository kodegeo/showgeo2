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
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from "@nestjs/swagger";
import { StreamingService } from "./streaming.service";
import { CreateSessionDto, GenerateTokenDto, UpdateMetricsDto, ValidateGeofenceDto } from "./dto";
import { JwtAuthGuard, RolesGuard } from "../../common/guards";
import { Roles, CurrentUser, Public } from "../../common/decorators";
import { User, UserRole } from "@prisma/client";

@ApiTags("streaming")
@Controller("streaming")
export class StreamingController {
  constructor(private readonly streamingService: StreamingService) {}

  @Post("session/:eventId")
  @UseGuards(JwtAuthGuard, RolesGuard)
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
    return this.streamingService.createSession(createSessionDto, user.id, user.role);
  }

  @Post("token/:eventId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Generate LiveKit access token (authenticated)" })
  @ApiParam({ name: "eventId", type: String })
  @ApiResponse({ status: 200, description: "Token generated successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Access denied due to geofencing or ticket requirement" })
  @ApiResponse({ status: 404, description: "No active streaming session found" })
  generateToken(
    @Param("eventId") eventId: string,
    @Body() generateTokenDto: GenerateTokenDto,
    @CurrentUser() user: User,
  ) {
    return this.streamingService.generateToken(eventId, generateTokenDto, user.id);
  }

  @Post("session/:id/end")
  @UseGuards(JwtAuthGuard, RolesGuard)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
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
  @UseGuards(JwtAuthGuard)
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

