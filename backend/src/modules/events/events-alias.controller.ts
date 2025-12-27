import {
  Controller,
  Get,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from "@nestjs/swagger";
import { EventsService } from "./events.service";
import { EventQueryDto } from "./dto";
import { Public } from "../../common/decorators";

/**
 * Alias controller for legacy frontend routes.
 * Provides /events endpoint without /api prefix for compatibility.
 * Reuses existing events logic and guards.
 */
@ApiTags("events")
@Controller() // No prefix - routes will be at root level
export class EventsAliasController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * Get all events with optional filters.
   * Alias for /api/events - same logic, same guards, same response.
   */
  @Get("events")
  @Public()
  @ApiOperation({ summary: "Get all events with optional filters (legacy alias)" })
  @ApiResponse({ status: 200, description: "List of events" })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "eventType", required: false, enum: ["LIVE", "PRERECORDED"] })
  @ApiQuery({ name: "phase", required: false, enum: ["PRE_LIVE", "LIVE", "POST_LIVE"] })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["DRAFT", "SCHEDULED", "LIVE", "COMPLETED", "CANCELLED"],
  })
  findAll(@Query() query: EventQueryDto) {
    // Reuse exact same logic as EventsController.findAll()
    return this.eventsService.findAll(query);
  }
}
  