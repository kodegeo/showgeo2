import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  OnModuleDestroy,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { EntityRoleType } from "@prisma/client";
import { AccessToken } from "livekit-server-sdk";

/**
 * Grace period in seconds for user to join after session starts
 */
const JOIN_GRACE_PERIOD_SECONDS = 60;

/**
 * Meet & Greet Session Status
 */
export enum MeetGreetSessionStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  MISSED = "MISSED",
}

/**
 * Meet & Greet Session (from Prisma)
 */
export interface MeetGreetSession {
  id: string;
  eventId: string;
  ticketId: string;
  userId: string;
  slotOrder: number;
  durationMinutes: number;
  status: MeetGreetSessionStatus;
  startedAt: Date | null;
  endedAt: Date | null;
  joinedAt: Date | null; // VIP room join timestamp (Phase 4C)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Meet & Greet Service (Phase 4A)
 * 
 * Manages VIP Meet & Greet sessions with strict state enforcement:
 * - Only one ACTIVE session per event at a time
 * - Sequential processing by slotOrder
 * - Automatic progression and completion
 * - Grace period enforcement
 * 
 * Safety guarantees:
 * - Idempotent operations
 * - Transactional where needed
 * - No side effects (no emails, mailbox, tickets, streaming)
 */
@Injectable()
export class MeetGreetService implements OnModuleDestroy {
  private readonly logger = new Logger(MeetGreetService.name);
  private readonly activeTimers = new Map<string, NodeJS.Timeout>();
  private readonly livekitApiKey: string;
  private readonly livekitApiSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.livekitApiKey = this.configService.get<string>("LIVEKIT_API_KEY") || "";
    this.livekitApiSecret = this.configService.get<string>("LIVEKIT_API_SECRET") || "";
  }

  /**
   * Cleanup all active timers on module destroy
   */
  onModuleDestroy() {
    this.logger.log("Cleaning up active timers...");
    for (const timer of this.activeTimers.values()) {
      clearTimeout(timer);
    }
    this.activeTimers.clear();
  }

  /**
   * Get all sessions for an event, ordered by slotOrder
   */
  async getQueue(eventId: string): Promise<MeetGreetSession[]> {
    const sessions = await (this.prisma as any).meet_greet_sessions.findMany({
      where: { eventId },
      orderBy: { slotOrder: "asc" },
    });

    return sessions.map(this.mapToSession);
  }

  /**
   * Get the currently active session for an event
   */
  async getCurrentSession(eventId: string): Promise<MeetGreetSession | null> {
    const session = await (this.prisma as any).meet_greet_sessions.findFirst({
      where: {
        eventId,
        status: MeetGreetSessionStatus.ACTIVE,
      },
      orderBy: { slotOrder: "asc" },
    });

    return session ? this.mapToSession(session) : null;
  }

  /**
   * Start the next pending session for an event
   * 
   * Rules:
   * - Only starts if no ACTIVE session exists
   * - Selects the next PENDING session by slotOrder
   * - Sets startedAt timestamp
   * - Schedules grace period check and auto-complete
   * 
   * @returns The started session, or null if no pending sessions
   */
  async startNextSession(eventId: string): Promise<MeetGreetSession | null> {
    // Use transaction to ensure atomicity
    return await (this.prisma as any).$transaction(async (tx: any) => {
      // 1. Assert no active session exists
      const activeSession = await tx.meet_greet_sessions.findFirst({
        where: {
          eventId,
          status: MeetGreetSessionStatus.ACTIVE,
        },
      });

      if (activeSession) {
        throw new BadRequestException(
          `Cannot start new session: Event ${eventId} already has an ACTIVE session`,
        );
      }

      // 2. Find next pending session by slotOrder
      const nextSession = await tx.meet_greet_sessions.findFirst({
        where: {
          eventId,
          status: MeetGreetSessionStatus.PENDING,
        },
        orderBy: { slotOrder: "asc" },
      });

      if (!nextSession) {
        return null; // No pending sessions
      }

      // 3. Start the session
      const started = await tx.meet_greet_sessions.update({
        where: { id: nextSession.id },
        data: {
          status: MeetGreetSessionStatus.ACTIVE,
          startedAt: new Date(),
        },
      });

      const session = this.mapToSession(started);

      // 4. Schedule automatic progression (non-blocking)
      this.scheduleSessionProgression(session);

      return session;
    });
  }

