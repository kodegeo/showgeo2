// Any raw SQL comparison against a UUID column must explicitly cast parameters using ::uuid. Prisma does not enforce this for $queryRaw.

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { SupabaseService } from "../supabase/supabase.service";
import { EntityStatus, entity_applications, UserRole, Prisma } from "@prisma/client";
import { RoomServiceClient } from "livekit-server-sdk";
import * as crypto from "crypto";

type User = any;

export enum UserStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  BANNED = "BANNED",
}

type AuditTargetType = "USER" | "ENTITY" | "APPLICATION";

interface AuditLogData {
  adminId: string;
  targetType: AuditTargetType;
  targetId: string;
  action: string;
  reason?: string;
  metadata?: any;
}

export interface EnforcementAction {
  action: "SUSPEND" | "REINSTATE" | "DISABLE_ENTITY" | "REINSTATE_ENTITY" | "SUSPEND_ENTITY" | "TERMINATE_EVENT" | "PROMOTE" | "DEMOTE" | "DISABLE_USER" | "ENABLE_USER" | "APPROVE_ENTITY" | "REJECT_ENTITY" | "ACCEPT_APPLICATION" | "REJECT_APPLICATION" | "BAN_APPLICATION" | "PROMOTE_TO_ADMIN" | "DEMOTE_ADMIN";
  userId?: string;
  entityId?: string;
  eventId?: string;
  applicationId?: string;
  adminId: string;
  reason: string;
  timestamp: Date;
  previousStatus?: string;
  newStatus: string;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private roomService: RoomServiceClient | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    // Initialize LiveKit RoomServiceClient for emergency termination
    const livekitUrl = this.configService.get<string>("LIVEKIT_URL");
    const livekitApiKey = this.configService.get<string>("LIVEKIT_API_KEY");
    const livekitApiSecret = this.configService.get<string>("LIVEKIT_API_SECRET");

