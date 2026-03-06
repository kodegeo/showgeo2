import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ForbiddenException, NotFoundException, BadRequestException } from "@nestjs/common";
import { MeetGreetController } from "./meet-greet.controller";
import { MeetGreetService, MeetGreetSessionStatus } from "./meet-greet.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthService } from "../auth/auth.service";

describe("MeetGreetController", () => {
  let controller: MeetGreetController;
  let service: MeetGreetService;
  let prismaService: PrismaService;

  const mockUserId = "user-123";
  const mockEventId = "event-123";
  const mockSessionId = "session-123";

  const mockUser = {
    id: mockUserId,
    email: "artist@example.com",
    role: "ENTITY",
  };

  const mockSession: any = {
    id: mockSessionId,
    eventId: mockEventId,
    ticketId: "ticket-123",
    userId: "fan-456",
    slotOrder: 1,
    durationMinutes: 5,
    status: MeetGreetSessionStatus.PENDING,
    startedAt: null,
    endedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockActiveSession: any = {
    ...mockSession,
    id: "session-active-123",
    status: MeetGreetSessionStatus.ACTIVE,
    startedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeetGreetController],
      providers: [
        MeetGreetService,
        {
          provide: PrismaService,
          useValue: {
            meet_greet_sessions: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
            },
            events: {
              findUnique: jest.fn(),
            },
            entity_roles: {
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

    controller = module.get<MeetGreetController>(MeetGreetController);
    service = module.get<MeetGreetService>(MeetGreetService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe("getQueue", () => {
    it("should return queue for authorized user", async () => {
      const mockQueue = [mockSession, { ...mockSession, id: "session-2", slotOrder: 2 }];

      jest.spyOn(service, "checkEventPermissions").mockResolvedValue(undefined);
      jest.spyOn(service, "getQueue").mockResolvedValue(mockQueue as any);

      const result = await controller.getQueue(mockEventId, mockUser);

      expect(service.checkEventPermissions).toHaveBeenCalledWith(mockEventId, mockUserId);
      expect(service.getQueue).toHaveBeenCalledWith(mockEventId);
      expect(result).toEqual(mockQueue);
    });

    it("should throw 403 for unauthorized user", async () => {
      jest
        .spyOn(service, "checkEventPermissions")
        .mockRejectedValue(new ForbiddenException("Insufficient permissions"));
      jest.spyOn(service, "getQueue");

      await expect(controller.getQueue(mockEventId, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(service.getQueue).not.toHaveBeenCalled();
    });
  });

  describe("getCurrent", () => {
    it("should return current session for authorized user", async () => {
      jest.spyOn(service, "checkEventPermissions").mockResolvedValue(undefined);
      jest.spyOn(service, "getCurrentSession").mockResolvedValue(mockActiveSession as any);

      const result = await controller.getCurrent(mockEventId, mockUser);

      expect(service.checkEventPermissions).toHaveBeenCalledWith(mockEventId, mockUserId);
      expect(service.getCurrentSession).toHaveBeenCalledWith(mockEventId);
      expect(result).toEqual(mockActiveSession);
    });

    it("should return null when no active session", async () => {
      jest.spyOn(service, "checkEventPermissions").mockResolvedValue(undefined);
      jest.spyOn(service, "getCurrentSession").mockResolvedValue(null);

      const result = await controller.getCurrent(mockEventId, mockUser);

      expect(result).toBeNull();
    });

    it("should throw 403 for unauthorized user", async () => {
      jest
        .spyOn(service, "checkEventPermissions")
        .mockRejectedValue(new ForbiddenException("Insufficient permissions"));

      await expect(controller.getCurrent(mockEventId, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("startNext", () => {
    it("should start next session for authorized user", async () => {
      jest.spyOn(service, "checkEventPermissions").mockResolvedValue(undefined);
      jest.spyOn(service, "startNextSession").mockResolvedValue(mockActiveSession as any);

      const result = await controller.startNext(mockEventId, mockUser);

      expect(service.checkEventPermissions).toHaveBeenCalledWith(mockEventId, mockUserId);
      expect(service.startNextSession).toHaveBeenCalledWith(mockEventId);
      expect(result).toEqual({
        session: mockActiveSession,
        started: true,
        message: "Session started successfully",
      });
    });

    it("should return null when no pending sessions", async () => {
      jest.spyOn(service, "checkEventPermissions").mockResolvedValue(undefined);
      jest.spyOn(service, "startNextSession").mockResolvedValue(null);

      const result = await controller.startNext(mockEventId, mockUser);

      expect(result).toEqual({
        session: null,
        started: false,
        message: "No pending sessions available",
      });
    });

    it("should throw 400 when active session already exists", async () => {
      jest.spyOn(service, "checkEventPermissions").mockResolvedValue(undefined);
      jest
        .spyOn(service, "startNextSession")
        .mockRejectedValue(
          new BadRequestException("Event already has an ACTIVE session"),
        );

      await expect(controller.startNext(mockEventId, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw 403 for unauthorized user", async () => {
      jest
        .spyOn(service, "checkEventPermissions")
        .mockRejectedValue(new ForbiddenException("Insufficient permissions"));

      await expect(controller.startNext(mockEventId, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("complete", () => {
    it("should complete session for authorized user", async () => {
      const completedSession = {
        ...mockActiveSession,
        status: MeetGreetSessionStatus.COMPLETED,
        endedAt: new Date(),
      };

      jest.spyOn(service, "getEventIdFromSession").mockResolvedValue(mockEventId);
      jest.spyOn(service, "checkEventPermissions").mockResolvedValue(undefined);
      jest.spyOn(service, "markSessionCompleted").mockResolvedValue(completedSession as any);

      const result = await controller.complete(mockSessionId, mockUser);

      expect(service.getEventIdFromSession).toHaveBeenCalledWith(mockSessionId);
      expect(service.checkEventPermissions).toHaveBeenCalledWith(mockEventId, mockUserId);
      expect(service.markSessionCompleted).toHaveBeenCalledWith(mockSessionId);
      expect(result.status).toBe(MeetGreetSessionStatus.COMPLETED);
    });

    it("should throw 404 when session not found", async () => {
      jest
        .spyOn(service, "getEventIdFromSession")
        .mockRejectedValue(new NotFoundException("Session not found"));

      await expect(controller.complete(mockSessionId, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw 403 for unauthorized user", async () => {
      jest.spyOn(service, "getEventIdFromSession").mockResolvedValue(mockEventId);
      jest
        .spyOn(service, "checkEventPermissions")
        .mockRejectedValue(new ForbiddenException("Insufficient permissions"));

      await expect(controller.complete(mockSessionId, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should throw 400 for invalid state transition", async () => {
      jest.spyOn(service, "getEventIdFromSession").mockResolvedValue(mockEventId);
      jest.spyOn(service, "checkEventPermissions").mockResolvedValue(undefined);
      jest
        .spyOn(service, "markSessionCompleted")
        .mockRejectedValue(
          new BadRequestException("Current status is PENDING, expected ACTIVE"),
        );

      await expect(controller.complete(mockSessionId, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("miss", () => {
    it("should mark session as missed for authorized user", async () => {
      const missedSession = {
        ...mockSession,
        status: MeetGreetSessionStatus.MISSED,
        endedAt: new Date(),
      };

      jest.spyOn(service, "getEventIdFromSession").mockResolvedValue(mockEventId);
      jest.spyOn(service, "checkEventPermissions").mockResolvedValue(undefined);
      jest.spyOn(service, "markSessionMissed").mockResolvedValue(missedSession as any);

      const result = await controller.miss(mockSessionId, mockUser);

      expect(service.getEventIdFromSession).toHaveBeenCalledWith(mockSessionId);
      expect(service.checkEventPermissions).toHaveBeenCalledWith(mockEventId, mockUserId);
      expect(service.markSessionMissed).toHaveBeenCalledWith(mockSessionId);
      expect(result.status).toBe(MeetGreetSessionStatus.MISSED);
    });

    it("should throw 404 when session not found", async () => {
      jest
        .spyOn(service, "getEventIdFromSession")
        .mockRejectedValue(new NotFoundException("Session not found"));

      await expect(controller.miss(mockSessionId, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw 403 for unauthorized user", async () => {
      jest.spyOn(service, "getEventIdFromSession").mockResolvedValue(mockEventId);
      jest
        .spyOn(service, "checkEventPermissions")
        .mockRejectedValue(new ForbiddenException("Insufficient permissions"));

      await expect(controller.miss(mockSessionId, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should be idempotent - return same session if already missed", async () => {
      const alreadyMissedSession = {
        ...mockSession,
        status: MeetGreetSessionStatus.MISSED,
        endedAt: new Date(),
      };

      jest.spyOn(service, "getEventIdFromSession").mockResolvedValue(mockEventId);
      jest.spyOn(service, "checkEventPermissions").mockResolvedValue(undefined);
      jest.spyOn(service, "markSessionMissed").mockResolvedValue(alreadyMissedSession as any);

      const result = await controller.miss(mockSessionId, mockUser);

      expect(result.status).toBe(MeetGreetSessionStatus.MISSED);
    });
  });

  describe("Authorization", () => {
    it("should verify event authorization before allowing queue access", async () => {
      const checkSpy = jest
        .spyOn(service, "checkEventPermissions")
        .mockResolvedValue(undefined);
      jest.spyOn(service, "getQueue").mockResolvedValue([]);

      await controller.getQueue(mockEventId, mockUser);

      expect(checkSpy).toHaveBeenCalledWith(mockEventId, mockUserId);
    });

    it("should verify event authorization via session for complete/miss endpoints", async () => {
      const getEventIdSpy = jest
        .spyOn(service, "getEventIdFromSession")
        .mockResolvedValue(mockEventId);
      const checkSpy = jest
        .spyOn(service, "checkEventPermissions")
        .mockResolvedValue(undefined);
      jest
        .spyOn(service, "markSessionCompleted")
        .mockResolvedValue(mockActiveSession as any);

      await controller.complete(mockSessionId, mockUser);

      expect(getEventIdSpy).toHaveBeenCalledWith(mockSessionId);
      expect(checkSpy).toHaveBeenCalledWith(mockEventId, mockUserId);
    });
  });
});

