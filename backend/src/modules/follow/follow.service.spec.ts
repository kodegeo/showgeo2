import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { FollowService } from "./follow.service";
import { PrismaService } from "../../prisma/prisma.service";
import { TestUtils } from "../../../test/test-utils";

describe("FollowService", () => {
  let service: FollowService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await TestUtils.createTestingModule({
      imports: [],
      providers: [
        FollowService,
        {
          provide: PrismaService,
          useValue: TestUtils.createMockPrismaService(),
        },
      ],
    });

    service = module.get<FollowService>(FollowService);
    prismaService = module.get<PrismaService>(PrismaService);

    (prismaService as any).reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("followEntity", () => {
    it("should successfully follow an entity", async () => {
      const userId = "user-123";
      const entityId = "entity-123";

      const user = await TestUtils.createTestUser({ id: userId });
      const entity = await TestUtils.createTestEntity({ id: entityId, ownerId: "other-user" });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prismaService.entity.findUnique as jest.Mock).mockResolvedValue(entity);
      (prismaService.follow.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.follow.create as jest.Mock).mockResolvedValue({
        id: "follow-123",
        userId,
        entityId,
        createdAt: new Date(),
      });

      const result = await service.followEntity(userId, entityId);

      expect(result).toHaveProperty("userId", userId);
      expect(result).toHaveProperty("entityId", entityId);
      expect(prismaService.follow.create).toHaveBeenCalled();
    });

    it("should throw NotFoundException if user not found", async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.followEntity("invalid-user", "entity-123")).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException if entity not found", async () => {
      const user = await TestUtils.createTestUser();
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prismaService.entity.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.followEntity(user.id, "invalid-entity")).rejects.toThrow(NotFoundException);
    });

    it("should throw ConflictException if already following", async () => {
      const userId = "user-123";
      const entityId = "entity-123";

      const user = await TestUtils.createTestUser({ id: userId });
      const entity = await TestUtils.createTestEntity({ id: entityId });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prismaService.entity.findUnique as jest.Mock).mockResolvedValue(entity);
      (prismaService.follow.findUnique as jest.Mock).mockResolvedValue({
        id: "follow-123",
        userId,
        entityId,
      });

      await expect(service.followEntity(userId, entityId)).rejects.toThrow(ConflictException);
    });

    it("should throw BadRequestException if trying to follow own entity", async () => {
      const userId = "user-123";
      const entityId = "entity-123";

      const user = await TestUtils.createTestUser({ id: userId });
      const entity = await TestUtils.createTestEntity({ id: entityId, ownerId: userId });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prismaService.entity.findUnique as jest.Mock).mockResolvedValue(entity);

      await expect(service.followEntity(userId, entityId)).rejects.toThrow(BadRequestException);
    });
  });

  describe("unfollowEntity", () => {
    it("should successfully unfollow an entity", async () => {
      const userId = "user-123";
      const entityId = "entity-123";

      const follow = {
        id: "follow-123",
        userId,
        entityId,
        createdAt: new Date(),
      };

      (prismaService.follow.findUnique as jest.Mock).mockResolvedValue(follow);
      (prismaService.follow.delete as jest.Mock).mockResolvedValue(follow);

      const result = await service.unfollowEntity(userId, entityId);

      expect(result).toHaveProperty("message");
      expect(prismaService.follow.delete).toHaveBeenCalled();
    });

    it("should throw NotFoundException if follow relationship not found", async () => {
      (prismaService.follow.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.unfollowEntity("user-123", "entity-123")).rejects.toThrow(NotFoundException);
    });
  });

  describe("getFollowers", () => {
    it("should return paginated list of followers", async () => {
      const entityId = "entity-123";
      const followers = [
        {
          id: "follow-1",
          userId: "user-1",
          entityId,
          user: {
            id: "user-1",
            email: "user1@example.com",
            profile: {
              username: "user1",
              avatarUrl: null,
            },
          },
        },
        {
          id: "follow-2",
          userId: "user-2",
          entityId,
          user: {
            id: "user-2",
            email: "user2@example.com",
            profile: {
              username: "user2",
              avatarUrl: null,
            },
          },
        },
      ];

      const entity = await TestUtils.createTestEntity({ id: entityId });
      (prismaService.entity.findUnique as jest.Mock).mockResolvedValue(entity);
      (prismaService.follow.findMany as jest.Mock).mockResolvedValue(followers);
      (prismaService.follow.count as jest.Mock).mockResolvedValue(2);

      const result = await service.getFollowers(entityId, 1, 20);

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it("should throw NotFoundException if entity not found", async () => {
      (prismaService.entity.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getFollowers("invalid-entity", 1, 20)).rejects.toThrow(NotFoundException);
    });
  });

  describe("isFollowing", () => {
    it("should return true if user is following entity", async () => {
      const userId = "user-123";
      const entityId = "entity-123";

      (prismaService.follow.findUnique as jest.Mock).mockResolvedValue({
        id: "follow-123",
        userId,
        entityId,
      });

      const result = await service.isFollowing(userId, entityId);

      expect(result).toBe(true);
    });

    it("should return false if user is not following entity", async () => {
      const userId = "user-123";
      const entityId = "entity-123";

      (prismaService.follow.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.isFollowing(userId, entityId);

      expect(result).toBe(false);
    });
  });
});

