import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
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
} from "@nestjs/swagger";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles, CurrentUser } from "../../common/decorators";
import { assertFullUser } from "../../common/guards/assert-full-user";
import { ModerationService } from "./moderation.service";
import { CreateReportDto, UpdateReportStatusDto } from "./dto";

type User = any;

@ApiTags("moderation")
@Controller()
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  /**
   * POST /api/events/:eventId/reports
   * Create a moderation report
   */
  @Post("events/:eventId/reports")
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a moderation report" })
  @ApiParam({ name: "eventId", type: String })
  @ApiResponse({ status: 201, description: "Report created successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Event not found" })
  async createReport(
    @Param("eventId") eventId: string,
    @Body() dto: CreateReportDto,
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    return this.moderationService.createReport(eventId, dto, user.id);
  }

  /**
   * GET /api/events/:eventId/reports
   * List reports for an event (producer/admin only)
   */
  @Get("events/:eventId/reports")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "COORDINATOR", "ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "List reports for an event (producer/admin only)" })
  @ApiParam({ name: "eventId", type: String })
  @ApiResponse({ status: 200, description: "List of reports" })
  @ApiResponse({ status: 403, description: "Forbidden - insufficient permissions" })
  @ApiResponse({ status: 404, description: "Event not found" })
  async listReportsForEvent(
    @Param("eventId") eventId: string,
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    return this.moderationService.listReportsForEvent(eventId, user.id);
  }

  /**
   * GET /api/me/reports
   * List reports created by the current user
   */
  @Get("me/reports")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List reports created by the current user" })
  @ApiResponse({ status: 200, description: "List of user's reports" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async listMyReports(@CurrentUser() user: User) {
    assertFullUser(user);
    return this.moderationService.listReportsForUser(user.id);
  }

  /**
   * PATCH /api/reports/:reportId/status
   * Update report status (admin/coordinator only)
   */
  @Patch("reports/:reportId/status")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "COORDINATOR", "ADMIN")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update report status (admin/coordinator only)" })
  @ApiParam({ name: "reportId", type: String })
  @ApiResponse({ status: 200, description: "Report status updated" })
  @ApiResponse({ status: 403, description: "Forbidden - insufficient permissions" })
  @ApiResponse({ status: 404, description: "Report not found" })
  async updateReportStatus(
    @Param("reportId") reportId: string,
    @Body() dto: UpdateReportStatusDto,
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    return this.moderationService.updateReportStatus(reportId, dto, user.id);
  }
}

