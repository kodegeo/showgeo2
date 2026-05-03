import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import { FanInteractionService } from "./fan-interaction.service";
import { FansResponseDto, RankingsResponseDto } from "./dto";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { Public } from "../../common/decorators";

@ApiTags("events")
@Controller("events")
export class FanInteractionController {
  constructor(private readonly fanInteractionService: FanInteractionService) {}

  @Get(":eventId/fans")
  @Public()
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({ summary: "Get fans (presence) for an event" })
  @ApiParam({ name: "eventId", type: String, description: "Event UUID" })
  @ApiResponse({ status: 200, description: "Aggregated fans/presence", type: FansResponseDto })
  @ApiResponse({ status: 404, description: "Event not found" })
  async getFans(@Param("eventId") eventId: string) {
    return this.fanInteractionService.getFansForEvent(eventId);
  }

  @Get(":eventId/rankings")
  @Public()
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({ summary: "Get fan rankings for an event" })
  @ApiParam({ name: "eventId", type: String, description: "Event UUID" })
  @ApiResponse({ status: 200, description: "Fan rankings by engagement", type: RankingsResponseDto })
  @ApiResponse({ status: 404, description: "Event not found" })
  async getRankings(@Param("eventId") eventId: string) {
    return this.fanInteractionService.getRankingsForEvent(eventId);
  }
}
