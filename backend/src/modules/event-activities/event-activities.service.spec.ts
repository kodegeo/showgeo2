import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { EventActivitiesService } from "./event-activities.service";
import { PrismaService } from "../../prisma/prisma.service";
import {
  EventPhase,
  EntityRoleType,
} from "@prisma/client";
import {
  EventActivityType,
  EventActivityStatus,
  ActivityVisibility,
} from "../../../shared/types/event-activities.types";
import { CreateActivityDto, UpdateActivityDto } from "./dto";

describe("EventActivitiesService", () => {
  let service: EventActivitiesService;
  let prismaService: PrismaService;

  const mockEventId = "event-123";
  const mockActivityId = "activity-123";
  const mockUserId = "user-123";
  const mockOtherUserId = "user-456";

  const mockEvent = {
    id: mockEventId,
    phase: EventPhase.POST_LIVE,
    eventCoordinatorId: mockUserId,
    entityId: "entity-123",
    entities_events_entityIdToentities: {
      ownerId: mockUserId,
    },
  };

  const mockActivity = {
    id: mockActivityId,
    eventId: mockEventId,
    phase: EventPhase.POST_LIVE,
    type: EventActivityType.FAN_DISCUSSION,
    status: EventActivityStatus.INACTIVE,
    title: "Test Activity",
    description: "Test Description",
    config: { key: "value" },
    visibility: ActivityVisibility.ALL_ATTENDEES,
    startsAt: null,
    endsAt: null,
    createdBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    events: mockEvent,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventActivitiesService,
        {
          provide: PrismaService,
          useValue: {
            events: {
              findUnique: jest.fn(),
            },
            event_activities: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
            entity_roles: {
              findUnique: jest.fn(),
            },
            event_registrations: {
              findMany: jest.fn(),
            },
            tickets: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<EventActivitiesService>(EventActivitiesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createActivity", () => {
    const createDto: CreateActivityDto = {
      phase: EventPhase.POST_LIVE,
      type: EventActivityType.FAN_DISCUSSION,
      title: "Test Activity",
      description: "Test Description",
      config: { key: "value" },
      visibility: ActivityVisibility.ALL_ATTENDEES,
    };

    it("should create activity with INACTIVE status", async () => {
      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (prismaService.entity_roles.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.event_activities.create as jest.Mock).mockResolvedValue({
        ...mockActivity,
        id: require("crypto").randomUUID(),
      });

      const result = await service.createActivity(mockEventId, createDto, mockUserId);

      expect(result.status).toBe(EventActivityStatus.INACTIVE);
      expect(prismaService.event_activities.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventId: mockEventId,
          phase: EventPhase.POST_LIVE,
          status: EventActivityStatus.INACTIVE,
          title: createDto.title,
        }),
      });
    });

    it("should throw 403 for unauthorized user", async () => {
      (prismaService.events.findUnique as jest.Mock).mockResolvedValue({
        ...mockEvent,
        eventCoordinatorId: mockOtherUserId,
      });
      (prismaService.entity_roles.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createActivity(mockEventId, createDto, mockUserId),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw 400 if phase does not match event phase", async () => {
      (prismaService.events.findUnique as jest.Mock).mockResolvedValue({
        ...mockEvent,
        phase: EventPhase.LIVE,
      });
      (prismaService.entity_roles.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createActivity(mockEventId, createDto, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("launchActivity", () => {
    it("should launch activity and set status to ACTIVE", async () => {
      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (prismaService.entity_roles.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.event_activities.findUnique as jest.Mock).mockResolvedValue({
        ...mockActivity,
        events: mockEvent,
      });
      (prismaService.event_activities.update as jest.Mock).mockResolvedValue({
        ...mockActivity,
        status: EventActivityStatus.ACTIVE,
        startsAt: new Date(),
      });

      const result = await service.launchActivity(mockActivityId, mockUserId);

      expect(result.status).toBe(EventActivityStatus.ACTIVE);
      expect(result.startsAt).toBeDefined();
      expect(prismaService.event_activities.update).toHaveBeenCalledWith({
        where: { id: mockActivityId },
        data: {
          status: EventActivityStatus.ACTIVE,
          startsAt: expect.any(Date),
        },
      });
    });

    it("should be idempotent if already ACTIVE", async () => {
      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (prismaService.entity_roles.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.event_activities.findUnique as jest.Mock).mockResolvedValue({
        ...mockActivity,
        status: EventActivityStatus.ACTIVE,
        startsAt: new Date(),
        events: mockEvent,
      });

      const result = await service.launchActivity(mockActivityId, mockUserId);

      expect(result.status).toBe(EventActivityStatus.ACTIVE);
      expect(prismaService.event_activities.update).not.toHaveBeenCalled();
    });

    it("should throw 400 if phase does not match event phase", async () => {
      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (prismaService.entity_roles.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.event_activities.findUnique as jest.Mock).mockResolvedValue({
        ...mockActivity,
        phase: EventPhase.LIVE,
        events: { ...mockEvent, phase: EventPhase.POST_LIVE },
      });

      await expect(
        service.launchActivity(mockActivityId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw 400 if activity is COMPLETED", async () => {
      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (prismaService.entity_roles.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.event_activities.findUnique as jest.Mock).mockResolvedValue({
        ...mockActivity,
        status: EventActivityStatus.COMPLETED,
        events: mockEvent,
      });

      await expect(
        service.launchActivity(mockActivityId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("completeActivity", () => {
    it("should complete activity and set status to COMPLETED", async () => {
      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (prismaService.entity_roles.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.event_activities.findUnique as jest.Mock).mockResolvedValue({
        ...mockActivity,
        status: EventActivityStatus.ACTIVE,
      });
      (prismaService.event_activities.update as jest.Mock).mockResolvedValue({
        ...mockActivity,
        status: EventActivityStatus.COMPLETED,
        endsAt: new Date(),
      });

      const result = await service.completeActivity(mockActivityId, mockUserId);

      expect(result.status).toBe(EventActivityStatus.COMPLETED);
      expect(result.endsAt).toBeDefined();
    });

    it("should be idempotent if already COMPLETED", async () => {
      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (prismaService.entity_roles.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.event_activities.findUnique as jest.Mock).mockResolvedValue({
        ...mockActivity,
        status: EventActivityStatus.COMPLETED,
        endsAt: new Date(),
      });

      const result = await service.completeActivity(mockActivityId, mockUserId);

      expect(result.status).toBe(EventActivityStatus.COMPLETED);
      expect(prismaService.event_activities.update).not.toHaveBeenCalled();
    });
  });

  describe("updateActivity", () => {
    it("should update INACTIVE activity", async () => {
      const updateDto: UpdateActivityDto = {
        title: "Updated Title",
      };

      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (prismaService.entity_roles.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.event_activities.findUnique as jest.Mock).mockResolvedValue({
        ...mockActivity,
        events: mockEvent,
      });
      (prismaService.event_activities.update as jest.Mock).mockResolvedValue({
        ...mockActivity,
        title: "Updated Title",
      });

      const result = await service.updateActivity(mockActivityId, updateDto, mockUserId);

      expect(result.title).toBe("Updated Title");
    });

    it("should only allow metadata updates for ACTIVE activities", async () => {
      const updateDto: UpdateActivityDto = {
        title: "Updated Title",
        startsAt: new Date(),
      };

      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (prismaService.entity_roles.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.event_activities.findUnique as jest.Mock).mockResolvedValue({
        ...mockActivity,
        status: EventActivityStatus.ACTIVE,
        events: mockEvent,
      });

      await expect(
        service.updateActivity(mockActivityId, updateDto, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("listActivities", () => {
    it("should return all activities for producers", async () => {
      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (prismaService.entity_roles.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.event_activities.findMany as jest.Mock).mockResolvedValue([mockActivity]);

      const result = await service.listActivities(mockEventId, null, mockUserId, true);

      expect(result).toHaveLength(1);
      expect(prismaService.event_activities.findMany).toHaveBeenCalled();
    });

    it("should filter by visibility for non-producers", async () => {
      (prismaService.events.findUnique as jest.Mock).mockResolvedValue({
        ...mockEvent,
        event_registrations: [{ userId: mockUserId }],
        tickets: [],
      });
      (prismaService.event_activities.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockActivity,
          visibility: ActivityVisibility.ALL_ATTENDEES,
        },
        {
          ...mockActivity,
          id: "activity-456",
          visibility: ActivityVisibility.VIP_ONLY,
        },
      ]);

      const result = await service.listActivities(mockEventId, null, mockUserId, false);

      expect(result).toHaveLength(1);
      expect(result[0].visibility).toBe(ActivityVisibility.ALL_ATTENDEES);
    });
  });

  describe("expireActivitiesForEvent", () => {
    it("should expire all ACTIVE activities", async () => {
      (prismaService.event_activities.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      await service.expireActivitiesForEvent(mockEventId);

      expect(prismaService.event_activities.updateMany).toHaveBeenCalledWith({
        where: {
          eventId: mockEventId,
          status: EventActivityStatus.ACTIVE,
        },
        data: {
          status: EventActivityStatus.EXPIRED,
          endsAt: expect.any(Date),
        },
      });
    });

    it("should not throw on error (non-blocking)", async () => {
      (prismaService.event_activities.updateMany as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      await expect(service.expireActivitiesForEvent(mockEventId)).resolves.not.toThrow();
    });
  });
});

