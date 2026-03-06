import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
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
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles, CurrentUser } from "../../common/decorators";
import { assertFullUser } from "../../common/guards/assert-full-user";
import { EventActivitiesService, EventActivity } from "./event-activities.service";
import { CreateActivityDto, UpdateActivityDto } from "./dto";
import { EventPhase } from "@prisma/client";

type User = any;

@ApiTags("event-activities")
@Controller()
export class EventActivitiesController {
  constructor(private readonly activitiesService: EventActivitiesService) {}

  /**
   * POST /api/events/:eventId/activities
   * Create a new activity for an event
   */
  @Post("events/:eventId/activities")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "COORDINATOR", "ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new activity for an event" })
  @ApiParam({ name: "eventId", type: String })
  @ApiResponse({ status: 201, description: "Activity created successfully" })
  @ApiResponse({ status: 400, description: "Bad request - invalid phase or data" })
  @ApiResponse({ status: 403, description: "Forbidden - insufficient permissions" })
  @ApiResponse({ status: 404, description: "Event not found" })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param("eventId") eventId: string,
    @Body() createActivityDto: CreateActivityDto,
    @CurrentUser() user: User,
  ): Promise<EventActivity> {
    assertFullUser(user);
    return this.activitiesService.createActivity(eventId, createActivityDto, user.id);
  }

  /**
   * PATCH /api/activities/:activityId
   * Update an activity
   */
  @Patch("activities/:activityId")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "COORDINATOR", "ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update an activity" })
  @ApiParam({ name: "activityId", type: String })
  @ApiResponse({ status: 200, description: "Activity updated successfully" })
  @ApiResponse({ status: 400, description: "Bad request - cannot update ACTIVE activity" })
  @ApiResponse({ status: 403, description: "Forbidden - insufficient permissions" })
  @ApiResponse({ status: 404, description: "Activity not found" })
  async update(
    @Param("activityId") activityId: string,
    @Body() updateActivityDto: UpdateActivityDto,
    @CurrentUser() user: User,
  ): Promise<EventActivity> {
    assertFullUser(user);
    return this.activitiesService.updateActivity(activityId, updateActivityDto, user.id);
  }

  /**
   * POST /api/activities/:activityId/launch
   * Launch an activity
   */
  @Post("activities/:activityId/launch")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "COORDINATOR", "ADMIN", "MANAGER")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Launch an activity" })
  @ApiParam({ name: "activityId", type: String })
  @ApiResponse({ status: 200, description: "Activity launched successfully" })
  @ApiResponse({ status: 400, description: "Bad request - phase mismatch or invalid status" })
  @ApiResponse({ status: 403, description: "Forbidden - insufficient permissions" })
  @ApiResponse({ status: 404, description: "Activity not found" })
  async launch(
    @Param("activityId") activityId: string,
    @CurrentUser() user: User,
  ): Promise<EventActivity> {
    assertFullUser(user);
    return this.activitiesService.launchActivity(activityId, user.id);
  }

  /**
   * POST /api/activities/:activityId/complete
   * Complete an activity
   */
  @Post("activities/:activityId/complete")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "COORDINATOR", "ADMIN", "MANAGER")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Complete an activity" })
  @ApiParam({ name: "activityId", type: String })
  @ApiResponse({ status: 200, description: "Activity completed successfully" })
  @ApiResponse({ status: 403, description: "Forbidden - insufficient permissions" })
  @ApiResponse({ status: 404, description: "Activity not found" })
  async complete(
    @Param("activityId") activityId: string,
    @CurrentUser() user: User,
  ): Promise<EventActivity> {
    assertFullUser(user);
    return this.activitiesService.completeActivity(activityId, user.id);
  }

  /**
   * GET /api/events/:eventId/activities?phase=POST_LIVE
   * List activities for an event
   */
  @Get("events/:eventId/activities")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List activities for an event" })
  @ApiParam({ name: "eventId", type: String })
  @ApiQuery({ name: "phase", enum: EventPhase, required: false })
  @ApiResponse({ status: 200, description: "List of activities" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Event not found" })
  async list(
    @Param("eventId") eventId: string,
    @Query("phase") phase: EventPhase | undefined,
    @CurrentUser() user: User,
  ): Promise<EventActivity[]> {
    assertFullUser(user);

    // Check if user is a producer (event coordinator or entity admin/manager)
    const isProducer = await this.activitiesService.isProducer(eventId, user.id);

    return this.activitiesService.listActivities(
      eventId,
      phase || null,
      user.id,
      isProducer,
    );
  }
}

