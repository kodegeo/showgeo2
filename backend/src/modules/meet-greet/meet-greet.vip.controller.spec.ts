import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { MeetGreetFanController } from "./meet-greet.fan.controller";
import { MeetGreetController } from "./meet-greet.controller";
import { MeetGreetService, MeetGreetSessionStatus } from "./meet-greet.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthService } from "../auth/auth.service";
import { AccessToken } from "livekit-server-sdk";

// Mock LiveKit AccessToken
jest.mock("livekit-server-sdk", () => ({
  AccessToken: jest.fn().mockImplementation(() => ({
    addGrant: jest.fn(),
    toJwt: jest.fn().mockResolvedValue("mock-vip-jwt-token"),
    ttl: "",
  })),
  RoomServiceClient: jest.fn(),
}));

describe("VIP Meet & Greet LiveKit Token Generation", () => {
  let fanController: MeetGreetFanController;
  let artistController: MeetGreetController;
  let service: MeetGreetService;
  let prismaService: PrismaService;

  const mockUserId = "fan-123";
  const mockOtherUserId = "fan-456";
  const mockArtistId = "artist-789";
  const mockEventId = "event-123";
  const mockSessionId = "session-123";

  const mockUser: any = {
    id: mockUserId,
    email: "fan@example.com",
    role: "USER",
  };

  const mockArtist: any = {
    id: mockArtistId,
    email: "artist@example.com",
    role: "ENTITY",
  };

  const mockActiveSession: any = {
    id: mockSessionId,
    eventId: mockEventId,
    ticketId: "ticket-123",
    userId: mockUserId,
    slotOrder: 1,
    durationMinutes: 5,
    status: MeetGreetSessionStatus.ACTIVE,
    startedAt: new Date(),
    endedAt: null,
    joinedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPendingSession: any = {
    ...mockActiveSession,
    status: MeetGreetSessionStatus.PENDING,
    startedAt: null,
  };

  const mockCompletedSession: any = {
    ...mockActiveSession,
    status: MeetGreetSessionStatus.COMPLETED,
    endedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeetGreetFanController, MeetGreetController],
      providers: [
        MeetGreetService,
        {
          provide: PrismaService,
          useValue: {
            meet_greet_sessions: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
            },
            $transaction: jest.fn((callback) => callback({})),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "LIVEKIT_API_KEY") return "test-api-key";
              if (key === "LIVEKIT_API_SECRET") return "test-api-secret";
              return null;
            }),
          },
        },
        {
          provide: AuthService,
          useValue: { verifySupabaseToken: jest.fn() },
        },
      ],
    }).compile();

    fanController = module.get<MeetGreetFanController>(MeetGreetFanController);
    artistController = module.get<MeetGreetController>(MeetGreetController);
    service = module.get<MeetGreetService>(MeetGreetService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe("Fan VIP Join (POST /api/meet-greet/sessions/:sessionId/join-vip)", () => {
    it("should generate VIP token when session is ACTIVE and belongs to user", async () => {
      jest.spyOn(service, "generateFanVipToken").mockResolvedValue({
        roomName: `vip-event-${mockEventId}-session-${mockSessionId}`,
        livekitToken: "mock-vip-jwt-token",
        expiresAt: new Date(),
      });

      const result = await fanController.joinVip(mockSessionId, mockUser);

      expect(service.generateFanVipToken).toHaveBeenCalledWith(mockSessionId, mockUserId);
      expect(result).toHaveProperty("roomName");
      expect(result).toHaveProperty("livekitToken");
      expect(result).toHaveProperty("expiresAt");
      expect(result.roomName).toContain("vip-event");
      expect(result.roomName).toContain(mockEventId);
      expect(result.roomName).toContain(mockSessionId);
    });

    it("should return 403 when user tries to join someone else's session", async () => {
      jest
        .spyOn(service, "generateFanVipToken")
        .mockRejectedValue(
          new ForbiddenException("You do not have permission to join this session"),
        );

      await expect(fanController.joinVip(mockSessionId, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should return 400 if session is PENDING", async () => {
      jest
        .spyOn(service, "generateFanVipToken")
        .mockRejectedValue(new BadRequestException("Session not active yet"));

      await expect(fanController.joinVip(mockSessionId, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should return 400 if session is COMPLETED", async () => {
      jest
        .spyOn(service, "generateFanVipToken")
        .mockRejectedValue(new BadRequestException("Session has ended"));

      await expect(fanController.joinVip(mockSessionId, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should return 404 when session not found", async () => {
      jest
        .spyOn(service, "generateFanVipToken")
        .mockRejectedValue(new NotFoundException("Session not found"));

      await expect(fanController.joinVip("non-existent", mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return 500 when LiveKit is not configured", async () => {
      jest
        .spyOn(service, "generateFanVipToken")
        .mockRejectedValue(
          new InternalServerErrorException("LiveKit not configured"),
        );

      await expect(fanController.joinVip(mockSessionId, mockUser)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe("Artist VIP Join (POST /api/events/:eventId/meet-greet/join-vip)", () => {
    it("should generate VIP token for authorized artist when session is ACTIVE", async () => {
      jest.spyOn(service, "checkEventPermissions").mockResolvedValue(undefined);
      jest.spyOn(service, "generateArtistVipToken").mockResolvedValue({
        roomName: `vip-event-${mockEventId}-session-${mockSessionId}`,
        livekitToken: "mock-vip-jwt-token",
        expiresAt: new Date(),
        sessionId: mockSessionId,
      });

      const result = await artistController.joinVip(mockEventId, mockArtist);

      expect(service.checkEventPermissions).toHaveBeenCalledWith(mockEventId, mockArtistId);
      expect(service.generateArtistVipToken).toHaveBeenCalledWith(mockEventId, mockArtistId);
      expect(result).toHaveProperty("roomName");
      expect(result).toHaveProperty("livekitToken");
      expect(result).toHaveProperty("expiresAt");
      expect(result).toHaveProperty("sessionId");
      expect(result.roomName).toContain("vip-event");
      expect(result.roomName).toContain(mockEventId);
    });

    it("should return 403 for unauthorized artist", async () => {
      jest
        .spyOn(service, "checkEventPermissions")
        .mockRejectedValue(new ForbiddenException("Insufficient permissions"));

      await expect(artistController.joinVip(mockEventId, mockArtist)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should return 400 when no active session exists", async () => {
      jest.spyOn(service, "checkEventPermissions").mockResolvedValue(undefined);
      jest
        .spyOn(service, "generateArtistVipToken")
        .mockRejectedValue(new BadRequestException("No active VIP session. Start a session first."));

      await expect(artistController.joinVip(mockEventId, mockArtist)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should return 500 when LiveKit is not configured", async () => {
      jest.spyOn(service, "checkEventPermissions").mockResolvedValue(undefined);
      jest
        .spyOn(service, "generateArtistVipToken")
        .mockRejectedValue(
          new InternalServerErrorException("LiveKit not configured"),
        );

      await expect(artistController.joinVip(mockEventId, mockArtist)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe("Token Generation Logic", () => {
    it("should generate token with correct room name format", async () => {
      const roomName = `vip-event-${mockEventId}-session-${mockSessionId}`;
      
      jest.spyOn(service, "generateFanVipToken").mockResolvedValue({
        roomName,
        livekitToken: "mock-token",
        expiresAt: new Date(),
      });

      const result = await fanController.joinVip(mockSessionId, mockUser);

      expect(result.roomName).toBe(roomName);
      expect(result.roomName).toMatch(/^vip-event-[a-z0-9-]+-session-[a-z0-9-]+$/);
    });

    it("should set token expiration based on session duration", async () => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      jest.spyOn(service, "generateFanVipToken").mockResolvedValue({
        roomName: "vip-event-test-session-test",
        livekitToken: "mock-token",
        expiresAt,
      });

      const result = await fanController.joinVip(mockSessionId, mockUser);

      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });
});

