import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from "@nestjs/swagger";
import { EventsService } from "./events.service";
import { CreateEventDto, UpdateEventDto, EventQueryDto, PhaseTransitionDto } from "./dto";
import { JwtAuthGuard, RolesGuard } from "../../common/guards";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { User } from "@prisma/client";

@ApiTags("events")
@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ENTITY", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new event" })
  @ApiResponse({ status: 201, description: "Event created successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  create(@Body() createEventDto: CreateEventDto, @CurrentUser() user: User) {
    return this.eventsService.create(createEventDto, user.id);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: "Get all events with optional filters" })
  @ApiResponse({ status: 200, description: "List of events" })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "eventType", required: false, enum: ["LIVE", "PRERECORDED"] })
  @ApiQuery({ name: "phase", required: false, enum: ["PRE_CONCERT", "CONCERT", "POST_CONCERT"] })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["DRAFT", "SCHEDULED", "LIVE", "COMPLETED", "CANCELLED"],
  })
  findAll(@Query() query: EventQueryDto) {
    return this.eventsService.findAll(query);
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

  @Get(":id/metrics")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ENTITY", "COORDINATOR", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get event metrics and analytics" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Event metrics" })
  @ApiResponse({ status: 404, description: "Event not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  getMetrics(@Param("id") id: string) {
    return this.eventsService.getEventMetrics(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ENTITY", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update an event" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Event updated successfully" })
  @ApiResponse({ status: 404, description: "Event not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  update(@Param("id") id: string, @Body() updateEventDto: UpdateEventDto, @CurrentUser() user: User) {
    return this.eventsService.update(id, updateEventDto, user.id);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ENTITY", "ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete an event" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 204, description: "Event deleted successfully" })
  @ApiResponse({ status: 404, description: "Event not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  remove(@Param("id") id: string) {
    return this.eventsService.remove(id);
  }

  @Post(":id/phase/transition")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("COORDINATOR", "ENTITY", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Transition event to a new phase" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Phase transitioned successfully" })
  @ApiResponse({ status: 400, description: "Invalid phase transition" })
  @ApiResponse({ status: 404, description: "Event not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  transitionPhase(
    @Param("id") id: string,
    @Body() phaseTransitionDto: PhaseTransitionDto,
    @CurrentUser() user: User,
  ) {
    return this.eventsService.transitionPhase(id, phaseTransitionDto, user.id);
  }

  @Post(":id/phase/extend")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("COORDINATOR", "ENTITY", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Extend the current phase duration" })
  @ApiParam({ name: "id", type: String })
  @ApiQuery({ name: "minutes", type: Number, description: "Additional minutes to extend" })
  @ApiResponse({ status: 200, description: "Phase extended successfully" })
  @ApiResponse({ status: 400, description: "Cannot extend phase" })
  @ApiResponse({ status: 404, description: "Event not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  extendPhase(@Param("id") id: string, @Query("minutes") minutes: string, @CurrentUser() user: User) {
    const additionalMinutes = parseInt(minutes, 10);
    if (isNaN(additionalMinutes) || additionalMinutes <= 0) {
      throw new Error("Invalid minutes value");
    }
    return this.eventsService.extendPhase(id, additionalMinutes, user.id);
  }

  @Post(":id/metrics")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("COORDINATOR", "ENTITY", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update live metrics for an event" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Metrics updated successfully" })
  @ApiResponse({ status: 404, description: "Event not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  updateLiveMetrics(@Param("id") id: string, @Body() metrics: Record<string, unknown>, @CurrentUser() user: User) {
    return this.eventsService.updateLiveMetrics(id, metrics, user.id);
  }

  @Post(":id/test-results")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("COORDINATOR", "ENTITY", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Add a test result log for an event" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Test result added successfully" })
  @ApiResponse({ status: 404, description: "Event not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  addTestResult(@Param("id") id: string, @Body() testResult: Record<string, unknown>, @CurrentUser() user: User) {
    return this.eventsService.addTestResult(id, testResult, user.id);
  }
}

