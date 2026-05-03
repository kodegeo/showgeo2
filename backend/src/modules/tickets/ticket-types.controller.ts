import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { TicketTypesService } from "./ticket-types.service";
import { CreateTicketTypeDto } from "./dto/create-ticket-type.dto";
import { SaveTicketTypesDto } from "./dto/save-ticket-types.dto";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { CurrentUser } from "../../common/decorators";
import { assertFullUser } from "../../common/guards/assert-full-user";

type User = { id?: string } | null;

@ApiTags("ticket-types")
@Controller("events/:eventId/ticket-types")
export class TicketTypesController {
  constructor(private readonly ticketTypesService: TicketTypesService) {}

  @Get()
  @ApiOperation({ summary: "List ticket types for an event" })
  @ApiResponse({ status: 200, description: "Ticket type rows" })
  getTicketTypes(@Param("eventId", ParseUUIDPipe) eventId: string) {
    return this.ticketTypesService.getTicketTypes(eventId);
  }

  /**
   * Replace all ticket_types for the event and mirror `events.ticketTypes` JSON.
   * Single source of truth for catalog + legacy JSON field.
   */
  @Post()
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Save ticket types (replace catalog + event JSON)" })
  @ApiResponse({ status: 200, description: "Created ticket type rows" })
  @ApiResponse({ status: 403, description: "Not the event creator" })
  saveTicketTypes(
    @Param("eventId", ParseUUIDPipe) eventId: string,
    @Body() body: SaveTicketTypesDto,
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    return this.ticketTypesService.replaceTicketTypes(
      eventId,
      body.ticketTypes,
      user.id,
    );
  }

  @Post("single")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a single ticket type (legacy)" })
  @ApiResponse({ status: 201, description: "Created ticket type" })
  @ApiResponse({ status: 403, description: "Not the event creator" })
  createTicketType(
    @Param("eventId", ParseUUIDPipe) eventId: string,
    @Body() body: CreateTicketTypeDto,
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    return this.ticketTypesService.createTicketType(eventId, body, user.id);
  }
}
