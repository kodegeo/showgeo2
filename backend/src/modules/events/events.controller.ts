import {
  Body,
  Patch,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { Controller, Get, Post, Param, Req } from "@nestjs/common";

import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from "@nestjs/swagger";
import { EventsService } from "./events.service";
import { CreateEventDto, UpdateEventDto, EventQueryDto, PhaseTransitionDto, EventAnalyticsDto } from "./dto";
import { UpsertEventRoleBodyDto } from "./dto/upsert-event-role.dto";
import { AudienceActionDto } from "./dto/audience-action.dto";
import { CreateReminderDto } from "./dto/create-reminder.dto";
import { CreateBlastDto } from "./dto/create-blast.dto";
import { RolesGuard } from "../../common/guards";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { assertFullUser } from "../../common/guards/assert-full-user";
import { EventRoleGuard } from "./guards/event-role.guard";
import { Roles, CurrentUser, Public } from "../../common/decorators";
import { RequireEventPhase } from "../../common/decorators/event-role.decorator";

import { Request } from "express";

import { app_users } from "@prisma/client";

type User = app_users;


@ApiTags("events")
@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // ------------------------------------------------------------
  // CREATE EVENT
  // ------------------------------------------------------------
  @Post()
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new event" })
  @ApiResponse({ status: 201, description: "Event created successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  create(
    @Body() createEventDto: CreateEventDto,
    @CurrentUser() user: User
  ) {
    assertFullUser(user);
    return this.eventsService.create(createEventDto, user.id);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: "Get all events with optional filters" })
  @ApiResponse({ status: 200, description: "List of events" })
  @ApiQuery({ name: "q", required: false, type: String })
  @ApiQuery({ name: "creatorId", required: false, type: String })
  @ApiQuery({ name: "virtual", required: false, type: String })
  @ApiQuery({ name: "vip", required: false, type: String })
  @ApiQuery({ name: "fromDate", required: false, type: String })
  @ApiQuery({ name: "toDate", required: false, type: String })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "sort", required: false, enum: ["upcoming", "newest", "trending"] })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "eventType", required: false, enum: ["LIVE", "PRERECORDED"] })
  @ApiQuery({ name: "phase", required: false, enum: ["PRE_LIVE", "LIVE", "POST_LIVE"] })
  @ApiQuery({ name: "entityId", required: false, type: String })
  @ApiQuery({ name: "tourId", required: false, type: String })
  @ApiQuery({ name: "isVirtual", required: false, type: Boolean })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  @ApiQuery({ name: "streamingAccessLevel", required: false, type: String })
  @ApiQuery({ name: "location", required: false, type: String })
  async findAll(
    @Query("q") q?: string,
    @Query("creatorId") creatorId?: string,
    @Query("virtual") virtual?: string,
    @Query("vip") vip?: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Query("status") status?: string,
    @Query("sort") sort?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query() query?: EventQueryDto,
  ) {
    return this.eventsService.findAll({
      q: q ?? query?.search,
      creatorId: creatorId ?? query?.entityId,
      virtual,
      vip,
      fromDate: fromDate ?? query?.startDate,
      toDate: toDate ?? query?.endDate,
      status: status ?? (query?.status as string | undefined),
      sort,
      page: page ? parseInt(page, 10) : query?.page ?? 1,
      limit: limit ? parseInt(limit, 10) : query?.limit ?? 12,
      search: query?.search,
      eventType: query?.eventType,
      phase: query?.phase,
      entityId: query?.entityId,
      tourId: query?.tourId,
      isVirtual: query?.isVirtual,
      startDate: query?.startDate,
      endDate: query?.endDate,
      streamingAccessLevel: query?.streamingAccessLevel,
      location: query?.location,
    });
  }

  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Get a single event by ID" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Event details" })
  @ApiResponse({ status: 404, description: "Event not found" })
  findOne(@Param("id") id: string) {
    return this.eventsService.findOne(id);
  }

  @Get(":id/access")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user's access role and operational roles for the event" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Access info or null" })
  getAccess(@Param("id") id: string, @CurrentUser() user: User) {
    const userId = user?.id ?? null;
    return this.eventsService.getAccess(id, userId);
  }

  @Get(":id/roles")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List event roles (event OWNER/ADMIN or platform ADMIN)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "List of event roles" })
  getRoles(@Param("id") id: string, @CurrentUser() user: User) {
    assertFullUser(user);
    return this.eventsService.getRoles(id, user.id);
  }

  @Post(":id/roles")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Upsert a user's event role (event OWNER/ADMIN or platform ADMIN)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Upserted event role" })
  upsertRole(
    @Param("id") id: string,
    @Body() body: UpsertEventRoleBodyDto & { userId: string },
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    const targetUserId = body.userId;
    if (!targetUserId) throw new BadRequestException("userId is required");
    return this.eventsService.upsertRole(id, targetUserId, body, user.id);
  }

  @Delete(":id/roles/:userId")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove a user's event role (event OWNER/ADMIN or platform ADMIN)" })
  @ApiParam({ name: "id", type: String })
  @ApiParam({ name: "userId", type: String })
  removeRole(@Param("id") id: string, @Param("userId") userId: string, @CurrentUser() user: User) {
    assertFullUser(user);
    return this.eventsService.removeRole(id, userId, user.id);
  }

  @Get(":id/metrics")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "COORDINATOR", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get event metrics and analytics" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Event metrics" })
  @ApiResponse({ status: 404, description: "Event not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  getMetrics(@Param("id") id: string, @Req() req: Request & { user: User }) {
    assertFullUser(req.user);
    return this.eventsService.getEventMetrics(id);
  }

  @Patch(":id")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update an event" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Event updated successfully" })
  @ApiResponse({ status: 404, description: "Event not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  update(@Param("id") id: string, @Body() updateEventDto: UpdateEventDto, @CurrentUser() user: User) {
    assertFullUser(user);
    return this.eventsService.update(id, updateEventDto, user.id);
  }

  @Delete(":id")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete an event" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 204, description: "Event deleted successfully" })
  @ApiResponse({ status: 404, description: "Event not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  remove(@Param("id") id: string, @Req() req: Request & { user: User }) {
    assertFullUser(req.user);
    return this.eventsService.remove(id);
  }

  @Post(":id/phase/transition")
  @UseGuards(SupabaseAuthGuard, EventRoleGuard)
  @RequireEventPhase()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Transition event to a new phase" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Phase transitioned successfully" })
  @ApiResponse({ status: 400, description: "Invalid phase transition" })
  @ApiResponse({ status: 404, description: "Event not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - event role required" })
  transitionPhase(
    @Param("id") id: string,
    @Body() phaseTransitionDto: PhaseTransitionDto,
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    return this.eventsService.transitionPhase(id, phaseTransitionDto, user.id);
  }

  @Post(":id/phase/extend")
  @UseGuards(SupabaseAuthGuard, EventRoleGuard)
  @RequireEventPhase()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Extend the current phase duration" })
  @ApiParam({ name: "id", type: String })
  @ApiQuery({ name: "minutes", type: Number, description: "Additional minutes to extend" })
  @ApiResponse({ status: 200, description: "Phase extended successfully" })
  @ApiResponse({ status: 400, description: "Cannot extend phase" })
  @ApiResponse({ status: 404, description: "Event not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - event role required" })
  extendPhase(@Param("id") id: string, @Query("minutes") minutes: string, @CurrentUser() user: User) {
    assertFullUser(user);
    const additionalMinutes = parseInt(minutes, 10);
    if (isNaN(additionalMinutes) || additionalMinutes <= 0) {
      throw new Error("Invalid minutes value");
    }
    return this.eventsService.extendPhase(id, additionalMinutes, user.id);
  }

  @Post(":id/metrics")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("COORDINATOR", "ENTITY", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update live metrics for an event" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Metrics updated successfully" })
  @ApiResponse({ status: 404, description: "Event not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  updateLiveMetrics(@Param("id") id: string, @Body() metrics: Record<string, unknown>, @CurrentUser() user: User) {
    assertFullUser(user);
    return this.eventsService.updateLiveMetrics(id, metrics, user.id);
  }

  @Post(":id/test-results")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("COORDINATOR", "ENTITY", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Add a test result log for an event" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Test result added successfully" })
  @ApiResponse({ status: 404, description: "Event not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  addTestResult(@Param("id") id: string, @Body() testResult: Record<string, unknown>, @CurrentUser() user: User) {
    assertFullUser(user);
    return this.eventsService.addTestResult(id, testResult, user.id);
  }

  @Get(":id/analytics")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "COORDINATOR", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get event analytics (Phase 3B)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Event analytics", type: EventAnalyticsDto })
  @ApiResponse({ status: 404, description: "Event not found" })
  @ApiResponse({ status: 403, description: "Forbidden - insufficient permissions" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  getAnalytics(@Param("id") id: string, @CurrentUser() user: User): Promise<EventAnalyticsDto> {
    assertFullUser(user);
    return this.eventsService.getEventAnalytics(id, user.id);
  }

  // ---------------------------------------------------------------------------
  // AUDIENCE & PROMOTION ACTIONS
  // ---------------------------------------------------------------------------

  @Post(":id/audience-action")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Perform audience action (send reminder, invite audience, schedule reminder)" })
  @ApiParam({ name: "id", type: String, description: "Event ID" })
  @ApiResponse({ status: 200, description: "Action completed successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - insufficient permissions" })
  @ApiResponse({ status: 404, description: "Event not found" })
  handleAudienceAction(
    @Param("id") eventId: string,
    @Body() dto: AudienceActionDto,
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    return this.eventsService.handleAudienceAction(eventId, user.id, dto);
  }

  // ---------------------------------------------------------------------------
  // REMINDER SCHEDULING
  // ---------------------------------------------------------------------------

  @Post(":id/reminders")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a scheduled reminder for an event" })
  @ApiParam({ name: "id", type: String, description: "Event ID" })
  @ApiResponse({ status: 201, description: "Reminder created successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - insufficient permissions" })
  @ApiResponse({ status: 404, description: "Event not found" })
  createReminder(
    @Param("id") eventId: string,
    @Body() dto: CreateReminderDto,
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    return this.eventsService.createReminder(eventId, user.id, dto);
  }

  @Get(":id/reminders")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all scheduled reminders for an event" })
  @ApiParam({ name: "id", type: String, description: "Event ID" })
  @ApiResponse({ status: 200, description: "List of reminders" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - insufficient permissions" })
  @ApiResponse({ status: 404, description: "Event not found" })
  getReminders(@Param("id") eventId: string, @CurrentUser() user: User) {
    assertFullUser(user);
    return this.eventsService.getReminders(eventId, user.id);
  }

  // ---------------------------------------------------------------------------
  // BLAST COMPOSER
  // ---------------------------------------------------------------------------

  @Post(":id/blasts")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a blast (message blast to audience)" })
  @ApiParam({ name: "id", type: String, description: "Event ID" })
  @ApiResponse({ status: 201, description: "Blast created successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - insufficient permissions" })
  @ApiResponse({ status: 404, description: "Event not found" })
  createBlast(
    @Param("id") eventId: string,
    @Body() dto: CreateBlastDto,
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    return this.eventsService.createBlast(eventId, user.id, dto);
  }
}

