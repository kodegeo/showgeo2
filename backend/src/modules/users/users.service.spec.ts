import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ConflictException, ForbiddenException } from "@nestjs/common";
import { UsersService } from "./users.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateUserProfileDto, UpdateUserProfileDto } from "./dto";
import { UserRole } from "@prisma/client";
import { TestUtils } from "../../../test/test-utils";

describe("UsersService", () => {
  let service: UsersService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await TestUtils.createTestingModule({
      imports: [],
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: TestUtils.createMockPrismaService(),
        },
      ],
    });

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);

    (prismaService as any).reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createUserProfile", () => {
    it("should successfully create user profile", async () => {
      const userId = "user-123";
      const createDto: CreateUserProfileDto = {
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        bio: "Test bio",
      };

      const user = await TestUtils.createTestUser({ id: userId });
      (prismaService.app_users.findUnique as jest.Mock).mockResolvedValue({
        ...user,
        profile: null,
      });
      (prismaService.user_profiles.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.createUserProfile(userId, createDto);

      expect(result).toHaveProperty("username", createDto.username);
      expect(prismaService.user_profiles.create).toHaveBeenCalled();
    });

    it("should throw NotFoundException if user not found", async () => {
      (prismaService.app_users.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.createUserProfile("invalid-id", {} as CreateUserProfileDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ConflictException if profile already exists", async () => {
      const userId = "user-123";
      const user = await TestUtils.createTestUser({ id: userId });
      (prismaService.app_users.findUnique as jest.Mock).mockResolvedValue({
        ...user,
        profile: { id: "profile-123" },
      });

      await expect(service.createUserProfile(userId, {} as CreateUserProfileDto)).rejects.toThrow(ConflictException);
    });
  });

  describe("updateProfile", () => {
    it("should successfully update user profile", async () => {
      const userId = "user-123";
      const updateDto: UpdateUserProfileDto = {
        bio: "Updated bio",
        location: "New York",
      };

      const user = await TestUtils.createTestUser({ id: userId });
      (prismaService.app_users.findUnique as jest.Mock).mockResolvedValue(user);
      (prismaService.user_profiles.findUnique as jest.Mock).mockResolvedValue({
        id: "profile-123",
        userId,
        bio: "Old bio",
      });

      const result = await service.updateProfile(userId, updateDto);

      expect(result).toHaveProperty("bio", updateDto.bio);
      expect(prismaService.user_profiles.update).toHaveBeenCalled();
    });

    it("should throw NotFoundException if user not found", async () => {
      (prismaService.app_users.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.updateProfile("invalid-id", {} as UpdateUserProfileDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe("findAll", () => {
    it("should return paginated list of users", async () => {
      const users = [await TestUtils.createTestUser(), await TestUtils.createTestUser()];
      (prismaService.app_users.findMany as jest.Mock).mockResolvedValue(users);
      (prismaService.app_users.count as jest.Mock).mockResolvedValue(2);

      const result = await service.findAll(1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(prismaService.app_users.findMany).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return user by id", async () => {
      const user = await TestUtils.createTestUser();
      (prismaService.app_users.findUnique as jest.Mock).mockResolvedValue(user);

      const result = await service.findOne(user.id);

      expect(result).toHaveProperty("id", user.id);
      expect(prismaService.app_users.findUnique).toHaveBeenCalledWith({ where: { id: user.id } });
    });

    it("should throw NotFoundException if user not found", async () => {
      (prismaService.app_users.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne("invalid-id")).rejects.toThrow(NotFoundException);
    });
  });

  describe("delete", () => {
    it("should successfully delete user", async () => {
      const user = await TestUtils.createTestUser();
      (prismaService.app_users.findUnique as jest.Mock).mockResolvedValue(user);
      (prismaService.app_users.delete as jest.Mock).mockResolvedValue(user);

      await service.delete(user.id);

      expect(prismaService.app_users.delete).toHaveBeenCalledWith({ where: { id: user.id } });
    });

    it("should throw NotFoundException if user not found", async () => {
      (prismaService.app_users.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.delete("invalid-id")).rejects.toThrow(NotFoundException);
    });
  });
});

