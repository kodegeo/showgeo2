import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { EventsService } from "./events.service";
import { PrismaService } from "@/prisma/prisma.service";
import { RegistrationsService } from "@/modules/registrations/registrations.service";
import { NotificationsService } from "@/modules/notifications/notifications.service";
import { EscrowService } from "@/modules/escrow/escrow.service";
import { CreateEventDto, UpdateEventDto, PhaseTransitionDto } from "./dto";
import { EventPhase, EventStatus, EventType } from "@prisma/client";
import { TestUtils } from "../../../test/test-utils";

describe("EventsService", () => {
  let service: EventsService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const prismaMock = TestUtils.createMockPrismaService();
    // EventsService uses plural delegates (entities, events); mock uses singular (entity, event). Alias them.
    (prismaMock as any).entities = (prismaMock as any).entity;
    (prismaMock as any).events = (prismaMock as any).event;
    // Prisma branches used by transitionPhase, getEventAnalytics, sendBlast, createReminder, getReminders
    (prismaMock as any).streaming_sessions = {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    };
    (prismaMock as any).mailbox_items = {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: "mb-1", createdAt: new Date() }),
    };
    (prismaMock as any).event_reminders = {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: "rem-1", createdAt: new Date() }),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [
        EventsService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: RegistrationsService,
          useValue: {
            notifyLiveEvent: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            notifyEventScheduled: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: EscrowService,
          useValue: {
            releaseEscrowAndCreatePayouts: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

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
      const startTime = new Date();
      const createDto: CreateEventDto = {
        entityId: "entity-123",
        name: "Test Event",
        description: "Test description",
        eventType: EventType.LIVE,
        startTime: startTime.toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
        phase: EventPhase.PRE_LIVE,
        status: EventStatus.SCHEDULED,
        isVirtual: false,
        geoRestricted: false,
        ticketRequired: true,
        entryCodeRequired: false,
        entryCodeDelivery: false,
        testingEnabled: false,
      };

      // EventsService.create requires entity to be ACTIVE
      const entity = await TestUtils.createTestEntity({
        id: createDto.entityId,
        status: "ACTIVE" as any,
        name: "Test Entity",
      });
      (prismaService.entities.findUnique as jest.Mock).mockResolvedValue(entity);
      const mockEvent = {
        id: "event-123",
        name: createDto.name,
        status: EventStatus.SCHEDULED,
        startTime: new Date(createDto.startTime),
        entityId: createDto.entityId,
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prismaService.events.create as jest.Mock).mockResolvedValue(mockEvent);

      const result = await service.create(createDto, userId);

      expect(result).toHaveProperty("name", createDto.name);
      expect(result).toHaveProperty("id", "event-123");
      expect(result).toHaveProperty("status", EventStatus.SCHEDULED);
      expect(result).toHaveProperty("startTime");
      expect(prismaService.events.create).toHaveBeenCalled();
    });

    it("should throw NotFoundException if entity not found", async () => {
      const createDto: CreateEventDto = {
        entityId: "invalid-entity",
        name: "Test Event",
        eventType: EventType.LIVE,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        phase: EventPhase.PRE_LIVE,
        status: EventStatus.SCHEDULED,
        isVirtual: false,
        geoRestricted: false,
        ticketRequired: true,
        entryCodeRequired: false,
        entryCodeDelivery: false,
        testingEnabled: false,
      };

      (prismaService.entities.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto, "user-123")).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException if entity status is blocked", async () => {
      const createDto: CreateEventDto = {
        entityId: "entity-123",
        name: "Test Event",
        eventType: EventType.LIVE,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        phase: EventPhase.PRE_LIVE,
        status: EventStatus.SCHEDULED,
        isVirtual: false,
        geoRestricted: false,
        ticketRequired: true,
        entryCodeRequired: false,
        entryCodeDelivery: false,
        testingEnabled: false,
      };

      const entity = await TestUtils.createTestEntity({
        id: createDto.entityId,
        status: "SUSPENDED" as any,
        name: "Suspended Entity",
      });
      (prismaService.entities.findUnique as jest.Mock).mockResolvedValue(entity);

      await expect(service.create(createDto, "user-123")).rejects.toThrow(ForbiddenException);
      await expect(service.create(createDto, "user-123")).rejects.toThrow(/cannot create events/);
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

      (prismaService.events.findMany as jest.Mock).mockResolvedValue(events);
      (prismaService.events.count as jest.Mock).mockResolvedValue(2);

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

      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(event);

      const result = await service.findOne("event-123");

      expect(result).toHaveProperty("id", "event-123");
      expect(prismaService.events.findUnique).toHaveBeenCalled();
    });

    it("should throw NotFoundException if event not found", async () => {
      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(null);

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

      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(existingEvent);
      (prismaService.events.update as jest.Mock).mockResolvedValue({
        ...existingEvent,
        ...updateDto,
        updatedAt: new Date(),
      });

      const result = await service.update(eventId, updateDto, "user-123");

      expect(result).toHaveProperty("name", updateDto.name);
      expect(prismaService.events.update).toHaveBeenCalled();
    });

    it("should throw NotFoundException if event not found", async () => {
      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.update("invalid-id", {}, "user-123")).rejects.toThrow(NotFoundException);
    });
  });

  describe("transitionPhase", () => {
    it("should successfully transition event phase", async () => {
      const eventId = "event-123";
      const transitionDto: PhaseTransitionDto = {
        phase: EventPhase.LIVE,
      };

      const event = {
        id: eventId,
        entityId: "entity-123",
        phase: EventPhase.PRE_LIVE,
        status: EventStatus.SCHEDULED,
        ticketRequired: false, // Not required, so no ticket types needed
        ticketTypes: null,
        createdAt: new Date(),
        entity: null,
        app_users: null,
        tour: null,
        collaborators: [],
        tickets: [],
      };

      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(event);
      (prismaService.events.update as jest.Mock).mockResolvedValue({
        ...event,
        phase: transitionDto.phase,
        status: EventStatus.LIVE,
        updatedAt: new Date(),
      });

      const result = await service.transitionPhase(eventId, transitionDto, "user-123");

      expect(result).toHaveProperty("phase", transitionDto.phase);
      expect(prismaService.events.update).toHaveBeenCalled();
    });

    it("should successfully transition to LIVE when ticketRequired is true and ticketTypes exist", async () => {
      const eventId = "event-123";
      const transitionDto: PhaseTransitionDto = {
        phase: EventPhase.LIVE,
      };

      const event = {
        id: eventId,
        entityId: "entity-123",
        phase: EventPhase.PRE_LIVE,
        status: EventStatus.SCHEDULED,
        ticketRequired: true,
        ticketTypes: [{ name: "General", price: 10, quantity: 100 }], // Required ticket types present
        createdAt: new Date(),
        entity: null,
        app_users: null,
        tour: null,
        collaborators: [],
        tickets: [],
      };

      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(event);
      (prismaService.events.update as jest.Mock).mockResolvedValue({
        ...event,
        phase: transitionDto.phase,
        status: EventStatus.LIVE,
        updatedAt: new Date(),
      });

      const result = await service.transitionPhase(eventId, transitionDto, "user-123");

      expect(result).toHaveProperty("phase", transitionDto.phase);
      expect(result).toHaveProperty("status", EventStatus.LIVE);
    });

    it("should throw BadRequestException when transitioning to LIVE with ticketRequired=true but no ticketTypes", async () => {
      const eventId = "event-123";
      const transitionDto: PhaseTransitionDto = {
        phase: EventPhase.LIVE,
      };

      const event = {
        id: eventId,
        entityId: "entity-123",
        phase: EventPhase.PRE_LIVE,
        status: EventStatus.SCHEDULED,
        ticketRequired: true,
        ticketTypes: null, // Missing ticket types when required
        createdAt: new Date(),
        entity: null,
        app_users: null,
        tour: null,
        collaborators: [],
        tickets: [],
      };

      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(event);

      await expect(service.transitionPhase(eventId, transitionDto, "user-123")).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.transitionPhase(eventId, transitionDto, "user-123")).rejects.toThrow(
        "At least one ticket type is required before going live",
      );
    });

    it("should throw BadRequestException for invalid phase transition", async () => {
      const eventId = "event-123";
      const transitionDto: PhaseTransitionDto = {
        phase: EventPhase.PRE_LIVE,
      };

      const event = {
        id: eventId,
        entityId: "entity-123",
        phase: EventPhase.POST_LIVE,
        status: EventStatus.COMPLETED,
        ticketRequired: false,
        ticketTypes: null,
        createdAt: new Date(),
        entity: null,
        app_users: null,
        tour: null,
        collaborators: [],
        tickets: [],
      };

      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(event);

      await expect(service.transitionPhase(eventId, transitionDto, "user-123")).rejects.toThrow(BadRequestException);
      await expect(service.transitionPhase(eventId, transitionDto, "user-123")).rejects.toThrow(
        "Invalid phase transition from POST_LIVE to PRE_LIVE",
      );
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

      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(event);
      (prismaService.events.delete as jest.Mock).mockResolvedValue(event);

      await service.remove(eventId);

      expect(prismaService.events.delete).toHaveBeenCalledWith({ where: { id: eventId } });
    });

    it("should throw NotFoundException if event not found", async () => {
      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.remove("invalid-id")).rejects.toThrow(NotFoundException);
    });
  });
});

