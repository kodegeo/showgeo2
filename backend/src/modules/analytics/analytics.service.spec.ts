import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { PrismaService } from "../../prisma/prisma.service";
import { TestUtils } from "../../../test/test-utils";

describe("AnalyticsService", () => {
  let service: AnalyticsService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await TestUtils.createTestingModule({
      imports: [],
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: TestUtils.createMockPrismaService(),
        },
      ],
    });

    service = module.get<AnalyticsService>(AnalyticsService);
    prismaService = module.get<PrismaService>(PrismaService);

    (prismaService as any).reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("aggregateMetrics", () => {
    it("should successfully aggregate entity metrics", async () => {
      const entityId = "entity-123";
      const entity = await TestUtils.createTestEntity({ id: entityId });

      (prismaService.entity.findUnique as jest.Mock).mockResolvedValue(entity);
      (prismaService.event.count as jest.Mock).mockResolvedValue(10);
      (prismaService.follow.count as jest.Mock).mockResolvedValue(50);
      (prismaService.product.count as jest.Mock).mockResolvedValue(25);
      (prismaService.product.aggregate as jest.Mock).mockResolvedValue({ _sum: { price: 1000 } });
      (prismaService.streamingSession.aggregate as jest.Mock).mockResolvedValue({ _avg: { viewers: 500 } });
      (prismaService.notification.count as jest.Mock).mockResolvedValue(100);
      (prismaService.ticket.count as jest.Mock).mockResolvedValue(200);

      const result = await service.aggregateMetrics(entityId);

      expect(result).toHaveProperty("eventsCount");
      expect(result).toHaveProperty("activeFollowers");
      expect(result).toHaveProperty("engagementScore");
      expect(prismaService.entity.findUnique).toHaveBeenCalled();
    });

    it("should throw NotFoundException if entity not found", async () => {
      (prismaService.entity.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.aggregateMetrics("invalid-entity")).rejects.toThrow(NotFoundException);
    });
  });

  describe("getEventPerformance", () => {
    it("should successfully get event performance metrics", async () => {
      const eventId = "event-123";
      const event = {
        id: eventId,
        streamingSessions: [
          {
            id: "session-1",
            viewers: 100,
            active: false,
            startTime: new Date(),
            endTime: new Date(Date.now() + 3600000),
            metrics: { messages: 50, reactions: 100, participants: 10 },
          },
        ],
        tickets: [{ id: "ticket-1" }, { id: "ticket-2" }],
      };

      (prismaService.event.findUnique as jest.Mock).mockResolvedValue(event);

      const result = await service.getEventPerformance(eventId);

      expect(result).toHaveProperty("viewers");
      expect(result).toHaveProperty("messages");
      expect(result).toHaveProperty("reactions");
      expect(result).toHaveProperty("ticketsSold");
      expect(prismaService.event.findUnique).toHaveBeenCalled();
    });

    it("should throw NotFoundException if event not found", async () => {
      (prismaService.event.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getEventPerformance("invalid-id")).rejects.toThrow(NotFoundException);
    });
  });

  describe("getUserEngagement", () => {
    it("should successfully get user engagement metrics", async () => {
      const userId = "user-123";
      const user = await TestUtils.createTestUser({ id: userId });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prismaService.ticket.count as jest.Mock).mockResolvedValue(5);
      (prismaService.streamingSession.count as jest.Mock).mockResolvedValue(10);
      (prismaService.follow.count as jest.Mock).mockResolvedValue(15);
      (prismaService.follow.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.notification.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await service.getUserEngagement(userId);

      expect(result).toHaveProperty("eventsAttended");
      expect(result).toHaveProperty("streamsWatched");
      expect(result).toHaveProperty("entitiesFollowed");
      expect(result).toHaveProperty("engagementScore");
      expect(prismaService.user.findUnique).toHaveBeenCalled();
    });

    it("should throw NotFoundException if user not found", async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getUserEngagement("invalid-id")).rejects.toThrow(NotFoundException);
    });
  });

  describe("getPlatformOverview", () => {
    it("should successfully get platform overview", async () => {
      (prismaService.user.count as jest.Mock).mockResolvedValue(1000);
      (prismaService.entity.count as jest.Mock).mockResolvedValue(100);
      (prismaService.event.count as jest.Mock).mockResolvedValue(500);
      (prismaService.streamingSession.count as jest.Mock).mockResolvedValue(25);
      (prismaService.analyticsSummary.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.user.count as jest.Mock).mockResolvedValue(100);
      (prismaService.event.count as jest.Mock).mockResolvedValue(50);
      (prismaService.product.count as jest.Mock).mockResolvedValue(200);
      (prismaService.streamingSession.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getPlatformOverview();

      expect(result).toHaveProperty("totalUsers");
      expect(result).toHaveProperty("totalEntities");
      expect(result).toHaveProperty("totalEvents");
      expect(result).toHaveProperty("activeSessions");
      expect(result).toHaveProperty("topPerformingEntities");
      expect(result).toHaveProperty("recentActivity");
    });
  });

  describe("getRecommendations", () => {
    it("should successfully get recommendations for user", async () => {
      const userId = "user-123";
      const user = await TestUtils.createTestUser({ id: userId });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prismaService.entity.findMany as jest.Mock).mockResolvedValue([
        {
          id: "entity-1",
          name: "Entity 1",
          slug: "entity-1",
          type: "ARTIST",
          isPublic: true,
          events: [{ id: "event-1" }],
          followers: [{ userId: "other-user" }],
        },
      ]);
      (prismaService.follow.count as jest.Mock).mockResolvedValue(5);
      (prismaService.ticket.count as jest.Mock).mockResolvedValue(10);
      (prismaService.streamingSession.count as jest.Mock).mockResolvedValue(3);
      (prismaService.notification.count as jest.Mock).mockResolvedValue(20);
      (prismaService.event.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRecommendations(userId);

      expect(result).toHaveProperty("entities");
      expect(result).toHaveProperty("events");
      expect(Array.isArray(result.entities)).toBe(true);
      expect(Array.isArray(result.events)).toBe(true);
    });

    it("should throw NotFoundException if user not found", async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getRecommendations("invalid-id")).rejects.toThrow(NotFoundException);
    });
  });

  describe("validateEntityAccess", () => {
    it("should allow owner to access entity analytics", async () => {
      const entityId = "entity-123";
      const userId = "user-123";

      const entity = await TestUtils.createTestEntity({ id: entityId, ownerId: userId });
      (prismaService.entity.findUnique as jest.Mock).mockResolvedValue({
        ...entity,
        roles: [],
      });

      await expect(service.validateEntityAccess(entityId, userId)).resolves.not.toThrow();
    });

    it("should throw NotFoundException if entity not found", async () => {
      (prismaService.entity.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.validateEntityAccess("invalid-entity", "user-123")).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException if user is not owner or manager", async () => {
      const entityId = "entity-123";
      const userId = "user-123";

      const entity = await TestUtils.createTestEntity({ id: entityId, ownerId: "other-user" });
      (prismaService.entity.findUnique as jest.Mock).mockResolvedValue({
        ...entity,
        roles: [],
      });

      await expect(service.validateEntityAccess(entityId, userId)).rejects.toThrow(ForbiddenException);
    });
  });
});

