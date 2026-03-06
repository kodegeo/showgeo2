import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { FollowService } from "./follow.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("FollowService (Idempotent)", () => {
  let service: FollowService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowService,
        {
          provide: PrismaService,
          useValue: {
            app_users: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
            },
            entities: {
              findUnique: jest.fn(),
            },
            events: {
              findUnique: jest.fn(),
            },
            follows: {
              upsert: jest.fn(),
              deleteMany: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<FollowService>(FollowService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================
  // ENTITY FOLLOW
  // =========================================

  describe("followEntity", () => {
    it("should upsert follow record", async () => {
      prisma.app_users.findUnique.mockResolvedValue({ id: "user-1" });
      prisma.entities.findUnique.mockResolvedValue({
        id: "entity-1",
        ownerId: "other-user",
      });

      prisma.follows.upsert.mockResolvedValue({
        id: "follow-1",
        user_id: "user-1",
        target_id: "entity-1",
      });

      const result = await service.followEntity("user-1", "entity-1");

      expect(prisma.follows.upsert).toHaveBeenCalled();
      expect(result.target_id).toBe("entity-1");
    });

    it("should throw if user not found", async () => {
      prisma.app_users.findUnique.mockResolvedValue(null);
      prisma.app_users.findFirst.mockResolvedValue(null);

      await expect(
        service.followEntity("invalid-user", "entity-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw if entity not found", async () => {
      prisma.app_users.findUnique.mockResolvedValue({ id: "user-1" });
      prisma.entities.findUnique.mockResolvedValue(null);

      await expect(
        service.followEntity("user-1", "invalid-entity"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw if following own entity", async () => {
      prisma.app_users.findUnique.mockResolvedValue({ id: "user-1" });
      prisma.entities.findUnique.mockResolvedValue({
        id: "entity-1",
        ownerId: "user-1",
      });

      await expect(
        service.followEntity("user-1", "entity-1"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================
  // UNFOLLOW ENTITY
  // =========================================

  describe("unfollowEntity", () => {
    it("should deleteMany without throwing", async () => {
      prisma.follows.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.unfollowEntity("user-1", "entity-1");

      expect(prisma.follows.deleteMany).toHaveBeenCalled();
      expect(result).toHaveProperty("message");
    });

    it("should not throw if follow does not exist", async () => {
      prisma.follows.deleteMany.mockResolvedValue({ count: 0 });

      await expect(
        service.unfollowEntity("user-1", "entity-1"),
      ).resolves.toHaveProperty("message");
    });
  });

  // =========================================
  // IS FOLLOWING
  // =========================================

  describe("isFollowing", () => {
    it("should return true if follow exists", async () => {
      prisma.follows.findUnique.mockResolvedValue({
        id: "follow-1",
      });

      const result = await service.isFollowing("user-1", "entity-1");

      expect(result).toBe(true);
    });

    it("should return false if follow does not exist", async () => {
      prisma.follows.findUnique.mockResolvedValue(null);

      const result = await service.isFollowing("user-1", "entity-1");

      expect(result).toBe(false);
    });
  });

  // =========================================
  // GET FOLLOW COUNTS
  // =========================================

  describe("getFollowCounts", () => {
    it("should return entity follower count", async () => {
      prisma.follows.count.mockResolvedValue(5);

      const result = await service.getFollowCounts("entity-1", "entity");

      expect(result.followers).toBe(5);
      expect(result.following).toBe(0);
    });

    it("should return user following count", async () => {
      prisma.follows.count.mockResolvedValue(3);

      const result = await service.getFollowCounts("user-1", "user");

      expect(result.following).toBe(3);
      expect(result.followers).toBe(0);
    });
  });

  // =========================================
  // EVENT FOLLOW + NOTIFY
  // =========================================

  describe("followEvent", () => {
    it("should upsert event follow", async () => {
      prisma.app_users.findUnique.mockResolvedValue({ id: "user-1" });
      prisma.events.findUnique.mockResolvedValue({ id: "event-1" });

      prisma.follows.upsert.mockResolvedValue({
        id: "follow-1",
        target_id: "event-1",
      });

      const result = await service.followEvent("user-1", "event-1");

      expect(prisma.follows.upsert).toHaveBeenCalled();
      expect(result.target_id).toBe("event-1");
    });
  });

  describe("setEventNotify", () => {
    it("should update notify flag", async () => {
      prisma.follows.upsert.mockResolvedValue({
        id: "follow-1",
      });

      prisma.follows.update.mockResolvedValue({
        notify: true,
      });

      const result = await service.setEventNotify(
        "user-1",
        "event-1",
        true,
      );

      expect(prisma.follows.update).toHaveBeenCalled();
      expect(result.notify).toBe(true);
    });
  });
});