  /**
   * Mark a session as completed
   * 
   * Rules:
   * - Only ACTIVE sessions can be completed (idempotent: if already COMPLETED, return it)
   * - Sets endedAt timestamp
   * - Automatically starts next session if available
   */
  async markSessionCompleted(sessionId: string): Promise<MeetGreetSession> {
    return await (this.prisma as any).$transaction(async (tx: any) => {
      // 1. Fetch and validate session
      const session = await tx.meet_greet_sessions.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }

      // Idempotent: if already completed, return it without side effects
      if (session.status === MeetGreetSessionStatus.COMPLETED) {
        return this.mapToSession(session);
      }

      if (session.status !== MeetGreetSessionStatus.ACTIVE) {
        throw new BadRequestException(
          `Cannot complete session ${sessionId}: Current status is ${session.status}, expected ACTIVE`,
        );
      }

      // 2. Mark as completed
      const completed = await tx.meet_greet_sessions.update({
        where: { id: sessionId },
        data: {
          status: MeetGreetSessionStatus.COMPLETED,
          endedAt: new Date(),
        },
      });

      // 3. Cancel any scheduled timers for this session
      this.cancelTimers(sessionId);

      // 4. Automatically start next session (non-blocking)
      setImmediate(async () => {
        try {
          await this.startNextSession(session.eventId);
        } catch (error) {
          this.logger.error(
            `Failed to auto-start next session after completing ${sessionId}:`,
            error,
          );
        }
      });

      return this.mapToSession(completed);
    });
  }

  /**
   * Mark a session as missed
   * 
   * Rules:
   * - Only PENDING or ACTIVE sessions can be marked as missed (idempotent: if already MISSED, return it)
   * - Sets endedAt timestamp if not already set
   * - Automatically starts next session if available
   */
  async markSessionMissed(sessionId: string): Promise<MeetGreetSession> {
    return await (this.prisma as any).$transaction(async (tx: any) => {
      // 1. Fetch and validate session
      const session = await tx.meet_greet_sessions.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }

      // Idempotent: if already missed, return it without side effects
      if (session.status === MeetGreetSessionStatus.MISSED) {
        return this.mapToSession(session);
      }

      if (
        session.status !== MeetGreetSessionStatus.PENDING &&
        session.status !== MeetGreetSessionStatus.ACTIVE
      ) {
        throw new BadRequestException(
          `Cannot mark session ${sessionId} as missed: Current status is ${session.status}, expected PENDING or ACTIVE`,
        );
      }

      // 2. Mark as missed
      const updateData: any = {
        status: MeetGreetSessionStatus.MISSED,
      };

      // Set endedAt if not already set
      if (!session.endedAt) {
        updateData.endedAt = new Date();
      }

      // Set startedAt if session was ACTIVE but not started
      if (session.status === MeetGreetSessionStatus.ACTIVE && !session.startedAt) {
        updateData.startedAt = new Date();
      }

      const missed = await tx.meet_greet_sessions.update({
        where: { id: sessionId },
        data: updateData,
      });

      // 3. Cancel any scheduled timers for this session
      this.cancelTimers(sessionId);

      // 4. Automatically start next session (non-blocking)
      setImmediate(async () => {
        try {
          await this.startNextSession(session.eventId);
        } catch (error) {
          this.logger.error(
            `Failed to auto-start next session after missing ${sessionId}:`,
            error,
          );
        }
      });

      return this.mapToSession(missed);
    });
  }

  /**
   * Schedule automatic progression for a session
   * 
   * Schedules:
   * 1. Grace period check (after JOIN_GRACE_PERIOD_SECONDS)
   * 2. Auto-complete after duration (after durationMinutes)
   * 
   * Both are non-blocking and wrapped in error handling
   */
  private scheduleSessionProgression(session: MeetGreetSession): void {
    // Cancel any existing timers for this session
    this.cancelTimers(session.id);

    // Schedule grace period check
    const gracePeriodMs = JOIN_GRACE_PERIOD_SECONDS * 1000;
    const graceTimer = setTimeout(async () => {
      try {
        await this.checkGracePeriod(session.id);
      } catch (error) {
        this.logger.error(
          `Grace period check failed for session ${session.id}:`,
          error,
        );
      }
    }, gracePeriodMs);

    this.activeTimers.set(`${session.id}_grace`, graceTimer);

    // Schedule auto-complete after duration
    const durationMs = session.durationMinutes * 60 * 1000;
    const completeTimer = setTimeout(async () => {
      try {
        await this.autoCompleteSession(session.id);
      } catch (error) {
        this.logger.error(
          `Auto-complete failed for session ${session.id}:`,
          error,
        );
      }
    }, durationMs);

    this.activeTimers.set(`${session.id}_complete`, completeTimer);
  }

  /**
   * Check if user joined within grace period (Phase 4C)
   * 
   * If session is still ACTIVE and user hasn't joined VIP room (no joinedAt on session),
   * mark as MISSED
   * 
   * Uses meet_greet_sessions.joinedAt (VIP room join) not tickets.joinedAt (stream join)
   */
  private async checkGracePeriod(sessionId: string): Promise<void> {
    const session = await (this.prisma as any).meet_greet_sessions.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return; // Session doesn't exist, ignore
    }

    // Only check if session is still ACTIVE
    if (session.status !== MeetGreetSessionStatus.ACTIVE) {
      return; // Session already completed/missed, ignore
    }

    // Check if user joined VIP room (session.joinedAt)
    if (!session.joinedAt) {
      // User didn't join VIP room within grace period, mark as missed
      this.logger.log(
        `Session ${sessionId} marked as MISSED: User did not join VIP room within grace period`,
      );
      await this.markSessionMissed(sessionId);
      return;
    }

    // Check if joinedAt is within grace period window
    const startedAt = session.startedAt ? new Date(session.startedAt) : null;
    if (!startedAt) {
      // Shouldn't happen, but safety check
      this.logger.warn(`Session ${sessionId} is ACTIVE but has no startedAt`);
      return;
    }

    const gracePeriodEnd = new Date(startedAt.getTime() + JOIN_GRACE_PERIOD_SECONDS * 1000);
    const joinedAt = new Date(session.joinedAt);

    if (joinedAt > gracePeriodEnd) {
      // User joined after grace period, mark as missed
      this.logger.log(
        `Session ${sessionId} marked as MISSED: User joined VIP room after grace period`,
      );
      await this.markSessionMissed(sessionId);
    } else {
      this.logger.log(
        `Session ${sessionId} grace period passed: User has joined VIP room within grace period`,
      );
    }
  }

  /**
   * Auto-complete a session after its duration expires
   */
  private async autoCompleteSession(sessionId: string): Promise<void> {
    const session = await (this.prisma as any).meet_greet_sessions.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return; // Session doesn't exist, ignore
    }

    // Only auto-complete if still ACTIVE
    if (session.status === MeetGreetSessionStatus.ACTIVE) {
      this.logger.log(
        `Session ${sessionId} auto-completed after duration expired`,
      );
      await this.markSessionCompleted(sessionId);
    }
  }

  /**
   * Cancel all timers for a session
   */
  private cancelTimers(sessionId: string): void {
    const graceKey = `${sessionId}_grace`;
    const completeKey = `${sessionId}_complete`;

    if (this.activeTimers.has(graceKey)) {
      clearTimeout(this.activeTimers.get(graceKey)!);
      this.activeTimers.delete(graceKey);
    }

    if (this.activeTimers.has(completeKey)) {
      clearTimeout(this.activeTimers.get(completeKey)!);
      this.activeTimers.delete(completeKey);
    }
  }

  /**
   * Assert no active session exists for an event
   * 
   * Helper method for validation
   */
  async assertNoActiveSession(eventId: string): Promise<void> {
    const activeSession = await (this.prisma as any).meet_greet_sessions.findFirst({
      where: {
        eventId,
        status: MeetGreetSessionStatus.ACTIVE,
      },
    });

    if (activeSession) {
      throw new BadRequestException(
        `Event ${eventId} already has an ACTIVE session (${activeSession.id})`,
      );
    }
  }

  /**
   * Check if requester has permission to manage meet & greet for an event
   * Must be: event coordinator, entity owner, or entity admin/manager
   * 
   * Reuses the same authorization pattern as EventsService.checkEventAnalyticsPermissions
   */
  async checkEventPermissions(eventId: string, userId: string): Promise<void> {
    // Fetch event with entity relationship
    const event = await (this.prisma as any).events.findUnique({
      where: { id: eventId },
      include: {
        entities_events_entityIdToentities: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // Check if user is event coordinator
    if (event.eventCoordinatorId === userId) {
      return;
    }

    // Check if user is entity owner
    if (event.entities_events_entityIdToentities?.ownerId === userId) {
      return;
    }

    // Check if user has ADMIN or MANAGER role on the entity
    const entityId = event.entityId;
    if (entityId) {
      const entityRole = await (this.prisma as any).entity_roles.findUnique({
        where: {
          userId_entityId: {
            userId,
            entityId,
          },
        },
      });

      if (
        entityRole &&
        (entityRole.role === EntityRoleType.ADMIN || entityRole.role === EntityRoleType.MANAGER)
      ) {
        return;
      }
    }

    throw new ForbiddenException(
      "You do not have permission to manage meet & greet sessions for this event",
    );
  }

  /**
   * Get event ID from session ID (for authorization checks)
   */
  async getEventIdFromSession(sessionId: string): Promise<string> {
    const session = await (this.prisma as any).meet_greet_sessions.findUnique({
      where: { id: sessionId },
      select: { eventId: true },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    return session.eventId;
  }

  /**
   * Mark a fan as having joined the VIP room (Phase 4C)
   * 
   * Rules:
   * - Only the session owner (session.userId === userId) can join
   * - Only ACTIVE sessions can be joined
   * - Idempotent: if already joined, returns session without update
   * - Sets joinedAt timestamp
   */
  async markFanJoined(sessionId: string, userId: string): Promise<MeetGreetSession> {
    return await (this.prisma as any).$transaction(async (tx: any) => {
      // 1. Fetch and validate session
      const session = await tx.meet_greet_sessions.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }

      // 2. Verify identity-bound access
      if (session.userId !== userId) {
        throw new ForbiddenException(
          "You do not have permission to join this session",
        );
      }

      // 3. Check session status
      if (session.status === MeetGreetSessionStatus.PENDING) {
        throw new BadRequestException("Session not active yet");
      }

      if (
        session.status === MeetGreetSessionStatus.COMPLETED ||
        session.status === MeetGreetSessionStatus.MISSED
      ) {
        throw new BadRequestException("Session has ended");
      }

      if (session.status !== MeetGreetSessionStatus.ACTIVE) {
        throw new BadRequestException(
          `Cannot join session: Current status is ${session.status}, expected ACTIVE`,
        );
      }

      // 4. Idempotent update: if already joined, return session
      if (session.joinedAt) {
        return this.mapToSession(session);
      }

      // 5. Mark as joined
      const updated = await tx.meet_greet_sessions.update({
        where: { id: sessionId },
        data: {
          joinedAt: new Date(),
        },
      });

      return this.mapToSession(updated);
    });
  }

  /**
   * Get a fan's session for an event (Phase 4C)
   * 
   * Returns the session where eventId and userId match, or null if none exists
   */
  async getFanSession(eventId: string, userId: string): Promise<MeetGreetSession | null> {
    const session = await (this.prisma as any).meet_greet_sessions.findFirst({
      where: {
        eventId,
        userId,
      },
      orderBy: { slotOrder: "asc" },
    });

    return session ? this.mapToSession(session) : null;
  }

  /**
   * Generate VIP room name (deterministic format)
   * Format: vip-event-{eventId}-session-{sessionId}
   */
  private getVipRoomName(eventId: string, sessionId: string): string {
    return `vip-event-${eventId.toLowerCase()}-session-${sessionId.toLowerCase()}`;
  }

  /**
   * Generate LiveKit access token for VIP room (Phase 4D)
   * 
   * @param roomName - VIP room name
   * @param identity - Participant identity (userId)
   * @param permissions - Token permissions
   * @param ttlMinutes - Token time-to-live in minutes
   * @returns LiveKit JWT token
   */
  private async generateLiveKitToken(
    roomName: string,
    identity: string,
    permissions: {
      canPublish: boolean;
      canSubscribe: boolean;
      canPublishData: boolean;
    },
    ttlMinutes: number,
  ): Promise<string> {
    if (!this.livekitApiKey || !this.livekitApiSecret) {
      this.logger.warn("LiveKit not configured, cannot generate VIP token");
      throw new InternalServerErrorException("LiveKit not configured");
    }

    try {
      const at = new AccessToken(this.livekitApiKey, this.livekitApiSecret, {
        identity,
      });

      // Set token TTL (max of session duration)
      const ttlSeconds = Math.min(ttlMinutes * 60, 3600); // Cap at 1 hour
      at.ttl = `${ttlSeconds}s`;

      // Add room grant with permissions
      at.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: permissions.canPublish,
        canSubscribe: permissions.canSubscribe,
        canPublishData: permissions.canPublishData,
      });

      const jwtToken = (await at.toJwt()) as unknown as string;

      if (!jwtToken || typeof jwtToken !== "string") {
        throw new Error("Invalid token generated");
      }

      return jwtToken;
    } catch (error) {
      this.logger.error("LiveKit VIP token generation failed:", error);
      throw new InternalServerErrorException("Failed to generate VIP room token");
    }
  }

  /**
   * Generate VIP room token for fan (Phase 4D)
   * 
   * Rules:
   * - Only session owner can join
   * - Only ACTIVE sessions can be joined
   * - Token TTL is session duration
   * - Fan can publish and subscribe
   */
  async generateFanVipToken(sessionId: string, userId: string): Promise<{
    roomName: string;
    livekitToken: string;
    expiresAt: Date;
  }> {
    return await (this.prisma as any).$transaction(async (tx: any) => {
      // 1. Fetch and validate session
      const session = await tx.meet_greet_sessions.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }

      // 2. Verify identity-bound access
      if (session.userId !== userId) {
        throw new ForbiddenException(
          "You do not have permission to join this session",
        );
      }

      // 2.5. Code of Conduct consent check (required for VIP Meet & Greet)
      const { checkCodeOfConductConsent } = await import("../../common/helpers/consent.helper");
      await checkCodeOfConductConsent(tx, userId);

      // 3. Check session status - only ACTIVE sessions can be joined
      if (session.status !== MeetGreetSessionStatus.ACTIVE) {
        if (session.status === MeetGreetSessionStatus.PENDING) {
          throw new BadRequestException("Session not active yet");
        }
        if (
          session.status === MeetGreetSessionStatus.COMPLETED ||
          session.status === MeetGreetSessionStatus.MISSED
        ) {
          throw new BadRequestException("Session has ended");
        }
        throw new BadRequestException(
          `Cannot join VIP room: Session status is ${session.status}, expected ACTIVE`,
        );
      }

      // 4. Generate VIP room name
      const roomName = this.getVipRoomName(session.eventId, session.id);

      // 5. Calculate token expiration (session duration from now)
      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + session.durationMinutes * 60 * 1000,
      );

      // 6. Generate LiveKit token
      const livekitToken = await this.generateLiveKitToken(
        roomName,
        userId,
        {
          canPublish: true, // Fan can publish audio/video
          canSubscribe: true, // Fan can subscribe to artist
          canPublishData: true, // Fan can send data messages
        },
        session.durationMinutes,
      );

      return {
        roomName,
        livekitToken,
        expiresAt,
      };
    });
  }

  /**
   * Generate VIP room token for artist (Phase 4D)
   * 
   * Rules:
   * - Artist must be authorized (event coordinator or entity admin/manager)
   * - Only ACTIVE sessions can be joined
   * - Artist joins the current ACTIVE session room
   * - Artist can publish, subscribe, and moderate
   */
  async generateArtistVipToken(eventId: string, userId: string): Promise<{
    roomName: string;
    livekitToken: string;
    expiresAt: Date;
    sessionId: string;
  }> {
    // 1. Verify artist authorization
    await this.checkEventPermissions(eventId, userId);

    // 2. Get current ACTIVE session
    const currentSession = await this.getCurrentSession(eventId);

    if (!currentSession) {
      throw new BadRequestException(
        "No active VIP session. Start a session first.",
      );
    }

    // 3. Verify session is ACTIVE
    if (currentSession.status !== MeetGreetSessionStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot join VIP room: Current session status is ${currentSession.status}, expected ACTIVE`,
      );
    }

    // 4. Generate VIP room name
    const roomName = this.getVipRoomName(eventId, currentSession.id);

    // 5. Calculate token expiration (session duration from now)
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + currentSession.durationMinutes * 60 * 1000,
    );

    // 6. Generate LiveKit token with artist permissions
    const livekitToken = await this.generateLiveKitToken(
      roomName,
      userId,
      {
        canPublish: true, // Artist can publish audio/video
        canSubscribe: true, // Artist can subscribe to fan
        canPublishData: true, // Artist can send data messages
        // Note: Moderate permissions (kick, mute) are handled by LiveKit server-side
        // if needed in the future, we can add canUpdatePermissions
      },
      currentSession.durationMinutes,
    );

    return {
      roomName,
      livekitToken,
      expiresAt,
      sessionId: currentSession.id,
    };
  }

  /**
   * Map Prisma result to MeetGreetSession interface
   */
  private mapToSession(prismaResult: any): MeetGreetSession {
    return {
      id: prismaResult.id,
      eventId: prismaResult.eventId,
      ticketId: prismaResult.ticketId,
      userId: prismaResult.userId,
      slotOrder: prismaResult.slotOrder,
      durationMinutes: prismaResult.durationMinutes,
      status: prismaResult.status as MeetGreetSessionStatus,
      startedAt: prismaResult.startedAt,
      endedAt: prismaResult.endedAt,
      joinedAt: prismaResult.joinedAt || null, // Phase 4C
      createdAt: prismaResult.createdAt,
      updatedAt: prismaResult.updatedAt,
    };
  }
}

