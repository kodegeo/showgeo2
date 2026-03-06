import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  EventPhase,
  EntityRoleType,
} from "@prisma/client";
import {
  EventActivityType,
  EventActivityStatus,
  ActivityVisibility,
} from "../../shared/types/event-activities.types";
import { CreateActivityDto, UpdateActivityDto } from "./dto";

export interface EventActivity {
  id: string;
  eventId: string;
  phase: EventPhase;
  type: EventActivityType;
  status: EventActivityStatus;
  title: string;
  description: string | null;
  config: Record<string, any>;
  visibility: ActivityVisibility;
  startsAt: Date | null;
  endsAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class EventActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if user is a producer (can manage activities)
   * Returns true if user is event coordinator, entity owner, or entity admin/manager
   */
  async isProducer(eventId: string, userId: string): Promise<boolean> {
    try {
      await this.checkEventPermissions(eventId, userId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if user has permission to manage activities for an event
   * Must be: event coordinator, entity owner, or entity admin/manager
   */
  private async checkEventPermissions(eventId: string, userId: string): Promise<void> {
    const event = await (this.prisma as any).events.findUnique({
      where: { id: eventId },
      include: {
        entities_events_entityIdToentities: true,
      },
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
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
      "You do not have permission to manage activities for this event",
    );
  }

  /**
   * Create a new activity for an event
   * 
   * Rules:
   * - Authorization required (event coordinator or entity admin/manager)
   * - Default status = INACTIVE
   * - Phase must match event.phase OR be POST_LIVE
   * - No side effects
   */
  async createActivity(
    eventId: string,
    dto: CreateActivityDto,
    userId: string,
  ): Promise<EventActivity> {
    // 1. Check authorization
    await this.checkEventPermissions(eventId, userId);

    // 2. Fetch event to validate phase
    const event = await (this.prisma as any).events.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    // 3. Validate phase: must match event.phase OR be POST_LIVE (POST_EVENT)
    if (dto.phase !== event.phase && dto.phase !== EventPhase.POST_LIVE) {
      throw new BadRequestException(
        `Activity phase ${dto.phase} does not match event phase ${event.phase} and is not POST_LIVE`,
      );
    }

    // 4. Create activity with INACTIVE status
    const activity = await (this.prisma as any).event_activities.create({
      data: {
        id: require("crypto").randomUUID(),
        eventId,
        phase: dto.phase,
        type: dto.type,
        status: EventActivityStatus.INACTIVE,
        title: dto.title,
        description: dto.description || null,
        config: dto.config as any,
        visibility: dto.visibility,
        startsAt: dto.startsAt || null,
        endsAt: dto.endsAt || null,
        createdBy: userId,
      },
    });

    return this.mapToActivity(activity);
  }

  /**
   * Update an activity
   * 
   * Rules:
   * - Cannot update ACTIVE activities except metadata (title, description, config, visibility)
   * - Authorization required
   */
  async updateActivity(
    activityId: string,
    dto: UpdateActivityDto,
    userId: string,
  ): Promise<EventActivity> {
    // 1. Fetch activity
    const activity = await (this.prisma as any).event_activities.findUnique({
      where: { id: activityId },
      include: {
        events: true,
      },
    });

    if (!activity) {
      throw new NotFoundException(`Activity ${activityId} not found`);
    }

    // 2. Check authorization
    await this.checkEventPermissions(activity.eventId, userId);

    // 3. If activity is ACTIVE, only allow metadata updates
    if (activity.status === EventActivityStatus.ACTIVE) {
      // Only allow title, description, config, visibility updates
      const allowedFields = ["title", "description", "config", "visibility"];
      const updateData: any = {};

      if (dto.title !== undefined) updateData.title = dto.title;
      if (dto.description !== undefined) updateData.description = dto.description;
      if (dto.config !== undefined) updateData.config = dto.config as any;
      if (dto.visibility !== undefined) updateData.visibility = dto.visibility;

      // Reject if trying to update other fields
      if (dto.startsAt !== undefined || dto.endsAt !== undefined) {
        throw new BadRequestException(
          "Cannot update startsAt or endsAt for ACTIVE activities",
        );
      }

      const updated = await (this.prisma as any).event_activities.update({
        where: { id: activityId },
        data: updateData,
      });

      return this.mapToActivity(updated);
    }

    // 4. For non-ACTIVE activities, allow all updates
    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.config !== undefined) updateData.config = dto.config as any;
    if (dto.visibility !== undefined) updateData.visibility = dto.visibility;
    if (dto.startsAt !== undefined) updateData.startsAt = dto.startsAt;
    if (dto.endsAt !== undefined) updateData.endsAt = dto.endsAt;

    const updated = await (this.prisma as any).event_activities.update({
      where: { id: activityId },
      data: updateData,
    });

    return this.mapToActivity(updated);
  }

  /**
   * Launch an activity
   * 
   * Rules:
   * - Sets status = ACTIVE
   * - Sets startsAt = now()
   * - Phase must match event.phase
   * - Idempotent (if already ACTIVE → return activity)
   * - Non-blocking
   * - Does NOT send emails or mailbox messages
   */
  async launchActivity(activityId: string, userId: string): Promise<EventActivity> {
    // 1. Fetch activity with event
    const activity = await (this.prisma as any).event_activities.findUnique({
      where: { id: activityId },
      include: {
        events: true,
      },
    });

    if (!activity) {
      throw new NotFoundException(`Activity ${activityId} not found`);
    }

    // 2. Check authorization
    await this.checkEventPermissions(activity.eventId, userId);

    // 3. If already ACTIVE, return (idempotent)
    if (activity.status === EventActivityStatus.ACTIVE) {
      return this.mapToActivity(activity);
    }

    // 4. Validate phase matches event phase
    if (activity.phase !== activity.events.phase) {
      throw new BadRequestException(
        `Activity phase ${activity.phase} does not match event phase ${activity.events.phase}`,
      );
    }

    // 5. Cannot launch COMPLETED or EXPIRED activities
    if (
      activity.status === EventActivityStatus.COMPLETED ||
      activity.status === EventActivityStatus.EXPIRED
    ) {
      throw new BadRequestException(
        `Cannot launch activity with status ${activity.status}`,
      );
    }

    // 6. Launch activity
    const updated = await (this.prisma as any).event_activities.update({
      where: { id: activityId },
      data: {
        status: EventActivityStatus.ACTIVE,
        startsAt: new Date(),
      },
    });

    return this.mapToActivity(updated);
  }

  /**
   * Complete an activity
   * 
   * Rules:
   * - Sets status = COMPLETED
   * - Sets endsAt = now()
   * - Idempotent
   */
  async completeActivity(activityId: string, userId: string): Promise<EventActivity> {
    // 1. Fetch activity
    const activity = await (this.prisma as any).event_activities.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      throw new NotFoundException(`Activity ${activityId} not found`);
    }

    // 2. Check authorization
    await this.checkEventPermissions(activity.eventId, userId);

    // 3. If already COMPLETED, return (idempotent)
    if (activity.status === EventActivityStatus.COMPLETED) {
      return this.mapToActivity(activity);
    }

    // 4. Complete activity
    const updated = await (this.prisma as any).event_activities.update({
      where: { id: activityId },
      data: {
        status: EventActivityStatus.COMPLETED,
        endsAt: new Date(),
      },
    });

    return this.mapToActivity(updated);
  }

  /**
   * Expire all ACTIVE activities for an event
   * 
   * Rules:
   * - Marks any ACTIVE activities as EXPIRED
   * - Non-blocking, safe to call multiple times
   */
  async expireActivitiesForEvent(eventId: string): Promise<void> {
    try {
      await (this.prisma as any).event_activities.updateMany({
        where: {
          eventId,
          status: EventActivityStatus.ACTIVE,
        },
        data: {
          status: EventActivityStatus.EXPIRED,
          endsAt: new Date(),
        },
      });
    } catch (error) {
      // Non-blocking: log error but don't throw
      console.error(`Failed to expire activities for event ${eventId}:`, error);
    }
  }

  /**
   * List activities for an event
   * 
   * Rules:
   * - Filters by visibility
   * - Producers see all
   * - Fans see only allowed visibility
   */
  async listActivities(
    eventId: string,
    phase: EventPhase | null,
    userId: string | null,
    isProducer: boolean = false,
  ): Promise<EventActivity[]> {
    // 1. Build where clause
    const where: any = {
      eventId,
    };

    if (phase) {
      where.phase = phase;
    }

    // 2. Fetch activities
    const activities = await (this.prisma as any).event_activities.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // 3. Filter by visibility if not producer
    if (!isProducer && userId) {
      // Check user's relationship to event
      const event = await (this.prisma as any).events.findUnique({
        where: { id: eventId },
        include: {
          event_registrations: {
            where: { userId },
          },
          tickets: {
            where: {
              userId,
              status: "ACTIVE",
            },
          },
        },
      });

      if (!event) {
        return [];
      }

      const isRegistered = event.event_registrations.length > 0;
      const hasActiveTicket = event.tickets.length > 0;
      const hasVipTicket = event.tickets.some(
        (t: any) => t.type === "VIP_MEET_GREET" && t.status === "ACTIVE",
      );

      return activities
        .filter((activity: any) => {
          if (activity.visibility === ActivityVisibility.ALL_ATTENDEES) {
            return isRegistered || hasActiveTicket;
          }
          if (activity.visibility === ActivityVisibility.REGISTERED_ONLY) {
            return isRegistered;
          }
          if (activity.visibility === ActivityVisibility.VIP_ONLY) {
            return hasVipTicket;
          }
          return false;
        })
        .map(this.mapToActivity);
    }

    // 4. Producers see all
    return activities.map(this.mapToActivity);
  }

  /**
   * Map Prisma result to EventActivity interface
   */
  private mapToActivity(prismaResult: any): EventActivity {
    return {
      id: prismaResult.id,
      eventId: prismaResult.eventId,
      phase: prismaResult.phase,
      type: prismaResult.type,
      status: prismaResult.status,
      title: prismaResult.title,
      description: prismaResult.description,
      config: prismaResult.config as Record<string, any>,
      visibility: prismaResult.visibility,
      startsAt: prismaResult.startsAt,
      endsAt: prismaResult.endsAt,
      createdBy: prismaResult.createdBy,
      createdAt: prismaResult.createdAt,
      updatedAt: prismaResult.updatedAt,
    };
  }
}

