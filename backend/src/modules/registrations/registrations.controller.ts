import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
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
  @ApiOperation({ summary: "Send invitations (guest list or audience FOLLOWERS)" })
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
      throw new UnauthorizedException("Authentication required");
    }

    return this.registrationsService.sendInvitations(eventId, dto, user.id);
  }

  @Get("invitations")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List invitations for this event (creator only)" })
  @ApiParam({ name: "eventId", type: String })
  @ApiResponse({ status: 200, description: "List of invitations" })
  @ApiResponse({ status: 403, description: "Only event creator can list invitations" })
  async listInvitations(@Param("eventId") eventId: string, @Req() req: any) {
    const user = req.user;
    if (!user?.id) throw new UnauthorizedException("Authentication required");
    return this.registrationsService.listInvitations(eventId, user.id);
  }

  @Get("access-code")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get or create event access code (creator only)" })
  @ApiParam({ name: "eventId", type: String })
  @ApiResponse({ status: 200, description: "Access code for sharing" })
  @ApiResponse({ status: 403, description: "Only event creator" })
  async getEventAccessCode(@Param("eventId") eventId: string, @Req() req: any) {
    const user = req.user;
    if (!user?.id) throw new UnauthorizedException("Authentication required");
    return this.registrationsService.getOrCreateEventAccessCode(eventId, user.id);
  }

  @Get("search-users")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Search users to invite (creator only)" })
  @ApiParam({ name: "eventId", type: String })
  async searchUsersToInvite(
    @Param("eventId") eventId: string,
    @Req() req: any,
    @Query("q") q?: string,
  ) {
    const user = req.user;
    if (!user?.id) throw new UnauthorizedException("Authentication required");
    return this.registrationsService.searchUsersToInvite(eventId, user.id, q ?? "");
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

  @Patch(":id/read")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Mark a mailbox item as read for authenticated user" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Mailbox item marked as read" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async markMailboxItemRead(@Param("id") id: string, @Req() req: any) {
    const user = req.user;
    if (!user || !user.id) {
      throw new UnauthorizedException("Authentication required");
    }
    return this.registrationsService.markMailboxItemRead(user.id, id);
  }
}

