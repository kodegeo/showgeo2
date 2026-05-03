import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { TicketsService } from "./tickets.service";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { CurrentUser } from "../../common/decorators";
import { assertFullUser } from "../../common/guards/assert-full-user";

type User = { id?: string } | null;

@ApiTags("tickets")
@Controller("tickets")
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get("my")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get tickets owned by the current user (ACTIVE only)" })
  @ApiResponse({ status: 200, description: "List of user tickets with event details" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  getMyTickets(@CurrentUser() user: User) {
    assertFullUser(user);
    return this.ticketsService.getMyTickets(user.id);
  }
}
