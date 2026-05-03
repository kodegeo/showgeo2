import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { CurrentUser } from "../../common/decorators";
import { assertFullUser } from "../../common/guards/assert-full-user";
import { TicketsService } from "./tickets.service";

type User = { id?: string } | null;

@ApiTags("me")
@Controller("me")
export class MeTicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get("tickets")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "List access passes for the current user with event metadata",
  })
  @ApiResponse({ status: 200, description: "Access passes with event summary" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  getMyTickets(@CurrentUser() user: User) {
    assertFullUser(user);
    return this.ticketsService.getMyAccessPassesWithEvents(user.id);
  }
}
