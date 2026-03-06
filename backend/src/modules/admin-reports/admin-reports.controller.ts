import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
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
  ApiQuery,
} from "@nestjs/swagger";
import { AdminReportsService, AdminReportStatus } from "./admin-reports.service";
import { CreateAdminReportDto, ResolveAdminReportDto } from "./dto";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { assertFullUser } from "../../common/guards/assert-full-user";

type User = any;

@ApiTags("reports")
@Controller("reports")
export class AdminReportsController {
  constructor(private readonly adminReportsService: AdminReportsService) {}

  @Post()
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create an admin report (authenticated users)" })
  @ApiResponse({ status: 201, description: "Report created successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Entity or Event not found" })
  async createReport(
    @Body() dto: CreateAdminReportDto,
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    return this.adminReportsService.createReport(
      dto,
      user.id,
      user.role,
    );
  }
}

@ApiTags("admin")
@Controller("admin/reports")
export class AdminReportsAdminController {
  constructor(private readonly adminReportsService: AdminReportsService) {}

  @Get()
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "List all admin reports (Admin only)" })
  @ApiQuery({
    name: "status",
    enum: AdminReportStatus,
    required: false,
    description: "Filter by report status",
  })
  @ApiResponse({ status: 200, description: "List of reports" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  async listReports(@Query("status") status?: AdminReportStatus) {
    return this.adminReportsService.listReports(status);
  }

  @Patch(":id/resolve")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Resolve an admin report (Admin only)" })
  @ApiParam({ name: "id", type: String, description: "Report ID to resolve" })
  @ApiResponse({ status: 200, description: "Report resolved successfully" })
  @ApiResponse({ status: 400, description: "Bad request - Report already resolved" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  @ApiResponse({ status: 404, description: "Report not found" })
  async resolveReport(
    @Param("id") reportId: string,
    @Body() dto: ResolveAdminReportDto,
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    return this.adminReportsService.resolveReport(reportId, user.id, dto);
  }
}

