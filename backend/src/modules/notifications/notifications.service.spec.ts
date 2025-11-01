import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { PrismaService } from "../../prisma/prisma.service";
import { FollowService } from "../follow/follow.service";
import { NotificationGateway } from "./notifications.gateway";
import { CreateNotificationDto, BroadcastNotificationDto } from "./dto";
import { NotificationType } from "@prisma/client";
import { TestUtils } from "../../../test/test-utils";

describe("NotificationsService", () => {
  let service: NotificationsService;
  let prismaService: PrismaService;
  let followService: FollowService;
  let notificationGateway: NotificationGateway;

  beforeEach(async () => {
    const module: TestingModule = await TestUtils.createTestingModule({
      imports: [],
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: TestUtils.createMockPrismaService(),
        },
        {
          provide: FollowService,
          useValue: {
            getFollowers: jest.fn(() => Promise.resolve({ data: [], meta: { total: 0 } })),
          },
        },
        {
          provide: NotificationGateway,
          useValue: {
            notifyUser: jest.fn(),
            notifyUnreadCount: jest.fn(),
          },
        },
      ],
    });

    service = module.get<NotificationsService>(NotificationsService);
    prismaService = module.get<PrismaService>(PrismaService);
    followService = module.get<FollowService>(FollowService);
    notificationGateway = module.get<NotificationGateway>(NotificationGateway);

    (prismaService as any).reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createNotification", () => {
    it("should successfully create notification", async () => {
      const userId = "user-123";
      const createDto: CreateNotificationDto = {
        userId,
        type: NotificationType.CUSTOM,
        message: "Test notification",
      };

      const user = await TestUtils.createTestUser({ id: userId });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prismaService.notification.create as jest.Mock).mockResolvedValue({
        id: "notification-123",
        ...createDto,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createNotification(createDto);

      expect(result).toHaveProperty("userId", userId);
      expect(result).toHaveProperty("message", createDto.message);
      expect(prismaService.notification.create).toHaveBeenCalled();
      expect(notificationGateway.notifyUser).toHaveBeenCalled();
    });

    it("should throw NotFoundException if user not found", async () => {
      const createDto: CreateNotificationDto = {
        userId: "invalid-user",
        type: NotificationType.CUSTOM,
        message: "Test",
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.createNotification(createDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe("broadcastToFollowers", () => {
    it("should successfully broadcast to all followers", async () => {
      const entityId = "entity-123";
      const broadcastDto: BroadcastNotificationDto = {
        entityId,
        type: NotificationType.LIVE_NOW,
        message: "Entity is now live!",
      };

      const entity = await TestUtils.createTestEntity({ id: entityId });
      (prismaService.entity.findUnique as jest.Mock).mockResolvedValue(entity);
      (prismaService.follow.findMany as jest.Mock).mockResolvedValue([
        { userId: "user-1" },
        { userId: "user-2" },
      ]);

      (prismaService.notification.create as jest.Mock).mockImplementation(({ data }) => {
        return Promise.resolve({
          id: `notification-${Date.now()}`,
          ...data,
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      const result = await service.broadcastToFollowers(broadcastDto);

      expect(result).toHaveProperty("count", 2);
      expect(result.notifications).toHaveLength(2);
      expect(prismaService.notification.create).toHaveBeenCalledTimes(2);
    });

    it("should throw NotFoundException if entity not found", async () => {
      const broadcastDto: BroadcastNotificationDto = {
        entityId: "invalid-entity",
        type: NotificationType.LIVE_NOW,
        message: "Test",
      };

      (prismaService.entity.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.broadcastToFollowers(broadcastDto)).rejects.toThrow(NotFoundException);
    });

    it("should return empty array if entity has no followers", async () => {
      const entityId = "entity-123";
      const broadcastDto: BroadcastNotificationDto = {
        entityId,
        type: NotificationType.LIVE_NOW,
        message: "Test",
      };

      const entity = await TestUtils.createTestEntity({ id: entityId });
      (prismaService.entity.findUnique as jest.Mock).mockResolvedValue(entity);
      (prismaService.follow.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.broadcastToFollowers(broadcastDto);

      expect(result.count).toBe(0);
      expect(result.notifications).toHaveLength(0);
    });
  });

  describe("markAsRead", () => {
    it("should successfully mark notification as read", async () => {
      const notificationId = "notification-123";
      const userId = "user-123";

      const notification = {
        id: notificationId,
        userId,
        isRead: false,
        createdAt: new Date(),
      };

      (prismaService.notification.findUnique as jest.Mock).mockResolvedValue(notification);
      (prismaService.notification.update as jest.Mock).mockResolvedValue({
        ...notification,
        isRead: true,
        updatedAt: new Date(),
      });

      const result = await service.markAsRead(notificationId, userId);

      expect(result).toHaveProperty("isRead", true);
      expect(prismaService.notification.update).toHaveBeenCalledWith({
        where: { id: notificationId },
        data: { isRead: true },
        include: expect.any(Object),
      });
    });

    it("should throw NotFoundException if notification not found", async () => {
      (prismaService.notification.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.markAsRead("invalid-id", "user-123")).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException if user doesn't own notification", async () => {
      const notification = {
        id: "notification-123",
        userId: "other-user",
        isRead: false,
      };

      (prismaService.notification.findUnique as jest.Mock).mockResolvedValue(notification);

      await expect(service.markAsRead("notification-123", "user-123")).rejects.toThrow(BadRequestException);
    });
  });

  describe("getUserNotifications", () => {
    it("should return paginated notifications", async () => {
      const userId = "user-123";
      const notifications = [
        {
          id: "notification-1",
          userId,
          isRead: false,
          createdAt: new Date(),
        },
        {
          id: "notification-2",
          userId,
          isRead: true,
          createdAt: new Date(),
        },
      ];

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(await TestUtils.createTestUser({ id: userId }));
      (prismaService.notification.findMany as jest.Mock).mockResolvedValue(notifications);
      (prismaService.notification.count as jest.Mock).mockResolvedValue(2).mockResolvedValueOnce(2).mockResolvedValueOnce(1);

      const result = await service.getUserNotifications(userId, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.unreadCount).toBe(1);
    });

    it("should filter by unreadOnly", async () => {
      const userId = "user-123";
      const notifications = [
        {
          id: "notification-1",
          userId,
          isRead: false,
          createdAt: new Date(),
        },
      ];

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(await TestUtils.createTestUser({ id: userId }));
      (prismaService.notification.findMany as jest.Mock).mockResolvedValue(notifications);
      (prismaService.notification.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getUserNotifications(userId, { unreadOnly: true, page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].isRead).toBe(false);
    });
  });

  describe("getUnreadCount", () => {
    it("should return unread notification count", async () => {
      const userId = "user-123";

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(await TestUtils.createTestUser({ id: userId }));
      (prismaService.notification.count as jest.Mock).mockResolvedValue(5);

      const result = await service.getUnreadCount(userId);

      expect(result).toBe(5);
      expect(prismaService.notification.count).toHaveBeenCalledWith({
        where: { userId, isRead: false },
      });
    });

    it("should throw NotFoundException if user not found", async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getUnreadCount("invalid-id")).rejects.toThrow(NotFoundException);
    });
  });

  describe("clearAll", () => {
    it("should delete all notifications when markAsRead is false", async () => {
      const userId = "user-123";

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(await TestUtils.createTestUser({ id: userId }));
      (prismaService.notification.deleteMany as jest.Mock).mockResolvedValue({ count: 10 });

      const result = await service.clearAll(userId, false);

      expect(result.count).toBe(10);
      expect(prismaService.notification.deleteMany).toHaveBeenCalledWith({ where: { userId } });
    });

    it("should mark all as read when markAsRead is true", async () => {
      const userId = "user-123";

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(await TestUtils.createTestUser({ id: userId }));
      (prismaService.notification.updateMany as jest.Mock).mockResolvedValue({ count: 10 });

      const result = await service.clearAll(userId, true);

      expect(result.count).toBe(10);
      expect(prismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
    });
  });
});

