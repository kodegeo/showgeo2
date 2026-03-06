import { Test, TestingModule } from "@nestjs/testing";
import { ModerationController } from "./moderation.controller";
import { ModerationService } from "./moderation.service";
import { PrismaService } from "../../prisma/prisma.service";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import {
  ModerationReason,
  ModerationRoleContext,
  ModerationStatus,
} from "@prisma/client";

describe("ModerationController", () => {
  let controller: ModerationController;
  let service: ModerationService;

  const mockUser = {
    id: "user-123",
    role: "USER",
    email: "user@example.com",
  };

  const mockAdmin = {
    id: "admin-123",
    role: "ADMIN",
    email: "admin@example.com",
  };

  const mockReport = {
    id: "report-123",
    eventId: "event-123",
    reporterUserId: mockUser.id,
    reportedUserId: "reported-456",
    roleContext: ModerationRoleContext.FAN_REPORTING_CREATOR,
    reason: ModerationReason.HARASSMENT,
    status: ModerationStatus.OPEN,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModerationController],
      providers: [
        {
          provide: ModerationService,
          useValue: {
            createReport: jest.fn(),
            listReportsForEvent: jest.fn(),
            listReportsForUser: jest.fn(),
            updateReportStatus: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ModerationController>(ModerationController);
    service = module.get<ModerationService>(ModerationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createReport", () => {
    it("should create a report", async () => {
      const dto = {
        reportedUserId: "reported-456",
        roleContext: ModerationRoleContext.FAN_REPORTING_CREATOR,
        reason: ModerationReason.HARASSMENT,
      };

      jest.spyOn(service, "createReport").mockResolvedValue(mockReport);

      const result = await controller.createReport("event-123", dto, mockUser);

      expect(service.createReport).toHaveBeenCalledWith(
        "event-123",
        dto,
        mockUser.id,
      );
      expect(result).toEqual(mockReport);
    });
  });

  describe("listReportsForEvent", () => {
    it("should return reports for authorized user", async () => {
      jest
        .spyOn(service, "listReportsForEvent")
        .mockResolvedValue([mockReport]);

      const result = await controller.listReportsForEvent(
        "event-123",
        mockAdmin,
      );

      expect(service.listReportsForEvent).toHaveBeenCalledWith(
        "event-123",
        mockAdmin.id,
      );
      expect(result).toEqual([mockReport]);
    });

    it("should throw ForbiddenException for unauthorized user", async () => {
      jest
        .spyOn(service, "listReportsForEvent")
        .mockRejectedValue(
          new ForbiddenException("Insufficient permissions"),
        );

      await expect(
        controller.listReportsForEvent("event-123", mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("listMyReports", () => {
    it("should return user's reports", async () => {
      jest.spyOn(service, "listReportsForUser").mockResolvedValue([mockReport]);

      const result = await controller.listMyReports(mockUser);

      expect(service.listReportsForUser).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual([mockReport]);
    });
  });

  describe("updateReportStatus", () => {
    it("should update status for admin", async () => {
      const dto = { status: ModerationStatus.REVIEWED };
      const updated = { ...mockReport, status: ModerationStatus.REVIEWED };

      jest.spyOn(service, "updateReportStatus").mockResolvedValue(updated);

      const result = await controller.updateReportStatus(
        "report-123",
        dto,
        mockAdmin,
      );

      expect(service.updateReportStatus).toHaveBeenCalledWith(
        "report-123",
        dto,
        mockAdmin.id,
      );
      expect(result.status).toBe(ModerationStatus.REVIEWED);
    });

    it("should throw ForbiddenException for unauthorized user", async () => {
      const dto = { status: ModerationStatus.REVIEWED };

      jest
        .spyOn(service, "updateReportStatus")
        .mockRejectedValue(
          new ForbiddenException("Only admins and coordinators can update report status"),
        );

      await expect(
        controller.updateReportStatus("report-123", dto, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

