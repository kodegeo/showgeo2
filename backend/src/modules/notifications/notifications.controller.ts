import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";
import { CreateNotificationDto, BroadcastNotificationDto, NotificationQueryDto } from "./dto";
import { RolesGuard } from "../../common/guards";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { Roles, CurrentUser } from "../../common/decorators";

type User = any;

@ApiTags("notifications")
@Controller("notifications")
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "Get notifications for current user (paginated)" })
  @ApiQuery({ name: "unreadOnly", required: false, type: Boolean })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "List of notifications with pagination metadata" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  getUserNotifications(@Query() query: NotificationQueryDto, @CurrentUser() user: User) {
    return this.notificationsService.getUserNotifications(user.id, query);
  }

  @Get("unread-count")
  @ApiOperation({ summary: "Get unread notification count" })
  @ApiResponse({ status: 200, description: "Unread count" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  getUnreadCount(@CurrentUser() user: User) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Mark notification as read" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Notification marked as read" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Notification not found" })
  markAsRead(@Param("id") id: string, @CurrentUser() user: User) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Delete("clear")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Clear all notifications (delete or mark as read)" })
  @ApiQuery({ name: "markAsRead", required: false, type: Boolean, description: "If true, mark as read instead of deleting" })
  @ApiResponse({ status: 200, description: "Notifications cleared" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  clearAll(@Query("markAsRead") markAsRead: string, @CurrentUser() user: User) {
    const markAsReadBool = markAsRead === "true" || markAsRead === "1";
    return this.notificationsService.clearAll(user.id, markAsReadBool);
  }

  @Post("test")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @ApiOperation({ summary: "Send test notification (Admin only)" })
  @ApiResponse({ status: 201, description: "Test notification sent" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  sendTestNotification(@Body() createNotificationDto: CreateNotificationDto, @CurrentUser() user: User) {
    // Use current user if userId not provided
    const notificationDto = {
      ...createNotificationDto,
      userId: createNotificationDto.userId || user.id,
    };
    return this.notificationsService.createNotification(notificationDto);
  }
}

