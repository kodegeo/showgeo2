import {
  Controller,
  Patch,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
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
import { AdminService } from "./admin.service";
import {
  SuspendUserDto,
  ReinstateUserDto,
  DisableEntityDto,
  ReinstateEntityDto,
  TerminateEventDto,
  PromoteUserDto,
  DemoteUserDto,
  PromoteToAdminDto,
  DemoteAdminDto,
  DisableUserDto,
  EnableUserDto,
  ApproveEntityDto,
  RejectEntityDto,
  AcceptApplicationDto,
  RejectApplicationDto,
  BanApplicationDto,
} from "./dto";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { assertFullUser } from "../../common/guards/assert-full-user";

type User = any;

@ApiTags("admin")
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("users")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all users (Admin only)" })
  @ApiResponse({ status: 200, description: "List of users" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  async getUsers() {
    return this.adminService.getUsers();
  }

  @Patch("users/:id/suspend")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Suspend a user (Admin only)" })
  @ApiParam({ name: "id", type: String, description: "User ID to suspend" })
  @ApiResponse({
    status: 200,
    description: "User suspended successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  @ApiResponse({ status: 404, description: "User not found" })
  async suspendUser(
    @Param("id") userId: string,
    @Body() suspendDto: SuspendUserDto,
    @Req() req?: Request & { user?: User },
  ) {
    assertFullUser(req?.user);
    const adminId = req.user.id;

    return this.adminService.suspendUser(userId, adminId, suspendDto.reason);
  }

  @Patch("users/:id/reinstate")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reinstate a user (Admin only)" })
  @ApiParam({ name: "id", type: String, description: "User ID to reinstate" })
  @ApiResponse({
    status: 200,
    description: "User reinstated successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  @ApiResponse({ status: 404, description: "User not found" })
  async reinstateUser(
    @Param("id") userId: string,
    @Body() reinstateDto: ReinstateUserDto,
    @Req() req?: Request & { user?: User },
  ) {
    assertFullUser(req?.user);
    const adminId = req.user.id;

    return this.adminService.reinstateUser(userId, adminId, reinstateDto.reason);
  }

  @Patch("entities/:id/disable")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Disable an entity (Admin only)" })
  @ApiParam({ name: "id", type: String, description: "Entity ID to disable" })
  @ApiResponse({
    status: 200,
    description: "Entity disabled successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  @ApiResponse({ status: 404, description: "Entity not found" })
  async disableEntity(
    @Param("id") entityId: string,
    @Body() disableDto: DisableEntityDto,
    @Req() req?: Request & { user?: User },
  ) {
    assertFullUser(req?.user);
    const adminId = req.user.id;

    return this.adminService.disableEntity(entityId, adminId, disableDto.reason);
  }

  @Patch("entities/:id/reinstate")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reinstate an entity (Admin only)" })
  @ApiParam({ name: "id", type: String, description: "Entity ID to reinstate" })
  @ApiResponse({
    status: 200,
    description: "Entity reinstated successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  @ApiResponse({ status: 404, description: "Entity not found" })
  async reinstateEntity(
    @Param("id") entityId: string,
    @Body() reinstateDto: ReinstateEntityDto,
    @Req() req?: Request & { user?: User },
  ) {
    assertFullUser(req?.user);
    const adminId = req.user.id;

    return this.adminService.reinstateEntity(
      entityId,
      adminId,
      reinstateDto.reason,
    );
  }

  @Post("events/:id/terminate")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Terminate an event immediately (Admin only - kill switch)" })
  @ApiParam({ name: "id", type: String, description: "Event ID to terminate" })
  @ApiResponse({
    status: 200,
    description: "Event terminated successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request - Event must be LIVE or PRE_LIVE" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  @ApiResponse({ status: 404, description: "Event not found" })
  async terminateEvent(
    @Param("id") eventId: string,
    @Body() terminateDto: TerminateEventDto,
    @Req() req?: Request & { user?: User },
  ) {
    assertFullUser(req?.user);
    const adminId = req.user.id;

    return this.adminService.terminateEvent(eventId, adminId, terminateDto.reason);
  }

  @Get("reports")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "List all admin reports (Admin only)" })
  @ApiQuery({
    name: "status",
    enum: ["OPEN", "RESOLVED", "DISMISSED"],
    required: false,
    description: "Filter by report status",
  })
  @ApiResponse({ status: 200, description: "List of reports" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  async getReports(@Query("status") status?: string) {
    try {
      return await this.adminService.getReports(status as "OPEN" | "RESOLVED" | "DISMISSED" | undefined);
    } catch (err) {
      // Defensive: Never allow exceptions to bubble from admin list endpoints
      // Auth failures (401/403) are handled by guards, so this is for service errors only
      console.error("[ADMIN REPORTS CONTROLLER ERROR]", err);
      return [];
    }
  }

  @Patch("users/:id/promote")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Promote a user to ENTITY role (Admin only)" })
  @ApiParam({ name: "id", type: String, description: "User ID to promote" })
  @ApiResponse({
    status: 200,
    description: "User promoted successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request - User is disabled or already ENTITY" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  @ApiResponse({ status: 404, description: "User not found" })
  async promoteUser(
    @Param("id") userId: string,
    @Body() promoteDto: PromoteUserDto,
    @Req() req?: Request & { user?: User },
  ) {
    assertFullUser(req?.user);
    const adminId = req.user.id;

    return this.adminService.promoteUser(userId, adminId, promoteDto.reason);
  }

  @Patch("users/:id/demote")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Demote a user from ENTITY role (Admin only)" })
  @ApiParam({ name: "id", type: String, description: "User ID to demote" })
  @ApiResponse({
    status: 200,
    description: "User demoted successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request - Last ADMIN or has active entities" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  @ApiResponse({ status: 404, description: "User not found" })
  async demoteUser(
    @Param("id") userId: string,
    @Body() demoteDto: DemoteUserDto,
    @Req() req?: Request & { user?: User },
  ) {
    assertFullUser(req?.user);
    const adminId = req.user.id;

    return this.adminService.demoteUser(userId, adminId, demoteDto.reason);
  }

  @Patch("users/:id/promote-to-admin")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: "Promote a user to ADMIN role (Admin only)",
    description: "Promotes a USER to ADMIN role. This only affects platform administrative access, not creator status. Users become creators through approved applications."
  })
  @ApiParam({ name: "id", type: String, description: "User ID to promote to ADMIN" })
  @ApiResponse({
    status: 200,
    description: "User promoted to ADMIN successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request - User is disabled, already ADMIN, or cannot promote self" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  @ApiResponse({ status: 404, description: "User not found" })
  async promoteToAdmin(
    @Param("id") userId: string,
    @Body() promoteDto: PromoteToAdminDto,
    @Req() req?: Request & { user?: User },
  ) {
    assertFullUser(req?.user);
    const adminId = req.user.id;

    return this.adminService.promoteToAdmin(userId, adminId, promoteDto.reason);
  }

  @Patch("users/:id/demote-admin")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: "Demote an ADMIN user to USER role (Admin only)",
    description: "Demotes an ADMIN to USER role. This only affects platform administrative access, not creator status. Cannot demote the last remaining ADMIN."
  })
  @ApiParam({ name: "id", type: String, description: "User ID to demote from ADMIN" })
  @ApiResponse({
    status: 200,
    description: "User demoted from ADMIN successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request - Last ADMIN or cannot demote self" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  @ApiResponse({ status: 404, description: "User not found" })
  async demoteAdmin(
    @Param("id") userId: string,
    @Body() demoteDto: DemoteAdminDto,
    @Req() req?: Request & { user?: User },
  ) {
    assertFullUser(req?.user);
    const adminId = req.user.id;

    return this.adminService.demoteAdmin(userId, adminId, demoteDto.reason);
  }

  @Patch("users/:id/disable")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Disable a user (Admin only)" })
  @ApiParam({ name: "id", type: String, description: "User ID to disable" })
  @ApiResponse({
    status: 200,
    description: "User disabled successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request - Admin cannot disable themselves" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  @ApiResponse({ status: 404, description: "User not found" })
  async disableUser(
    @Param("id") userId: string,
    @Body() disableDto: DisableUserDto,
    @Req() req?: Request & { user?: User },
  ) {
    assertFullUser(req?.user);
    const adminId = req.user.id;

    return this.adminService.disableUser(userId, adminId, disableDto.reason);
  }

  @Patch("users/:id/enable")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Enable a user (Admin only)" })
  @ApiParam({ name: "id", type: String, description: "User ID to enable" })
  @ApiResponse({
    status: 200,
    description: "User enabled successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  @ApiResponse({ status: 404, description: "User not found" })
  async enableUser(
    @Param("id") userId: string,
    @Body() enableDto: EnableUserDto,
    @Req() req?: Request & { user?: User },
  ) {
    assertFullUser(req?.user);
    const adminId = req.user.id;

    return this.adminService.enableUser(userId, adminId, enableDto.reason);
  }

  @Get("entities")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all entities (Admin only)" })
  @ApiResponse({ status: 200, description: "List of entities" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  async getEntities() {
    return this.adminService.getEntities();
  }

  @Patch("entities/:id/suspend")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: "Suspend an entity (Admin only)",
    description: "Suspends an ACTIVE entity. Suspended entities cannot create events or stream, but can be reinstated."
  })
  @ApiParam({ name: "id", type: String, description: "Entity ID to suspend" })
  @ApiResponse({
    status: 200,
    description: "Entity suspended successfully",
  })
  @ApiResponse({ 
    status: 400, 
    description: "Bad request - Entity must be ACTIVE to suspend" 
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  @ApiResponse({ status: 404, description: "Entity not found" })
  async suspendEntity(
    @Param("id") entityId: string,
    @Body() suspendDto: ApproveEntityDto,
    @Req() req?: Request & { user?: User },
  ) {
    assertFullUser(req?.user);
    const adminId = req.user.id;

    return this.adminService.suspendEntity(entityId, adminId, suspendDto.reason);
  }

  @Patch("entities/:id/reject")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reject an entity (Admin only)" })
  @ApiParam({ name: "id", type: String, description: "Entity ID to reject" })
  @ApiResponse({
    status: 200,
    description: "Entity rejected successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request - Entity already rejected" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  @ApiResponse({ status: 404, description: "Entity not found" })
  async rejectEntity(
    @Param("id") entityId: string,
    @Body() rejectDto: RejectEntityDto,
    @Req() req?: Request & { user?: User },
  ) {
    assertFullUser(req?.user);
    const adminId = req.user.id;

    return this.adminService.rejectEntity(entityId, adminId, rejectDto.reason);
  }

  @Get("entity-applications")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all entity applications (Admin only)" })
  @ApiResponse({ status: 200, description: "List of entity applications" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  async getEntityApplications() {
    try {
      return await this.adminService.getEntityApplications();
    } catch (err) {
      // Defensive: Never allow exceptions to bubble from admin list endpoints
      // Auth failures (401/403) are handled by guards, so this is for service errors only
      console.error("[ADMIN APPLICATIONS CONTROLLER ERROR]", err);
      return [];
    }
  }

  @Get("entity-applications/:id")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a single entity application by ID (Admin only)" })
  @ApiParam({ name: "id", type: String, description: "Application ID" })
  @ApiResponse({ status: 200, description: "Application details" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  @ApiResponse({ status: 404, description: "Application not found" })
  async getEntityApplicationById(@Param("id") applicationId: string) {
    return this.adminService.getEntityApplicationById(applicationId);
  }

  @Get("audit-logs")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get admin audit logs" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "Page number" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "Items per page" })
  @ApiQuery({ name: "adminId", required: false, type: String, description: "Filter by admin ID" })
  @ApiQuery({ name: "targetType", required: false, enum: ["USER", "ENTITY", "APPLICATION"], description: "Filter by target type" })
  @ApiQuery({ name: "action", required: false, type: String, description: "Filter by action" })
  @ApiQuery({ name: "startDate", required: false, type: String, description: "Start date (ISO string)" })
  @ApiQuery({ name: "endDate", required: false, type: String, description: "End date (ISO string)" })
  @ApiResponse({ status: 200, description: "Paginated audit logs" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  async getAuditLogs(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("adminId") adminId?: string,
    @Query("targetType") targetType?: string,
    @Query("action") action?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const pageNum = page ? parseInt(page, 10) : 1;
    const offset = (pageNum - 1) * limitNum;

    return this.adminService.getAuditLogs({
      limit: limitNum,
      offset,
    });
  }

  @Patch("entity-applications/:id/accept")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Accept an entity application (Admin only)" })
  @ApiParam({ name: "id", type: String, description: "Application ID to accept" })
  @ApiResponse({
    status: 200,
    description: "Application accepted successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  @ApiResponse({ status: 404, description: "Application not found" })
  async acceptApplication(
    @Param("id") applicationId: string,
    @Body() acceptDto: AcceptApplicationDto,
    @Req() req?: Request & { user?: User },
  ) {
    assertFullUser(req?.user);
    const adminId = req.user.id;

    return this.adminService.acceptApplication(applicationId, adminId, acceptDto.reason);
  }

  @Patch("entity-applications/:id/reject")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reject an entity application (Admin only)" })
  @ApiParam({ name: "id", type: String, description: "Application ID to reject" })
  @ApiResponse({
    status: 200,
    description: "Application rejected successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  @ApiResponse({ status: 404, description: "Application not found" })
  async rejectApplication(
    @Param("id") applicationId: string,
    @Body() rejectDto: RejectApplicationDto,
    @Req() req?: Request & { user?: User },
  ) {
    assertFullUser(req?.user);
    const adminId = req.user.id;

    return this.adminService.rejectApplication(applicationId, adminId, rejectDto.reason);
  }

  @Patch("entity-applications/:id/ban")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: "Ban an entity application (Admin only)",
    description: "Permanently bans the applicant from reapplying. This action is IRREVERSIBLE."
  })
  @ApiParam({ name: "id", type: String, description: "Application ID to ban" })
  @ApiResponse({
    status: 200,
    description: "Application banned successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  @ApiResponse({ status: 404, description: "Application not found" })
  async banApplication(
    @Param("id") applicationId: string,
    @Body() banDto: BanApplicationDto,
    @Req() req?: Request & { user?: User },
  ) {
    assertFullUser(req?.user);
    const adminId = req.user.id;

    return this.adminService.banApplication(applicationId, adminId, banDto.reason);
  }
}

