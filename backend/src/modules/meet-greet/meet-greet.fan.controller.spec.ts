import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ForbiddenException, NotFoundException, BadRequestException } from "@nestjs/common";
import { MeetGreetFanController } from "./meet-greet.fan.controller";
import { MeetGreetService, MeetGreetSessionStatus } from "./meet-greet.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthService } from "../auth/auth.service";

describe("MeetGreetFanController", () => {
  let controller: MeetGreetFanController;
  let service: MeetGreetService;
  let prismaService: PrismaService;

  const mockUserId = "fan-123";
  const mockOtherUserId = "fan-456";
  const mockEventId = "event-123";
  const mockSessionId = "session-123";

  const mockUser = {
    id: mockUserId,
    email: "fan@example.com",
    role: "USER",
  };

  const mockSession: any = {
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
    ...mockSession,
    status: MeetGreetSessionStatus.PENDING,
    startedAt: null,
  };

  const mockCompletedSession: any = {
    ...mockSession,
    status: MeetGreetSessionStatus.COMPLETED,
    endedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeetGreetFanController],
      providers: [
        MeetGreetService,
        {
          provide: PrismaService,
          useValue: {
            meet_greet_sessions: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string) => "") },
        },
        {
          provide: AuthService,
          useValue: { verifySupabaseToken: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<MeetGreetFanController>(MeetGreetFanController);
    service = module.get<MeetGreetService>(MeetGreetService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe("getMySession", () => {
    it("should return session when exists and belongs to user", async () => {
      jest.spyOn(service, "getFanSession").mockResolvedValue(mockSession as any);
      jest.spyOn(service, "getCurrentSession").mockResolvedValue(mockSession as any);

      const result = await controller.getMySession(mockEventId, mockUser);

      expect(service.getFanSession).toHaveBeenCalledWith(mockEventId, mockUserId);
      expect(result.session).toEqual(mockSession);
      expect(result.currentActiveSession).toEqual(mockSession);
    });

    it("should return null when no session exists", async () => {
      jest.spyOn(service, "getFanSession").mockResolvedValue(null);
      jest.spyOn(service, "getCurrentSession").mockResolvedValue(null);

      const result = await controller.getMySession(mockEventId, mockUser);

      expect(result.session).toBeNull();
      expect(result.currentActiveSession).toBeUndefined();
    });
  });

  describe("join", () => {
    it("should join session when ACTIVE and belongs to user", async () => {
      const joinedSession = {
        ...mockSession,
        joinedAt: new Date(),
      };

      jest.spyOn(service, "markFanJoined").mockResolvedValue(joinedSession as any);

      const result = await controller.join(mockSessionId, mockUser);

      expect(service.markFanJoined).toHaveBeenCalledWith(mockSessionId, mockUserId);
      expect(result.joinedAt).toBeDefined();
    });

    it("should return 403 when user tries to join someone else's session", async () => {
      jest
        .spyOn(service, "markFanJoined")
        .mockRejectedValue(
          new ForbiddenException("You do not have permission to join this session"),
        );

      await expect(controller.join(mockSessionId, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should return 400 if session is PENDING", async () => {
      jest
        .spyOn(service, "markFanJoined")
        .mockRejectedValue(new BadRequestException("Session not active yet"));

      await expect(controller.join(mockSessionId, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should return 400 if session is COMPLETED", async () => {
      jest
        .spyOn(service, "markFanJoined")
        .mockRejectedValue(new BadRequestException("Session has ended"));

      await expect(controller.join(mockSessionId, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should be idempotent - return session if already joined", async () => {
      const alreadyJoinedSession = {
        ...mockSession,
        joinedAt: new Date(Date.now() - 1000), // Joined 1 second ago
      };

      jest.spyOn(service, "markFanJoined").mockResolvedValue(alreadyJoinedSession as any);

      const result = await controller.join(mockSessionId, mockUser);

      expect(result.joinedAt).toBeDefined();
      // Should return same session without error (idempotent)
    });

    it("should return 404 when session not found", async () => {
      jest
        .spyOn(service, "markFanJoined")
        .mockRejectedValue(new NotFoundException("Session not found"));

      await expect(controller.join("non-existent", mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

