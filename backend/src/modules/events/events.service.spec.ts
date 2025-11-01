import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { EventsService } from "./events.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateEventDto, UpdateEventDto, PhaseTransitionDto } from "./dto";
import { EventPhase, EventStatus, EventType } from "./dto/create-event.dto";
import { TestUtils } from "../../../test/test-utils";

describe("EventsService", () => {
  let service: EventsService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await TestUtils.createTestingModule({
      imports: [],
      providers: [
        EventsService,
        {
          provide: PrismaService,
          useValue: TestUtils.createMockPrismaService(),
        },
      ],
    });

    service = module.get<EventsService>(EventsService);
    prismaService = module.get<PrismaService>(PrismaService);

    (prismaService as any).reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should successfully create an event", async () => {
      const userId = "user-123";
      const createDto: CreateEventDto = {
        entityId: "entity-123",
        name: "Test Event",
        description: "Test description",
        type: EventType.LIVE,
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        phase: EventPhase.PRE_CONCERT,
        status: EventStatus.SCHEDULED,
      };

      const entity = await TestUtils.createTestEntity({ id: createDto.entityId });
      (prismaService.entity.findUnique as jest.Mock).mockResolvedValue(entity);
      (prismaService.event.create as jest.Mock).mockResolvedValue({
        id: "event-123",
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(createDto, userId);

      expect(result).toHaveProperty("name", createDto.name);
      expect(prismaService.event.create).toHaveBeenCalled();
    });

    it("should throw NotFoundException if entity not found", async () => {
      const createDto: CreateEventDto = {
        entityId: "invalid-entity",
        name: "Test Event",
        type: EventType.LIVE,
        startTime: new Date(),
        endTime: new Date(),
        phase: EventPhase.PRE_CONCERT,
        status: EventStatus.SCHEDULED,
      };

      (prismaService.entity.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto, "user-123")).rejects.toThrow(NotFoundException);
    });
  });

  describe("findAll", () => {
    it("should return paginated list of events", async () => {
      const events = [
        {
          id: "event-1",
          name: "Event 1",
          createdAt: new Date(),
        },
        {
          id: "event-2",
          name: "Event 2",
          createdAt: new Date(),
        },
      ];

      (prismaService.event.findMany as jest.Mock).mockResolvedValue(events);
      (prismaService.event.count as jest.Mock).mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });
  });

  describe("findOne", () => {
    it("should return event by id", async () => {
      const event = {
        id: "event-123",
        name: "Test Event",
        createdAt: new Date(),
      };

      (prismaService.event.findUnique as jest.Mock).mockResolvedValue(event);

      const result = await service.findOne("event-123");

      expect(result).toHaveProperty("id", "event-123");
      expect(prismaService.event.findUnique).toHaveBeenCalled();
    });

    it("should throw NotFoundException if event not found", async () => {
      (prismaService.event.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne("invalid-id")).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("should successfully update event", async () => {
      const eventId = "event-123";
      const updateDto: UpdateEventDto = {
        name: "Updated Event Name",
        description: "Updated description",
      };

      const existingEvent = {
        id: eventId,
        entityId: "entity-123",
        name: "Original Name",
        createdAt: new Date(),
      };

      (prismaService.event.findUnique as jest.Mock).mockResolvedValue(existingEvent);
      (prismaService.event.update as jest.Mock).mockResolvedValue({
        ...existingEvent,
        ...updateDto,
        updatedAt: new Date(),
      });

      const result = await service.update(eventId, updateDto, "user-123", "USER");

      expect(result).toHaveProperty("name", updateDto.name);
      expect(prismaService.event.update).toHaveBeenCalled();
    });

    it("should throw NotFoundException if event not found", async () => {
      (prismaService.event.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.update("invalid-id", {}, "user-123", "USER")).rejects.toThrow(NotFoundException);
    });
  });

  describe("transitionPhase", () => {
    it("should successfully transition event phase", async () => {
      const eventId = "event-123";
      const transitionDto: PhaseTransitionDto = {
        phase: EventPhase.CONCERT,
      };

      const event = {
        id: eventId,
        phase: EventPhase.PRE_CONCERT,
        status: EventStatus.SCHEDULED,
        createdAt: new Date(),
      };

      (prismaService.event.findUnique as jest.Mock).mockResolvedValue(event);
      (prismaService.event.update as jest.Mock).mockResolvedValue({
        ...event,
        phase: transitionDto.phase,
        status: EventStatus.LIVE,
        updatedAt: new Date(),
      });

      const result = await service.transitionPhase(eventId, transitionDto, "user-123");

      expect(result).toHaveProperty("phase", transitionDto.phase);
      expect(prismaService.event.update).toHaveBeenCalled();
    });

    it("should throw BadRequestException for invalid phase transition", async () => {
      const eventId = "event-123";
      const transitionDto: PhaseTransitionDto = {
        phase: EventPhase.PRE_CONCERT,
      };

      const event = {
        id: eventId,
        phase: EventPhase.POST_CONCERT,
        status: EventStatus.COMPLETED,
        createdAt: new Date(),
      };

      (prismaService.event.findUnique as jest.Mock).mockResolvedValue(event);

      await expect(service.transitionPhase(eventId, transitionDto, "user-123")).rejects.toThrow(BadRequestException);
    });
  });

  describe("remove", () => {
    it("should successfully delete event", async () => {
      const eventId = "event-123";
      const event = {
        id: eventId,
        name: "Test Event",
        createdAt: new Date(),
      };

      (prismaService.event.findUnique as jest.Mock).mockResolvedValue(event);
      (prismaService.event.delete as jest.Mock).mockResolvedValue(event);

      await service.remove(eventId);

      expect(prismaService.event.delete).toHaveBeenCalledWith({ where: { id: eventId } });
    });

    it("should throw NotFoundException if event not found", async () => {
      (prismaService.event.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.remove("invalid-id")).rejects.toThrow(NotFoundException);
    });
  });
});

