import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { FollowService } from "../follow/follow.service";
import {
  CreateNotificationDto,
  BroadcastNotificationDto,
  NotificationQueryDto,
} from "./dto";
import { Prisma } from "@prisma/client";
import { NotificationType } from "@prisma/client";
import { NotificationGateway } from "./notifications.gateway";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => FollowService))
    private readonly followService: FollowService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  /**
   * Convenience accessor to treat PrismaService as any
   * so we can use snake_case models (app_users, entities, notifications, etc.)
   * without TypeScript errors.
   */
  private get p(): any {
    return this.prisma as any;
  }

  // ---------------------------------------------------------------------------
  // Create a single notification
  // ---------------------------------------------------------------------------
  async createNotification(createNotificationDto: CreateNotificationDto): Promise<any> {
    const { userId, entityId, type, message, metadata } = createNotificationDto;

    // Validate user exists (app_users)
    const user = await this.p.app_users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Validate entity exists if provided (entities)
    if (entityId) {
      const entity = await this.p.entities.findUnique({
        where: { id: entityId },
      });

      if (!entity) {
        throw new NotFoundException("Entity not found");
      }
    }

    const notification = await this.p.notifications.create({
      data: {
        userId,
        entityId,
        type,
        message,
        metadata: (metadata || {}) as Prisma.InputJsonValue,
        isRead: false,
      },
      include: {
        // Relation name from schema: `entities`
        entities: {
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

  // ---------------------------------------------------------------------------
  // Broadcast to all followers of an entity
  // ---------------------------------------------------------------------------
  async broadcastToFollowers(
    broadcastNotificationDto: BroadcastNotificationDto,
  ): Promise<{ count: number; notifications: any[] }> {
    const { entityId, type, message, metadata } = broadcastNotificationDto;
    const metadataJson = (metadata || {}) as Prisma.InputJsonValue;

    // Validate entity exists
    const entity = await this.p.entities.findUnique({
      where: { id: entityId },
    });

    if (!entity) {
      throw new NotFoundException("Entity not found");
    }

    // Get all followers of the entity
    const followers = await this.p.follows.findMany({
      where: { entityId },
      select: { userId: true },
    });

    if (!followers.length) {
      return { count: 0, notifications: [] };
    }

    const userIds = followers.map((f) => f.userId);

    // Create notifications for all followers
    const notifications = await Promise.all(
      userIds.map((userId) =>
        this.p.notifications.create({
          data: {
            userId,
            entityId,
            type,
            message,
            metadata: metadataJson,
            isRead: false,
          },
          include: {
            entities: {
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

  // ---------------------------------------------------------------------------
  // Mark a notification as read
  // ---------------------------------------------------------------------------
  async markAsRead(notificationId: string, userId: string): Promise<any> {
    const notification = await this.p.notifications.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    if (notification.userId !== userId) {
      throw new BadRequestException(
        "You can only mark your own notifications as read",
      );
    }

    const updated = await this.p.notifications.update({
      where: { id: notificationId },
      data: { isRead: true },
      include: {
        entities: {
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

  // ---------------------------------------------------------------------------
  // Get paginated notifications for a user
  // ---------------------------------------------------------------------------
  async getUserNotifications(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<{
    data: any[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      unreadCount: number;
    };
  }> {
    const { unreadOnly, page = 1, limit = 20 } = query;

    // Validate user exists
    const user = await this.p.app_users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const where: any = {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      this.p.notifications.findMany({
        where,
        include: {
          entities: {
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
      this.p.notifications.count({ where }),
      this.p.notifications.count({
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

  // ---------------------------------------------------------------------------
  // Get unread count for a user
  // ---------------------------------------------------------------------------
  async getUnreadCount(userId: string): Promise<number> {
    // Validate user exists
    const user = await this.p.app_users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const count = await this.p.notifications.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return count;
  }

  // ---------------------------------------------------------------------------
  // Clear all notifications (mark read or delete)
  // ---------------------------------------------------------------------------
  async clearAll(
    userId: string,
    markAsRead = false,
  ): Promise<{ count: number }> {
    // Validate user exists
    const user = await this.p.app_users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (markAsRead) {
      const result = await this.p.notifications.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });

      return { count: result.count };
    }

    const result = await this.p.notifications.deleteMany({
      where: { userId },
    });

    return { count: result.count };
  }

  // ---------------------------------------------------------------------------
  // Helper hooks for other modules
  // ---------------------------------------------------------------------------

  async notifyStreamingSessionStarted(eventId: string, entityId: string) {
    const event = await this.p.events.findUnique({
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
      } as Record<string, unknown>,
    });
  }

  async notifyProductAdded(
    entityId: string,
    productId: string,
    productName: string,
  ) {
    await this.broadcastToFollowers({
      entityId,
      type: NotificationType.NEW_DROP,
      message: `🛍️ New product: ${productName}`,
      metadata: {
        productId,
        productName,
        type: "product_added",
      } as Record<string, unknown>,
    });
  }

  async notifyEventPhaseUpdate(
    eventId: string,
    entityId: string,
    phase: string,
    eventName: string,
  ) {
    await this.broadcastToFollowers({
      entityId,
      type: NotificationType.PHASE_UPDATE,
      message: `📅 ${eventName} has moved to ${phase}`,
      metadata: {
        eventId,
        phase,
        eventName,
        type: "phase_update",
      } as Record<string, unknown>,
    });
  }
}
