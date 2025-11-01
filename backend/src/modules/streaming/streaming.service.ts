import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateSessionDto, GenerateTokenDto, UpdateMetricsDto, ValidateGeofenceDto, AccessLevel, ParticipantRole } from "./dto";
import { UserRole, EntityRoleType, EventPhase, EventStatus } from "@prisma/client";
import { RoomServiceClient, AccessToken } from "livekit-server-sdk";
import { GeofenceValidationResult } from "./interfaces/streaming.interface";

@Injectable()
export class StreamingService {
  private roomService: RoomServiceClient;
  private livekitApiKey: string;
  private livekitApiSecret: string;
  private livekitUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.livekitApiKey = this.configService.get<string>("LIVEKIT_API_KEY") || "";
    this.livekitApiSecret = this.configService.get<string>("LIVEKIT_API_SECRET") || "";
    this.livekitUrl = this.configService.get<string>("LIVEKIT_URL") || "";

    if (this.livekitUrl) {
      this.roomService = new RoomServiceClient(this.livekitUrl, this.livekitApiKey, this.livekitApiSecret);
    }
  }

  async createSession(createSessionDto: CreateSessionDto, userId: string, userRole: UserRole) {
    const { eventId, accessLevel, metadata, geoRegions } = createSessionDto;

    // Validate event exists
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        entity: true,
      },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    // Check permissions: Entity owner, Coordinator, or Admin
    await this.checkEventPermissions(event, userId, userRole);

    // Check if event already has an active session
    const existingSession = await this.prisma.streamingSession.findFirst({
      where: {
        eventId,
        active: true,
      },
    });

    if (existingSession) {
      throw new BadRequestException("Event already has an active streaming session");
    }

    // Generate unique room ID
    const roomId = `event-${eventId}-${Date.now()}`;
    const sessionKey = this.generateSessionKey();

    // Create LiveKit room via API
    let livekitRoom;
    try {
      livekitRoom = await this.roomService.createRoom({
        name: roomId,
        emptyTimeout: 600, // 10 minutes
        maxParticipants: 10000, // Configurable
      });
    } catch (error) {
      // If LiveKit is not configured, we'll still create the session record
      // In production, you might want to throw an error here
      console.warn("LiveKit room creation failed, continuing without LiveKit:", error);
    }

    // Create streaming session
    const session = await this.prisma.streamingSession.create({
      data: {
        eventId,
        entityId: event.entityId,
        roomId: livekitRoom?.name || roomId,
        sessionKey,
        accessLevel: accessLevel || AccessLevel.PUBLIC,
        metrics: metadata || {},
        geoRegions: geoRegions || [],
        active: true,
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            phase: true,
            status: true,
          },
        },
        entity: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Update event phase if needed (can trigger to LIVE if starting)
    if (event.phase !== EventPhase.CONCERT && event.status === EventStatus.SCHEDULED) {
      await this.prisma.event.update({
        where: { id: eventId },
        data: {
          phase: EventPhase.CONCERT,
          status: EventStatus.LIVE,
          lastLaunchedBy: userId,
        },
      });
    }

    return session;
  }

  async generateToken(eventId: string, generateTokenDto: GenerateTokenDto, userId: string) {
    const { role, identity } = generateTokenDto;

    // Find active session for event
    const session = await this.prisma.streamingSession.findFirst({
      where: {
        eventId,
        active: true,
      },
      include: {
        event: true,
      },
    });

    if (!session) {
      throw new NotFoundException("No active streaming session found for this event");
    }

    // Validate geofence if provided (check event geofencing)
    if (session.geoRegions.length > 0 || session.event.geoRestricted) {
      // Extract location from generateTokenDto if available
      const geofenceResult = await this.validateGeofence({
        sessionId: session.id,
        country: generateTokenDto.country,
        state: generateTokenDto.state,
        city: generateTokenDto.city,
        timezone: generateTokenDto.timezone,
      });

      if (!geofenceResult.allowed) {
        throw new ForbiddenException(
          geofenceResult.reason || "Access denied due to geographic restrictions",
        );
      }
    }

    // Validate access level requirements
    if (session.accessLevel === AccessLevel.REGISTERED || session.accessLevel === AccessLevel.TICKETED) {
      // Check if user has ticket (for TICKETED)
      if (session.accessLevel === AccessLevel.TICKETED) {
        const ticket = await this.prisma.ticket.findFirst({
          where: {
            userId,
            eventId,
          },
        });

        if (!ticket) {
          throw new ForbiddenException("Ticket required to access this stream");
        }
      }
    }

    // Generate LiveKit token
    const participantIdentity = identity || userId;
    const at = new AccessToken(this.livekitApiKey, this.livekitApiSecret, {
      identity: participantIdentity,
    });

    // Grant permissions based on role
    const videoGrant = {
      room: session.roomId,
      roomJoin: true,
      canPublish: role === ParticipantRole.HOST || role === ParticipantRole.COORDINATOR,
      canSubscribe: true,
      canPublishData: true,
    };

    at.addGrant(videoGrant);

    // Generate token
    const token = at.toJwt();

    return {
      token,
      roomId: session.roomId,
      wsUrl: this.livekitUrl,
      participantIdentity,
      role,
    };
  }

  async endSession(sessionId: string, userId: string, userRole: UserRole) {
    const session = await this.prisma.streamingSession.findUnique({
      where: { id: sessionId },
      include: {
        event: true,
      },
    });

    if (!session) {
      throw new NotFoundException("Streaming session not found");
    }

    // Check permissions
    await this.checkEventPermissions(session.event, userId, userRole);

    // End LiveKit room
    try {
      await this.roomService.deleteRoom(session.roomId);
    } catch (error) {
      console.warn("LiveKit room deletion failed:", error);
    }

    // Update session
    const updated = await this.prisma.streamingSession.update({
      where: { id: sessionId },
      data: {
        active: false,
        endTime: new Date(),
      },
      include: {
        event: true,
        entity: true,
      },
    });

    // Update event phase to POST_CONCERT
    await this.prisma.event.update({
      where: { id: session.eventId },
      data: {
        phase: EventPhase.POST_CONCERT,
        status: EventStatus.COMPLETED,
        lastLaunchedBy: userId,
      },
    });

    return updated;
  }

  async getActiveSessions() {
    const sessions = await this.prisma.streamingSession.findMany({
      where: {
        active: true,
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            thumbnail: true,
            phase: true,
            status: true,
            startTime: true,
          },
        },
        entity: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
          },
        },
      },
      orderBy: { startTime: "desc" },
    });

    return sessions;
  }

  async getSessionDetails(id: string) {
    const session = await this.prisma.streamingSession.findUnique({
      where: { id },
      include: {
        event: {
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
        },
        entity: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            type: true,
            isVerified: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException("Streaming session not found");
    }

    // Get LiveKit room stats if available
    let roomStats = null;
    try {
      const room = await this.roomService.listRooms([session.roomId]);
      if (room && room.length > 0) {
        roomStats = {
          numParticipants: room[0].numParticipants || 0,
          creationTime: room[0].creationTime,
          emptyTimeout: room[0].emptyTimeout,
        };
      }
    } catch (error) {
      console.warn("Failed to get LiveKit room stats:", error);
    }

    // Calculate duration
    const duration = session.endTime
      ? Math.floor((session.endTime.getTime() - session.startTime.getTime()) / 1000)
      : Math.floor((Date.now() - session.startTime.getTime()) / 1000);

    const metrics = (session.metrics as Record<string, unknown>) || {};

    return {
      ...session,
      duration, // in seconds
      roomStats,
      metrics: {
        viewers: session.viewers,
        ...metrics,
      },
    };
  }

  async updateMetrics(sessionId: string, updateMetricsDto: UpdateMetricsDto, userId: string) {
    const session = await this.prisma.streamingSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException("Streaming session not found");
    }

    const currentMetrics = (session.metrics as Record<string, unknown>) || {};
    const updatedMetrics = {
      ...currentMetrics,
      ...updateMetricsDto.customMetrics,
      viewers: updateMetricsDto.viewers !== undefined ? updateMetricsDto.viewers : currentMetrics.viewers || 0,
      participants: updateMetricsDto.participants !== undefined ? updateMetricsDto.participants : currentMetrics.participants || 0,
      messages: updateMetricsDto.messages !== undefined ? updateMetricsDto.messages : currentMetrics.messages || 0,
      reactions: updateMetricsDto.reactions !== undefined ? updateMetricsDto.reactions : currentMetrics.reactions || 0,
      updatedAt: new Date().toISOString(),
    };

    const updated = await this.prisma.streamingSession.update({
      where: { id: sessionId },
      data: {
        metrics: updatedMetrics,
        viewers: updateMetricsDto.viewers !== undefined ? updateMetricsDto.viewers : session.viewers,
      },
    });

    return updated;
  }

  async validateGeofence(validateGeofenceDto: ValidateGeofenceDto): Promise<GeofenceValidationResult> {
    const { sessionId, country, state, city, timezone } = validateGeofenceDto;

    const session = await this.prisma.streamingSession.findUnique({
      where: { id: sessionId },
      include: {
        event: {
          include: {
            geofencing: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException("Streaming session not found");
    }

    // Check event geofencing rules
    const geofencing = session.event.geofencing;

    if (!geofencing || session.geoRegions.length === 0) {
      // No geofencing restrictions
      return { allowed: true };
    }

    const regions = session.geoRegions.length > 0 ? session.geoRegions : geofencing.regions;
    const type = geofencing.type;

    // Build user location identifiers
    const userRegions: string[] = [];
    if (country) userRegions.push(`country:${country}`);
    if (state) userRegions.push(`state:${state}`);
    if (city) userRegions.push(`city:${city}`);
    if (timezone) {
      // Convert timezone to short form if needed
      const tzMap: Record<string, string> = {
        "America/New_York": "EST",
        "America/Chicago": "CST",
        "America/Denver": "MST",
        "America/Los_Angeles": "PST",
      };
      const tzShort = tzMap[timezone] || timezone.split("/").pop()?.toUpperCase() || timezone;
      userRegions.push(`timezone:${tzShort}`);
    }

    // Check if user location matches any region
    const matches = regions.filter((region) => {
      // Handle special cases
      if (region === "region:international") {
        return country && country !== "US";
      }
      if (region === "global") {
        return true;
      }

      // Check if user region matches
      return userRegions.some((userRegion) => {
        // Exact match
        if (userRegion === region) return true;

        // Partial match (e.g., country:US matches any state in US)
        const [userType, userValue] = userRegion.split(":");
        const [regionType, regionValue] = region.split(":");

        if (userType === "country" && regionType === "state" && country === "US") {
          return true; // US states are within US
        }

        return false;
      });
    });

    if (type === "ALLOWLIST") {
      return {
        allowed: matches.length > 0,
        reason: matches.length === 0 ? "Access denied: Your location is not in the allowed regions" : undefined,
        matchedRegions: matches,
      };
    } else {
      // BLOCKLIST
      return {
        allowed: matches.length === 0,
        reason: matches.length > 0 ? "Access denied: Your location is blocked" : undefined,
        matchedRegions: matches,
      };
    }
  }

  private generateSessionKey(): string {
    return `sk_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private async checkEventPermissions(event: any, userId: string, userRole: UserRole) {
    if (userRole === UserRole.ADMIN) {
      return; // Admin can manage anything
    }

    // Get entity to check ownership
    const entity = await this.prisma.entity.findUnique({
      where: { id: event.entityId },
      include: {
        owner: true,
      },
    });

    if (!entity) {
      throw new NotFoundException("Entity not found");
    }

    if (entity.ownerId === userId) {
      return; // Entity owner can manage
    }

    // Check if user is coordinator
    if (event.eventCoordinatorId === userId) {
      return; // Coordinator can manage
    }

    // Check if user is a manager with ADMIN/MANAGER role for this entity
    const entityRole = await this.prisma.entityRole.findUnique({
      where: {
        userId_entityId: {
          userId,
          entityId: event.entityId,
        },
      },
    });

    if (entityRole && (entityRole.role === EntityRoleType.ADMIN || entityRole.role === EntityRoleType.MANAGER)) {
      return; // Manager with ADMIN/MANAGER role can manage
    }

    throw new ForbiddenException("You do not have permission to manage streaming sessions for this event");
  }
}

