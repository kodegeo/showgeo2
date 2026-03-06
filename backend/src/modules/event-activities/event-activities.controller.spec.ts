import { Test, TestingModule } from "@nestjs/testing";
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { EventActivitiesController } from "./event-activities.controller";
import { EventActivitiesService } from "./event-activities.service";
import { PrismaService } from "../../prisma/prisma.service";
import { EventPhase } from "@prisma/client";
import {
  EventActivityType,
  EventActivityStatus,
  ActivityVisibility,
} from "../../../shared/types/event-activities.types";
import { CreateActivityDto, UpdateActivityDto } from "./dto";

describe("EventActivitiesController", () => {
  let controller: EventActivitiesController;
  let service: EventActivitiesService;

  const mockEventId = "event-123";
  const mockActivityId = "activity-123";
  const mockUserId = "user-123";

  const mockUser: any = {
    id: mockUserId,
    email: "user@example.com",
    role: "ENTITY",
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventActivitiesController],
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

    controller = module.get<EventActivitiesController>(EventActivitiesController);
    service = module.get<EventActivitiesService>(EventActivitiesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    const createDto: CreateActivityDto = {
      phase: EventPhase.POST_LIVE,
      type: EventActivityType.FAN_DISCUSSION,
      title: "Test Activity",
      description: "Test Description",
      config: { key: "value" },
      visibility: ActivityVisibility.ALL_ATTENDEES,
    };

    it("should create activity successfully", async () => {
      jest.spyOn(service, "createActivity").mockResolvedValue(mockActivity as any);

      const result = await controller.create(mockEventId, createDto, mockUser);

      expect(service.createActivity).toHaveBeenCalledWith(mockEventId, createDto, mockUserId);
      expect(result).toEqual(mockActivity);
    });

    it("should throw 403 for unauthorized user", async () => {
      jest
        .spyOn(service, "createActivity")
        .mockRejectedValue(new ForbiddenException("Insufficient permissions"));

      await expect(controller.create(mockEventId, createDto, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("update", () => {
    const updateDto: UpdateActivityDto = {
      title: "Updated Title",
    };

    it("should update activity successfully", async () => {
      const updatedActivity = { ...mockActivity, title: "Updated Title" };
      jest.spyOn(service, "updateActivity").mockResolvedValue(updatedActivity as any);

      const result = await controller.update(mockActivityId, updateDto, mockUser);

      expect(service.updateActivity).toHaveBeenCalledWith(mockActivityId, updateDto, mockUserId);
      expect(result.title).toBe("Updated Title");
    });

    it("should throw 400 for invalid update on ACTIVE activity", async () => {
      jest
        .spyOn(service, "updateActivity")
        .mockRejectedValue(
          new BadRequestException("Cannot update startsAt or endsAt for ACTIVE activities"),
        );

      await expect(controller.update(mockActivityId, updateDto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("launch", () => {
    it("should launch activity successfully", async () => {
      const launchedActivity = {
        ...mockActivity,
        status: EventActivityStatus.ACTIVE,
        startsAt: new Date(),
      };
      jest.spyOn(service, "launchActivity").mockResolvedValue(launchedActivity as any);

      const result = await controller.launch(mockActivityId, mockUser);

      expect(service.launchActivity).toHaveBeenCalledWith(mockActivityId, mockUserId);
      expect(result.status).toBe(EventActivityStatus.ACTIVE);
      expect(result.startsAt).toBeDefined();
    });

    it("should be idempotent if already ACTIVE", async () => {
      const activeActivity = {
        ...mockActivity,
        status: EventActivityStatus.ACTIVE,
        startsAt: new Date(),
      };
      jest.spyOn(service, "launchActivity").mockResolvedValue(activeActivity as any);

      const result = await controller.launch(mockActivityId, mockUser);

      expect(result.status).toBe(EventActivityStatus.ACTIVE);
    });

    it("should throw 400 if phase mismatch", async () => {
      jest
        .spyOn(service, "launchActivity")
        .mockRejectedValue(
          new BadRequestException("Activity phase does not match event phase"),
        );

      await expect(controller.launch(mockActivityId, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("complete", () => {
    it("should complete activity successfully", async () => {
      const completedActivity = {
        ...mockActivity,
        status: EventActivityStatus.COMPLETED,
        endsAt: new Date(),
      };
      jest.spyOn(service, "completeActivity").mockResolvedValue(completedActivity as any);

      const result = await controller.complete(mockActivityId, mockUser);

      expect(service.completeActivity).toHaveBeenCalledWith(mockActivityId, mockUserId);
      expect(result.status).toBe(EventActivityStatus.COMPLETED);
      expect(result.endsAt).toBeDefined();
    });

    it("should be idempotent if already COMPLETED", async () => {
      const completedActivity = {
        ...mockActivity,
        status: EventActivityStatus.COMPLETED,
        endsAt: new Date(),
      };
      jest.spyOn(service, "completeActivity").mockResolvedValue(completedActivity as any);

      const result = await controller.complete(mockActivityId, mockUser);

      expect(result.status).toBe(EventActivityStatus.COMPLETED);
    });
  });

  describe("list", () => {
    it("should return activities for producer", async () => {
      jest.spyOn(service, "isProducer").mockResolvedValue(true);
      jest.spyOn(service, "listActivities").mockResolvedValue([mockActivity] as any);

      const result = await controller.list(mockEventId, EventPhase.POST_LIVE, mockUser);

      expect(service.isProducer).toHaveBeenCalledWith(mockEventId, mockUserId);
      expect(service.listActivities).toHaveBeenCalledWith(
        mockEventId,
        EventPhase.POST_LIVE,
        mockUserId,
        true,
      );
      expect(result).toHaveLength(1);
    });

    it("should return filtered activities for non-producer", async () => {
      jest.spyOn(service, "isProducer").mockResolvedValue(false);
      jest.spyOn(service, "listActivities").mockResolvedValue([mockActivity] as any);

      const result = await controller.list(mockEventId, undefined, mockUser);

      expect(service.listActivities).toHaveBeenCalledWith(
        mockEventId,
        null,
        mockUserId,
        false,
      );
      expect(result).toHaveLength(1);
    });
  });
});

