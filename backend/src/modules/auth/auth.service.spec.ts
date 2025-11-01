import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RegisterDto, LoginDto } from "./dto";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { TestUtils } from "../../../test/test-utils";

describe("AuthService", () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await TestUtils.createTestingModule({
      imports: [],
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: TestUtils.createMockPrismaService(),
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(() => "mock-access-token"),
            verify: jest.fn(() => ({ sub: "user-id", email: "test@example.com" })),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "JWT_SECRET") return "test-secret";
              if (key === "JWT_EXPIRES_IN") return "15m";
              if (key === "JWT_REFRESH_SECRET") return "refresh-secret";
              if (key === "JWT_REFRESH_EXPIRES_IN") return "7d";
              return undefined;
            }),
          },
        },
      ],
    });

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset mock data
    (prismaService as any).reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("should successfully register a new user", async () => {
      const registerDto: RegisterDto = {
        email: "newuser@example.com",
        password: "password123",
        role: UserRole.USER,
        firstName: "Test",
        lastName: "User",
      };

      const result = await service.register(registerDto);

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(result).toHaveProperty("user");
      expect(result.user.email).toBe(registerDto.email);
      expect(prismaService.user.create).toHaveBeenCalled();
    });

    it("should throw ConflictException if user already exists", async () => {
      const registerDto: RegisterDto = {
        email: "existing@example.com",
        password: "password123",
        role: UserRole.USER,
      };

      // Create existing user
      const existingUser = await TestUtils.createTestUser({ email: registerDto.email });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(existingUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it("should hash password before storing", async () => {
      const registerDto: RegisterDto = {
        email: "test@example.com",
        password: "password123",
        role: UserRole.USER,
      };

      await service.register(registerDto);

      const createCall = (prismaService.user.create as jest.Mock).mock.calls[0];
      const password = createCall[0].data.password;

      expect(password).not.toBe(registerDto.password);
      expect(await bcrypt.compare(registerDto.password, password)).toBe(true);
    });
  });

  describe("login", () => {
    it("should successfully login with correct credentials", async () => {
      const loginDto: LoginDto = {
        email: "test@example.com",
        password: "password123",
      };

      const hashedPassword = await bcrypt.hash(loginDto.password, 10);
      const user = await TestUtils.createTestUser({
        email: loginDto.email,
        password: hashedPassword,
      });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(result).toHaveProperty("user");
      expect(jwtService.sign).toHaveBeenCalled();
    });

    it("should throw UnauthorizedException if user not found", async () => {
      const loginDto: LoginDto = {
        email: "nonexistent@example.com",
        password: "password123",
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException if password is incorrect", async () => {
      const loginDto: LoginDto = {
        email: "test@example.com",
        password: "wrongpassword",
      };

      const hashedPassword = await bcrypt.hash("password123", 10);
      const user = await TestUtils.createTestUser({
        email: loginDto.email,
        password: hashedPassword,
      });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("refreshToken", () => {
    it("should generate new tokens with valid refresh token", async () => {
      const refreshTokenDto = {
        refreshToken: "valid-refresh-token",
      };

      const user = await TestUtils.createTestUser();
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: user.id, email: user.email });

      const result = await service.refreshToken(refreshTokenDto.refreshToken);

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(jwtService.sign).toHaveBeenCalledTimes(2); // access + refresh
    });

    it("should throw UnauthorizedException with invalid refresh token", async () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(service.refreshToken("invalid-token")).rejects.toThrow(UnauthorizedException);
    });
  });
});

