import {
  Body,
  Patch,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { Controller, Get, Post, Param, Req } from "@nestjs/common";

import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from "@nestjs/swagger";
import { EventsService } from "./events.service";
import { EventsDiscoveryService } from "./events-discovery.service";
import { EscrowService } from "../escrow/escrow.service";
import { ClipsService } from "../clips/clips.service";
import { RegistrationsService } from "../registrations/registrations.service";
import { AccessPassesService } from "../tickets/access-passes.service";
import { SendInvitationsDto } from "../registrations/dto/send-invitations.dto";
import { CreateClipDto } from "../clips/clips.dto";
import { CreateEventDto, UpdateEventDto, EventQueryDto, PhaseTransitionDto, EventAnalyticsDto, RegisterForEventDto, ClaimInviteDto } from "./dto";
import { InviteToEventDto, InviteFollowersDto } from "../tickets/dto/invite-to-event.dto";
import { RegisterFreeDto, EventCheckoutDto } from "../tickets/dto/event-ticket-flow.dto";
import { EventTicketLifecycleService } from "../tickets/event-ticket-lifecycle.service";
import { OptionalSupabaseAuthGuard } from "../../common/guards/optional-supabase-auth.guard";
import { CreateRevenueSplitDto } from "./dto/revenue-split.dto";
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
  constructor(
    private readonly eventsService: EventsService,
    private readonly eventsDiscoveryService: EventsDiscoveryService,
    private readonly escrowService: EscrowService,
    private readonly clipsService: ClipsService,
    private readonly registrationsService: RegistrationsService,
    private readonly accessPassesService: AccessPassesService,
    private readonly eventTicketLifecycle: EventTicketLifecycleService,
  ) {}

  // ------------------------------------------------------------
  // CREATE EVENT
  // ------------------------------------------------------------
  @Post()
  @UseGuards(SupabaseAuthGuard)
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

  @Get("followed")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get upcoming or live events from creators the current user follows" })
  @ApiResponse({ status: 200, description: "List of events from followed entities" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  getFollowed(@CurrentUser() user: User) {
    assertFullUser(user);
    return this.eventsService.getFollowedEvents(user.id);
  }

  @Get("discovery")
  @Public()
  @ApiOperation({ summary: "Get discovery sections: live_now, trending, following, nearby" })
  @ApiResponse({ status: 200, description: "Discovery sections with up to 20 events each" })
  @ApiQuery({ name: "region", required: false, type: String, description: "Region code for nearby (e.g. US-CA)" })
  async getDiscovery(
    @Req() req: Request & { user?: { id: string } },
    @Query("region") region?: string,
  ) {
    const userId = req.user?.id ?? null;
    return this.eventsDiscoveryService.getDiscovery(userId, region);
  }

  @Get("my-events")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user's events with dashboard stats (tickets, revenue, escrow, clips)" })
  @ApiResponse({ status: 200, description: "Events and recent clips for creator dashboard" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  getMyEvents(@CurrentUser() user: User) {
    assertFullUser(user);
    return this.eventsService.getMyEvents(user.id);
  }

  @Get("upcoming")
  @Public()
  @ApiOperation({ summary: "Get upcoming events for discovery" })
  @ApiResponse({ status: 200, description: "List of upcoming events" })
  getUpcoming() {
    return this.eventsService.findAll({
      sort: "upcoming",
      startDate: new Date().toISOString(),
      status: "SCHEDULED",
      limit: 20,
      page: 1,
    });
  }

  @Get(":id/financial-summary")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get financial summary (escrow, revenue, splits) for event creator/collaborators" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Financial summary" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Event not found" })
  getFinancialSummary(@Param("id") eventId: string, @CurrentUser() user: User) {
    assertFullUser(user);
    return this.escrowService.getFinancialSummary(eventId, user.id);
  }

  @Get(":id/revenue")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get event revenue dashboard (tickets, revenue, escrow, collaborators)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Revenue dashboard data" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Event not found" })
  getEventRevenue(@Param("id") eventId: string, @CurrentUser() user: User) {
    assertFullUser(user);
    return this.escrowService.getEventRevenue(eventId, user.id);
  }

  @Post(":id/revenue-splits")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create or update a revenue split. Creator only. Splits must total <= 100%." })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Split created or updated" })
  @ApiResponse({ status: 400, description: "Splits locked or total exceeds 100%" })
  @ApiResponse({ status: 403, description: "Forbidden or collaborator not allowed" })
  @ApiResponse({ status: 404, description: "Event not found" })
  upsertRevenueSplit(
    @Param("id") eventId: string,
    @Body() dto: CreateRevenueSplitDto,
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    return this.escrowService.upsertRevenueSplit(
      eventId,
      dto.collaboratorId,
      dto.sharePercent,
      dto.role ?? null,
      user.id,
    );
  }

  @Post(":id/revenue-splits/:splitId/approve")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Approve a revenue split (collaborator only). When all approve, splits_locked becomes true; ticket sales can then begin." })
  @ApiParam({ name: "id", type: String, description: "Event ID" })
  @ApiParam({ name: "splitId", type: String, description: "Revenue split ID" })
  @ApiResponse({ status: 200, description: "Approval result with splitsLocked" })
  @ApiResponse({ status: 400, description: "Splits total exceeds 100%" })
  @ApiResponse({ status: 403, description: "Only the collaborator for this split can approve" })
  @ApiResponse({ status: 404, description: "Revenue split not found" })
  approveRevenueSplit(
    @Param("id") eventId: string,
    @Param("splitId") splitId: string,
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    return this.escrowService.approveSplit(eventId, splitId, user.id);
  }

  @Get(":id/clips")
  @Public()
  @ApiOperation({ summary: "Get all clips for an event (newest first)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "List of clips" })
  @ApiResponse({ status: 404, description: "Event not found" })
  getEventClips(@Param("id") eventId: string) {
    return this.clipsService.getClipsByEvent(eventId);
  }

  @Post(":id/clips")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a clip from an event (creator only)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 201, description: "Clip created" })
  @ApiResponse({ status: 403, description: "Only event creator can create clips" })
  @ApiResponse({ status: 404, description: "Event not found" })
  createEventClip(
    @Param("id") eventId: string,
    @Body() dto: CreateClipDto,
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    return this.clipsService.createClip(user.id, eventId, dto);
  }

  @Get(":id/stream")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get streaming session info for Event Studio (RTMP URL, stream key) — creator only" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Stream info" })
  @ApiResponse({ status: 403, description: "Not the event creator" })
  async getStream(
    @Param("id") id: string,
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    const ownerId = await this.eventsService.getEventEntityOwnerId(id);
    if (!ownerId) throw new BadRequestException("Event not found");
    if (ownerId !== user.id) {
      throw new ForbiddenException("Only the event creator can access stream credentials");
    }
    return this.eventsService.getStreamForEvent(id);
  }

  @Post(":id/invitations")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Invite audience (followers or email list); creates registrations with unique access codes",
  })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Invitations created" })
  async sendInvitations(
    @Param("id") eventId: string,
    @Body() dto: SendInvitationsDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException("Authentication required");
    }
    return this.registrationsService.sendInvitations(eventId, dto, userId);
  }
    
  createEventInvitations(
    @Param("id") eventId: string,
    @Body() dto: SendInvitationsDto,
    @Req() req: Request & { user?: { id?: string } },
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException("Authentication required");
    }
    return this.registrationsService.sendInvitations(eventId, dto, userId);
  }

  @Post(":id/register")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      "Register for an event with a public free ticket type (creates access pass)",
  })
  @ApiParam({ name: "id", type: String, description: "Event ID" })
  @ApiResponse({
    status: 201,
    description: "Access pass created",
    schema: {
      type: "object",
      properties: {
        accessPassId: { type: "string", format: "uuid" },
        ticketTypeId: { type: "string", format: "uuid" },
        eventId: { type: "string", format: "uuid" },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Payment required or bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Ticket not public or requires invite" })
  @ApiResponse({ status: 404, description: "Ticket type not found" })
  @ApiResponse({ status: 409, description: "Already registered for this event" })
  registerForEvent(
    @Param("id") eventId: string,
    @Body() body: RegisterForEventDto,
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    return this.accessPassesService.registerPublicForEvent(eventId, user.id, body);
  }

  @Post(":id/register-free")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      "Register for free (public or invite) — issues ticket + access_pass as needed",
  })
  @ApiParam({ name: "id", type: String, description: "Event ID" })
  registerFree(
    @Param("id") eventId: string,
    @Body() body: RegisterFreeDto,
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    return this.eventTicketLifecycle.registerFree(eventId, user.id, body);
  }

  @Post(":id/redeem")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Redeem an invite code or claim a free ticket tier" })
  @ApiParam({ name: "id", type: String, description: "Event ID" })
  @ApiResponse({ status: 201, description: "{ success, ticket, accessPassId }" })
  @ApiResponse({ status: 403, description: "Invalid or used access code" })
  @ApiResponse({ status: 404, description: "Event or ticket type not found" })
  @ApiResponse({ status: 409, description: "Already have an active ticket for this event" })
  redeemAccess(
    @Param("id") eventId: string,
    @Body() body: RegisterFreeDto,
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    return this.accessPassesService.redeemAccess(eventId, user.id, body);
  }

  @Post(":id/claim")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Claim an invitation — marks event_registration REGISTERED and issues a ticket" })
  @ApiParam({ name: "id", type: String, description: "Event ID" })
  @ApiResponse({ status: 200, description: "{ success: true }" })
  @ApiResponse({ status: 400, description: "Invitation already used" })
  @ApiResponse({ status: 404, description: "Invitation not found" })
  @ApiResponse({ status: 409, description: "Already have an active ticket for this event" })
  claimInvite(
    @Param("id") eventId: string,
    @Body() body: ClaimInviteDto,
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    return this.accessPassesService.claimInvite(eventId, user.id, body.accessCode);
  }

  @Get(":id/access-status")
  @Public()
  @UseGuards(OptionalSupabaseAuthGuard)
  getAccessStatus(
    @Param("id") eventId: string,
    @Query("code") inviteCode: string | undefined,
    @Req() req: Request & { user?: { id?: string } },
  ) {
    const userId = req.user?.id ?? null;
  
    return this.eventTicketLifecycle.getAccessStatus(
      eventId,
      userId,
      {
        inviteCode: inviteCode?.trim() || undefined,
      },
    );
  }
  @Post(":id/checkout")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      "Start paid checkout — creates order + order_item, Stripe Checkout session, returns checkoutUrl",
  })
  @ApiParam({ name: "id", type: String })
  createEventCheckout(
    @Param("id") eventId: string,
    @Body() body: EventCheckoutDto,
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    return this.eventTicketLifecycle.createCheckout(eventId, user.id, body);
  }

  @Post(":id/orders/:orderId/confirm")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Simulate payment success (dev / staging only when Stripe unavailable). Production: set ALLOW_DEV_ORDER_CONFIRM=true or use Stripe webhook.",
  })
  confirmEventOrder(
    @Param("id") eventId: string,
    @Param("orderId") orderId: string,
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    return this.eventTicketLifecycle.confirmOrderPlaceholder(
      eventId,
      user.id,
      orderId,
    );
  }

  @Post(":id/invite")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      "Invite followers or email addresses — creates access_pass rows (status SENT)",
  })
  @ApiParam({ name: "id", type: String, description: "Event ID" })
  @ApiResponse({ status: 201, description: "{ created: number }" })
  @ApiResponse({ status: 403, description: "Not the event creator" })
  @ApiResponse({ status: 404, description: "Event or ticket type not found" })
  inviteToEvent(
    @Param("id") eventId: string,
    @Body() body: InviteToEventDto,
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    return this.accessPassesService.inviteToEvent(eventId, user.id, body);
  }

  @Post(":id/invite-followers")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      "Invite followers in one transactional flow (invitation + ticket + inbox message)",
  })
  @ApiParam({ name: "id", type: String, description: "Event ID" })
  @ApiResponse({ status: 201, description: "{ created: number }" })
  inviteFollowers(
    @Param("id") eventId: string,
    @Body() body: InviteFollowersDto,
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    return this.accessPassesService.InviteFollowers({
      eventId,
      creatorUserId: user.id,
      ticketTypeId: body.ticketTypeId,
      followerIds: body.followerIds,
      emails: body.emails,
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
    console.log(
      `[transitionPhase] userId=${user.id} eventId=${id} requestedPhase=${phaseTransitionDto.phase}`,
    );
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

