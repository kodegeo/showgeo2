import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { FollowService } from "../follow/follow.service";
import { CreateNotificationDto, BroadcastNotificationDto, NotificationQueryDto } from "./dto";
import { Notification, NotificationType } from "@prisma/client";
import { NotificationGateway } from "./notifications.gateway";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => FollowService))
    private readonly followService: FollowService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async createNotification(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const { userId, entityId, type, message, metadata } = createNotificationDto;

    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Validate entity exists if provided
    if (entityId) {
      const entity = await this.prisma.entity.findUnique({
        where: { id: entityId },
      });

      if (!entity) {
        throw new NotFoundException("Entity not found");
      }
    }

    // Create notification
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        entityId,
        type,
        message,
        metadata: metadata || {},
        isRead: false,
      },
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
          },
        },
      },
    });

    // Emit real-time notification via WebSocket
    this.notificationGateway.notifyUser(userId, notification);

    return notification;
  }

  async broadcastToFollowers(
    broadcastNotificationDto: BroadcastNotificationDto,
  ): Promise<{ count: number; notifications: Notification[] }> {
    const { entityId, type, message, metadata } = broadcastNotificationDto;

    // Validate entity exists
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
    });

    if (!entity) {
      throw new NotFoundException("Entity not found");
    }

    // Get all followers of the entity
    // Using getFollowers which returns paginated results
    // We need to fetch all followers, so we'll query directly
    const followers = await this.prisma.follow.findMany({
      where: { entityId },
      select: { userId: true },
    });

    if (followers.length === 0) {
      return { count: 0, notifications: [] };
    }

    const userIds = followers.map((f) => f.userId);

    // Create notifications for all followers
    const notifications = await Promise.all(
      userIds.map((userId) =>
        this.prisma.notification.create({
          data: {
            userId,
            entityId,
            type,
            message,
            metadata: metadata || {},
            isRead: false,
          },
          include: {
            entity: {
              select: {
                id: true,
                name: true,
                slug: true,
                thumbnail: true,
              },
            },
          },
        }),
      ),
    );

    // Emit real-time notifications via WebSocket to all followers
    notifications.forEach((notification) => {
      this.notificationGateway.notifyUser(notification.userId, notification);
    });

    return {
      count: notifications.length,
      notifications,
    };
  }

  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    // Find notification and verify ownership
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    if (notification.userId !== userId) {
      throw new BadRequestException("You can only mark your own notifications as read");
    }

    // Update notification
    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
          },
        },
      },
    });

    return updated;
  }

  async getUserNotifications(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<{ data: Notification[]; meta: { total: number; page: number; limit: number; totalPages: number; unreadCount: number } }> {
    const { unreadOnly, page = 1, limit = 20 } = query;

    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const where: any = {
      userId,
    };

    if (unreadOnly) {
      where.isRead = false;
    }

    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: {
          entity: {
            select: {
              id: true,
              name: true,
              slug: true,
              thumbnail: true,
            },
          },
        },
        orderBy: [
          { isRead: "asc" }, // Unread first
          { createdAt: "desc" }, // Then by newest
        ],
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const count = await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return count;
  }

  async clearAll(userId: string, markAsRead = false): Promise<{ count: number }> {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (markAsRead) {
      // Mark all as read
      const result = await this.prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });

      return { count: result.count };
    } else {
      // Delete all notifications
      const result = await this.prisma.notification.deleteMany({
        where: { userId },
      });

      return { count: result.count };
    }
  }

  // Helper methods for integration with other modules

  async notifyStreamingSessionStarted(eventId: string, entityId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { name: true, thumbnail: true },
    });

    if (!event) return;

    await this.broadcastToFollowers({
      entityId,
      type: NotificationType.LIVE_NOW,
      message: `🎥 ${event.name} is now live!`,
      metadata: {
        eventId,
        type: "streaming_session_started",
        eventName: event.name,
        eventThumbnail: event.thumbnail,
      },
    });
  }

  async notifyProductAdded(entityId: string, productId: string, productName: string) {
    await this.broadcastToFollowers({
      entityId,
      type: NotificationType.NEW_DROP,
      message: `🛍️ New product: ${productName}`,
      metadata: {
        productId,
        productName,
        type: "product_added",
      },
    });
  }

  async notifyEventPhaseUpdate(eventId: string, entityId: string, phase: string, eventName: string) {
    await this.broadcastToFollowers({
      entityId,
      type: NotificationType.PHASE_UPDATE,
      message: `📅 ${eventName} has moved to ${phase}`,
      metadata: {
        eventId,
        phase,
        eventName,
        type: "phase_update",
      },
    });
  }
}

