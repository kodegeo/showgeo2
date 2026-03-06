import { Test, TestingModule } from "@nestjs/testing";
import { ModerationService } from "./moderation.service";
import { PrismaService } from "../../prisma/prisma.service";
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import {
  ModerationReason,
  ModerationStatus,
  ModerationRoleContext,
  EventPhase,
  EntityRoleType,
} from "@prisma/client";
import { CreateReportDto, UpdateReportStatusDto } from "./dto";

describe("ModerationService", () => {
  let service: ModerationService;
  let prismaService: PrismaService;

  const mockEventId = "event-123";
  const mockActivityId = "activity-456";
  const mockSessionId = "session-789";
  const mockReporterUserId = "reporter-123";
  const mockReportedUserId = "reported-456";
  const mockCoordinatorId = "coordinator-123";
  const mockOwnerId = "owner-123";
  const mockEntityId = "entity-123";

  const mockEvent = {
    id: mockEventId,
    name: "Test Event",
    phase: EventPhase.LIVE,
    entityId: mockEntityId,
    eventCoordinatorId: mockCoordinatorId,
    entities_events_entityIdToentities: {
      ownerId: mockOwnerId,
    },
  };

  const mockActivity = {
    id: mockActivityId,
    eventId: mockEventId,
    title: "Test Activity",
  };

  const mockSession = {
    id: mockSessionId,
    eventId: mockEventId,
    slotOrder: 1,
  };

  const mockReport = {
    id: "report-123",
    eventId: mockEventId,
    reporterUserId: mockReporterUserId,
    reportedUserId: mockReportedUserId,
    roleContext: ModerationRoleContext.FAN_REPORTING_CREATOR,
    phase: EventPhase.LIVE,
    reason: ModerationReason.HARASSMENT,
    status: ModerationStatus.OPEN,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationService,
        {
          provide: PrismaService,
          useValue: {
            events: {
              findUnique: jest.fn(),
            },
            event_activities: {
              findUnique: jest.fn(),
            },
            meet_greet_sessions: {
              findUnique: jest.fn(),
            },
            app_users: {
              findUnique: jest.fn(),
            },
            moderation_reports: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            entity_roles: {
              findUnique: jest.fn(),
            },
            mailbox_items: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ModerationService>(ModerationService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createReport", () => {
    const createReportDto: CreateReportDto = {
      reportedUserId: mockReportedUserId,
      roleContext: ModerationRoleContext.FAN_REPORTING_CREATOR,
      reason: ModerationReason.HARASSMENT,
      description: "Test description",
    };

    it("should create a report successfully", async () => {
      (prismaService as any).events.findUnique.mockResolvedValue(mockEvent);
      (prismaService as any).app_users.findUnique.mockResolvedValue({
        id: mockReportedUserId,
      });
      (prismaService as any).moderation_reports.create.mockResolvedValue(
        mockReport,
      );
      (prismaService as any).mailbox_items.create.mockResolvedValue({});

      const result = await service.createReport(
        mockEventId,
        createReportDto,
        mockReporterUserId,
      );

      expect(result).toEqual(mockReport);
      expect((prismaService as any).moderation_reports.create).toHaveBeenCalled();
      expect((prismaService as any).mailbox_items.create).toHaveBeenCalledTimes(
        2,
      ); // Coordinator and owner
    });

    it("should throw NotFoundException if event does not exist", async () => {
      (prismaService as any).events.findUnique.mockResolvedValue(null);

      await expect(
        service.createReport(mockEventId, createReportDto, mockReporterUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException if reporter and reported are the same", async () => {
      (prismaService as any).events.findUnique.mockResolvedValue(mockEvent);

      await expect(
        service.createReport(
          mockEventId,
          { ...createReportDto, reportedUserId: mockReporterUserId },
          mockReporterUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should validate activityId belongs to event", async () => {
      (prismaService as any).events.findUnique.mockResolvedValue(mockEvent);
      (prismaService as any).event_activities.findUnique.mockResolvedValue({
        ...mockActivity,
        eventId: "different-event",
      });

      await expect(
        service.createReport(
          mockEventId,
          { ...createReportDto, activityId: mockActivityId },
          mockReporterUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should validate meetGreetSessionId belongs to event", async () => {
      (prismaService as any).events.findUnique.mockResolvedValue(mockEvent);
      (prismaService as any).meet_greet_sessions.findUnique.mockResolvedValue({
        ...mockSession,
        eventId: "different-event",
      });

      await expect(
        service.createReport(
          mockEventId,
          { ...createReportDto, meetGreetSessionId: mockSessionId },
          mockReporterUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("listReportsForEvent", () => {
    it("should return reports for authorized user", async () => {
      (prismaService as any).events.findUnique.mockResolvedValue(mockEvent);
      (prismaService as any).entity_roles.findUnique.mockResolvedValue({
        role: EntityRoleType.ADMIN,
      });
      (prismaService as any).moderation_reports.findMany.mockResolvedValue([
        mockReport,
      ]);

      const result = await service.listReportsForEvent(
        mockEventId,
        mockReporterUserId,
      );

      expect(result).toEqual([mockReport]);
    });

    it("should throw ForbiddenException for unauthorized user", async () => {
      (prismaService as any).events.findUnique.mockResolvedValue(mockEvent);
      (prismaService as any).entity_roles.findUnique.mockResolvedValue(null);

      await expect(
        service.listReportsForEvent(mockEventId, "unauthorized-user"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("listReportsForUser", () => {
    it("should return user's reports", async () => {
      (prismaService as any).moderation_reports.findMany.mockResolvedValue([
        mockReport,
      ]);

      const result = await service.listReportsForUser(mockReporterUserId);

      expect(result).toEqual([mockReport]);
      expect((prismaService as any).moderation_reports.findMany).toHaveBeenCalledWith(
        {
          where: { reporterUserId: mockReporterUserId },
          orderBy: { createdAt: "desc" },
          include: expect.any(Object),
        },
      );
    });
  });

  describe("updateReportStatus", () => {
    const updateDto: UpdateReportStatusDto = {
      status: ModerationStatus.REVIEWED,
    };

    it("should update status for admin", async () => {
      (prismaService as any).moderation_reports.findUnique.mockResolvedValue({
        ...mockReport,
        event: mockEvent,
      });
      (prismaService as any).entity_roles.findUnique.mockResolvedValue({
        role: EntityRoleType.ADMIN,
      });
      (prismaService as any).moderation_reports.update.mockResolvedValue({
        ...mockReport,
        status: ModerationStatus.REVIEWED,
      });

      const result = await service.updateReportStatus(
        "report-123",
        updateDto,
        "admin-user",
      );

      expect(result.status).toBe(ModerationStatus.REVIEWED);
    });

    it("should update status for coordinator", async () => {
      (prismaService as any).moderation_reports.findUnique.mockResolvedValue({
        ...mockReport,
        event: mockEvent,
      });
      (prismaService as any).moderation_reports.update.mockResolvedValue({
        ...mockReport,
        status: ModerationStatus.REVIEWED,
      });

      const result = await service.updateReportStatus(
        "report-123",
        updateDto,
        mockCoordinatorId,
      );

      expect(result.status).toBe(ModerationStatus.REVIEWED);
    });

    it("should throw ForbiddenException for unauthorized user", async () => {
      (prismaService as any).moderation_reports.findUnique.mockResolvedValue({
        ...mockReport,
        event: mockEvent,
      });
      (prismaService as any).entity_roles.findUnique.mockResolvedValue(null);

      await expect(
        service.updateReportStatus("report-123", updateDto, "unauthorized-user"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw NotFoundException if report does not exist", async () => {
      (prismaService as any).moderation_reports.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.updateReportStatus("report-123", updateDto, mockCoordinatorId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

