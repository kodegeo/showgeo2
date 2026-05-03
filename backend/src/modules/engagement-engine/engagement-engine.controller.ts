import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import { EngagementEngineService } from "./engagement-engine.service";
import { EnergyResponseDto, HighlightsResponseDto } from "./dto";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { Public } from "../../common/decorators";

@ApiTags("events")
@Controller("events")
export class EngagementEngineController {
  constructor(private readonly engagementEngineService: EngagementEngineService) {}

  @Get(":eventId/energy")
  @Public()
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({ summary: "Get crowd energy snapshots for an event" })
  @ApiParam({ name: "eventId", type: String, description: "Event UUID" })
  @ApiResponse({ status: 200, description: "Energy snapshots (realtime writes)", type: EnergyResponseDto })
  @ApiResponse({ status: 404, description: "Event not found" })
  async getEnergy(@Param("eventId") eventId: string) {
    return this.engagementEngineService.getEnergyForEvent(eventId);
  }

  @Get(":eventId/highlights")
  @Public()
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({ summary: "Get highlight moments for an event" })
  @ApiParam({ name: "eventId", type: String, description: "Event UUID" })
  @ApiResponse({ status: 200, description: "Highlight moments (realtime writes)", type: HighlightsResponseDto })
  @ApiResponse({ status: 404, description: "Event not found" })
  async getHighlights(@Param("eventId") eventId: string) {
    return this.engagementEngineService.getHighlightsForEvent(eventId);
  }
}
