/**
 * StreamingService Unit Tests - Authorization Logic
 * 
 * Tests comprehensive authorization logic for streaming token generation.
 * 
 * STRICT RULE: ALL VIEWER ACCESS REQUIRES A VALID TICKET
 * - No public or anonymous viewer access
 * - FREE, GIFTED, and PAID tickets all require ACTIVE status
 * - Tickets must match the event and be properly registered
 * 
 * BROADCASTER ACCESS: Unchanged - no ticket requirement
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { StreamingService } from "./streaming.service";
import { PrismaService } from "../../prisma/prisma.service";
import { GenerateTokenDto, StreamRole } from "./dto/generate-token.dto";
import { EventPhase } from "@prisma/client";
import { TicketStatus } from "../../shared/types/ticket.types";
import { AccessToken } from "livekit-server-sdk";
import { LocationService } from "../location/location.service";
import { NotificationsService } from "../notifications/notifications.service";

// Mock LiveKit AccessToken
jest.mock("livekit-server-sdk", () => ({
  AccessToken: jest.fn().mockImplementation(() => ({
    addGrant: jest.fn(),
    toJwt: jest.fn().mockResolvedValue("mock-jwt-token"),
  })),
  RoomServiceClient: jest.fn(),
}));

describe("StreamingService - VIEWER Authorization", () => {
  let service: StreamingService;
  let prismaService: PrismaService;
  let configService: ConfigService;

  const mockUser = { id: "user-123", email: "test@example.com" };
  const mockEventId = "event-123";
  const mockSessionId = "session-123";
  const mockRoomId = "room-123";

  // Mock data
  const mockLiveEvent = {
    id: mockEventId,
    name: "Test Event",
    phase: EventPhase.LIVE,
    entityId: "entity-123",
    ticketRequired: true,
    geoRestricted: false,
    geoRegions: [],
  };

  const mockActiveSession = {
    id: mockSessionId,
    eventId: mockEventId,
    entityId: "entity-123",
    roomId: mockRoomId,
    sessionKey: "session-key",
    active: true,
    geoRegions: [],
  };

  const mockActiveTicket = {
    id: "ticket-123",
    eventId: mockEventId,
    userId: mockUser.id,
    status: TicketStatus.ACTIVE,
    type: "FREE",
    registrationId: null,
    registrations: null,
  };

  const mockInactiveTicket = {
    id: "ticket-456",
    eventId: mockEventId,
    userId: mockUser.id,
    status: TicketStatus.USED,
    type: "FREE",
    registrationId: null,
    registrations: null,
  };

  const mockWrongEventTicket = {
    id: "ticket-789",
    eventId: "different-event-id",
    userId: mockUser.id,
    status: TicketStatus.ACTIVE,
    type: "FREE",
    registrationId: null,
    registrations: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamingService,
        {
          provide: PrismaService,
          useValue: {
            streaming_sessions: {
              findFirst: jest.fn(),
              create: jest.fn(),
            },
            events: {
              findUnique: jest.fn(),
            },
            tickets: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            event_registrations: {
              findUnique: jest.fn(),
            },
            entities: {
              findUnique: jest.fn(),
            },
            event_roles: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
            user_profiles: {
              findUnique: jest.fn().mockResolvedValue({
                preferences: {
                  consent: {
                    codeOfConductAccepted: true,
                    acceptedAt: new Date().toISOString(),
                  },
                },
              }),
            },
          },
        },
        {
          provide: LocationService,
          useValue: {
            getLocationFromIp: jest.fn().mockReturnValue(null),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            notifyStreamingSessionStarted: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                LIVEKIT_API_KEY: "test-api-key",
                LIVEKIT_API_SECRET: "test-api-secret",
                LIVEKIT_URL: "wss://test.livekit.cloud",
              };
              return config[key] || "";
            }),
          },
        },
      ],
    }).compile();

    service = module.get<StreamingService>(StreamingService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe("VIEWER Authorization", () => {
    beforeEach(() => {
      // Setup common mocks for all VIEWER tests
      (prismaService.streaming_sessions.findFirst as jest.Mock).mockResolvedValue(mockActiveSession);
      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(mockLiveEvent);
      (prismaService.entities.findUnique as jest.Mock).mockResolvedValue({
        id: "entity-123",
        name: "Test Entity",
        status: "ACTIVE",
      });
    });

    it("should throw ForbiddenException when VIEWER has no valid ticket for user or credentials", async () => {
      const dto: GenerateTokenDto = {
        eventId: mockEventId,
        streamRole: StreamRole.VIEWER,
        // No ticketId or accessCode
      };

      (prismaService.tickets.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.generateToken(dto, mockUser)).rejects.toThrow(ForbiddenException);
      await expect(service.generateToken(dto, mockUser)).rejects.toThrow("No valid ticket");

      expect(prismaService.tickets.findUnique).not.toHaveBeenCalled();
      expect(prismaService.tickets.findFirst).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
          eventId: mockEventId,
          status: "ACTIVE",
        },
        include: { registrations: true },
      });
    });

    it("should throw ForbiddenException when VIEWER has inactive ticket (USED status)", async () => {
      const dto: GenerateTokenDto = {
        eventId: mockEventId,
        streamRole: StreamRole.VIEWER,
        ticketId: mockInactiveTicket.id,
      };

      (prismaService.tickets.findUnique as jest.Mock).mockResolvedValue(mockInactiveTicket);

      await expect(service.generateToken(dto, mockUser)).rejects.toThrow(ForbiddenException);
      await expect(service.generateToken(dto, mockUser)).rejects.toThrow(
        "Ticket is used",
      );

      expect(prismaService.tickets.findUnique).toHaveBeenCalledWith({
        where: { id: mockInactiveTicket.id },
        include: { registrations: true },
      });
    });

    it("should throw ForbiddenException when VIEWER has CANCELLED ticket", async () => {
      const cancelledTicket = {
        ...mockActiveTicket,
        id: "ticket-cancelled",
        status: TicketStatus.CANCELLED,
      };

      const dto: GenerateTokenDto = {
        eventId: mockEventId,
        streamRole: StreamRole.VIEWER,
        ticketId: cancelledTicket.id,
      };

      (prismaService.tickets.findUnique as jest.Mock).mockResolvedValue(cancelledTicket);

      await expect(service.generateToken(dto, mockUser)).rejects.toThrow(ForbiddenException);
      await expect(service.generateToken(dto, mockUser)).rejects.toThrow(
        "Ticket is cancelled",
      );
    });

    it("should throw ForbiddenException when VIEWER has ticket for wrong event", async () => {
      const dto: GenerateTokenDto = {
        eventId: mockEventId,
        streamRole: StreamRole.VIEWER,
        ticketId: mockWrongEventTicket.id,
      };

      (prismaService.tickets.findUnique as jest.Mock).mockResolvedValue(mockWrongEventTicket);

      await expect(service.generateToken(dto, mockUser)).rejects.toThrow(ForbiddenException);
      await expect(service.generateToken(dto, mockUser)).rejects.toThrow(
        "Ticket is for a different event",
      );

      expect(prismaService.tickets.findUnique).toHaveBeenCalledWith({
        where: { id: mockWrongEventTicket.id },
        include: { registrations: true },
      });
    });

    it("should throw ForbiddenException when ticket is not found", async () => {
      const dto: GenerateTokenDto = {
        eventId: mockEventId,
        streamRole: StreamRole.VIEWER,
        ticketId: "non-existent-ticket",
      };

      (prismaService.tickets.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.generateToken(dto, mockUser)).rejects.toThrow(ForbiddenException);
      await expect(service.generateToken(dto, mockUser)).rejects.toThrow("No valid ticket");
    });

    it("should throw ForbiddenException when accessCode does not match any ticket", async () => {
      const dto: GenerateTokenDto = {
        eventId: mockEventId,
        streamRole: StreamRole.VIEWER,
        accessCode: "invalid-code",
      };

      (prismaService.tickets.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.generateToken(dto, mockUser)).rejects.toThrow(ForbiddenException);
      await expect(service.generateToken(dto, mockUser)).rejects.toThrow("No valid ticket");

      expect(prismaService.tickets.findFirst).toHaveBeenCalledWith({
        where: {
          eventId: mockEventId,
          entryCode: "invalid-code",
        },
        include: {
          registrations: true,
        },
      });
    });

    it("should successfully generate token when VIEWER has ACTIVE ticket for LIVE event", async () => {
      const dto: GenerateTokenDto = {
        eventId: mockEventId,
        streamRole: StreamRole.VIEWER,
        ticketId: mockActiveTicket.id,
      };

      (prismaService.tickets.findUnique as jest.Mock).mockResolvedValue(mockActiveTicket);

      const result = await service.generateToken(dto, mockUser);

      expect(result).toHaveProperty("token");
      expect(result.token).toBe("mock-jwt-token");
      expect(prismaService.tickets.findUnique).toHaveBeenCalledWith({
        where: { id: mockActiveTicket.id },
        include: { registrations: true },
      });

      // Verify AccessToken was created with correct permissions (read-only)
      expect(AccessToken).toHaveBeenCalled();
      const tokenInstance = (AccessToken as jest.Mock).mock.results[
        (AccessToken as jest.Mock).mock.results.length - 1
      ].value;
      expect(tokenInstance.addGrant).toHaveBeenCalledWith(
        expect.objectContaining({
          room: `event-${mockEventId.toLowerCase()}`,
          roomJoin: true,
          canPublish: false, // VIEWER cannot publish
          canSubscribe: true,
          canPublishData: false, // VIEWER cannot publish data
        }),
      );
    });

    it("should successfully generate token when VIEWER has valid accessCode", async () => {
      const dto: GenerateTokenDto = {
        eventId: mockEventId,
        streamRole: StreamRole.VIEWER,
        accessCode: "valid-access-code",
      };

      // Ticket must not have userId for accessCode to work (unclaimed ticket)
      const ticketWithAccessCode = {
        ...mockActiveTicket,
        userId: null, // Unclaimed ticket - accessCode can be used
        entryCode: "valid-access-code",
      };

      const usedTicket = {
        ...ticketWithAccessCode,
        status: TicketStatus.USED,
      };

      (prismaService.tickets.findFirst as jest.Mock)
        .mockResolvedValueOnce(ticketWithAccessCode) // First call: find ticket
        .mockResolvedValueOnce(usedTicket); // Second call: reload after update
      (prismaService.tickets.findUnique as jest.Mock).mockResolvedValue(usedTicket);
      (prismaService.tickets.update as jest.Mock).mockResolvedValue(usedTicket);
      (prismaService.entities.findUnique as jest.Mock).mockResolvedValue({
        id: "entity-123",
        name: "Test Entity",
        slug: "test-entity",
        status: "ACTIVE",
      });

      const result = await service.generateToken(dto, mockUser);

      expect(result).toHaveProperty("token");
      expect(result.token).toBe("mock-jwt-token");
      expect(prismaService.tickets.findFirst).toHaveBeenCalledWith({
        where: {
          eventId: mockEventId,
          entryCode: "valid-access-code",
        },
        include: {
          registrations: true,
        },
      });
    });

    it("should throw ForbiddenException when event is PRE_LIVE", async () => {
      const preLiveEvent = {
        ...mockLiveEvent,
        phase: EventPhase.PRE_LIVE,
      };

      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(preLiveEvent);

      const dto: GenerateTokenDto = {
        eventId: mockEventId,
        streamRole: StreamRole.VIEWER,
        ticketId: mockActiveTicket.id,
      };

      (prismaService.tickets.findUnique as jest.Mock).mockResolvedValue(mockActiveTicket);

      await expect(service.generateToken(dto, mockUser)).rejects.toThrow(ForbiddenException);
      await expect(service.generateToken(dto, mockUser)).rejects.toThrow("Event is not live");
    });

    it("should throw ForbiddenException when event is POST_LIVE", async () => {
      const postLiveEvent = {
        ...mockLiveEvent,
        phase: EventPhase.POST_LIVE,
      };

      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(postLiveEvent);

      const dto: GenerateTokenDto = {
        eventId: mockEventId,
        streamRole: StreamRole.VIEWER,
        ticketId: mockActiveTicket.id,
      };

      (prismaService.tickets.findUnique as jest.Mock).mockResolvedValue(mockActiveTicket);

      await expect(service.generateToken(dto, mockUser)).rejects.toThrow(ForbiddenException);
      await expect(service.generateToken(dto, mockUser)).rejects.toThrow("Event is not live");
    });

    it("should generate token when ticket is ACTIVE even if linked registration is not REGISTERED", async () => {
      const ticketWithRegistration = {
        ...mockActiveTicket,
        registrationId: "registration-123",
        registrations: {
          id: "registration-123",
          status: "INVITED",
        },
      };

      const dto: GenerateTokenDto = {
        eventId: mockEventId,
        streamRole: StreamRole.VIEWER,
        ticketId: ticketWithRegistration.id,
      };

      (prismaService.tickets.findUnique as jest.Mock).mockResolvedValue(ticketWithRegistration);

      const result = await service.generateToken(dto, mockUser);

      expect(result).toHaveProperty("token");
      expect((prismaService as any).event_registrations.findUnique).not.toHaveBeenCalled();
    });

    it("should successfully generate token when ticket has REGISTERED registration", async () => {
      const ticketWithRegistration = {
        ...mockActiveTicket,
        registrationId: "registration-123",
        registrations: {
          id: "registration-123",
          status: "REGISTERED",
        },
      };

      const dto: GenerateTokenDto = {
        eventId: mockEventId,
        streamRole: StreamRole.VIEWER,
        ticketId: ticketWithRegistration.id,
      };

      (prismaService.tickets.findUnique as jest.Mock).mockResolvedValue(ticketWithRegistration);

      const result = await service.generateToken(dto, mockUser);

      expect(result).toHaveProperty("token");
      expect(result.token).toBe("mock-jwt-token");
      expect((prismaService as any).event_registrations.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("VIEWER Ticket Redemption - Single Use Enforcement", () => {
    beforeEach(() => {
      // Setup common mocks for all redemption tests
      (prismaService.streaming_sessions.findFirst as jest.Mock).mockResolvedValue(mockActiveSession);
      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(mockLiveEvent);
      (prismaService.tickets.update as jest.Mock).mockResolvedValue({});
      (prismaService.entities.findUnique as jest.Mock).mockResolvedValue({
        id: "entity-123",
        name: "Test Entity",
        slug: "test-entity",
        status: "ACTIVE",
      });
      ((prismaService as any).event_registrations.findUnique as jest.Mock).mockResolvedValue(null);
    });

    it("should bind ticket to logged-in user and clear entryCode when user redeems via ticketId", async () => {
      const unclaimedTicket = {
        ...mockActiveTicket,
        userId: null,
        entryCode: "ACCESS123",
      };

      const claimedTicket = {
        ...unclaimedTicket,
        userId: mockUser.id,
        entryCode: null,
      };

      (prismaService.tickets.findUnique as jest.Mock)
        .mockResolvedValueOnce(unclaimedTicket) // First call: find ticket
        .mockResolvedValueOnce(claimedTicket); // Second call: reload after update

      const dto: GenerateTokenDto = {
        eventId: mockEventId,
        streamRole: StreamRole.VIEWER,
        ticketId: unclaimedTicket.id,
      };

      await service.generateToken(dto, mockUser);

      // Verify ticket was updated: userId set, entryCode cleared
      expect(prismaService.tickets.update).toHaveBeenCalledWith({
        where: { id: unclaimedTicket.id },
        data: {
          userId: mockUser.id,
          entryCode: null,
        },
      });

      // Verify ticket remains ACTIVE (not set to USED)
      expect(prismaService.tickets.update).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({ status: "USED" }),
        }),
      );
    });

    it("should block accessCode usage when ticket is already claimed by a user", async () => {
      const claimedTicket = {
        ...mockActiveTicket,
        userId: "different-user-id",
        entryCode: "ACCESS123",
      };

      (prismaService.tickets.findFirst as jest.Mock).mockResolvedValue(claimedTicket);

      const dto: GenerateTokenDto = {
        eventId: mockEventId,
        streamRole: StreamRole.VIEWER,
        accessCode: "ACCESS123",
      };

      await expect(service.generateToken(dto, mockUser)).rejects.toThrow(ForbiddenException);
      await expect(service.generateToken(dto, mockUser)).rejects.toThrow(
        "This access code has already been redeemed.",
      );

      // Verify ticket was NOT updated (blocked before redemption)
      expect(prismaService.tickets.update).not.toHaveBeenCalled();
    });

    it("should burn ticket (set to USED) when accessCode is redeemed by unauthenticated user", async () => {
      const unclaimedTicket = {
        ...mockActiveTicket,
        userId: null,
        entryCode: "ACCESS123",
      };

      const usedTicket = {
        ...unclaimedTicket,
        status: TicketStatus.USED,
      };

      (prismaService.tickets.findFirst as jest.Mock)
        .mockResolvedValueOnce(unclaimedTicket) // First call: find ticket
        .mockResolvedValueOnce(usedTicket); // Second call: reload after update (won't happen, but mock it)

      (prismaService.tickets.findUnique as jest.Mock).mockResolvedValue(usedTicket);

      const dto: GenerateTokenDto = {
        eventId: mockEventId,
        streamRole: StreamRole.VIEWER,
        accessCode: "ACCESS123",
      };

      // Use a user with empty id to simulate unauthenticated access
      const unauthenticatedUser = { id: "", email: undefined };

      await service.generateToken(dto, unauthenticatedUser);

      // Verify ticket was updated to USED
      expect(prismaService.tickets.update).toHaveBeenCalledWith({
        where: { id: unclaimedTicket.id },
        data: {
          status: "USED",
        },
      });
    });

    it("should block all future access when ticket is USED", async () => {
      const usedTicket = {
        ...mockActiveTicket,
        status: TicketStatus.USED,
      };

      (prismaService.tickets.findUnique as jest.Mock).mockResolvedValue(usedTicket);

      const dto: GenerateTokenDto = {
        eventId: mockEventId,
        streamRole: StreamRole.VIEWER,
        ticketId: usedTicket.id,
      };

      await expect(service.generateToken(dto, mockUser)).rejects.toThrow(ForbiddenException);
      await expect(service.generateToken(dto, mockUser)).rejects.toThrow(
        "Ticket is used",
      );

      // Verify ticket was NOT updated (blocked before redemption)
      expect(prismaService.tickets.update).not.toHaveBeenCalled();
    });

    it("should allow same user to re-enter stream with claimed ticket", async () => {
      const claimedTicket = {
        ...mockActiveTicket,
        userId: mockUser.id, // Ticket already claimed by this user
        entryCode: null,
      };

      (prismaService.tickets.findUnique as jest.Mock).mockResolvedValue(claimedTicket);

      const dto: GenerateTokenDto = {
        eventId: mockEventId,
        streamRole: StreamRole.VIEWER,
        ticketId: claimedTicket.id,
      };

      const result = await service.generateToken(dto, mockUser);

      // Should succeed - same user can re-enter
      expect(result).toHaveProperty("token");
      expect(result.token).toBe("mock-jwt-token");

      // joinedAt tracking (not redemption) may update the ticket once
      expect(prismaService.tickets.update).toHaveBeenCalledWith({
        where: { id: claimedTicket.id },
        data: { joinedAt: expect.any(Date) },
      });
    });

    it("should block other users from using a ticket claimed by someone else", async () => {
      const claimedTicket = {
        ...mockActiveTicket,
        userId: "different-user-id", // Ticket claimed by different user
        entryCode: null,
      };

      (prismaService.tickets.findUnique as jest.Mock).mockResolvedValue(claimedTicket);

      const dto: GenerateTokenDto = {
        eventId: mockEventId,
        streamRole: StreamRole.VIEWER,
        ticketId: claimedTicket.id,
      };

      await expect(service.generateToken(dto, mockUser)).rejects.toThrow(ForbiddenException);
      await expect(service.generateToken(dto, mockUser)).rejects.toThrow(
        "This ticket has already been claimed by another user.",
      );

      // Verify ticket was NOT updated (blocked before redemption)
      expect(prismaService.tickets.update).not.toHaveBeenCalled();
    });

    it("should block accessCode reuse after it has been used", async () => {
      // First redemption: accessCode used, ticket set to USED
      const unclaimedTicket = {
        ...mockActiveTicket,
        userId: null,
        entryCode: "ACCESS123",
      };

      const usedTicket = {
        ...unclaimedTicket,
        status: TicketStatus.USED,
      };

      (prismaService.tickets.findFirst as jest.Mock)
        .mockResolvedValueOnce(unclaimedTicket) // First attempt: find unclaimed ticket
        .mockResolvedValueOnce(usedTicket); // First attempt: reload after update
      (prismaService.tickets.findUnique as jest.Mock).mockResolvedValueOnce(usedTicket); // First attempt: reload after update
      (prismaService.tickets.update as jest.Mock).mockResolvedValue(usedTicket);
      (prismaService.entities.findUnique as jest.Mock).mockResolvedValue({
        id: "entity-123",
        name: "Test Entity",
        slug: "test-entity",
        status: "ACTIVE",
      });

      const dto: GenerateTokenDto = {
        eventId: mockEventId,
        streamRole: StreamRole.VIEWER,
        accessCode: "ACCESS123",
      };

      const unauthenticatedUser = { id: "", email: undefined };

      // First redemption should succeed and burn ticket
      await service.generateToken(dto, unauthenticatedUser);
      expect(prismaService.tickets.update).toHaveBeenCalledWith({
        where: { id: unclaimedTicket.id },
        data: { status: "USED" },
      });

      // Reset mocks for second attempt
      jest.clearAllMocks();
      (prismaService.streaming_sessions.findFirst as jest.Mock).mockResolvedValue(mockActiveSession);
      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(mockLiveEvent);
      // Second attempt: ticket is now USED, so findFirst should still find it (entryCode still exists)
      (prismaService.tickets.findFirst as jest.Mock).mockResolvedValue(usedTicket);
      (prismaService.entities.findUnique as jest.Mock).mockResolvedValue({
        id: "entity-123",
        name: "Test Entity",
        slug: "test-entity",
        status: "ACTIVE",
      });

      // Second attempt should fail - ticket is USED (status check will catch it)
      await expect(service.generateToken(dto, unauthenticatedUser)).rejects.toThrow(ForbiddenException);
      await expect(service.generateToken(dto, unauthenticatedUser)).rejects.toThrow(
        "Ticket is used",
      );
    });
  });

  describe("BROADCASTER Authorization (unchanged)", () => {
    beforeEach(() => {
      (prismaService.streaming_sessions.findFirst as jest.Mock).mockResolvedValue(mockActiveSession);
      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(mockLiveEvent);
      (prismaService.entities.findUnique as jest.Mock).mockResolvedValue({
        id: "entity-123",
        name: "Test Entity",
        status: "ACTIVE",
      });
    });

    it("should successfully generate token for BROADCASTER without ticket", async () => {
      const dto: GenerateTokenDto = {
        eventId: mockEventId,
        streamRole: StreamRole.BROADCASTER,
        // No ticket required for BROADCASTER
      };

      const result = await service.generateToken(dto, mockUser);

      expect(result).toHaveProperty("token");
      expect(result.token).toBe("mock-jwt-token");

      // Verify BROADCASTER has full permissions
      expect(AccessToken).toHaveBeenCalled();
      const tokenInstance = (AccessToken as jest.Mock).mock.results[
        (AccessToken as jest.Mock).mock.results.length - 1
      ].value;
      expect(tokenInstance.addGrant).toHaveBeenCalledWith(
        expect.objectContaining({
          room: `event-${mockEventId.toLowerCase()}`,
          roomJoin: true,
          canPublish: true, // BROADCASTER can publish
          canSubscribe: true,
          canPublishData: true, // BROADCASTER can publish data
        }),
      );

      // Verify ticket queries were NOT called for BROADCASTER
      expect(prismaService.tickets.findUnique).not.toHaveBeenCalled();
      expect(prismaService.tickets.findFirst).not.toHaveBeenCalled();
    });

    it("should allow BROADCASTER token generation for PRE_LIVE event", async () => {
      const preLiveEvent = {
        ...mockLiveEvent,
        phase: EventPhase.PRE_LIVE,
      };

      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(preLiveEvent);

      const dto: GenerateTokenDto = {
        eventId: mockEventId,
        streamRole: StreamRole.BROADCASTER,
      };

      const result = await service.generateToken(dto, mockUser);

      expect(result).toHaveProperty("token");
      // BROADCASTER can get tokens in PRE_LIVE and LIVE (not POST_LIVE)
    });
  });

  describe("Error handling", () => {
    it("should auto-create session when none exists for LIVE viewer with valid ticket", async () => {
      (prismaService.streaming_sessions.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.streaming_sessions.create as jest.Mock).mockResolvedValue({
        ...mockActiveSession,
        id: "new-session-id",
      });
      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(mockLiveEvent);
      (prismaService.tickets.findUnique as jest.Mock).mockResolvedValue(mockActiveTicket);
      (prismaService.entities.findUnique as jest.Mock).mockResolvedValue({
        id: "entity-123",
        name: "Test Entity",
        status: "ACTIVE",
      });

      const dto: GenerateTokenDto = {
        eventId: mockEventId,
        streamRole: StreamRole.VIEWER,
        ticketId: mockActiveTicket.id,
      };

      const result = await service.generateToken(dto, mockUser);
      expect(result).toHaveProperty("token");
      expect(prismaService.streaming_sessions.create).toHaveBeenCalled();
    });

    it("should throw NotFoundException when event is not found", async () => {
      (prismaService.streaming_sessions.findFirst as jest.Mock).mockResolvedValue(mockActiveSession);
      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(null);

      const dto: GenerateTokenDto = {
        eventId: mockEventId,
        streamRole: StreamRole.VIEWER,
        ticketId: mockActiveTicket.id,
      };

      await expect(service.generateToken(dto, mockUser)).rejects.toThrow(NotFoundException);
      await expect(service.generateToken(dto, mockUser)).rejects.toThrow("Event not found");
    });
  });

  /**
   * Event Phase Validation Tests
   * 
   * Tests generateToken() behavior across all event phases.
   * 
   * Note: DRAFT is an EventStatus, not an EventPhase. The actual EventPhase values are:
   * - PRE_LIVE: Event is scheduled but not yet live
   * - LIVE: Event is currently live and streaming
   * - POST_LIVE: Event has ended
   * 
   * We test all valid phases plus null/undefined edge cases.
   */
  describe("Event Phase Validation - generateToken()", () => {
    const mockEntityId = "entity-123";
    const mockCreatorUserId = "creator-user-123";
    const mockEventId = "event-phase-test-123";
    const mockSessionId = "session-phase-test-123";

    const mockActiveEntity = {
      id: mockEntityId,
      name: "Test Entity",
      status: "ACTIVE",
    };

    const mockCreatorUser = {
      id: mockCreatorUserId,
      email: "creator@example.com",
    };

    beforeEach(() => {
      // Setup common mocks
      (prismaService.entities.findUnique as jest.Mock).mockResolvedValue(mockActiveEntity);
      (prismaService.streaming_sessions.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.streaming_sessions.create as jest.Mock).mockImplementation(({ data }) => {
        return Promise.resolve({
          id: mockSessionId,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    });

    describe("PRE_LIVE phase", () => {
      it("should allow BROADCASTER token for PRE_LIVE and auto-create session", async () => {
        const preLiveEvent = {
          id: mockEventId,
          name: "Test Event",
          phase: EventPhase.PRE_LIVE,
          entityId: mockEntityId,
          geoRestricted: false,
        };

        (prismaService.events.findUnique as jest.Mock).mockResolvedValue(preLiveEvent);

        const dto: GenerateTokenDto = {
          eventId: mockEventId,
          streamRole: StreamRole.BROADCASTER,
        };

        const result = await service.generateToken(dto, mockCreatorUser);

        expect(result).toHaveProperty("token");
        expect(result.token).toBe("mock-jwt-token");
        expect(prismaService.streaming_sessions.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            eventId: mockEventId,
            entityId: mockEntityId,
            active: true,
          }),
        });
      });
    });

    describe("LIVE phase", () => {
      it("should successfully generate token for LIVE event and auto-create session", async () => {
        const liveEvent = {
          id: mockEventId,
          name: "Test Event",
          phase: EventPhase.LIVE,
          entityId: mockEntityId,
          geoRestricted: false,
        };

        (prismaService.events.findUnique as jest.Mock).mockResolvedValue(liveEvent);

        const dto: GenerateTokenDto = {
          eventId: mockEventId,
          streamRole: StreamRole.BROADCASTER,
        };

        const result = await service.generateToken(dto, mockCreatorUser);

        // Verify token was returned
        expect(result).toHaveProperty("token");
        expect(result.token).toBe("mock-jwt-token");

        // Verify session was auto-created
        expect(prismaService.streaming_sessions.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            eventId: mockEventId,
            entityId: mockEntityId,
            active: true,
          }),
        });
      });

      it("should reuse existing active session for LIVE event", async () => {
        const liveEvent = {
          id: mockEventId,
          name: "Test Event",
          phase: EventPhase.LIVE,
          entityId: mockEntityId,
          geoRestricted: false,
        };

        const existingSession = {
          id: mockSessionId,
          eventId: mockEventId,
          entityId: mockEntityId,
          roomId: `event-${mockEventId.toLowerCase()}`,
          sessionKey: "existing-key",
          active: true,
          geoRegions: [],
        };

        (prismaService.events.findUnique as jest.Mock).mockResolvedValue(liveEvent);
        (prismaService.streaming_sessions.findFirst as jest.Mock).mockResolvedValue(existingSession);

        const dto: GenerateTokenDto = {
          eventId: mockEventId,
          streamRole: StreamRole.BROADCASTER,
        };

        const result = await service.generateToken(dto, mockCreatorUser);

        // Verify token was returned
        expect(result).toHaveProperty("token");
        expect(result.token).toBe("mock-jwt-token");

        // Verify no new session was created (reused existing)
        expect(prismaService.streaming_sessions.create).not.toHaveBeenCalled();
      });
    });

    describe("POST_LIVE phase", () => {
      it("should throw ForbiddenException for POST_LIVE event", async () => {
        const postLiveEvent = {
          id: mockEventId,
          name: "Test Event",
          phase: EventPhase.POST_LIVE,
          entityId: mockEntityId,
          geoRestricted: false,
        };

        (prismaService.events.findUnique as jest.Mock).mockResolvedValue(postLiveEvent);

        const dto: GenerateTokenDto = {
          eventId: mockEventId,
          streamRole: StreamRole.BROADCASTER,
        };

        await expect(service.generateToken(dto, mockCreatorUser)).rejects.toThrow(ForbiddenException);
        await expect(service.generateToken(dto, mockCreatorUser)).rejects.toThrow(
          "Event is not live yet",
        );

        // Verify no session was created
        expect(prismaService.streaming_sessions.create).not.toHaveBeenCalled();
      });
    });

    describe("Invalid/null phase", () => {
      it("should throw ForbiddenException when event phase is null or undefined", async () => {
        const eventWithNullPhase = {
          id: mockEventId,
          name: "Test Event",
          phase: null as any,
          entityId: mockEntityId,
          geoRestricted: false,
        };

        (prismaService.events.findUnique as jest.Mock).mockResolvedValue(eventWithNullPhase);

        const dto: GenerateTokenDto = {
          eventId: mockEventId,
          streamRole: StreamRole.BROADCASTER,
        };

        await expect(service.generateToken(dto, mockCreatorUser)).rejects.toThrow(ForbiddenException);
        await expect(service.generateToken(dto, mockCreatorUser)).rejects.toThrow(
          "Event is not live yet",
        );

        // Verify no session was created
        expect(prismaService.streaming_sessions.create).not.toHaveBeenCalled();
      });
    });

    describe("Session creation enforcement", () => {
      it("should NOT create session for POST_LIVE event", async () => {
        const postLiveEvent = {
          id: mockEventId,
          name: "Test Event",
          phase: EventPhase.POST_LIVE,
          entityId: mockEntityId,
          geoRestricted: false,
        };

        (prismaService.events.findUnique as jest.Mock).mockResolvedValue(postLiveEvent);

        const dto: GenerateTokenDto = {
          eventId: mockEventId,
          streamRole: StreamRole.BROADCASTER,
        };

        await expect(service.generateToken(dto, mockCreatorUser)).rejects.toThrow(ForbiddenException);

        // Verify no session was created
        expect(prismaService.streaming_sessions.create).not.toHaveBeenCalled();
      });
    });
  });
});

