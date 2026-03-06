import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateSessionDto,
  UpdateMetricsDto,
  ValidateGeofenceDto,
} from "./dto";
import {
  EntityRoleType,
  EventPhase,
  EventStatus,
  UserRole,
  Prisma,
} from "@prisma/client";
import { RoomServiceClient, AccessToken } from "livekit-server-sdk";
import { GeofenceValidationResult } from "./interfaces/streaming.interface";
import { User } from "../../shared/types/user.types";
import { randomUUID } from "crypto";
import { GenerateTokenDto, StreamRole } from "./dto/generate-token.dto";
import { AccessLevel } from "./dto/create-session.dto";

type UserAuth = {
  id: string;
  email?: string;
};


@Injectable()
export class StreamingService {
  private roomService: RoomServiceClient | null = null;
  private livekitApiKey: string;
  private livekitApiSecret: string;
  private livekitUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.livekitApiKey = this.configService.get<string>("LIVEKIT_API_KEY") || "";
    this.livekitApiSecret =
      this.configService.get<string>("LIVEKIT_API_SECRET") || "";
    this.livekitUrl = this.configService.get<string>("LIVEKIT_URL") || "";

    if (this.livekitUrl) {
      this.roomService = new RoomServiceClient(
        this.livekitUrl,
        this.livekitApiKey,
        this.livekitApiSecret,
      );
    }
  }

  // -------------------------------------------------------------------
  // CREATE STREAMING SESSION
  // -------------------------------------------------------------------
  async createSession(
    eventId: string,
    createSessionDto: CreateSessionDto,
    userId: string,
    userRole: UserRole,
  ) {
    const { accessLevel, metadata, geoRegions } = createSessionDto;

    // 1) Validate event
    const event = await (this.prisma as any).events.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      console.error("[createSession] BLOCKED", {
        reason: "Event not found",
        eventId,
        userId,
        role: userRole,
        dto: createSessionDto,
        eventStatus: undefined,
        eventOwnerId: undefined,
        existingSessionId: undefined,
        existingSessionActive: undefined,
      });
      throw new NotFoundException("Event not found");
    }

    // Domain Rule: Only ACTIVE entities can create streaming sessions
    const entity = await (this.prisma as any).entities.findUnique({
      where: { id: event.entityId },
      select: { status: true, name: true },
    });

    if (!entity) {
      throw new NotFoundException(`Entity ${event.entityId} not found`);
    }

    const entityStatus = String(entity.status);
    if (entityStatus !== "ACTIVE") {
      throw new ForbiddenException(
        `Entity "${entity.name}" is ${entityStatus}. Only ACTIVE entities can create streaming sessions.`
      );
    }

    // 2) Permissions: entity owner, coordinator, or admin
    // Check for existing session before permissions check to get existingSession data for logging
    const existingSession = await (this.prisma as any).streaming_sessions.findFirst(
      {
        where: {
          eventId,
          active: true,
        },
      },
    );

    // Look up entity to get ownerId for logging (safe lookup - may fail if entity doesn't exist)
    let entityOwnerId: string | undefined;
    try {
      const entityForOwner = await (this.prisma as any).entities.findUnique({
        where: { id: event.entityId },
        select: { ownerId: true },
      });
      entityOwnerId = entityForOwner?.ownerId;
    } catch (error) {
      // Entity lookup failed - will be handled by checkEventPermissions
      entityOwnerId = undefined;
    }

    try {
      await this.checkEventPermissions(event, userId, userRole);
    } catch (error) {
      console.error("[createSession] BLOCKED", {
        reason: error instanceof ForbiddenException 
          ? "Permission denied - user lacks required permissions"
          : error instanceof NotFoundException
          ? "Entity not found during permission check"
          : "Permission check failed",
        eventId,
        userId,
        role: userRole,
        dto: createSessionDto,
        eventStatus: event?.status,
        eventOwnerId: entityOwnerId,
        existingSessionId: existingSession?.id,
        existingSessionActive: existingSession?.active,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    // 3) Ensure no other active session for this event
    if (existingSession) {
      console.error("[createSession] BLOCKED", {
        reason: "Event already has an active streaming session",
        eventId,
        userId,
        role: userRole,
        dto: createSessionDto,
        eventStatus: event?.status,
        eventOwnerId: entityOwnerId,
        existingSessionId: existingSession?.id,
        existingSessionActive: existingSession?.active,
      });
      throw new BadRequestException({
        code: "ACTIVE_SESSION_EXISTS",
        message: "Event already has an active streaming session",
      });
          }

    // 4) Create LiveKit room (optional if LiveKit not configured)
    // Room name is deterministic: event-${eventId} (lowercase, no variation)
    // One event = one LiveKit room
    const roomId = `event-${eventId.toLowerCase()}`;
    const sessionKey = this.generateSessionKey();

    let livekitRoom: any;
    if (this.roomService) {
      try {
        livekitRoom = await this.roomService.createRoom({
          name: roomId,
          emptyTimeout: 600, // 10 minutes
          maxParticipants: 10000,
        });
      } catch (error) {
        // In production you might throw instead – for now, degrade gracefully
        console.warn(
          "LiveKit room creation failed, continuing without LiveKit:",
          error,
        );
      }
    }

    // 5) Create streaming session record (Prisma 7: use relation connect)
    const session = await this.prisma.streaming_sessions.create({
      data: {
        id: randomUUID(),
        events: { connect: { id: eventId } },
        entities: { connect: { id: event.entityId } },
        roomId,
        sessionKey,
        accessLevel: accessLevel || AccessLevel.PUBLIC,
        metrics: (metadata || {}) as Prisma.InputJsonValue,
        geoRegions: geoRegions ?? [],
        active: true,
        updatedAt: new Date(),
      },
    });

    // 6) Optionally bump event to LIVE phase
    // Using string coercion to avoid enum mismatch
    const eventPhase = String(event.phase);
    const eventStatus = String(event.status);
    if (eventPhase !== "LIVE" && eventStatus === "SCHEDULED") {
      await (this.prisma as any).events.update({
        where: { id: eventId },
        data: {
          phase: "LIVE" as EventPhase,
          status: "LIVE" as EventStatus,
          lastLaunchedBy: userId,
        },
      });
    }

    // 7) Attach minimal event + entity info to match your expected shape
    const entityInfo = await (this.prisma as any).entities.findUnique({
      where: { id: event.entityId },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    return {
      ...session,
      event: {
        id: event.id,
        name: event.name,
        phase: event.phase,
        status: event.status,
      },
      entity: entityInfo,
    };
  }

  async generateToken(dto: GenerateTokenDto, user: { id: string; email?: string }) {
    const {
      eventId,
      streamRole,
      identity,
      country,
      state,
      city,
      timezone,
    } = dto;

    // 1) Load event first (needed for both session check and auto-creation)
    const event = await (this.prisma as any).events.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      console.error("[generateToken] BLOCKED: Event not found", {
        eventId,
        userId: user.id,
        streamRole,
      });
      throw new NotFoundException("Event not found");
    }

    // 2) Enforce event phase gate - only LIVE events can generate tokens
    const eventPhase = String(event.phase);
    if (eventPhase !== "LIVE") {
      console.error("[generateToken] BLOCKED: Event is not LIVE", {
        eventId,
        eventPhase,
        userId: user.id,
        streamRole,
      });
      throw new ForbiddenException("Event is not live yet");
    }

    // 3) Active session is source of truth - enforce max one ACTIVE session per event
    // Query for existing active session first
    let session = await (this.prisma as any).streaming_sessions.findFirst({
      where: {
        eventId: event.id,
        active: true,
      },
    });
    
    if (!session) {
      // ✅ Enforce max one ACTIVE session: Double-check before creation to handle race conditions
      // Another request might have created a session between our check and creation
      const existingSession = await (this.prisma as any).streaming_sessions.findFirst({
        where: {
          eventId: event.id,
          active: true,
        },
      });
      
      if (existingSession) {
        // Session was created by another request - reuse it
        console.log("[generateToken] Active session found after re-check, reusing existing session", {
          sessionId: existingSession.id,
          eventId,
          userId: user.id,
          streamRole,
        });
        session = existingSession;
      } else {
        // No active session exists - create one
        console.log("[generateToken] No active session found, auto-creating session", {
          eventId,
          userId: user.id,
          streamRole,
        });
        
        const roomId = `event-${eventId.toLowerCase()}`;
        const sessionKey = this.generateSessionKey();
        
        session = await this.prisma.streaming_sessions.create({
          data: {
            id: randomUUID(),
            events: { connect: { id: event.id } },
            entities: { connect: { id: event.entityId } },
            roomId,
            sessionKey,
            accessLevel: AccessLevel.PUBLIC,
            metrics: {} as Prisma.InputJsonValue,
            geoRegions: [],
            active: true,
            updatedAt: new Date(),
          },
        });
        
        console.log("[generateToken] Session auto-created successfully", {
          sessionId: session.id,
          eventId,
          userId: user.id,
        });
      }
    } else {
      // Active session exists - reuse it
      console.log("[generateToken] Reusing existing active session", {
        sessionId: session.id,
        eventId,
        userId: user.id,
        streamRole,
      });
    }

    // Domain Rule: Only ACTIVE entities can generate streaming tokens
    const entity = await (this.prisma as any).entities.findUnique({
      where: { id: event.entityId },
      select: { status: true, name: true },
    });

    if (!entity) {
      console.error("[generateToken] BLOCKED: Entity not found", {
        eventId,
        entityId: event.entityId,
        userId: user.id,
        streamRole,
      });
      throw new NotFoundException(`Entity ${event.entityId} not found`);
    }

    const entityStatus = String(entity.status);
    if (entityStatus !== "ACTIVE") {
      console.error("[generateToken] BLOCKED: Entity not ACTIVE", {
        eventId,
        entityId: event.entityId,
        entityName: entity.name,
        entityStatus,
        userId: user.id,
        streamRole,
      });
      throw new ForbiddenException(
        `Entity "${entity.name}" is ${entityStatus}. Only ACTIVE entities can generate streaming tokens.`
      );
    }
  
    // 4) Role-based authorization - split by streamRole
    // Note: eventPhase is already validated as "LIVE" above, but we keep the variable for consistency

    // Declare ticket in function scope so it's accessible after the if/else blocks
    let ticket: any = null;

    if (streamRole === StreamRole.BROADCASTER) {
      // ✅ BROADCASTER authorization - existing logic unchanged
      // Broadcasters can create tokens regardless of phase (handled by session creation)
      // No additional checks needed here - session existence is sufficient
    } else if (streamRole === StreamRole.VIEWER) {
      // ⚠️ STRICT RULE: ALL VIEWER access requires a valid ticket (FREE, GIFTED, or PAID)
      // There is NO public or anonymous viewer access. Every viewer must have a valid ticket.
      
      // Phase enforcement: viewers only when LIVE
      if (eventPhase !== "LIVE") {
        throw new ForbiddenException("Event is not live");
      }

      // Code of Conduct consent check (required for authenticated users joining LIVE events)
      if (user.id) {
        const { checkCodeOfConductConsent } = await import("../../common/helpers/consent.helper");
        await checkCodeOfConductConsent(this.prisma, user.id);
      }

      // ⚠️ MANDATORY: Ticket ID or access code is REQUIRED for ALL viewers
      // No exceptions - this applies regardless of event.ticketRequired setting
      if (!dto.ticketId && !dto.accessCode) {
        throw new ForbiddenException("Valid ticket required for viewer access. Please provide a ticket ID or access code.");
      }

      // Validate ticket - must exist, be ACTIVE, and match the event

      if (dto.ticketId) {
        ticket = await (this.prisma as any).tickets.findUnique({
          where: { id: dto.ticketId },
          include: {
            registrations: true,
          },
        });
      } else if (dto.accessCode) {
        // Check both ticket.entryCode and registration.accessCode
        ticket = await (this.prisma as any).tickets.findFirst({
          where: {
            OR: [
              { entryCode: dto.accessCode },
              {
                registrations: {
                  accessCode: dto.accessCode,
                },
              },
            ],
            eventId,
          },
          include: {
            registrations: true,
          },
        });
      }

      // Ticket must exist
      if (!ticket) {
        throw new ForbiddenException("Invalid ticket or access code. No ticket found with the provided credentials.");
      }

      // Ticket must be for the correct event
      if (ticket.eventId !== eventId) {
        throw new ForbiddenException("Ticket is for a different event");
      }

      // Ticket must be ACTIVE (FREE, GIFTED, and PAID tickets all require ACTIVE status)
      if (ticket.status !== "ACTIVE") {
        throw new ForbiddenException(`Ticket is ${ticket.status.toLowerCase()}. Only active tickets are valid for streaming access.`);
      }

      // If ticket is linked to a registration, verify registration is REGISTERED
      if (ticket.registrationId) {
        const registration = await (this.prisma as any).event_registrations.findUnique({
          where: { id: ticket.registrationId },
        });

        if (!registration || registration.status !== "REGISTERED") {
          throw new ForbiddenException("Ticket registration is not active. Please complete your registration.");
        }
      }

      // ✅ Ticket validation complete
      // FREE, GIFTED, and PAID tickets are all treated equally for authorization
      // All that matters is: ticket exists, is ACTIVE, and matches the event

      // ⚠️ STRICT SINGLE-USE TICKET REDEMPTION
      // Enforce single-use ticket authorization rules

      // Blocking rules (mandatory checks before redemption)
      // 1. Ticket must be ACTIVE (already checked above, but re-verify for safety)
      if (ticket.status !== "ACTIVE") {
        throw new ForbiddenException(`Ticket is ${ticket.status.toLowerCase()}. Only active tickets are valid for streaming access.`);
      }

      // 2. If accessCode is provided AND ticket.userId exists → Forbidden (check accessCode first)
      // (Access code cannot be used if ticket is already bound to a user)
      if (dto.accessCode && ticket.userId) {
        throw new ForbiddenException("This access code has already been redeemed.");
      }

      // 3. If ticket.userId exists and does not match current user → Forbidden
      if (ticket.userId && ticket.userId !== user.id) {
        throw new ForbiddenException("This ticket has already been claimed by another user.");
      }

      // 4. If accessCode is reused (ticket.entryCode is null but accessCode was used) → Forbidden
      // This is handled by checking if ticket.userId exists when accessCode is provided (rule 3 above)

      // REDEMPTION LOGIC
      // Priority: Access code redemption first (burns ticket), then logged-in redemption (binds ticket)
      
      // Case 1: Access-code redemption (unauthenticated or when accessCode is explicitly provided)
      // If viewer uses accessCode and ticket.userId is NULL, burn the ticket (single use)
      if (dto.accessCode && !ticket.userId) {
        await (this.prisma as any).tickets.update({
          where: { id: ticket.id },
          data: {
            status: "USED", // Burn the ticket - single use only
          },
        });

        // Reload ticket to get updated status
        ticket = await (this.prisma as any).tickets.findUnique({
          where: { id: ticket.id },
          include: {
            registrations: true,
          },
        });
      }
      // Case 2: Logged-in viewer redemption (via ticketId, not accessCode)
      // If user is authenticated and ticket.userId is NULL, bind ticket to user and invalidate access code
      else if (user?.id && user.id.trim() !== "" && dto.ticketId && !ticket.userId) {
        await (this.prisma as any).tickets.update({
          where: { id: ticket.id },
          data: {
            app_users: { connect: { id: user.id } },
            entryCode: null, // Invalidate access code
            // Ticket remains ACTIVE - same user can re-enter later
          },
        });

        // Reload ticket to get updated userId
        ticket = await (this.prisma as any).tickets.findUnique({
          where: { id: ticket.id },
          include: {
            registrations: true,
          },
        });
      }
      // Case 3: Re-entry by same user (ticket.userId matches user.id)
      // No redemption needed - ticket already bound to this user
      // Ticket remains ACTIVE, user can re-enter
      // (This case is handled by the blocking rules above - if ticket.userId === user.id, we allow access)
    } else {
      throw new BadRequestException(`Invalid streamRole: ${streamRole}`);
    }
  
    // 4) Geofence check (applies to both BROADCASTER and VIEWER)
    if (event.geoRestricted || (session.geoRegions?.length ?? 0) > 0) {
      const result = await this.validateGeofence({
        sessionId: session.id,
        country: dto.country,
        state: dto.state,
        city: dto.city,
        timezone: dto.timezone,
      });
      if (!result.allowed) {
        console.error("[generateToken] BLOCKED: Geofence restriction", {
          eventId,
          entityId: event.entityId,
          userId: user.id,
          streamRole,
          geoRestricted: event.geoRestricted,
          geoRegions: session.geoRegions,
          userLocation: { country: dto.country, state: dto.state, city: dto.city },
          reason: result.reason,
        });
        throw new ForbiddenException(result.reason ?? "Access denied due to geographic restrictions");
      }
    }
  
    // 5) Compute room name deterministically: event-${eventId} (lowercase)
    // Room name is ONLY computed in backend, never in frontend
    // One event = one LiveKit room
    const roomName = `event-${eventId.toLowerCase()}`;
  
    // 6) Token grants - role-based permissions
    const participantIdentity = identity || user.id;
  
    const at = new AccessToken(this.livekitApiKey, this.livekitApiSecret, {
      identity: participantIdentity,
    });
  
    // ✅ VIEWER tokens are read-only (canSubscribe only)
    // ✅ BROADCASTER tokens have full permissions (canPublish, canPublishData)
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: streamRole === StreamRole.BROADCASTER,
      canSubscribe: true,
      canPublishData: streamRole === StreamRole.BROADCASTER,
    });
  
    // ✅ Generate JWT token and validate before returning
    const jwtToken = await at.toJwt() as unknown as string;
    
    // Validate token is a non-empty string
    if (typeof jwtToken !== "string" || !jwtToken.length) {
      console.error("[generateToken] LiveKit token generation failed:", {
        tokenType: typeof jwtToken,
        tokenValue: jwtToken,
        hasApiKey: !!this.livekitApiKey,
        hasApiSecret: !!this.livekitApiSecret,
        apiKeyLength: this.livekitApiKey?.length || 0,
        apiSecretLength: this.livekitApiSecret?.length || 0,
        eventId,
        participantIdentity,
        roomName,
      });
      throw new InternalServerErrorException("LiveKit token generation failed");
    }

    // Phase 2B: Track stream entry for VIEWER role (idempotent, non-blocking)
    // This enables reminder notifications to exclude users who already joined
    if (streamRole === StreamRole.VIEWER && ticket) {
      // Track joinedAt timestamp (idempotent - only set if not already set)
      // This does NOT affect authorization - it's purely for reminder tracking
      try {
        if (!ticket.joinedAt) {
          await (this.prisma as any).tickets.update({
            where: { id: ticket.id },
            data: { joinedAt: new Date() },
          });
        }
      } catch (error) {
        // Log but don't throw - tracking failure must not block token generation
        console.error(`[generateToken] Failed to track joinedAt for ticket ${ticket.id}:`, error);
      }
    }
  
    // ✅ Single-token authorization model: return ONLY the JWT token string
    // The token embeds room name and permissions - frontend never receives roomName or livekitUrl
    return {
      token: jwtToken,
    };
  }
  // -------------------------------------------------------------------
  // END SESSION
  // -------------------------------------------------------------------
  async endSession(sessionId: string, userId: string, userRole: UserRole) {
    const session = await (this.prisma as any).streaming_sessions.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException("Streaming session not found");
    }

    const event = await (this.prisma as any).events.findUnique({
      where: { id: session.eventId },
    });

    if (!event) {
      throw new NotFoundException("Event not found for this session");
    }

    // Permission check
    await this.checkEventPermissions(event, userId, userRole);

    // Try to end room in LiveKit
    if (this.roomService) {
      try {
        await this.roomService.deleteRoom(session.roomId);
      } catch (error) {
        console.warn("LiveKit room deletion failed:", error);
      }
    }

    // Mark session inactive
    const updatedSession = await (this.prisma as any).streaming_sessions.update(
      {
        where: { id: sessionId },
        data: {
          active: false,
          endTime: new Date(),
        },
      },
    );

    // Update event to POST_LIVE / COMPLETED
    // Using string literals with type assertions to avoid enum mismatch
    await (this.prisma as any).events.update({
      where: { id: session.eventId },
      data: {
        phase: "POST_LIVE" as EventPhase,
        status: "COMPLETED" as EventStatus,
        lastLaunchedBy: userId,
      },
    });

    const entity = await (this.prisma as any).entities.findUnique({
      where: { id: session.entityId },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    return {
      ...updatedSession,
      event: {
        id: event.id,
        name: event.name,
        phase: event.phase,
        status: event.status,
      },
      entity,
    };
  }

  // -------------------------------------------------------------------
  // LIST ACTIVE SESSIONS
  // -------------------------------------------------------------------
  async getActiveSessions() {
    const sessions = await (this.prisma as any).streaming_sessions.findMany({
      where: {
        active: true,
      },
      orderBy: { startTime: "desc" },
    });

    if (sessions.length === 0) {
      return [];
    }

    const eventIds = Array.from(
      new Set(sessions.map((s: any) => s.eventId).filter(Boolean)),
    );
    const entityIds = Array.from(
      new Set(sessions.map((s: any) => s.entityId).filter(Boolean)),
    );

    const [events, entities] = await Promise.all([
      (this.prisma as any).events.findMany({
        where: { id: { in: eventIds } },
        select: {
          id: true,
          name: true,
          thumbnail: true,
          phase: true,
          status: true,
          startTime: true,
        },
      }),
      (this.prisma as any).entities.findMany({
        where: { id: { in: entityIds } },
        select: {
          id: true,
          name: true,
          slug: true,
          thumbnail: true,
        },
      }),
    ]);

    const eventMap = new Map(events.map((e: any) => [e.id, e]));
    const entityMap = new Map(entities.map((e: any) => [e.id, e]));

    return sessions.map((s: any) => ({
      ...s,
      event: eventMap.get(s.eventId) || null,
      entity: entityMap.get(s.entityId) || null,
    }));
  }

  // -------------------------------------------------------------------
  // SESSION DETAILS
  // -------------------------------------------------------------------
  async getSessionDetails(id: string) {
    const session = await (this.prisma as any).streaming_sessions.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException("Streaming session not found");
    }

    const [event, entity] = await Promise.all([
      (this.prisma as any).events.findUnique({
        where: { id: session.eventId },
        select: {
          id: true,
          name: true,
          description: true,
          thumbnail: true,
          phase: true,
          status: true,
          startTime: true,
          endTime: true,
        },
      }),
      (this.prisma as any).entities.findUnique({
        where: { id: session.entityId },
        select: {
          id: true,
          name: true,
          slug: true,
          thumbnail: true,
          type: true,
          isVerified: true,
        },
      }),
    ]);

    if (!event) {
      throw new NotFoundException("Event not found for this session");
    }

    // LiveKit room stats
    let roomStats: any = null;
    if (this.roomService) {
      try {
        const rooms = await this.roomService.listRooms([session.roomId]);
        if (rooms && rooms.length > 0) {
          const room = rooms[0] as any;
          roomStats = {
            numParticipants: room.numParticipants || 0,
            creationTime: room.creationTime,
            emptyTimeout: room.emptyTimeout,
          };
        }
      } catch (error) {
        console.warn("Failed to get LiveKit room stats:", error);
      }
    }

    const startTime = session.startTime || event.startTime;
    const endTime = session.endTime || event.endTime || null;

    const duration = startTime
      ? endTime
        ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
        : Math.floor((Date.now() - startTime.getTime()) / 1000)
      : null;

    const metrics =
      ((session.metrics as Record<string, unknown>) || {}) as Record<
        string,
        unknown
      >;

    return {
      ...session,
      event,
      entity,
      duration,
      roomStats,
      metrics: {
        viewers: session.viewers,
        ...metrics,
      },
    };
  }

  // -------------------------------------------------------------------
  // UPDATE METRICS
  // -------------------------------------------------------------------
  async updateMetrics(
    sessionId: string,
    updateMetricsDto: UpdateMetricsDto,
    userId: string,
  ) {
    const session = await (this.prisma as any).streaming_sessions.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException("Streaming session not found");
    }

    const currentMetrics =
      ((session.metrics as Record<string, unknown>) ||
        {}) as Record<string, any>;

    const updatedMetrics: Record<string, any> = {
      ...currentMetrics,
      ...(updateMetricsDto.customMetrics || {}),
      viewers:
        updateMetricsDto.viewers !== undefined
          ? updateMetricsDto.viewers
          : currentMetrics.viewers || 0,
      participants:
        updateMetricsDto.participants !== undefined
          ? updateMetricsDto.participants
          : currentMetrics.participants || 0,
      messages:
        updateMetricsDto.messages !== undefined
          ? updateMetricsDto.messages
          : currentMetrics.messages || 0,
      reactions:
        updateMetricsDto.reactions !== undefined
          ? updateMetricsDto.reactions
          : currentMetrics.reactions || 0,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };

    const updated = await (this.prisma as any).streaming_sessions.update({
      where: { id: sessionId },
      data: {
        metrics: updatedMetrics as Prisma.InputJsonValue,
        viewers:
          updateMetricsDto.viewers !== undefined
            ? updateMetricsDto.viewers
            : session.viewers,
      },
    });

    return updated;
  }

  // -------------------------------------------------------------------
  // VALIDATE GEOFENCE
  // -------------------------------------------------------------------
  async validateGeofence(
    validateGeofenceDto: ValidateGeofenceDto,
  ): Promise<GeofenceValidationResult> {
    const { sessionId, country, state, city, timezone } = validateGeofenceDto;

    const session = await (this.prisma as any).streaming_sessions.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException("Streaming session not found");
    }

    const event = await (this.prisma as any).events.findUnique({
      where: { id: session.eventId },
      include: {
        geofencing: true,
      },
    });

    if (!event) {
      throw new NotFoundException("Event not found for this session");
    }

    const geofencing = event.geofencing;

    if (!geofencing || session.geoRegions.length === 0) {
      // No geofencing restrictions
      return { allowed: true };
    }

    const regions =
      session.geoRegions.length > 0 ? session.geoRegions : geofencing.regions;
    const type = geofencing.type;

    const userRegions: string[] = [];
    if (country) userRegions.push(`country:${country}`);
    if (state) userRegions.push(`state:${state}`);
    if (city) userRegions.push(`city:${city}`);
    if (timezone) {
      const tzMap: Record<string, string> = {
        "America/New_York": "EST",
        "America/Chicago": "CST",
        "America/Denver": "MST",
        "America/Los_Angeles": "PST",
      };
      const tzShort =
        tzMap[timezone] ||
        timezone.split("/").pop()?.toUpperCase() ||
        timezone;
      userRegions.push(`timezone:${tzShort}`);
    }

    const matches = regions.filter((region: string) => {
      if (region === "region:international") {
        return country && country !== "US";
      }
      if (region === "global") {
        return true;
      }

      return userRegions.some((userRegion) => {
        if (userRegion === region) return true;

        const [userType] = userRegion.split(":");
        const [regionType] = region.split(":");

        // Example rule: US country implies all US states allowed,
        // if region is any state but we only have country:US
        if (
          userType === "country" &&
          regionType === "state" &&
          country === "US"
        ) {
          return true;
        }

        return false;
      });
    });

    if (type === "ALLOWLIST") {
      return {
        allowed: matches.length > 0,
        reason:
          matches.length === 0
            ? "Access denied: Your location is not in the allowed regions"
            : undefined,
        matchedRegions: matches,
      };
    } else {
      // BLOCKLIST
      return {
        allowed: matches.length === 0,
        reason:
          matches.length > 0
            ? "Access denied: Your location is blocked"
            : undefined,
        matchedRegions: matches,
      };
    }
  }

  // -------------------------------------------------------------------
  // HELPERS
  // -------------------------------------------------------------------
  private generateSessionKey(): string {
    return `sk_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 15)}`;
  }

  private async checkEventPermissions(
    event: any,
    userId: string,
    userRole: UserRole,
  ) {
    if (userRole === UserRole.ADMIN) {
      return;
    }

    const entity = await (this.prisma as any).entities.findUnique({
      where: { id: event.entityId },
    });

    if (!entity) {
      throw new NotFoundException("Entity not found");
    }

    // Entity owner
    if (entity.ownerId === userId) {
      return;
    }

    // Coordinator
    if (event.eventCoordinatorId === userId) {
      return;
    }

    // Entity role (ADMIN / MANAGER)
    const entityRole = await (this.prisma as any).entity_roles.findUnique({
      where: {
        userId_entityId: {
          userId,
          entityId: event.entityId,
        },
      },
    });

    if (
      entityRole &&
      (entityRole.role === EntityRoleType.ADMIN ||
        entityRole.role === EntityRoleType.MANAGER)
    ) {
      return;
    }

    throw new ForbiddenException(
      "You do not have permission to manage streaming sessions for this event",
    );
  }
}
