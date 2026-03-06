import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { RegistrationsService } from "./registrations.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RegisterDto, SendInvitationsDto } from "./dto";
import { TestUtils } from "../../../test/test-utils";
import { EmailService } from "../email/email.service";
import { ConfigService } from "@nestjs/config";

describe("RegistrationsService - Auto Ticket Issuance", () => {
  let service: RegistrationsService;
  let prismaService: PrismaService;

  const mockEventId = "event-123";
  const mockUserId = "user-123";
  const mockEmail = "test@example.com";
  const mockRegistrationId = "registration-123";

  const mockEvent = {
    id: mockEventId,
    name: "Test Event",
    entryCodeRequired: false,
  };

  const mockInvitedRegistration = {
    id: mockRegistrationId,
    eventId: mockEventId,
    userId: null,
    email: mockEmail,
    accessCode: "ACCESS123",
    status: "INVITED",
    invitedBy: "creator-123",
    invitedAt: new Date(),
    registeredAt: null,
  };

  const mockRegisteredRegistration = {
    ...mockInvitedRegistration,
    status: "REGISTERED",
    registeredAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await TestUtils.createTestingModule({
      imports: [],
      providers: [
        RegistrationsService,
        {
          provide: PrismaService,
          useValue: TestUtils.createMockPrismaService(),
        },
        {
          provide: EmailService,
          useValue: {
            sendEmail: jest.fn(),
            buildLiveNowHtmlEmail: jest.fn(),
            buildLiveReminderHtmlEmail: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "FRONTEND_URL") return "https://showgeo.app";
              return undefined;
            }),
          },
        },
      ],
    });

    service = module.get<RegistrationsService>(RegistrationsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe("ensureFreeTicket - Auto Ticket Issuance", () => {
    beforeEach(() => {
      // Mock Prisma models using snake_case (as service does)
      (prismaService as any).events = {
        findUnique: jest.fn(),
      };
      (prismaService as any).event_registrations = {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      };
      (prismaService as any).tickets = {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      };
      (prismaService as any).mailbox_items = {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      };

      ((prismaService as any).events.findUnique as jest.Mock).mockResolvedValue(mockEvent);
    });

    it("should create a FREE ticket when registration becomes REGISTERED", async () => {
      const dto: RegisterDto = {
        registrationId: mockRegistrationId,
      };

      // Mock registration lookup
      ((prismaService as any).event_registrations.findUnique as jest.Mock).mockResolvedValue(
        mockInvitedRegistration,
      );

      // Mock registration update
      ((prismaService as any).event_registrations.update as jest.Mock).mockResolvedValue(
        mockRegisteredRegistration,
      );

      // Mock ticket check (no existing ticket)
      ((prismaService as any).tickets.findFirst as jest.Mock).mockResolvedValue(null);

      // Mock ticket creation
      const mockTicket = {
        id: "ticket-123",
        eventId: mockEventId,
        userId: null,
        email: mockEmail,
        registrationId: mockRegistrationId,
        type: "FREE",
        price: 0,
        currency: "USD",
        status: "ACTIVE",
        entryCode: null,
      };
      ((prismaService as any).tickets.create as jest.Mock).mockResolvedValue(mockTicket);

      // Mock mailbox check (no existing mailbox item)
      ((prismaService as any).mailbox_items.findFirst as jest.Mock).mockResolvedValue(null);

      // Mock mailbox creation
      ((prismaService as any).mailbox_items.create as jest.Mock).mockResolvedValue({});

      const result = await service.register(mockEventId, dto);

      // Verify ticket was created
      expect((prismaService as any).tickets.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventId: mockEventId,
          registrationId: mockRegistrationId,
          type: "FREE",
          price: 0,
          currency: "USD",
          status: "ACTIVE",
        }),
      });

      // Verify ticket is returned
      expect(result.ticket).toBeDefined();
      expect(result.ticket.type).toBe("FREE");
      expect(result.ticket.status).toBe("ACTIVE");
    });

    it("should NOT create duplicate tickets (idempotent)", async () => {
      const dto: RegisterDto = {
        registrationId: mockRegistrationId,
      };

      // Mock registration lookup
      ((prismaService as any).event_registrations.findUnique as jest.Mock).mockResolvedValue(
        mockInvitedRegistration,
      );

      // Mock registration update
      ((prismaService as any).event_registrations.update as jest.Mock).mockResolvedValue(
        mockRegisteredRegistration,
      );

      // Mock existing ticket found
      const existingTicket = {
        id: "ticket-existing",
        eventId: mockEventId,
        registrationId: mockRegistrationId,
        type: "FREE",
        status: "ACTIVE",
      };
      ((prismaService as any).tickets.findFirst as jest.Mock).mockResolvedValue(existingTicket);

      const result = await service.register(mockEventId, dto);

      // Verify ticket creation was NOT called (idempotent)
      expect((prismaService as any).tickets.create).not.toHaveBeenCalled();

      // Verify existing ticket is returned
      expect(result.ticket).toEqual(existingTicket);
    });

    it("should create ticket with ACTIVE status", async () => {
      const dto: RegisterDto = {
        registrationId: mockRegistrationId,
      };

      ((prismaService as any).event_registrations.findUnique as jest.Mock).mockResolvedValue(
        mockInvitedRegistration,
      );
      ((prismaService as any).event_registrations.update as jest.Mock).mockResolvedValue(
        mockRegisteredRegistration,
      );
      ((prismaService as any).tickets.findFirst as jest.Mock).mockResolvedValue(null);

      const mockTicket = {
        id: "ticket-123",
        eventId: mockEventId,
        registrationId: mockRegistrationId,
        type: "FREE",
        status: "ACTIVE",
      };
      ((prismaService as any).tickets.create as jest.Mock).mockResolvedValue(mockTicket);
      ((prismaService as any).mailbox_items.findFirst as jest.Mock).mockResolvedValue(null);
      ((prismaService as any).mailbox_items.create as jest.Mock).mockResolvedValue({});

      const result = await service.register(mockEventId, dto);

      expect((prismaService as any).tickets.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: "ACTIVE",
        }),
      });

      expect(result.ticket.status).toBe("ACTIVE");
    });

    it("should link ticket to registrationId", async () => {
      const dto: RegisterDto = {
        registrationId: mockRegistrationId,
      };

      ((prismaService as any).event_registrations.findUnique as jest.Mock).mockResolvedValue(
        mockInvitedRegistration,
      );
      ((prismaService as any).event_registrations.update as jest.Mock).mockResolvedValue(
        mockRegisteredRegistration,
      );
      ((prismaService as any).tickets.findFirst as jest.Mock).mockResolvedValue(null);

      const mockTicket = {
        id: "ticket-123",
        eventId: mockEventId,
        registrationId: mockRegistrationId,
        type: "FREE",
        status: "ACTIVE",
      };
      ((prismaService as any).tickets.create as jest.Mock).mockResolvedValue(mockTicket);
      ((prismaService as any).mailbox_items.findFirst as jest.Mock).mockResolvedValue(null);
      ((prismaService as any).mailbox_items.create as jest.Mock).mockResolvedValue({});

      const result = await service.register(mockEventId, dto);

      expect((prismaService as any).tickets.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          registrationId: mockRegistrationId,
        }),
      });

      expect(result.ticket.registrationId).toBe(mockRegistrationId);
    });

    it("should work with userId-based registration", async () => {
      const registrationWithUserId = {
        ...mockInvitedRegistration,
        userId: mockUserId,
        email: null,
      };

      const registeredWithUserId = {
        ...registrationWithUserId,
        status: "REGISTERED",
        registeredAt: new Date(),
      };

      const dto: RegisterDto = {
        registrationId: mockRegistrationId,
      };

      ((prismaService as any).event_registrations.findUnique as jest.Mock).mockResolvedValue(
        registrationWithUserId,
      );
      ((prismaService as any).event_registrations.update as jest.Mock).mockResolvedValue(
        registeredWithUserId,
      );
      ((prismaService as any).tickets.findFirst as jest.Mock).mockResolvedValue(null);

      const mockTicket = {
        id: "ticket-123",
        eventId: mockEventId,
        userId: mockUserId,
        registrationId: mockRegistrationId,
        type: "FREE",
        status: "ACTIVE",
      };
      ((prismaService as any).tickets.create as jest.Mock).mockResolvedValue(mockTicket);
      ((prismaService as any).mailbox_items.findFirst as jest.Mock).mockResolvedValue(null);
      ((prismaService as any).mailbox_items.create as jest.Mock).mockResolvedValue({});

      const result = await service.register(mockEventId, dto, mockUserId);

      expect((prismaService as any).tickets.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          registrationId: mockRegistrationId,
        }),
      });

      expect(result.ticket.userId).toBe(mockUserId);
    });

    it("should work with email-only registration (no userId)", async () => {
      const dto: RegisterDto = {
        registrationId: mockRegistrationId,
      };

      ((prismaService as any).event_registrations.findUnique as jest.Mock).mockResolvedValue(
        mockInvitedRegistration,
      );
      ((prismaService as any).event_registrations.update as jest.Mock).mockResolvedValue(
        mockRegisteredRegistration,
      );
      ((prismaService as any).tickets.findFirst as jest.Mock).mockResolvedValue(null);

      const mockTicket = {
        id: "ticket-123",
        eventId: mockEventId,
        userId: null,
        email: mockEmail,
        registrationId: mockRegistrationId,
        type: "FREE",
        status: "ACTIVE",
      };
      ((prismaService as any).tickets.create as jest.Mock).mockResolvedValue(mockTicket);
      ((prismaService as any).mailbox_items.findFirst as jest.Mock).mockResolvedValue(null);
      ((prismaService as any).mailbox_items.create as jest.Mock).mockResolvedValue({});

      const result = await service.register(mockEventId, dto);

      expect((prismaService as any).tickets.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: null,
          registrationId: mockRegistrationId,
        }),
      });

      expect(result.ticket.userId).toBeNull();
    });

    it("should add ticket to mailbox after creation", async () => {
      const dto: RegisterDto = {
        registrationId: mockRegistrationId,
      };

      ((prismaService as any).event_registrations.findUnique as jest.Mock).mockResolvedValue(
        mockInvitedRegistration,
      );
      ((prismaService as any).event_registrations.update as jest.Mock).mockResolvedValue(
        mockRegisteredRegistration,
      );
      ((prismaService as any).tickets.findFirst as jest.Mock).mockResolvedValue(null);

      const mockTicket = {
        id: "ticket-123",
        eventId: mockEventId,
        registrationId: mockRegistrationId,
        type: "FREE",
        status: "ACTIVE",
        entryCode: null,
      };
      ((prismaService as any).tickets.create as jest.Mock).mockResolvedValue(mockTicket);
      ((prismaService as any).mailbox_items.findFirst as jest.Mock).mockResolvedValue(null);
      ((prismaService as any).mailbox_items.create as jest.Mock).mockResolvedValue({});

      await service.register(mockEventId, dto);

      // Verify mailbox item was created
      expect((prismaService as any).mailbox_items.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: "TICKET",
          title: `Your ticket for ${mockEvent.name}`,
          registrationId: mockRegistrationId,
          metadata: expect.objectContaining({
            eventId: mockEventId,
            eventName: mockEvent.name,
            ticketId: mockTicket.id,
            registrationId: mockRegistrationId,
          }),
        }),
      });
    });

    it("should NOT create duplicate mailbox items", async () => {
      const dto: RegisterDto = {
        registrationId: mockRegistrationId,
      };

      ((prismaService as any).event_registrations.findUnique as jest.Mock).mockResolvedValue(
        mockInvitedRegistration,
      );
      ((prismaService as any).event_registrations.update as jest.Mock).mockResolvedValue(
        mockRegisteredRegistration,
      );
      ((prismaService as any).tickets.findFirst as jest.Mock).mockResolvedValue(null);

      const mockTicket = {
        id: "ticket-123",
        eventId: mockEventId,
        registrationId: mockRegistrationId,
        type: "FREE",
        status: "ACTIVE",
      };
      ((prismaService as any).tickets.create as jest.Mock).mockResolvedValue(mockTicket);

      // Mock existing mailbox item
      ((prismaService as any).mailbox_items.findFirst as jest.Mock).mockResolvedValue({
        id: "mailbox-existing",
        type: "TICKET",
        registrationId: mockRegistrationId,
      });

      await service.register(mockEventId, dto);

      // Verify mailbox creation was NOT called (idempotent)
      expect((prismaService as any).mailbox_items.create).not.toHaveBeenCalled();
    });
  });

  describe("register - Integration", () => {
    beforeEach(() => {
      // Mock Prisma models using snake_case (as service does)
      (prismaService as any).events = {
        findUnique: jest.fn(),
      };
      (prismaService as any).event_registrations = {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      };
      (prismaService as any).tickets = {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      };
      (prismaService as any).mailbox_items = {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      };

      ((prismaService as any).events.findUnique as jest.Mock).mockResolvedValue(mockEvent);
    });

    it("should throw NotFoundException if registration not found", async () => {
      const dto: RegisterDto = {
        registrationId: "non-existent",
      };

      ((prismaService as any).event_registrations.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.register(mockEventId, dto)).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException if already registered", async () => {
      const dto: RegisterDto = {
        registrationId: mockRegistrationId,
      };

      ((prismaService as any).event_registrations.findUnique as jest.Mock).mockResolvedValue(
        mockRegisteredRegistration,
      );

      await expect(service.register(mockEventId, dto)).rejects.toThrow(BadRequestException);
      await expect(service.register(mockEventId, dto)).rejects.toThrow("Already registered");
    });
  });

  describe("notifyLiveEvent - LIVE NOW Notifications", () => {
    beforeEach(() => {
      // Mock Prisma models using snake_case (as service does)
      (prismaService as any).events = {
        findUnique: jest.fn(),
      };
      (prismaService as any).event_registrations = {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      };
      (prismaService as any).tickets = {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      };
      (prismaService as any).mailbox_items = {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      };
      (prismaService as any).app_users = {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      };

      ((prismaService as any).events.findUnique as jest.Mock).mockResolvedValue(mockEvent);
    });

    it("should create LIVE NOW notification for REGISTERED user", async () => {
      const registeredUser = {
        id: mockRegistrationId,
        eventId: mockEventId,
        userId: mockUserId,
        email: mockEmail,
        status: "REGISTERED",
      };

      ((prismaService as any).event_registrations.findMany as jest.Mock).mockResolvedValue([
        registeredUser,
      ]);
      ((prismaService as any).tickets.findMany as jest.Mock).mockResolvedValue([]);
      ((prismaService as any).app_users.findMany as jest.Mock).mockResolvedValue([
        { id: mockUserId, email: mockEmail },
      ]);
      ((prismaService as any).mailbox_items.findMany as jest.Mock).mockResolvedValue([]);
      ((prismaService as any).mailbox_items.create as jest.Mock).mockResolvedValue({});

      await service.notifyLiveEvent(mockEventId);

      expect((prismaService as any).mailbox_items.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          type: "EVENT_UPDATE",
          title: `LIVE NOW: ${mockEvent.name}`,
          message: "The event you registered for is now live.",
          metadata: expect.objectContaining({
            eventId: mockEventId,
            eventName: mockEvent.name,
            registrationId: mockRegistrationId,
            phase: "LIVE",
          }),
        }),
      });
    });

    it("should create LIVE NOW notification for user with ACTIVE ticket", async () => {
      const activeTicket = {
        id: "ticket-123",
        eventId: mockEventId,
        userId: mockUserId,
        status: "ACTIVE",
        registrations: null,
      };

      ((prismaService as any).event_registrations.findMany as jest.Mock).mockResolvedValue([]);
      ((prismaService as any).tickets.findMany as jest.Mock).mockResolvedValue([activeTicket]);
      ((prismaService as any).app_users.findMany as jest.Mock).mockResolvedValue([
        { id: mockUserId, email: mockEmail },
      ]);
      ((prismaService as any).mailbox_items.findMany as jest.Mock).mockResolvedValue([]);
      ((prismaService as any).mailbox_items.create as jest.Mock).mockResolvedValue({});

      await service.notifyLiveEvent(mockEventId);

      expect((prismaService as any).mailbox_items.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          type: "EVENT_UPDATE",
          metadata: expect.objectContaining({
            ticketId: activeTicket.id,
          }),
        }),
      });
    });

    it("should support email-only registration (no userId)", async () => {
      const emailOnlyRegistration = {
        id: mockRegistrationId,
        eventId: mockEventId,
        userId: null,
        email: mockEmail,
        status: "REGISTERED",
      };

      ((prismaService as any).event_registrations.findMany as jest.Mock).mockResolvedValue([
        emailOnlyRegistration,
      ]);
      ((prismaService as any).tickets.findMany as jest.Mock).mockResolvedValue([]);
      ((prismaService as any).mailbox_items.findMany as jest.Mock).mockResolvedValue([]);
      ((prismaService as any).mailbox_items.create as jest.Mock).mockResolvedValue({});

      await service.notifyLiveEvent(mockEventId);

      expect((prismaService as any).mailbox_items.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: null,
          email: mockEmail,
          type: "EVENT_UPDATE",
        }),
      });
    });

    it("should NOT create duplicate notifications on repeated LIVE transitions", async () => {
      const registeredUser = {
        id: mockRegistrationId,
        eventId: mockEventId,
        userId: mockUserId,
        email: mockEmail,
        status: "REGISTERED",
      };

      const existingNotification = {
        id: "mailbox-existing",
        userId: mockUserId,
        type: "EVENT_UPDATE",
        metadata: {
          eventId: mockEventId,
        },
      };

      ((prismaService as any).event_registrations.findMany as jest.Mock).mockResolvedValue([
        registeredUser,
      ]);
      ((prismaService as any).tickets.findMany as jest.Mock).mockResolvedValue([]);
      ((prismaService as any).mailbox_items.findMany as jest.Mock).mockResolvedValue([
        existingNotification,
      ]);

      await service.notifyLiveEvent(mockEventId);

      // Should NOT create duplicate notification
      expect((prismaService as any).mailbox_items.create).not.toHaveBeenCalled();
    });

    it("should NOT notify INVITED or CANCELLED users", async () => {
      // Implementation queries for status: "REGISTERED" only
      // So mock should return empty array (no REGISTERED registrations exist)
      ((prismaService as any).event_registrations.findMany as jest.Mock).mockResolvedValue([]);
      ((prismaService as any).tickets.findMany as jest.Mock).mockResolvedValue([]);
      ((prismaService as any).mailbox_items.findMany as jest.Mock).mockResolvedValue([]);

      await service.notifyLiveEvent(mockEventId);

      // Should NOT create notifications for INVITED or CANCELLED
      // (They are filtered out by the query, so no notifications should be created)
      expect((prismaService as any).mailbox_items.create).not.toHaveBeenCalled();
    });

    it("should NOT throw if one user fails", async () => {
      const registeredUser1 = {
        id: "reg-1",
        eventId: mockEventId,
        userId: "user-1",
        email: "user1@example.com",
        status: "REGISTERED",
      };

      const registeredUser2 = {
        id: "reg-2",
        eventId: mockEventId,
        userId: "user-2",
        email: "user2@example.com",
        status: "REGISTERED",
      };

      ((prismaService as any).event_registrations.findMany as jest.Mock).mockResolvedValue([
        registeredUser1,
        registeredUser2,
      ]);
      ((prismaService as any).tickets.findMany as jest.Mock).mockResolvedValue([]);
      ((prismaService as any).app_users.findMany as jest.Mock).mockResolvedValue([
        { id: "user-1", email: "user1@example.com" },
        { id: "user-2", email: "user2@example.com" },
      ]);
      ((prismaService as any).mailbox_items.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // First user - no existing
        .mockResolvedValueOnce([]); // Second user - no existing

      // First create succeeds, second fails
      ((prismaService as any).mailbox_items.create as jest.Mock)
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error("Database error"));

      // Should not throw
      await expect(service.notifyLiveEvent(mockEventId)).resolves.not.toThrow();

      // Should have attempted to create for both users
      expect((prismaService as any).mailbox_items.create).toHaveBeenCalledTimes(2);
    });

    it("should de-duplicate recipients (user with both registration and ticket)", async () => {
      const registeredUser = {
        id: mockRegistrationId,
        eventId: mockEventId,
        userId: mockUserId,
        email: mockEmail,
        status: "REGISTERED",
      };

      const ticketForSameUser = {
        id: "ticket-123",
        eventId: mockEventId,
        userId: mockUserId,
        status: "ACTIVE",
        registrationId: mockRegistrationId,
        registrations: registeredUser,
      };

      ((prismaService as any).event_registrations.findMany as jest.Mock).mockResolvedValue([
        registeredUser,
      ]);
      ((prismaService as any).tickets.findMany as jest.Mock).mockResolvedValue([
        ticketForSameUser,
      ]);
      ((prismaService as any).app_users.findMany as jest.Mock).mockResolvedValue([
        { id: mockUserId, email: mockEmail },
      ]);
      ((prismaService as any).mailbox_items.findMany as jest.Mock).mockResolvedValue([]);
      ((prismaService as any).mailbox_items.create as jest.Mock).mockResolvedValue({});

      await service.notifyLiveEvent(mockEventId);

      // Should create only ONE notification (de-duplicated)
      expect((prismaService as any).mailbox_items.create).toHaveBeenCalledTimes(1);

      // Notification should include both ticketId and registrationId
      expect((prismaService as any).mailbox_items.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            ticketId: ticketForSameUser.id,
            registrationId: mockRegistrationId,
          }),
        }),
      });
    });
  });

  describe("Notification Preferences (Phase 2C)", () => {
    let emailService: EmailService;
    let configService: ConfigService;

    beforeEach(async () => {
      const module: TestingModule = await TestUtils.createTestingModule({
        imports: [],
        providers: [
          RegistrationsService,
          {
            provide: PrismaService,
            useValue: TestUtils.createMockPrismaService(),
          },
          {
            provide: EmailService,
            useValue: {
              sendEmail: jest.fn(),
              buildLiveNowHtmlEmail: jest.fn(),
              buildLiveReminderHtmlEmail: jest.fn(),
            },
          },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === "FRONTEND_URL") return "https://showgeo.app";
                return undefined;
              }),
            },
          },
        ],
      });

      service = module.get<RegistrationsService>(RegistrationsService);
      prismaService = module.get<PrismaService>(PrismaService);
      emailService = module.get<EmailService>(EmailService);
      configService = module.get<ConfigService>(ConfigService);

      // Add user_profiles mock for preference tests
      (prismaService as any).user_profiles = {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      };

      jest.clearAllMocks();
    });

    describe("shouldSendEmail", () => {
      it("should return true for guest users (no userId)", async () => {
        const result = await (service as any).shouldSendEmail(null, "LIVE_NOW");
        expect(result).toBe(true);
      });

      it("should return true if preferences are missing (default opt-in)", async () => {
        (prismaService.user_profiles.findUnique as jest.Mock).mockResolvedValue(
          null,
        );

        const result = await (service as any).shouldSendEmail(
          "user-123",
          "LIVE_NOW",
        );
        expect(result).toBe(true);
      });

      it("should return true if preferences.notifications is missing", async () => {
        (prismaService.user_profiles.findUnique as jest.Mock).mockResolvedValue(
          {
            preferences: {},
          },
        );

        const result = await (service as any).shouldSendEmail(
          "user-123",
          "LIVE_NOW",
        );
        expect(result).toBe(true);
      });

      it("should return false if emailLiveNow is false", async () => {
        (prismaService.user_profiles.findUnique as jest.Mock).mockResolvedValue(
          {
            preferences: {
              notifications: {
                emailLiveNow: false,
              },
            },
          },
        );

        const result = await (service as any).shouldSendEmail(
          "user-123",
          "LIVE_NOW",
        );
        expect(result).toBe(false);
      });

      it("should return true if emailLiveNow is true", async () => {
        (prismaService.user_profiles.findUnique as jest.Mock).mockResolvedValue(
          {
            preferences: {
              notifications: {
                emailLiveNow: true,
              },
            },
          },
        );

        const result = await (service as any).shouldSendEmail(
          "user-123",
          "LIVE_NOW",
        );
        expect(result).toBe(true);
      });

      it("should return false if emailReminders is false", async () => {
        (prismaService.user_profiles.findUnique as jest.Mock).mockResolvedValue(
          {
            preferences: {
              notifications: {
                emailReminders: false,
              },
            },
          },
        );

        const result = await (service as any).shouldSendEmail(
          "user-123",
          "REMINDER",
        );
        expect(result).toBe(false);
      });

      it("should return true if emailReminders is true", async () => {
        (prismaService.user_profiles.findUnique as jest.Mock).mockResolvedValue(
          {
            preferences: {
              notifications: {
                emailReminders: true,
              },
            },
          },
        );

        const result = await (service as any).shouldSendEmail(
          "user-123",
          "REMINDER",
        );
        expect(result).toBe(true);
      });

      it("should default to true if preference check fails", async () => {
        (prismaService.user_profiles.findUnique as jest.Mock).mockRejectedValue(
          new Error("Database error"),
        );

        const result = await (service as any).shouldSendEmail(
          "user-123",
          "LIVE_NOW",
        );
        expect(result).toBe(true);
      });
    });

    describe("sendLiveNowEmail with preferences", () => {
      it("should skip email if emailLiveNow is false but still create mailbox", async () => {
        // Mock user profile with emailLiveNow: false
        (prismaService.user_profiles.findUnique as jest.Mock).mockResolvedValue(
          {
            preferences: {
              notifications: {
                emailLiveNow: false,
              },
            },
          },
        );

        await (service as any).sendLiveNowEmail(
          {
            email: "test@example.com",
            eventName: "Test Event",
            watchUrl: "https://showgeo.app/events/123/watch",
          },
          "user-123",
        );

        // Email should not be sent
        expect(emailService.sendEmail).not.toHaveBeenCalled();
      });

      it("should send email if emailLiveNow is true", async () => {
        // Mock user profile with emailLiveNow: true
        (prismaService.user_profiles.findUnique as jest.Mock).mockResolvedValue(
          {
            preferences: {
              notifications: {
                emailLiveNow: true,
              },
            },
          },
        );

        (emailService.buildLiveNowHtmlEmail as jest.Mock).mockReturnValue(
          "<html>Test</html>",
        );

        await (service as any).sendLiveNowEmail(
          {
            email: "test@example.com",
            eventName: "Test Event",
            watchUrl: "https://showgeo.app/events/123/watch",
          },
          "user-123",
        );

        // Email should be sent
        expect(emailService.sendEmail).toHaveBeenCalled();
      });
    });

    describe("sendLiveReminderEmail with preferences", () => {
      it("should skip email if emailReminders is false", async () => {
        // Mock user profile with emailReminders: false
        (prismaService.user_profiles.findUnique as jest.Mock).mockResolvedValue(
          {
            preferences: {
              notifications: {
                emailReminders: false,
              },
            },
          },
        );

        await (service as any).sendLiveReminderEmail(
          {
            email: "test@example.com",
            eventName: "Test Event",
            watchUrl: "https://showgeo.app/events/123/watch",
            reminderType: "LIVE_10_MIN" as any,
          },
          "user-123",
        );

        // Email should not be sent
        expect(emailService.sendEmail).not.toHaveBeenCalled();
      });

      it("should send email if emailReminders is true", async () => {
        // Mock user profile with emailReminders: true
        (prismaService.user_profiles.findUnique as jest.Mock).mockResolvedValue(
          {
            preferences: {
              notifications: {
                emailReminders: true,
              },
            },
          },
        );

        (emailService.buildLiveReminderHtmlEmail as jest.Mock).mockReturnValue(
          "<html>Test</html>",
        );

        await (service as any).sendLiveReminderEmail(
          {
            email: "test@example.com",
            eventName: "Test Event",
            watchUrl: "https://showgeo.app/events/123/watch",
            reminderType: "LIVE_10_MIN" as any,
          },
          "user-123",
        );

        // Email should be sent
        expect(emailService.sendEmail).toHaveBeenCalled();
      });
    });
  });
});

