import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from "@nestjs/swagger";
import { RegistrationsService } from "./registrations.service";
import { SendInvitationsDto, RegisterDto, ValidateTicketDto } from "./dto";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";

@ApiTags("registrations")
@Controller("events/:eventId/registrations")
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Post("invitations")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Send invitations to a guest list" })
  @ApiParam({ name: "eventId", type: String })
  @ApiResponse({ status: 200, description: "Invitations sent successfully" })
  @ApiResponse({ status: 404, description: "Event not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async sendInvitations(
    @Param("eventId") eventId: string,
    @Body() dto: SendInvitationsDto,
    @Req() req: any,
  ) {
    const user = req.user;
    if (!user || !user.id) {
      throw new Error("Authentication required");
    }

    return this.registrationsService.sendInvitations(eventId, dto, user.id);
  }

  @Post("register")
  @ApiOperation({ summary: "Register for an event (authenticated or guest)" })
  @ApiParam({ name: "eventId", type: String })
  @ApiResponse({ status: 200, description: "Registration successful" })
  @ApiResponse({ status: 404, description: "Registration not found" })
  @ApiResponse({ status: 400, description: "Already registered or invalid request" })
  async register(
    @Param("eventId") eventId: string,
    @Body() dto: RegisterDto,
    @Req() req: any,
  ) {
    const user = req.user;
    const userId = user?.id;

    return this.registrationsService.register(eventId, dto, userId);
  }

  @Post("validate-ticket")
  @ApiOperation({ summary: "Validate ticket for streaming access" })
  @ApiParam({ name: "eventId", type: String })
  @ApiResponse({ status: 200, description: "Ticket validation result" })
  async validateTicket(
    @Param("eventId") eventId: string,
    @Body() dto: ValidateTicketDto,
  ) {
    return this.registrationsService.validateTicket(eventId, dto);
  }

  @Get("mailbox")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get mailbox items for authenticated user (event-specific)" })
  @ApiParam({ name: "eventId", type: String })
  @ApiResponse({ status: 200, description: "Mailbox items retrieved" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getMailboxForEvent(
    @Param("eventId") eventId: string,
    @Req() req: any,
  ) {
    const user = req.user;
    if (!user || !user.id) {
      throw new Error("Authentication required");
    }

    return this.registrationsService.getMailbox(user.id, eventId);
  }
}

@ApiTags("mailbox")
@Controller("mailbox")
export class MailboxController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Get()
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all mailbox items for authenticated user" })
  @ApiResponse({ status: 200, description: "Mailbox items retrieved" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getMailbox(@Req() req: any) {
    const user = req.user;
    if (!user || !user.id) {
      throw new UnauthorizedException("Authentication required");
    }

    // TODO: Add pagination support (page, limit query params)
    return this.registrationsService.getMailbox(user.id);
  }
}