    if (livekitUrl && livekitApiKey && livekitApiSecret) {
      this.roomService = new RoomServiceClient(
        livekitUrl,
        livekitApiKey,
        livekitApiSecret,
      );
    } else {
      this.logger.warn(
        "LiveKit configuration missing. Event termination will not disconnect viewers from LiveKit rooms.",
      );
    }
  }

  /**
   * Log admin enforcement action to audit log (non-blocking)
   * This method never throws - it only logs errors
   */
  /**
   * Log admin enforcement action to audit log (non-blocking)
   * This method never throws - it only logs errors
   * Guards against audit repository unavailability to prevent blocking enforcement actions
   */
  private async logAuditAction(data: AuditLogData): Promise<void> {
    try {
      await (this.prisma as any).admin_audit_logs.create({
        data: {
          id: crypto.randomUUID(),
          admin_id: data.adminId,
          target_type: data.targetType,
          target_id: data.targetId,
          action: data.action,
          reason: data.reason || null,
          metadata: data.metadata ? (data.metadata as any) : null,
          created_at: new Date(),
        },
      });
    } catch (error) {
      // Log warning but never throw - audit logging must not block enforcement
      this.logger.warn(
        `[AUDIT_LOG] Failed to log audit action: ${data.action} for ${data.targetType}:${data.targetId}`,
        {
          error: error instanceof Error ? error.message : String(error),
          adminId: data.adminId,
          targetType: data.targetType,
          targetId: data.targetId,
          action: data.action,
        },
      );
      // Explicitly return to ensure no exception propagates
      return;
    }
  }

  /**
   * Suspend a user (ADMIN only)
   * - Updates user status to SUSPENDED
   * - Records admin action with reason and timestamp
   * - Forces logout by invalidating Supabase sessions
   */
  async suspendUser(
    userId: string,
    adminId: string,
    reason: string,
  ): Promise<{ user: any; enforcementAction: EnforcementAction }> {
    // Prevent admin from suspending themselves
    if (userId === adminId) {
      throw new BadRequestException(
        "You cannot suspend your own account. Please ask another administrator to perform this action.",
      );
    }

    // Fetch user
    const user = await (this.prisma as any).app_users.findUnique({
      where: { id: userId },
      include: {
        user_profiles: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Prevent suspending last ADMIN
    if (user.role === UserRole.ADMIN) {
      const adminCount = await (this.prisma as any).app_users.count({
        where: { role: UserRole.ADMIN },
      });

      if (adminCount <= 1) {
        throw new BadRequestException(
          "Cannot suspend the last ADMIN user. At least one administrator must remain active.",
        );
      }
    }

    // Use account_status as single source of truth
    const currentStatus = user.account_status || "ACTIVE";

    // If already suspended, return current state
    if (currentStatus === "SUSPENDED") {
      this.logger.warn(
        `User ${userId} is already SUSPENDED. Skipping suspension.`,
      );
      return {
        user,
        enforcementAction: {
          action: "SUSPEND",
          userId,
          adminId,
          reason,
          timestamp: new Date(),
          previousStatus: currentStatus,
          newStatus: currentStatus,
        },
      };
    }

    // Update account_status in database (single source of truth)
    const updatedUser = await (this.prisma as any).app_users.update({
      where: { id: userId },
      data: {
        account_status: "SUSPENDED",
      },
      include: {
        user_profiles: true,
      },
    });

    // Mirror to Supabase (downstream)
    if (user.authUserId) {
      await this.mirrorAccountStatusToSupabase(user.authUserId, "SUSPENDED");
      // Force logout by invalidating Supabase sessions
      await this.invalidateUserSessions(userId);
    }

    // Log enforcement action
    const enforcementAction: EnforcementAction = {
      action: "SUSPEND",
      userId,
      adminId,
      reason,
      timestamp: new Date(),
      previousStatus: currentStatus,
      newStatus: "SUSPENDED",
    };

    this.logger.log(
      `[ENFORCEMENT] User ${userId} suspended by admin ${adminId}. Reason: ${reason}`,
    );

    // Log audit action (non-blocking)
    await this.logAuditAction({
      adminId,
      targetType: "USER",
      targetId: userId,
      action: "SUSPEND",
      reason,
      metadata: {
        userEmail: user.email,
        previousStatus: currentStatus,
        newStatus: "SUSPENDED",
      },
    });

    return {
      user: updatedUser,
      enforcementAction,
    };
  }

  /**
   * Reinstate a user (ADMIN only)
   * - Updates account_status to ACTIVE
   * - Removes Supabase ban
   * - Records admin action with reason and timestamp
   */
  async reinstateUser(
    userId: string,
    adminId: string,
    reason: string,
  ): Promise<{ user: any; enforcementAction: EnforcementAction }> {
    // Fetch user
    const user = await (this.prisma as any).app_users.findUnique({
      where: { id: userId },
      include: {
        user_profiles: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Use account_status as single source of truth
    const currentStatus = user.account_status || "ACTIVE";

    // If already active, return current state
    if (currentStatus === "ACTIVE") {
      this.logger.warn(
        `User ${userId} is already ACTIVE. Skipping reinstatement.`,
      );
      return {
        user,
        enforcementAction: {
          action: "REINSTATE",
          userId,
          adminId,
          reason,
          timestamp: new Date(),
          previousStatus: currentStatus,
          newStatus: currentStatus,
        },
      };
    }

    // Update account_status in database (single source of truth)
    const updatedUser = await (this.prisma as any).app_users.update({
      where: { id: userId },
      data: {
        account_status: "ACTIVE",
      },
      include: {
        user_profiles: true,
      },
    });

    // Mirror to Supabase (downstream) - remove ban
    if (user.authUserId) {
      await this.mirrorAccountStatusToSupabase(user.authUserId, "ACTIVE");
    }

    // Log enforcement action
    const enforcementAction: EnforcementAction = {
      action: "REINSTATE",
      userId,
      adminId,
      reason,
      timestamp: new Date(),
      previousStatus: currentStatus,
      newStatus: "ACTIVE",
    };

    this.logger.log(
      `[ENFORCEMENT] User ${userId} reinstated by admin ${adminId}. Reason: ${reason}`,
    );

    // Log audit action (non-blocking)
    await this.logAuditAction({
      adminId,
      targetType: "USER",
      targetId: userId,
      action: "REINSTATE",
      reason,
      metadata: {
        userEmail: user.email,
        previousStatus: currentStatus,
        newStatus: "ACTIVE",
      },
    });

    return {
      user: updatedUser,
      enforcementAction,
    };
  }

  /**
   * Invalidate all Supabase sessions for a user (force logout)
   * Uses Supabase Admin API to sign out the user from all devices
   */
  /**
   * Mirror account_status to Supabase Auth
   * 
   * Primary: Sets app_metadata.account_status for visibility and JWT inclusion
   * Secondary: Sets ban_duration for Auth enforcement
   * 
   * ACTIVE → app_metadata.account_status = "ACTIVE", ban_duration = "none"
   * SUSPENDED → app_metadata.account_status = "SUSPENDED", ban_duration = "8760h" (1 year)
   * DISABLED → app_metadata.account_status = "DISABLED", ban_duration = "876000h" (~100 years)
   */
  private async mirrorAccountStatusToSupabase(
    authUserId: string,
    accountStatus: "ACTIVE" | "SUSPENDED" | "DISABLED",
  ): Promise<void> {
    if (!authUserId) {
      this.logger.warn(`[MIRROR] No authUserId provided, skipping Supabase mirroring`);
      return;
    }

    try {
      // Determine ban_duration based on account_status
      let banDuration: string;
      if (accountStatus === "ACTIVE") {
        banDuration = "none";
      } else if (accountStatus === "SUSPENDED") {
        banDuration = "8760h"; // 1 year in hours (soft, reversible)
      } else if (accountStatus === "DISABLED") {
        banDuration = "876000h"; // ~100 years in hours (permanent)
      } else {
        this.logger.error(
          `[MIRROR] Invalid accountStatus: ${accountStatus} for authUserId: ${authUserId}`,
        );
        return;
      }

      // Fetch existing user to preserve existing app_metadata
      const { data: existingUser, error: fetchError } = await this.supabaseService.client.auth.admin.getUserById(
        authUserId,
      );

      if (fetchError) {
        this.logger.error(
          `[MIRROR] Failed to fetch existing Supabase user`,
          {
            authUserId,
            error: fetchError.message,
            errorCode: fetchError.status,
          },
        );
        return;
      }

      // Merge account_status into existing app_metadata
      const existingAppMetadata = (existingUser?.user?.app_metadata as Record<string, any>) || {};
      const updatedAppMetadata = {
        ...existingAppMetadata,
        account_status: accountStatus,
      };

      // Log what we're about to update
      this.logger.log(`[MIRROR] Updating Supabase user`, {
        authUserId,
        accountStatus,
        banDuration,
        existingAppMetadata,
        updatedAppMetadata,
      });

      // Update Supabase user with app_metadata.account_status (for JWT) and ban_duration (for enforcement)
      const { data, error } = await this.supabaseService.client.auth.admin.updateUserById(
        authUserId,
        {
          app_metadata: updatedAppMetadata,
          ban_duration: banDuration,
        },
      );

      if (error) {
        this.logger.error(
          `[MIRROR] Failed to mirror account_status to Supabase`,
          {
            authUserId,
            accountStatus,
            banDuration,
            error: error.message,
            errorCode: error.status,
            errorDetails: JSON.stringify(error),
            updatedAppMetadata,
          },
        );
        // Non-blocking: enforcement action is still recorded in DB
        return;
      }

      // Verify the update actually happened by checking the response
      const updatedAppMetadataCheck = (data?.user?.app_metadata as Record<string, any>) || {};
      const actualStatus = updatedAppMetadataCheck.account_status;

      if (actualStatus !== accountStatus) {
        this.logger.error(
          `[MIRROR] Update appeared successful but account_status mismatch`,
          {
            authUserId,
            expectedStatus: accountStatus,
            actualStatus: actualStatus,
            responseData: JSON.stringify(data?.user),
            updatedAppMetadataCheck,
          },
        );
        return;
      }

      // Double-check by re-fetching the user from Supabase to confirm persistence
      const { data: verifyData, error: verifyError } = await this.supabaseService.client.auth.admin.getUserById(
        authUserId,
      );

      if (verifyError) {
        this.logger.warn(
          `[MIRROR] Could not verify update persistence`,
          {
            authUserId,
            verifyError: verifyError.message,
          },
        );
      } else {
        const persistedAppMetadata = (verifyData?.user?.app_metadata as Record<string, any>) || {};
        const persistedStatus = persistedAppMetadata.account_status;

        if (persistedStatus !== accountStatus) {
          this.logger.error(
            `[MIRROR] Update succeeded but did not persist in Supabase`,
            {
              authUserId,
              expectedStatus: accountStatus,
              persistedStatus: persistedStatus,
              persistedAppMetadata,
            },
          );
        } else {
          this.logger.log(
            `[MIRROR] Successfully mirrored and verified account_status in Supabase`,
            {
              authUserId,
              accountStatus,
              banDuration,
              supabaseUserId: data?.user?.id,
              verifiedAppMetadata: updatedAppMetadataCheck,
              persistedAppMetadata,
            },
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `[MIRROR] Exception while mirroring account_status to Supabase`,
        {
          authUserId,
          accountStatus,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      );
      // Non-blocking: enforcement action is still recorded in DB
    }
  }

  /**
   * Check if an entity can operate (create events, stream)
   * Entity is operational only if:
   * - entity.status === ACTIVE AND
   * - owner.account_status === ACTIVE
   */
  private canOperateEntity(entity: any, owner: any): boolean {
    const entityStatus = String(entity.status);
    const ownerAccountStatus = owner?.account_status || "ACTIVE";
    
    return entityStatus === "ACTIVE" && ownerAccountStatus === "ACTIVE";
  }

  /**
   * Force session invalidation by revoking all refresh tokens
   * This ensures suspended/disabled users must reauthenticate
   */
  private async invalidateUserSessions(userId: string): Promise<void> {
    try {
      const user = await (this.prisma as any).app_users.findUnique({
        where: { id: userId },
        select: { authUserId: true },
      });

      if (!user?.authUserId) {
        this.logger.warn(
          `[SESSION] User ${userId} has no authUserId. Cannot invalidate Supabase sessions.`,
        );
        return;
      }

      // Revoke all refresh tokens for the user using Supabase Admin API
      // This forces the user to reauthenticate and get a new token with updated account_status
      const { error } = await this.supabaseService.client.auth.admin.signOut(
        user.authUserId,
        "global",
      );

      if (error) {
        this.logger.error(
          `[SESSION] Failed to revoke refresh tokens for user ${userId}`,
          {
            authUserId: user.authUserId,
            error: error.message,
            errorCode: error.status,
          },
        );
        // Don't throw - enforcement action should still be recorded
      } else {
        this.logger.log(
          `[SESSION] Successfully revoked all refresh tokens for user ${userId}`,
          {
            authUserId: user.authUserId,
          },
        );
      }
    } catch (error) {
      this.logger.error(
        `[SESSION] Exception while revoking refresh tokens for user ${userId}`,
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      );
      // Don't throw - enforcement action should still be recorded
    }
  }

  /**
   * Disable an entity (ADMIN only)
   * - Updates entity status to REJECTED (disabled)
   * - Cancels all active events (LIVE, SCHEDULED)
   * - Prevents new event creation (enforced by entity status check)
   * - Records admin action with reason and timestamp
   */
  async disableEntity(
    entityId: string,
    adminId: string,
    reason: string,
  ): Promise<{ entity: any; enforcementAction: EnforcementAction; eventsCancelled: number }> {
    // Fetch entity with owner
    const entity = await (this.prisma as any).entities.findUnique({
      where: { id: entityId },
      include: {
        app_users: {
          select: {
            id: true,
            email: true,
            account_status: true,
          },
        },
        events: {
          where: {
            status: {
              in: ["LIVE", "SCHEDULED"],
            },
          },
        },
      },
    });

    if (!entity) {
      throw new NotFoundException(`Entity ${entityId} not found`);
    }

    const owner = entity.app_users;
    if (!owner) {
      throw new NotFoundException(`Owner not found for entity ${entityId}`);
    }

    const currentStatus = String(entity.status);
    const ownerAccountStatus = owner.account_status || "ACTIVE";

    // Enforce valid transition: Only SUSPENDED → DISABLED
    // DISABLED entities cannot be disabled again (no transitions from DISABLED)
    // PENDING entities cannot be disabled - they are not yet operational
    if (currentStatus === "DISABLED") {
      this.logger.warn(
        `Entity ${entityId} is already disabled. Skipping disable action.`,
      );
      return {
        entity,
        enforcementAction: {
          action: "DISABLE_ENTITY",
          entityId,
          adminId,
          reason,
          timestamp: new Date(),
          previousStatus: currentStatus,
          newStatus: currentStatus,
        },
        eventsCancelled: 0,
      };
    }

    if (currentStatus === "PENDING") {
      throw new BadRequestException(
        `Entity ${entityId} is PENDING and cannot be disabled. ` +
        `PENDING entities are not yet operational. ` +
        `Valid transitions: SUSPENDED → DISABLED (via disable), PENDING → ACTIVE (via application acceptance only).`
      );
    }

    if (currentStatus !== "SUSPENDED") {
      throw new BadRequestException(
        `Entity must be SUSPENDED to disable. Current status: ${currentStatus}. Valid transitions: SUSPENDED → DISABLED. DISABLED entities require a new application.`
      );
    }

    // Block transition if owner account is not ACTIVE
    if (ownerAccountStatus !== "ACTIVE") {
      throw new BadRequestException(
        `Cannot disable entity: Owner account status is ${ownerAccountStatus}. Entity operations require owner account to be ACTIVE.`
      );
    }

    // Use transaction to ensure atomicity
    const result = await (this.prisma as any).$transaction(async (tx: any) => {
      // 1. Update entity status to DISABLED
      const updatedEntity = await tx.entities.update({
        where: { id: entityId },
        data: {
          status: "DISABLED",
        },
      });

      // 2. Cancel all active events (LIVE, SCHEDULED)
      const cancelledEvents = await tx.events.updateMany({
        where: {
          entityId,
          status: {
            in: ["LIVE", "SCHEDULED"],
          },
        },
        data: {
          status: "CANCELLED",
        },
      });

      return {
        entity: updatedEntity,
        eventsCancelled: cancelledEvents.count,
      };
    });

    // Log enforcement action
    const enforcementAction: EnforcementAction = {
      action: "DISABLE_ENTITY",
      entityId,
      adminId,
      reason,
      timestamp: new Date(),
      previousStatus: currentStatus,
      newStatus: "DISABLED",
    };

    this.logger.log(
      `[ENFORCEMENT] Entity ${entityId} disabled by admin ${adminId}. Reason: ${reason}. Events cancelled: ${result.eventsCancelled}`,
    );

    // Fetch updated entity with relations
    const updatedEntity = await (this.prisma as any).entities.findUnique({
      where: { id: entityId },
      include: {
        app_users: {
          select: {
            id: true,
            email: true,
            user_profiles: true,
          },
        },
        entity_roles: {
          include: {
            app_users: {
              select: {
                id: true,
                email: true,
                user_profiles: true,
              },
            },
          },
        },
      },
    });

    return {
      entity: updatedEntity,
      enforcementAction,
      eventsCancelled: result.eventsCancelled,
    };
  }

  /**
   * Reinstate an entity (ADMIN only)
   * - Updates entity status to ACTIVE
   * - Does NOT restore cancelled events (they remain cancelled)
   * - Allows new event creation
   * - Records admin action with reason and timestamp
   * 
   * Domain Rules:
   * - Only SUSPENDED entities can be reinstated
   * - Cannot reinstate if owner.account_status !== ACTIVE
   */
  async reinstateEntity(
    entityId: string,
    adminId: string,
    reason: string,
  ): Promise<{ entity: any; enforcementAction: EnforcementAction }> {
    // Fetch entity with owner
    const entity = await (this.prisma as any).entities.findUnique({
      where: { id: entityId },
      include: {
        app_users: {
          select: {
            id: true,
            email: true,
            account_status: true,
          },
        },
      },
    });

    if (!entity) {
      throw new NotFoundException(`Entity ${entityId} not found`);
    }

    const owner = entity.app_users;
    if (!owner) {
      throw new NotFoundException(`Owner not found for entity ${entityId}`);
    }

    const currentStatus = String(entity.status);
    const ownerAccountStatus = owner.account_status || "ACTIVE";

    // Enforce valid transition: Only SUSPENDED → ACTIVE
    // PENDING entities cannot be reinstated - they must go through application acceptance
    if (currentStatus === "PENDING") {
      throw new BadRequestException(
        `Entity ${entityId} is PENDING and cannot be reinstated. ` +
        `PENDING entities must be activated through application acceptance only. ` +
        `Valid transitions: SUSPENDED → ACTIVE (via reinstate), PENDING → ACTIVE (via application acceptance only).`
      );
    }

    if (currentStatus !== "SUSPENDED") {
      throw new BadRequestException(
        `Entity must be SUSPENDED to reinstate. Current status: ${currentStatus}. Valid transitions: SUSPENDED → ACTIVE`
      );
    }

    // Block transition if owner account is not ACTIVE
    if (ownerAccountStatus !== "ACTIVE") {
      throw new BadRequestException(
        `Cannot reinstate entity: Owner account status is ${ownerAccountStatus}. Entity operations require owner account to be ACTIVE.`
      );
    }

    // Update entity status to ACTIVE
    const updatedEntity = await (this.prisma as any).entities.update({
      where: { id: entityId },
      data: {
        status: "ACTIVE",
      },
      include: {
        app_users: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    // Log enforcement action
    const enforcementAction: EnforcementAction = {
      action: "REINSTATE_ENTITY",
      entityId,
      adminId,
      reason,
      timestamp: new Date(),
      previousStatus: currentStatus,
      newStatus: "ACTIVE",
    };

    this.logger.log(
      `[ENFORCEMENT] Entity ${entityId} reinstated by admin ${adminId}. Reason: ${reason}`,
    );

    // Log audit action (non-blocking)
    await this.logAuditAction({
      adminId,
      targetType: "ENTITY",
      targetId: entityId,
      action: "REINSTATE_ENTITY",
      reason,
      metadata: {
        entityName: entity.name,
        entityStatus: entity.status,
        ownerId: entity.owner_id,
      },
    });

    // Fetch updated entity with relations
    const fullEntity = await (this.prisma as any).entities.findUnique({
      where: { id: entityId },
      include: {
        app_users: {
          select: {
            id: true,
            email: true,
            user_profiles: true,
          },
        },
        entity_roles: {
          include: {
            app_users: {
              select: {
                id: true,
                email: true,
                user_profiles: true,
              },
            },
          },
        },
      },
    });

    return {
      entity: fullEntity,
      enforcementAction,
    };
  }

  /**
   * Terminate an event immediately (ADMIN only - kill switch)
   * - Ends live stream immediately
   * - Sets event.status = CANCELLED (acts as TERMINATED_BY_ADMIN)
   * - Disconnects all viewers by deleting LiveKit room
   * - Prevents restart (status remains CANCELLED)
   * - Records admin action with reason and timestamp
   * 
   * NOTE: EventStatus enum should include TERMINATED_BY_ADMIN for clarity.
   * Currently using CANCELLED as a workaround.
   */
  async terminateEvent(
    eventId: string,
    adminId: string,
    reason: string,
  ): Promise<{ event: any; enforcementAction: EnforcementAction; roomDeleted: boolean }> {
    // Fetch event with streaming session
    const event = await (this.prisma as any).events.findUnique({
      where: { id: eventId },
      include: {
        streaming_sessions: {
          where: {
            active: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    // Only allow termination if event is LIVE or PRE_LIVE
    if (event.phase !== "LIVE" && event.phase !== "PRE_LIVE") {
      throw new BadRequestException(
        `Event can only be terminated if it is LIVE or PRE_LIVE. Current phase: ${event.phase}`,
      );
    }

    const currentStatus = event.status || "SCHEDULED";
    const activeSession = event.streaming_sessions?.[0] || null;

    // Use transaction to ensure atomicity
    const result = await (this.prisma as any).$transaction(async (tx: any) => {
      let roomDeleted = false;

      // 1. Delete LiveKit room to disconnect all viewers (if session exists)
      if (activeSession && this.roomService) {
        try {
          await this.roomService.deleteRoom(activeSession.roomId);
          roomDeleted = true;
          this.logger.log(
            `[ENFORCEMENT] Deleted LiveKit room ${activeSession.roomId} for event ${eventId}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to delete LiveKit room ${activeSession.roomId}: ${error instanceof Error ? error.message : String(error)}`,
          );
          // Continue with termination even if room deletion fails
        }
      }

      // 2. Mark streaming session as inactive (if exists)
      if (activeSession) {
        await tx.streaming_sessions.update({
          where: { id: activeSession.id },
          data: {
            active: false,
            endTime: new Date(),
          },
        });
      }

      // 3. Update event status to CANCELLED (acts as TERMINATED_BY_ADMIN)
      // Set phase to POST_LIVE to prevent further streaming
      const updatedEvent = await tx.events.update({
        where: { id: eventId },
        data: {
          status: "CANCELLED", // TODO: Use TERMINATED_BY_ADMIN when enum is updated
          phase: "POST_LIVE",
          lastLaunchedBy: adminId,
        },
      });

      return {
        event: updatedEvent,
        roomDeleted,
      };
    });

    // Log enforcement action
    const enforcementAction: EnforcementAction = {
      action: "TERMINATE_EVENT",
      eventId,
      adminId,
      reason,
      timestamp: new Date(),
      previousStatus: currentStatus,
      newStatus: "CANCELLED", // TODO: Use TERMINATED_BY_ADMIN when enum is updated
    };

    this.logger.log(
      `[ENFORCEMENT] Event ${eventId} terminated by admin ${adminId}. Reason: ${reason}. LiveKit room deleted: ${result.roomDeleted}`,
    );

    // Fetch updated event with relations
    const updatedEvent = await (this.prisma as any).events.findUnique({
      where: { id: eventId },
      include: {
        entities: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        streaming_sessions: {
          where: {
            active: false,
          },
          orderBy: {
            endTime: "desc",
          },
          take: 1,
          select: {
            id: true,
            roomId: true,
            active: true,
            endTime: true,
          },
        },
      },
    });

    return {
      event: updatedEvent,
      enforcementAction,
      roomDeleted: result.roomDeleted,
    };
  }

  /**
   * Get all admin reports (ADMIN only)
   * - Returns all reports with optional status filtering
   * - Includes reporter, resolver, entity, and event relations
   */
  /**
   * Get admin reports (ADMIN only)
   * Returns normalized response matching frontend AdminReport interface
   * Safely handles nullable relations and missing data
   * NEVER throws - returns [] on failure
   */
  async getReports(status?: "OPEN" | "RESOLVED" | "DISMISSED"): Promise<any[]> {
    try {
      // Build where clause - safely handle undefined status
      const where: any = {};
      if (status && ["OPEN", "RESOLVED", "DISMISSED"].includes(status)) {
        where.status = status;
      }

      // Query with minimal select - avoid complex relation includes that may fail
      const reports = await (this.prisma as any).admin_reports.findMany({
        where,
        select: {
          id: true,
          reporter_user_id: true,
          reporter_role: true,
          message: true,
          entity_id: true,
          event_id: true,
          status: true,
          resolved_at: true,
          resolved_by: true,
          resolution_notes: true,
          created_at: true,
        },
        orderBy: {
          created_at: "desc",
        },
      });

      // Normalize response - fetch relations separately with error handling
      const normalizedReports = [];
      for (const report of reports) {
        try {
          // Safely fetch reporter (required)
          let reporter: { id: string; email: string } | undefined;
          if (report.reporter_user_id) {
            const reporterUser = await (this.prisma as any).app_users.findUnique({
              where: { id: report.reporter_user_id },
              select: { id: true, email: true },
            });
            if (reporterUser) {
              reporter = { id: reporterUser.id, email: reporterUser.email };
            }
          }

          // Safely fetch resolver (nullable)
          let resolvedBy: { id: string; email: string } | undefined;
          if (report.resolved_by) {
            const resolverUser = await (this.prisma as any).app_users.findUnique({
              where: { id: report.resolved_by },
              select: { id: true, email: true },
            });
            if (resolverUser) {
              resolvedBy = { id: resolverUser.id, email: resolverUser.email };
            }
          }

          // Safely fetch entity (nullable)
          let entity: { id: string; name: string } | undefined;
          if (report.entity_id) {
            const entityRecord = await (this.prisma as any).entities.findUnique({
              where: { id: report.entity_id },
              select: { id: true, name: true },
            });
            if (entityRecord) {
              entity = { id: entityRecord.id, name: entityRecord.name };
            }
          }

          // Safely fetch event (nullable)
          let event: { id: string; name: string } | undefined;
          if (report.event_id) {
            const eventRecord = await (this.prisma as any).events.findUnique({
              where: { id: report.event_id },
              select: { id: true, name: true },
            });
            if (eventRecord) {
              event = { id: eventRecord.id, name: eventRecord.name };
            }
          }

          // Normalize response with safe date conversion
          normalizedReports.push({
            id: String(report.id || ""),
            status: report.status || "OPEN",
            message: String(report.message || ""),
            createdAt: report.created_at instanceof Date ? report.created_at.toISOString() : new Date().toISOString(),
            reporter: reporter,
            resolvedBy: resolvedBy,
            entity: entity,
            event: event,
          });
        } catch (rowError) {
          // Skip individual row if it fails, but continue processing others
          console.warn(
            `[ADMIN REPORTS] Failed to process report ${report?.id || "unknown"}: ${rowError instanceof Error ? rowError.message : String(rowError)}`,
          );
        }
      }

      return normalizedReports;
    } catch (error) {
      // Defensive: If reports query fails, return empty array instead of crashing
      console.error(
        `[ADMIN REPORTS ERROR] Failed to fetch admin reports: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return [];
    }
  }

  /**
   * Get all users (ADMIN only)
   * - Returns all users from app_users table
   * - Includes user_profiles relation (normalized to profile)
   * - Ordered by createdAt descending
   */
  async getUsers(): Promise<{ data: any[] }> {
    const users = await (this.prisma as any).app_users.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user_profiles: true,
      },
    });

    // Normalize response: remove password, map user_profiles to profile
    // This matches the frontend contract and prevents Prisma relation names from leaking
    const usersWithoutPasswords = users.map(({ password, user_profiles, ...user }) => ({
      ...user,
      profile: user_profiles || null,
    }));

    return { data: usersWithoutPasswords };
  }

  /**
   * Promote a user to ENTITY role (ADMIN only)
   * - Sets app_users.role = ENTITY
   * - Prevents promoting disabled users
   */
  async promoteUser(
    userId: string,
    adminId: string,
    reason: string,
  ): Promise<{ user: any; enforcementAction: EnforcementAction }> {
    const user = await (this.prisma as any).app_users.findUnique({
      where: { id: userId },
      include: {
        user_profiles: true,
        entities: {
          where: {
            status: {
              in: ["APPROVED", "PENDING"],
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Check if user is disabled
    const preferences = (user.user_profiles?.preferences as any) || {};
    if (preferences.isDisabled === true) {
      throw new BadRequestException("Cannot promote a disabled user");
    }

    // If already ENTITY, return current state
    if (user.role === UserRole.ENTITY) {
      this.logger.warn(`User ${userId} is already ENTITY. Skipping promotion.`);
      return {
        user,
        enforcementAction: {
          action: "PROMOTE",
          userId,
          adminId,
          reason,
          timestamp: new Date(),
          previousStatus: user.role,
          newStatus: user.role,
        },
      };
    }

    // Update user role to ENTITY
    const updatedUser = await (this.prisma as any).app_users.update({
      where: { id: userId },
      data: {
        role: UserRole.ENTITY,
      },
      include: {
        user_profiles: true,
      },
    });

    const enforcementAction: EnforcementAction = {
      action: "PROMOTE",
      userId,
      adminId,
      reason,
      timestamp: new Date(),
      previousStatus: user.role,
      newStatus: UserRole.ENTITY,
    };

    this.logger.log(
      `[ENFORCEMENT] User ${userId} promoted to ENTITY by admin ${adminId}. Reason: ${reason}`,
    );

    // Log audit action (non-blocking)
    await this.logAuditAction({
      adminId,
      targetType: "USER",
      targetId: userId,
      action: "PROMOTE",
      reason,
      metadata: {
        previousRole: user.role,
        newRole: UserRole.ENTITY,
        userEmail: user.email,
      },
    });

    return {
      user: updatedUser,
      enforcementAction,
    };
  }

  /**
   * Demote a user from ENTITY role (ADMIN only)
   * - Prevents demoting self
   * - Prevents demoting ADMIN while logged in
   * - Prevents demoting last ADMIN
   * - Prevents demoting users with active entities
   */
  async demoteUser(
    userId: string,
    adminId: string,
    reason: string,
  ): Promise<{ user: any; enforcementAction: EnforcementAction }> {
    // Prevent demoting self
    if (userId === adminId) {
      throw new BadRequestException(
        "You cannot demote your own account. Please ask another administrator to perform this action.",
      );
    }

    const user = await (this.prisma as any).app_users.findUnique({
      where: { id: userId },
      include: {
        user_profiles: true,
        entities: {
          where: {
            status: {
              in: ["APPROVED", "PENDING"],
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Prevent demoting ADMIN while logged in
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException(
        "Cannot demote an ADMIN user. ADMIN users cannot be demoted to prevent loss of administrative access.",
      );
    }

    // Prevent demoting last ADMIN (defensive check, though ADMIN check above should catch this)
    if (user.role === UserRole.ADMIN) {
      const adminCount = await (this.prisma as any).app_users.count({
        where: { role: UserRole.ADMIN },
      });

      if (adminCount <= 1) {
        throw new BadRequestException(
          "Cannot demote the last ADMIN user. At least one administrator must remain active.",
        );
      }
    }

    // Prevent demoting users with active entities
    if (user.entities && user.entities.length > 0) {
      throw new BadRequestException(
        `Cannot demote user with ${user.entities.length} active entity/entities. Disable entities first.`,
      );
    }

    // If not ENTITY, return current state
    if (user.role !== UserRole.ENTITY) {
      this.logger.warn(`User ${userId} is not ENTITY (current role: ${user.role}). Skipping demotion.`);
      return {
        user,
        enforcementAction: {
          action: "DEMOTE",
          userId,
          adminId,
          reason,
          timestamp: new Date(),
          previousStatus: user.role,
          newStatus: user.role,
        },
      };
    }

    // Update user role to USER
    const updatedUser = await (this.prisma as any).app_users.update({
      where: { id: userId },
      data: {
        role: UserRole.USER,
      },
      include: {
        user_profiles: true,
      },
    });

    const enforcementAction: EnforcementAction = {
      action: "DEMOTE",
      userId,
      adminId,
      reason,
      timestamp: new Date(),
      previousStatus: UserRole.ENTITY,
      newStatus: UserRole.USER,
    };

    this.logger.log(
      `[ENFORCEMENT] User ${userId} demoted from ENTITY to USER by admin ${adminId}. Reason: ${reason}`,
    );

    return {
      user: updatedUser,
      enforcementAction,
    };
  }

  /**
   * Disable a user (ADMIN only)
   * - Sets account_status = DISABLED
   * - Permanently bans Supabase user
   * - Blocks login via auth guard
   */
  async disableUser(
    userId: string,
    adminId: string,
    reason: string,
  ): Promise<{ user: any; enforcementAction: EnforcementAction }> {
    // Prevent admin from disabling themselves
    if (userId === adminId) {
      throw new BadRequestException(
        "You cannot disable your own account. Please ask another administrator to perform this action.",
      );
    }

    const user = await (this.prisma as any).app_users.findUnique({
      where: { id: userId },
      include: {
        user_profiles: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Prevent disabling last ADMIN
    if (user.role === UserRole.ADMIN) {
      const adminCount = await (this.prisma as any).app_users.count({
        where: { role: UserRole.ADMIN },
      });

      if (adminCount <= 1) {
        throw new BadRequestException(
          "Cannot disable the last ADMIN user. At least one administrator must remain active.",
        );
      }
    }

    // Use account_status as single source of truth
    const currentStatus = user.account_status || "ACTIVE";

    // If already disabled, return current state
    if (currentStatus === "DISABLED") {
      this.logger.warn(`User ${userId} is already DISABLED. Skipping disable action.`);
      return {
        user,
        enforcementAction: {
          action: "DISABLE_USER",
          userId,
          adminId,
          reason,
          timestamp: new Date(),
          previousStatus: currentStatus,
          newStatus: currentStatus,
        },
      };
    }

    // Update account_status in database (single source of truth)
    const updatedUser = await (this.prisma as any).app_users.update({
      where: { id: userId },
      data: {
        account_status: "DISABLED",
      },
      include: {
        user_profiles: true,
      },
    });

    // Mirror to Supabase (downstream) - permanent ban
    if (user.authUserId) {
      await this.mirrorAccountStatusToSupabase(user.authUserId, "DISABLED");
      // Force logout by invalidating Supabase sessions
      await this.invalidateUserSessions(userId);
    }

    const enforcementAction: EnforcementAction = {
      action: "DISABLE_USER",
      userId,
      adminId,
      reason,
      timestamp: new Date(),
      previousStatus: currentStatus,
      newStatus: "DISABLED",
    };

    this.logger.log(
      `[ENFORCEMENT] User ${userId} disabled by admin ${adminId}. Reason: ${reason}`,
    );

    // Log audit action (non-blocking)
    await this.logAuditAction({
      adminId,
      targetType: "USER",
      targetId: userId,
      action: "DISABLE_USER",
      reason,
      metadata: {
        userEmail: user.email,
        userRole: user.role,
        previousStatus: currentStatus,
        newStatus: "DISABLED",
      },
    });

    return {
      user: updatedUser,
      enforcementAction,
    };
  }

  /**
   * Enable a user (ADMIN only)
   * - Sets account_status = ACTIVE
   * - Removes Supabase ban
   */
  async enableUser(
    userId: string,
    adminId: string,
    reason: string,
  ): Promise<{ user: any; enforcementAction: EnforcementAction }> {
    const user = await (this.prisma as any).app_users.findUnique({
      where: { id: userId },
      include: {
        user_profiles: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Use account_status as single source of truth
    const currentStatus = user.account_status || "ACTIVE";

    // If already active, return current state
    if (currentStatus === "ACTIVE") {
      this.logger.warn(`User ${userId} is already ACTIVE. Skipping enable action.`);
      return {
        user,
        enforcementAction: {
          action: "ENABLE_USER",
          userId,
          adminId,
          reason,
          timestamp: new Date(),
          previousStatus: currentStatus,
          newStatus: currentStatus,
        },
      };
    }

    // Update account_status in database (single source of truth)
    const updatedUser = await (this.prisma as any).app_users.update({
      where: { id: userId },
      data: {
        account_status: "ACTIVE",
      },
      include: {
        user_profiles: true,
      },
    });

    // Mirror to Supabase (downstream) - remove ban
    if (user.authUserId) {
      await this.mirrorAccountStatusToSupabase(user.authUserId, "ACTIVE");
    }

    const enforcementAction: EnforcementAction = {
      action: "ENABLE_USER",
      userId,
      adminId,
      reason,
      timestamp: new Date(),
      previousStatus: currentStatus,
      newStatus: "ACTIVE",
    };

    this.logger.log(
      `[ENFORCEMENT] User ${userId} enabled by admin ${adminId}. Reason: ${reason}`,
    );

    // Log audit action (non-blocking)
    await this.logAuditAction({
      adminId,
      targetType: "USER",
      targetId: userId,
      action: "ENABLE_USER",
      reason,
      metadata: {
        userEmail: user.email,
        previousStatus: currentStatus,
        newStatus: "ACTIVE",
      },
    });

    return {
      user: updatedUser,
      enforcementAction,
    };
  }

  /**
   * Promote a user to ADMIN role (ADMIN only)
   * - Sets app_users.role = ADMIN
   * - Prevents promoting disabled users
   * - Cannot promote yourself
   * - Updates Supabase metadata if applicable
   * 
   * Domain Rule: Users become creators ONLY through approved applications.
   * This method only manages platform ADMIN role, not creator status.
   */
  async promoteToAdmin(
    userId: string,
    adminId: string,
    reason: string,
  ): Promise<{ user: any; enforcementAction: EnforcementAction }> {
    // Prevent promoting yourself
    if (userId === adminId) {
      throw new BadRequestException(
        "You cannot promote your own account. Please ask another administrator to perform this action.",
      );
    }

    const user = await (this.prisma as any).app_users.findUnique({
      where: { id: userId },
      include: {
        user_profiles: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Check if user is disabled
    const preferences = (user.user_profiles?.preferences as any) || {};
    if (preferences.isDisabled === true) {
      throw new BadRequestException("Cannot promote a disabled user to ADMIN");
    }

    // If already ADMIN, return current state
    if (user.role === UserRole.ADMIN) {
      this.logger.warn(`User ${userId} is already ADMIN. Skipping promotion.`);
      return {
        user,
        enforcementAction: {
          action: "PROMOTE_TO_ADMIN",
          userId,
          adminId,
          reason,
          timestamp: new Date(),
          previousStatus: user.role,
          newStatus: user.role,
        },
      };
    }

    // Update user role to ADMIN
    const updatedUser = await (this.prisma as any).app_users.update({
      where: { id: userId },
      data: {
        role: UserRole.ADMIN,
      },
      include: {
        user_profiles: true,
      },
    });

    // Note: Supabase user metadata is managed separately from app_users.role
    // The app_users.role is the source of truth for authorization
    // Supabase metadata updates are handled separately if needed

    const enforcementAction: EnforcementAction = {
      action: "PROMOTE_TO_ADMIN",
      userId,
      adminId,
      reason,
      timestamp: new Date(),
      previousStatus: user.role,
      newStatus: UserRole.ADMIN,
    };

    this.logger.log(
      `[ENFORCEMENT] User ${userId} promoted to ADMIN by admin ${adminId}. Reason: ${reason}`,
    );

    // Log audit action (non-blocking)
    await this.logAuditAction({
      adminId,
      targetType: "USER",
      targetId: userId,
      action: "PROMOTE_TO_ADMIN",
      reason,
      metadata: {
        userEmail: user.email,
        previousRole: user.role,
        newRole: UserRole.ADMIN,
      },
    });

    return {
      user: updatedUser,
      enforcementAction,
    };
  }

  /**
   * Demote an ADMIN user to USER role (ADMIN only)
   * - Sets app_users.role = USER
   * - Prevents demoting yourself
   * - Prevents demoting last remaining ADMIN
   * - Updates Supabase metadata if applicable
   * 
   * Domain Rule: This only affects platform ADMIN role.
   * Creator status (ENTITY role) is managed separately through applications.
   */
  async demoteAdmin(
    userId: string,
    adminId: string,
    reason: string,
  ): Promise<{ user: any; enforcementAction: EnforcementAction }> {
    // Prevent demoting yourself
    if (userId === adminId) {
      throw new BadRequestException(
        "You cannot demote your own account. Please ask another administrator to perform this action.",
      );
    }

    const user = await (this.prisma as any).app_users.findUnique({
      where: { id: userId },
      include: {
        user_profiles: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Prevent demoting last ADMIN
    if (user.role === UserRole.ADMIN) {
      const adminCount = await (this.prisma as any).app_users.count({
        where: { role: UserRole.ADMIN },
      });

      if (adminCount <= 1) {
        throw new BadRequestException(
          "Cannot demote the last ADMIN user. At least one administrator must remain active.",
        );
      }
    }

    // If not ADMIN, return current state
    if (user.role !== UserRole.ADMIN) {
      this.logger.warn(`User ${userId} is not ADMIN (current role: ${user.role}). Skipping demotion.`);
      return {
        user,
        enforcementAction: {
          action: "DEMOTE_ADMIN",
          userId,
          adminId,
          reason,
          timestamp: new Date(),
          previousStatus: user.role,
          newStatus: user.role,
        },
      };
    }

    // Update user role to USER
    const updatedUser = await (this.prisma as any).app_users.update({
      where: { id: userId },
      data: {
        role: UserRole.USER,
      },
      include: {
        user_profiles: true,
      },
    });

    // Note: Supabase user metadata is managed separately from app_users.role
    // The app_users.role is the source of truth for authorization
    // Supabase metadata updates are handled separately if needed

    const enforcementAction: EnforcementAction = {
      action: "DEMOTE_ADMIN",
      userId,
      adminId,
      reason,
      timestamp: new Date(),
      previousStatus: UserRole.ADMIN,
      newStatus: UserRole.USER,
    };

    this.logger.log(
      `[ENFORCEMENT] User ${userId} demoted from ADMIN to USER by admin ${adminId}. Reason: ${reason}`,
    );

    // Log audit action (non-blocking)
    await this.logAuditAction({
      adminId,
      targetType: "USER",
      targetId: userId,
      action: "DEMOTE_ADMIN",
      reason,
      metadata: {
        userEmail: user.email,
        previousRole: UserRole.ADMIN,
        newRole: UserRole.USER,
      },
    });

    return {
      user: updatedUser,
      enforcementAction,
    };
  }

  /**
   * Get all entities (admin only)
   * Returns entities with owner email, status, createdAt
   */
  async getEntities(): Promise<{ data: any[] }> {
    const entities = await (this.prisma as any).entities.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        app_users: {
          select: {
            id: true,
            email: true,
            account_status: true,
          },
        },
      },
    });

    // Normalize response to include owner email and account_status
    const entitiesWithOwner = entities.map((entity: any) => ({
      ...entity,
      ownerEmail: entity.app_users?.email || null,
      ownerAccountStatus: entity.app_users?.account_status || "ACTIVE",
    }));

    return { data: entitiesWithOwner };
  }

  /**
   * Suspend an entity (ADMIN only)
   * Sets entity.status = SUSPENDED (reversible)
   * 
   * Domain Rules:
   * - Only ACTIVE entities can be suspended
   * - Cannot suspend if owner.account_status !== ACTIVE
   * - Suspended entities cannot create events or stream, but can be reinstated
   */
  async suspendEntity(
    entityId: string,
    adminId: string,
    reason: string,
  ): Promise<{ entity: any; enforcementAction: EnforcementAction }> {
    const entity = await (this.prisma as any).entities.findUnique({
      where: { id: entityId },
      include: {
        app_users: {
          select: {
            id: true,
            email: true,
            account_status: true,
          },
        },
      },
    });

    if (!entity) {
      throw new NotFoundException(`Entity ${entityId} not found`);
    }

    const owner = entity.app_users;
    if (!owner) {
      throw new NotFoundException(`Owner not found for entity ${entityId}`);
    }

    const entityStatus = String(entity.status);
    const ownerAccountStatus = owner.account_status || "ACTIVE";

    // Enforce valid transition: Only ACTIVE → SUSPENDED
    // PENDING entities cannot be suspended - they are not yet operational
    if (entityStatus === "PENDING") {
      throw new BadRequestException(
        `Entity ${entityId} is PENDING and cannot be suspended. ` +
        `PENDING entities are not yet operational. ` +
        `Valid transitions: ACTIVE → SUSPENDED (via suspend), PENDING → ACTIVE (via application acceptance only).`
      );
    }

    if (entityStatus !== "ACTIVE") {
      throw new BadRequestException(
        `Entity must be ACTIVE to suspend. Current status: ${entityStatus}. Valid transitions: ACTIVE → SUSPENDED`
      );
    }

    // Block transition if owner account is not ACTIVE
    if (ownerAccountStatus !== "ACTIVE") {
      throw new BadRequestException(
        `Cannot suspend entity: Owner account status is ${ownerAccountStatus}. Entity operations require owner account to be ACTIVE.`
      );
    }

    // Update entity status to SUSPENDED
    const updatedEntity = await (this.prisma as any).entities.update({
      where: { id: entityId },
      data: {
        status: "SUSPENDED",
      },
      include: {
        app_users: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    const enforcementAction: EnforcementAction = {
      action: "SUSPEND_ENTITY",
      entityId,
      adminId,
      reason,
      timestamp: new Date(),
      previousStatus: entity.status,
      newStatus: "SUSPENDED",
    };

    this.logger.log(
      `[ENFORCEMENT] Entity ${entityId} suspended by admin ${adminId}. Reason: ${reason}`,
    );

    // Log audit action
    await this.logAuditAction({
      adminId,
      targetType: "ENTITY",
      targetId: entityId,
      action: "SUSPEND_ENTITY",
      reason,
      metadata: {
        entityName: entity.name,
        entityStatus: entity.status,
        ownerId: entity.ownerId,
      },
    });

    return {
      entity: {
        ...updatedEntity,
        ownerEmail: updatedEntity.app_users?.email || null,
      },
      enforcementAction,
    };
  }

  /**
   * Reject an entity (ADMIN only)
   * Sets entity.status = REJECTED
   */

  

  async rejectEntity(
    entityId: string,
    adminId: string,
    reason: string,
  ): Promise<{ entity: any; enforcementAction: EnforcementAction }> {
    const entity = await (this.prisma as any).entities.findUnique({
      where: { id: entityId },
      include: {
        app_users: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!entity) {
      throw new NotFoundException(`Entity ${entityId} not found`);
    }

    // If already REJECTED, return current state
    if (entity.status === "REJECTED") {
      this.logger.warn(`Entity ${entityId} is already REJECTED. Skipping rejection.`);
      return {
        entity: {
          ...entity,
          ownerEmail: entity.app_users?.email || null,
        },
        enforcementAction: {
          action: "REJECT_ENTITY",
          entityId,
          adminId,
          reason,
          timestamp: new Date(),
          previousStatus: entity.status,
          newStatus: entity.status,
        },
      };
    }

    // Transaction: Reject entity and update related application
    const updatedEntity = await (this.prisma as any).$transaction(async (tx: any) => {
      // 1. Update entity status to REJECTED
      const updated = await tx.entities.update({
      where: { id: entityId },
      data: {
        status: "REJECTED",
      },
      include: {
        app_users: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      });

      // 2. Update related entity_applications to REJECTED
      await tx.entity_applications.updateMany({
        where: { entity_id: entityId },
        data: { status: "REJECTED" },
      });

      return updated;
    });

    const enforcementAction: EnforcementAction = {
      action: "REJECT_ENTITY",
      entityId,
      adminId,
      reason,
      timestamp: new Date(),
      previousStatus: entity.status,
      newStatus: "REJECTED",
    };

    this.logger.log(
      `[ENFORCEMENT] Entity ${entityId} rejected by admin ${adminId}. Reason: ${reason}`,
    );
    this.logger.log(
      `[REJECT_ENTITY] Updated related entity_applications to REJECTED for entity ${entityId}`,
    );

    // Log audit action (non-blocking)
    await this.logAuditAction({
      adminId,
      targetType: "ENTITY",
      targetId: entityId,
      action: "REJECT_ENTITY",
      reason,
      metadata: {
        entityName: entity.name,
        entityStatus: entity.status,
        ownerId: entity.owner_id,
      },
    });

    return {
      entity: {
        ...updatedEntity,
        ownerEmail: updatedEntity.app_users?.email || null,
      },
      enforcementAction,
    };
  }

  /**
   * Get entity applications (ADMIN only)
   * Returns ONLY PENDING applications - no enrichment, stable query
   * Applications represent ONLY pending entity applications
   * Returns { data: ApplicationRow[] } for consistency with other endpoints
   */
  async getEntityApplications(): Promise<{ data: any[] }> {
    try {
      this.logger.log("[GET ENTITY APPLICATIONS] Querying for PENDING applications...");
      const rows = await this.prisma.$queryRaw<Array<{
        id: string;
        entity_id: string;
        owner_id: string;
        status: string;
        reason: string | null;
        proof: any;
        created_at: Date;
        updated_at: Date;
        entity_name: string | null;
      }>>(
        Prisma.sql`
          SELECT 
            ea.id, 
            ea.entity_id, 
            ea.owner_id, 
            ea.status, 
            ea.reason, 
            ea.proof, 
            ea.created_at, 
            ea.updated_at,
            e.name AS entity_name
          FROM entity_applications ea
          LEFT JOIN entities e ON e.id = ea.entity_id
          WHERE ea.status = 'PENDING'
          ORDER BY ea.created_at DESC
        `
      );

      this.logger.log(`[GET ENTITY APPLICATIONS] Found ${rows.length} rows from database`);

      // Normalize to camelCase
      const normalized = rows.map((row: any) => {
        // Debug logging for first row to check entity_name
        if (rows.indexOf(row) === 0 && rows.length > 0) {
          this.logger.log(`[GET ENTITY APPLICATIONS] Sample row - entity_id: ${row.entity_id}, entity_name: ${row.entity_name}, row keys: ${Object.keys(row).join(", ")}`);
        }
        const normalizedRow = {
          id: String(row.id),
          status: row.status || "PENDING",
        entityId: row.entity_id ? String(row.entity_id) : null,
        ownerId: row.owner_id ? String(row.owner_id) : null,
          reason: row.reason || null,
          proof: row.proof || null,
          entityName: row.entity_name || null,
          createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || ""),
          updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at || ""),
        };
        // Log if entityName is null but entityId exists
        if (!normalizedRow.entityName && normalizedRow.entityId && rows.indexOf(row) === 0) {
          this.logger.warn(`[GET ENTITY APPLICATIONS] Entity name is null for entity_id: ${normalizedRow.entityId}. This may indicate the entity doesn't exist or the JOIN failed.`);
        }
        return normalizedRow;
      });

      this.logger.log(`[GET ENTITY APPLICATIONS] Returning ${normalized.length} normalized applications`);
      return { data: normalized };
    } catch (error) {
      this.logger.error(
        `[GET ENTITY APPLICATIONS] Failed to fetch applications: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return { data: [] };
    }
  }

  /**
   * Get a single entity application by ID (ADMIN only)
   * Returns enriched application data with related entity and applicant records
   * Used for detailed review in ApplicationReviewDrawer
   */
  async getEntityApplicationById(applicationId: string): Promise<{
    applicationId: string;
    status: string;
    reason: string | null;
    proof: any;
    telephoneNumber: string | null;
    createdAt: string;
    entity: {
      id: string;
      name: string;
      slug: string;
      bio: string | null;
      tags: string[];
      status: string;
    } | null;
    applicant: {
      id: string;
      email: string;
      role: string;
      phone: string | null;
    } | null;
  }> {
    try {
      const rows = await this.prisma.$queryRaw<Array<{
        application_id: string;
        application_status: string;
        application_reason: string | null;
        application_proof: any;
        application_phone: string | null;
        application_created_at: Date;
        entity_id: string | null;
        entity_name: string | null;
        entity_slug: string | null;
        entity_bio: string | null;
        entity_tags: string[] | null;
        entity_status: string | null;
        applicant_id: string | null;
        applicant_email: string | null;
        applicant_role: string | null;
        applicant_preferences: any | null;
      }>>(
        Prisma.sql`
          SELECT
            ea.id                AS application_id,
            ea.status            AS application_status,
            ea.reason            AS application_reason,
            ea.proof             AS application_proof,
            ea.phone              AS application_phone,
            ea.created_at        AS application_created_at,
            e.id                 AS entity_id,
            e.name               AS entity_name,
            e.slug               AS entity_slug,
            e.bio                AS entity_bio,
            e.tags               AS entity_tags,
            e.status             AS entity_status,
            u.id                 AS applicant_id,
            u.email              AS applicant_email,
            u.role               AS applicant_role,
            up.preferences       AS applicant_preferences
          FROM entity_applications ea
          LEFT JOIN entities e ON e.id = ea.entity_id
          LEFT JOIN app_users u ON u.id = ea.owner_id
          LEFT JOIN user_profiles up ON up."userId" = u.id
          WHERE ea.id = ${applicationId}::uuid
          LIMIT 1
        `
      );

      if (!rows || rows.length === 0) {
        throw new NotFoundException(`Application ${applicationId} not found`);
      }

      const row = rows[0];

      let proof = row.application_proof;
      if (proof && typeof proof === "string") {
        try {
          proof = JSON.parse(proof);
        } catch (e) {
          // Keep original value if parsing fails
        }
      }

      let entityTags = row.entity_tags;
      if (entityTags && typeof entityTags === "string") {
        try {
          entityTags = JSON.parse(entityTags);
        } catch (e) {
          entityTags = [];
        }
      }

      // Extract telephone number from entity_applications.phone (primary source)
      // Fallback to user_profiles.preferences and proof field for backward compatibility
      let telephoneNumber: string | null = null;
      
      // Primary: Get phone directly from entity_applications.phone column
      if (row.application_phone) {
        telephoneNumber = String(row.application_phone);
        this.logger.log(`[GET ENTITY APPLICATION BY ID] Found telephone number from entity_applications.phone: ${telephoneNumber}`);
      } else {
        // Fallback 1: Get phone from user_profiles.preferences JSON
        if (row.applicant_preferences && typeof row.applicant_preferences === "object") {
          const prefs = row.applicant_preferences as Record<string, any>;
          telephoneNumber = prefs.phone || prefs.telephone || prefs.telephoneNumber || null;
          if (telephoneNumber) {
            this.logger.debug(`[GET ENTITY APPLICATION BY ID] Found telephone number from user_profiles.preferences: ${telephoneNumber}`);
          }
        } else if (row.applicant_preferences && typeof row.applicant_preferences === "string") {
          // If preferences is a string, try to parse it
          try {
            const prefs = JSON.parse(row.applicant_preferences) as Record<string, any>;
            telephoneNumber = prefs.phone || prefs.telephone || prefs.telephoneNumber || null;
            if (telephoneNumber) {
              this.logger.debug(`[GET ENTITY APPLICATION BY ID] Found telephone number from parsed user_profiles.preferences: ${telephoneNumber}`);
            }
          } catch (e) {
            // Not JSON, ignore
          }
        }
        
        // Fallback 2: Extract from proof field if still not found (legacy)
        if (!telephoneNumber && proof && typeof proof === "object" && proof !== null) {
          const proofObj = proof as Record<string, any>;
          telephoneNumber = proofObj.verificationPhone || proofObj.telephone || proofObj.phone || proofObj.telephoneNumber || null;
          if (telephoneNumber) {
            this.logger.debug(`[GET ENTITY APPLICATION BY ID] Found telephone number from proof field (legacy): ${telephoneNumber}`);
          }
        } else if (!telephoneNumber && proof && typeof proof === "string") {
          // If proof is a string (legacy format), try to parse it
          try {
            const parsed = JSON.parse(proof);
            if (parsed && typeof parsed === "object") {
              telephoneNumber = parsed.verificationPhone || parsed.telephone || parsed.phone || parsed.telephoneNumber || null;
              if (telephoneNumber) {
                this.logger.debug(`[GET ENTITY APPLICATION BY ID] Found telephone number from proof string (legacy): ${telephoneNumber}`);
              }
            }
          } catch (e) {
            // Not JSON, ignore
          }
        }
      }
      
      // Final debug log
      if (telephoneNumber) {
        this.logger.log(`[GET ENTITY APPLICATION BY ID] Telephone number present in response: ${telephoneNumber}`);
      } else {
        this.logger.debug(`[GET ENTITY APPLICATION BY ID] No telephone number found (checked entity_applications.phone, user_profiles.preferences, and proof field)`);
      }

      return {
        applicationId: String(row.application_id),
        status: row.application_status || "PENDING",
        reason: row.application_reason || null,
        proof: proof || null,
        telephoneNumber: telephoneNumber,
        createdAt: row.application_created_at instanceof Date ? row.application_created_at.toISOString() : String(row.application_created_at),
        entity: row.entity_id ? {
          id: String(row.entity_id),
          name: row.entity_name || "",
          slug: row.entity_slug || "",
          bio: row.entity_bio || null,
          tags: Array.isArray(entityTags) ? entityTags : [],
          status: row.entity_status || "PENDING",
        } : null,
        applicant: row.applicant_id ? {
          id: String(row.applicant_id),
          email: row.applicant_email || "",
          role: row.applicant_role || "",
          phone: telephoneNumber || null,
        } : null,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `[GET ENTITY APPLICATION BY ID] Failed to fetch application ${applicationId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }  
  }

  /**
   * Accept an entity application (ADMIN only)
   * - Sets application.status = ACCEPTED
   * - Sets entity.status = ACTIVE (from PENDING)
   * - Creates entity_roles (OWNER)
   * - Promotes user: app_users.role = ENTITY
   * 
   * All operations are performed in a single Prisma transaction for atomicity.
   */
  async acceptApplication(
    applicationId: string,
    adminId: string,
    reason: string,
  ): Promise<{ application: any; enforcementAction: EnforcementAction }> {
    // Validate inputs
    if (!applicationId || typeof applicationId !== "string") {
      throw new BadRequestException("Application ID is required and must be a string");
    }

    if (!adminId || typeof adminId !== "string") {
      throw new BadRequestException("Admin ID is required and must be a string");
    }

    if (!reason || typeof reason !== "string" || reason.trim().length < 10) {
      throw new BadRequestException("Reason is required and must be at least 10 characters");
    }

    // Declare variables at function scope
    let entityId: string;
    let userId: string;
    let previousStatus: string;
    let applicationRow: {
      id: string;
      entity_id: string;
      owner_id: string;
      status: string;
      reason: string | null;
      proof: any;
      created_at: Date;
      updated_at: Date;
      entity_name: string | null;
      entity_status: string | null;
      user_id: string | null;
      user_email: string | null;
      user_role: string | null;
    };

    try {
      this.logger.log(
        `[ACCEPT_APPLICATION] Starting acceptance process for application ${applicationId} by admin ${adminId}`
      );

      // Step 1: Fetch application with related data using raw SQL (Prisma doesn't expose entity_applications model)
      // NOTE: entity_applications.entity_id and entities.id are both TEXT in Supabase - use plain text comparison
      const applicationRows = await this.prisma.$queryRaw<Array<{
        id: string;
        entity_id: string;
        owner_id: string;
        status: string;
        reason: string | null;
        proof: any;
        created_at: Date;
        updated_at: Date;
        entity_name: string | null;
        entity_status: string | null;
        user_id: string | null;
        user_email: string | null;
        user_role: string | null;
      }>>(
        Prisma.sql`
          SELECT 
            ea.id,
            ea.entity_id,
            ea.owner_id,
            ea.status,
            ea.reason,
            ea.proof,
            ea.created_at,
            ea.updated_at,
            e.name AS entity_name,
            e.status AS entity_status,
            u.id AS user_id,
            u.email AS user_email,
            u.role AS user_role
          FROM entity_applications ea
          LEFT JOIN entities e ON e.id = ea.entity_id
          LEFT JOIN app_users u ON u.id = ea.owner_id
          WHERE ea.id = ${applicationId}::uuid
          LIMIT 1
        `
      );

      if (!applicationRows || applicationRows.length === 0) {
        this.logger.error(`[ACCEPT_APPLICATION] Application ${applicationId} not found`);
        throw new NotFoundException(`Application ${applicationId} not found`);
      }

      applicationRow = applicationRows[0];
      entityId = applicationRow.entity_id;
      userId = applicationRow.owner_id;
      previousStatus = applicationRow.status;

      // Step 2: Validate required fields
      if (!entityId) {
        this.logger.error(`[ACCEPT_APPLICATION] Application ${applicationId} has no entity_id`);
        throw new BadRequestException(
          `Application ${applicationId} is missing required entity_id. Application may be corrupted.`
        );
      }

      if (!userId) {
        this.logger.error(`[ACCEPT_APPLICATION] Application ${applicationId} has no owner_id`);
        throw new BadRequestException(
          `Application ${applicationId} is missing required owner_id. Application may be corrupted.`
        );
      }

      // Validate entity exists
      const entityRows = await this.prisma.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
          SELECT id FROM entities WHERE id = ${entityId} LIMIT 1
        `
      );

      if (!entityRows || entityRows.length === 0) {
        this.logger.error(`[ACCEPT_APPLICATION] Entity ${entityId} not found for application ${applicationId}`);
        throw new NotFoundException(
          `Entity ${entityId} associated with application ${applicationId} not found. ` +
          `The entity may have been deleted or the application may be corrupted.`
        );
      }

      // Validate user exists
      const userRows = await this.prisma.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
          SELECT id FROM app_users WHERE id = ${userId} LIMIT 1
        `
      );

      if (!userRows || userRows.length === 0) {
        this.logger.error(`[ACCEPT_APPLICATION] User ${userId} not found for application ${applicationId}`);
        throw new NotFoundException(
          `User ${userId} associated with application ${applicationId} not found. ` +
          `The user may have been deleted or the application may be corrupted.`
        );
      }

      // Step 3: Enforce application lifecycle - only PENDING applications can be accepted
      if (previousStatus !== "PENDING") {
        if (previousStatus === "ACCEPTED") {
          const userRole = applicationRow.user_role;
          const entityStatus = applicationRow.entity_status;
          
          // Idempotency: If already ACCEPTED and fully promoted, return success
          if (userRole === "ENTITY" && entityStatus === "ACTIVE") {
            this.logger.log(
              `[ACCEPT_APPLICATION] Application ${applicationId} is already ACCEPTED and fully promoted. ` +
              `User role: ${userRole}, Entity status: ${entityStatus}. Returning current state (idempotent).`
            );
            return {
              application: {
                id: applicationRow.id,
                entityId: entityId,
                ownerId: userId,
                status: "ACCEPTED",
                reason: applicationRow.reason,
                proof: applicationRow.proof,
                createdAt: applicationRow.created_at,
                updatedAt: applicationRow.updated_at,
                entityName: applicationRow.entity_name,
                ownerEmail: applicationRow.user_email,
              },
              enforcementAction: {
                action: "ACCEPT_APPLICATION",
                applicationId,
                entityId,
                userId,
                adminId,
                reason,
                timestamp: new Date(),
                previousStatus: "ACCEPTED",
                newStatus: "ACCEPTED",
              },
            };
          } else {
            // Application is ACCEPTED but not fully promoted - complete promotion in transaction
            this.logger.warn(
              `[ACCEPT_APPLICATION] Application ${applicationId} is ACCEPTED but not fully promoted. ` +
              `User role: ${userRole}, Entity status: ${entityStatus}. Completing promotion to ACTIVE...`
            );
          }
        } else {
          throw new BadRequestException(
            `Application ${applicationId} cannot be accepted. Current status: ${previousStatus}. ` +
            `Only PENDING applications can be accepted. ` +
            `Rejected or banned applications cannot be accepted.`
          );
        }
      }

      // Step 3.1: Enforce entity lifecycle - entity must be PENDING to transition to ACTIVE
      const entityStatus = applicationRow.entity_status;
      if (entityStatus && entityStatus !== "PENDING") {
        throw new BadRequestException(
          `Entity ${entityId} cannot be activated via application acceptance. Current status: ${entityStatus}. ` +
          `Only PENDING entities can be activated through application acceptance. ` +
          `Entity status transitions: PENDING → ACTIVE (via application acceptance only).`
        );
      }

      // Step 4: Single transaction for all mutations
      this.logger.log(
        `[ACCEPT_APPLICATION] Starting transaction: application=${applicationId}, entity=${entityId}, user=${userId}`
      );

      type TransactionResult = {
        id: string;
        entity_id: string;
        owner_id: string;
        status: string;
        reason: string | null;
        proof: any;
        created_at: Date;
        updated_at: Date;
      };

      const result: TransactionResult = await (this.prisma as any).$transaction(async (tx: any) => {
        // 4.1: Update entity_applications.status to ACCEPTED
        this.logger.log(
          `[ACCEPT_APPLICATION] [TX] Updating entity_applications.status to ACCEPTED for application ${applicationId}`
        );
        await tx.$executeRaw(
          Prisma.sql`
            UPDATE entity_applications 
            SET status = 'ACCEPTED', reason = ${reason}, updated_at = NOW()
            WHERE id = ${applicationId}::uuid
          `
        );

        // 4.2: Update entities.status to ACTIVE (idempotent - only updates if PENDING)
        this.logger.log(
          `[ACCEPT_APPLICATION] [TX] Updating entities.status to ACTIVE for entity ${entityId}`
        );
        
        // First check current entity status
        const existingEntity = await tx.entities.findUnique({
          where: { id: entityId },
          select: { id: true, status: true },
        });
        
        if (!existingEntity) {
          throw new NotFoundException(
            `Entity ${entityId} not found. Entity should be created when application is submitted.`
          );
        }
        
        // Idempotency: If already ACTIVE, skip update
        if (existingEntity.status === "ACTIVE") {
          this.logger.log(
            `[ACCEPT_APPLICATION] [TX] Entity ${entityId} is already ACTIVE (idempotent)`
          );
        } else if (existingEntity.status === "PENDING") {
          // Update status from PENDING to ACTIVE
          await tx.entities.update({
            where: { id: entityId },
            data: {
              status: "ACTIVE",
            },
          });
          this.logger.log(
            `[ACCEPT_APPLICATION] [TX] Entity ${entityId} status updated from PENDING to ACTIVE`
          );
        } else {
          throw new BadRequestException(
            `Entity ${entityId} cannot be activated. Current status: ${existingEntity.status}. ` +
            `Only PENDING entities can be activated through application acceptance.`
          );
        }

        // 4.3: Ensure entity_roles entry exists (OWNER) - idempotent
        this.logger.log(
          `[ACCEPT_APPLICATION] [TX] Checking for existing entity_roles (OWNER) for user ${userId} and entity ${entityId}`
        );
        // NOTE: All database ID columns are TEXT in Supabase (including entity_roles.userId and entity_roles.entityId)
        const existingRoleRows = await tx.$queryRaw(
          Prisma.sql`
            SELECT id FROM entity_roles 
            WHERE "userId" = ${userId}
              AND "entityId" = ${entityId}
            LIMIT 1
          `
        ) as Array<{ id: string }>;

        if (!existingRoleRows || existingRoleRows.length === 0) {
          this.logger.log(
            `[ACCEPT_APPLICATION] [TX] Creating entity_roles (OWNER) for user ${userId} and entity ${entityId}`
          );
          const roleId = crypto.randomUUID();
          // NOTE: All database ID columns are TEXT in Supabase (including entity_roles.id, userId, entityId)
          await tx.$executeRaw(
            Prisma.sql`
              INSERT INTO entity_roles (id, "userId", "entityId", role, "createdAt", "updatedAt")
              VALUES (
                ${roleId},
                ${userId},
                ${entityId},
                'OWNER',
                NOW(),
                NOW()
              )
            `
          );
        } else {
          this.logger.log(
            `[ACCEPT_APPLICATION] [TX] entity_roles (OWNER) already exists for user ${userId} and entity ${entityId} (idempotent)`
          );
        }

        // 4.4: Promote user to ENTITY role (only if not already ENTITY)
        const currentUserRole = applicationRow.user_role;
        if (currentUserRole !== "ENTITY") {
          const previousRole = currentUserRole || "UNKNOWN";
          this.logger.log(
            `[ACCEPT_APPLICATION] [TX] Promoting user ${userId} from ${previousRole} to ENTITY role`
          );
          await tx.app_users.update({
            where: { id: userId },
            data: { role: "ENTITY" },
          });
        } else {
          this.logger.log(
            `[ACCEPT_APPLICATION] [TX] User ${userId} already has ENTITY role, skipping promotion (idempotent)`
          );
        }

        // Fetch updated application data for return
        const updatedApplicationRows = await tx.$queryRaw(
          Prisma.sql`
            SELECT 
              id, entity_id, owner_id, status, reason, proof, created_at, updated_at
            FROM entity_applications
            WHERE id = ${applicationId}::uuid
            LIMIT 1
          `
        ) as Array<TransactionResult>;

        return updatedApplicationRows[0];
      }, { timeout: 30000 });

      // Step 5: Build enforcement action
      const enforcementAction: EnforcementAction = {
        action: "ACCEPT_APPLICATION",
        applicationId,
        entityId,
        userId,
        adminId,
        reason,
        timestamp: new Date(),
        previousStatus: previousStatus,
        newStatus: "ACCEPTED",
      };

      // Step 6: Final logging
      this.logger.log(
        `[ENFORCEMENT] Application ${applicationId} accepted by admin ${adminId}. Reason: ${reason}`
      );
      this.logger.log(
        `[ACCEPT_APPLICATION] Transaction completed successfully: ` +
        `Entity ${entityId} activated (status=ACTIVE), ` +
        `User ${userId} promoted to ENTITY role, ` +
        `entity_roles (OWNER) created/verified`
      );

      return {
        application: {
          id: result.id,
          entityId: result.entity_id,
          ownerId: result.owner_id,
          status: result.status,
          reason: result.reason,
          proof: result.proof,
          createdAt: result.created_at,
          updatedAt: result.updated_at,
          entityName: applicationRow.entity_name,
          ownerEmail: applicationRow.user_email,
        },
        enforcementAction,
      };
    } catch (error: any) {
      // Log full error details for debugging
      this.logger.error(
        `[ACCEPT_APPLICATION] Failed for application ${applicationId}`,
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          code: error.code,
          meta: error.meta,
          adminId,
          applicationId,
        }
      );

      // Re-throw NestJS exceptions as-is
      if (error instanceof NotFoundException || 
          error instanceof BadRequestException || 
          error instanceof ForbiddenException) {
        throw error;
      }

      // Handle Prisma-specific errors and convert to appropriate HTTP exceptions
      if (error.code === "P2002") {
        throw new BadRequestException(
          `Unique constraint violation: ${error.meta?.target?.join(", ") || "Unknown field"}. ` +
          `This usually means a duplicate record already exists.`
        );
      }
      if (error.code === "P2003") {
        throw new BadRequestException(
          `Foreign key constraint violation: ${error.meta?.field_name || "Unknown field"}. ` +
          `Referenced record does not exist.`
        );
      }
      if (error.code === "P2025") {
        throw new NotFoundException(
          `Record not found: ${error.meta?.cause || "Unknown record"}. ` +
          `The record may have been deleted or does not exist.`
        );
      }

      // For unknown errors, throw a generic error with details
      throw new BadRequestException(
        `Failed to accept application: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Reject an entity application (ADMIN only)
   * - Sets application.status = REJECTED
   * - Sets entity.status = REJECTED
   * - User remains USER (can reapply)
   */
  async rejectApplication(
    applicationId: string,
    adminId: string,
    reason: string,
  ): Promise<{ application: any; enforcementAction: EnforcementAction }> {
    const application = await (this.prisma as any).entity_applications.findUnique({
      where: { id: applicationId },
      include: {
        entities: true,
        app_users: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    // If already REJECTED, return current state (idempotent)
    if (application.status === "REJECTED") {
      this.logger.warn(`Application ${applicationId} is already REJECTED. Skipping rejection.`);
      return {
        application: {
          ...application,
          entityName: application.entities?.name || null,
          ownerEmail: application.app_users?.email || null,
        },
        enforcementAction: {
          action: "REJECT_APPLICATION",
          applicationId,
          entityId: application.entity_id,
          userId: application.owner_id,
          adminId,
          reason,
          timestamp: new Date(),
          previousStatus: application.status,
          newStatus: application.status,
        },
      };
    }

    // Transaction: Reject application and entity
    const result = await (this.prisma as any).$transaction(async (tx: any) => {
      // 1. Update application status
      const updatedApplication = await tx.entity_applications.update({
        where: { id: applicationId },
        data: { status: "REJECTED", reason },
      });

      // 2. Update entity status to REJECTED
      await tx.entities.update({
        where: { id: application.entity_id },
        data: { status: "REJECTED" },
      });

      return updatedApplication;
    });

    const enforcementAction: EnforcementAction = {
      action: "REJECT_APPLICATION",
      applicationId,
      entityId: application.entity_id,
      userId: application.owner_id,
      adminId,
      reason,
      timestamp: new Date(),
      previousStatus: application.status,
      newStatus: "REJECTED",
    };

    this.logger.log(
      `[ENFORCEMENT] Application ${applicationId} rejected by admin ${adminId}. Reason: ${reason}`,
    );

    // Log audit action (non-blocking)
    await this.logAuditAction({
      adminId,
      targetType: "APPLICATION",
      targetId: applicationId,
      action: "REJECT_APPLICATION",
      reason,
      metadata: {
        entityId: application.entity_id,
        entityName: application.entities?.name,
        ownerId: application.owner_id,
        ownerEmail: application.app_users?.email,
        previousStatus: application.status,
        newStatus: "REJECTED",
      },
    });

    return {
      application: {
        ...result,
        entityName: application.entities?.name || null,
        ownerEmail: application.app_users?.email || null,
      },
      enforcementAction,
    };
  }

  /**
   * Ban an entity application (ADMIN only) - IRREVERSIBLE
   * - Sets application.status = BANNED
   * - Sets entity.status = REJECTED
   * - Sets user_profiles.preferences.isEntityBanned = true
   * - Permanently blocks all future applications
   */
  async banApplication(
    applicationId: string,
    adminId: string,
    reason: string,
  ): Promise<{ application: any; enforcementAction: EnforcementAction }> {
    const application = await (this.prisma as any).entity_applications.findUnique({
      where: { id: applicationId },
      include: {
        entities: true,
        app_users: {
          include: {
            user_profiles: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    // If already BANNED, return current state (idempotent)
    if (application.status === "BANNED") {
      this.logger.warn(`Application ${applicationId} is already BANNED. Skipping ban.`);
      return {
        application: {
          ...application,
          entityName: application.entities?.name || null,
          ownerEmail: application.app_users?.email || null,
        },
        enforcementAction: {
          action: "BAN_APPLICATION",
          applicationId,
          entityId: application.entity_id,
          userId: application.owner_id,
          adminId,
          reason,
          timestamp: new Date(),
          previousStatus: application.status,
          newStatus: application.status,
        },
      };
    }

    // Transaction: Ban application, reject entity, mark user as banned
    const result = await (this.prisma as any).$transaction(async (tx: any) => {
      // 1. Update application status
      const updatedApplication = await tx.entity_applications.update({
        where: { id: applicationId },
        data: { status: "BANNED", reason },
      });

      // 2. Update entity status to REJECTED
      await tx.entities.update({
        where: { id: application.entity_id },
        data: { status: "REJECTED" },
      });

      // 3. Mark user as banned in preferences
      const preferences = (application.app_users?.user_profiles?.preferences as any) || {};
      const updatedPreferences = {
        ...preferences,
        isEntityBanned: true,
        enforcementHistory: [
          ...(preferences.enforcementHistory || []),
          {
            action: "BAN_APPLICATION",
            applicationId,
            adminId,
            reason,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      if (application.app_users?.user_profiles) {
        await tx.user_profiles.update({
          where: { user_id: application.owner_id },
          data: { preferences: updatedPreferences },
        });
      } else {
        await tx.user_profiles.create({
          data: {
            id: crypto.randomUUID(),
            user_id: application.owner_id,
            preferences: updatedPreferences,
          },
        });
      }

      return updatedApplication;
    });

    const enforcementAction: EnforcementAction = {
      action: "BAN_APPLICATION",
      applicationId,
      entityId: application.entity_id,
      userId: application.owner_id,
      adminId,
      reason,
      timestamp: new Date(),
      previousStatus: application.status,
      newStatus: "BANNED",
    };

    this.logger.log(
      `[ENFORCEMENT] Application ${applicationId} banned by admin ${adminId}. Reason: ${reason}`,
    );

    // Log audit action (non-blocking)
    await this.logAuditAction({
      adminId,
      targetType: "APPLICATION",
      targetId: applicationId,
      action: "BAN_APPLICATION",
      reason,
      metadata: {
        entityId: application.entity_id,
        entityName: application.entities?.name,
        ownerId: application.owner_id,
        ownerEmail: application.app_users?.email,
        previousStatus: application.status,
        newStatus: "BANNED",
      },
    });

    return {
      application: {
        ...result,
        entityName: application.entities?.name || null,
        ownerEmail: application.app_users?.email || null,
      },
      enforcementAction,
    };
  }

  /**
   * Get admin audit logs (ADMIN only)
   * TODO: Implement audit log persistence (post-launch)
   */
  async getAuditLogs(params?: {
    limit?: number;
    offset?: number;
  }) {
    return {
      data: [],
      meta: {
        total: 0,
        limit: params?.limit ?? 50,
        offset: params?.offset ?? 0,
      },
    };
  }
}

