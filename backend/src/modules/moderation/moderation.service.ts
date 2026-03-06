import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  ModerationReason,
  ModerationStatus,
  ModerationRoleContext,
  EventPhase,
  EntityRoleType,
} from "@prisma/client";
import { CreateReportDto, UpdateReportStatusDto } from "./dto";
import { randomUUID } from "crypto";

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a moderation report
   */
  async createReport(
    eventId: string,
    dto: CreateReportDto,
    reporterUserId: string,
  ): Promise<any> {
    // 1. Validate event exists
    const event = await (this.prisma as any).events.findUnique({
      where: { id: eventId },
      include: {
        entities_events_entityIdToentities: {
          select: { ownerId: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // 2. Validate reporter and reported are different
    if (dto.reportedUserId === reporterUserId) {
      throw new BadRequestException(
        "You cannot report yourself",
      );
    }

    // 3. Validate activityId if provided
    if (dto.activityId) {
      const activity = await (this.prisma as any).event_activities.findUnique({
        where: { id: dto.activityId },
      });

      if (!activity) {
        throw new NotFoundException(
          `Activity with ID ${dto.activityId} not found`,
        );
      }

      if (activity.eventId !== eventId) {
        throw new BadRequestException(
          "Activity does not belong to this event",
        );
      }
    }

    // 5. Validate meetGreetSessionId if provided
    if (dto.meetGreetSessionId) {
      const session = await (this.prisma as any).meet_greet_sessions.findUnique(
        {
          where: { id: dto.meetGreetSessionId },
        },
      );

      if (!session) {
        throw new NotFoundException(
          `Meet & Greet session with ID ${dto.meetGreetSessionId} not found`,
        );
      }

      if (session.eventId !== eventId) {
        throw new BadRequestException(
          "Meet & Greet session does not belong to this event",
        );
      }
    }

    // 6. Validate reported user exists
    const reportedUser = await (this.prisma as any).app_users.findUnique({
      where: { id: dto.reportedUserId },
    });

    if (!reportedUser) {
      throw new NotFoundException(
        `User with ID ${dto.reportedUserId} not found`,
      );
    }

    // 7. Create report
    const report = await (this.prisma as any).moderation_reports.create({
      data: {
        id: randomUUID(),
        eventId,
        activityId: dto.activityId || null,
        meetGreetSessionId: dto.meetGreetSessionId || null,
        reporterUserId,
        reportedUserId: dto.reportedUserId,
        roleContext: dto.roleContext,
        phase: event.phase, // Use event's current phase
        reason: dto.reason,
        description: dto.description || null,
        status: ModerationStatus.OPEN,
      },
    });

    // 8. Create mailbox notifications for event coordinator and entity owner
    await this.notifyModerators(eventId, report.id, event);

    return report;
  }

  /**
   * List reports for an event (producer/admin only)
   */
  async listReportsForEvent(
    eventId: string,
    requesterUserId: string,
  ): Promise<any[]> {
    // 1. Verify event exists
    const event = await (this.prisma as any).events.findUnique({
      where: { id: eventId },
      include: {
        entities_events_entityIdToentities: {
          select: { ownerId: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // 2. Verify requester has permission
    await this.checkEventPermissions(event, requesterUserId);

    // 3. Fetch reports
    const reports = await (this.prisma as any).moderation_reports.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      include: {
        reporter: {
          select: { id: true, email: true },
        },
        reported: {
          select: { id: true, email: true },
        },
        activity: {
          select: { id: true, title: true },
        },
        meetGreetSession: {
          select: { id: true, slotOrder: true },
        },
      },
    });

    return reports;
  }

  /**
   * List reports created by a user (reporter visibility)
   */
  async listReportsForUser(userId: string): Promise<any[]> {
    const reports = await (this.prisma as any).moderation_reports.findMany({
      where: { reporterUserId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        event: {
          select: { id: true, name: true },
        },
        reported: {
          select: { id: true, email: true },
        },
        activity: {
          select: { id: true, title: true },
        },
        meetGreetSession: {
          select: { id: true, slotOrder: true },
        },
      },
    });

    return reports;
  }

  /**
   * Update report status (admin/coordinator only)
   */
  async updateReportStatus(
    reportId: string,
    dto: UpdateReportStatusDto,
    requesterUserId: string,
  ): Promise<any> {
    // 1. Fetch report with event
    const report = await (this.prisma as any).moderation_reports.findUnique({
      where: { id: reportId },
      include: {
        event: {
          include: {
            entities_events_entityIdToentities: {
              select: { ownerId: true },
            },
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    // 2. Verify requester has permission (admin or coordinator)
    await this.checkAdminOrCoordinatorPermissions(
      report.event,
      requesterUserId,
    );

    // 3. Update status
    const updated = await (this.prisma as any).moderation_reports.update({
      where: { id: reportId },
      data: { status: dto.status },
      include: {
        reporter: {
          select: { id: true, email: true },
        },
        reported: {
          select: { id: true, email: true },
        },
        activity: {
          select: { id: true, title: true },
        },
        meetGreetSession: {
          select: { id: true, slotOrder: true },
        },
      },
    });

    return updated;
  }

  /**
   * Check if user has event permissions (coordinator, entity owner, admin, manager)
   */
  private async checkEventPermissions(event: any, userId: string): Promise<void> {
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
        (entityRole.role === EntityRoleType.ADMIN ||
          entityRole.role === EntityRoleType.MANAGER)
      ) {
        return;
      }
    }

    throw new ForbiddenException(
      "You do not have permission to view reports for this event",
    );
  }

  /**
   * Check if user is admin or coordinator (for status updates)
   */
  private async checkAdminOrCoordinatorPermissions(
    event: any,
    userId: string,
  ): Promise<void> {
    // Check if user is event coordinator
    if (event.eventCoordinatorId === userId) {
      return;
    }

    // Check if user has ADMIN role on the entity
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

      if (entityRole && entityRole.role === EntityRoleType.ADMIN) {
        return;
      }
    }

    throw new ForbiddenException(
      "Only admins and coordinators can update report status",
    );
  }

  /**
   * Notify moderators (event coordinator and entity owner) via mailbox
   */
  private async notifyModerators(
    eventId: string,
    reportId: string,
    event: any,
  ): Promise<void> {
    const recipients: string[] = [];

    // Add event coordinator if exists
    if (event.eventCoordinatorId) {
      recipients.push(event.eventCoordinatorId);
    }

    // Add entity owner if exists
    if (event.entities_events_entityIdToentities?.ownerId) {
      const ownerId = event.entities_events_entityIdToentities.ownerId;
      // Avoid duplicate if coordinator is also owner
      if (!recipients.includes(ownerId)) {
        recipients.push(ownerId);
      }
    }

    // Create mailbox items for each recipient
    for (const userId of recipients) {
      try {
        await (this.prisma as any).mailbox_items.create({
          data: {
            id: randomUUID(),
            userId,
            type: "MODERATION_REPORT",
            title: "New moderation report submitted",
            message: `A new moderation report has been submitted for event "${event.name}". Please review it in the moderation dashboard.`,
            metadata: {
              eventId,
              reportId,
              phase: event.phase,
            },
            isRead: false,
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to create mailbox notification for user ${userId}:`,
          error,
        );
        // Non-blocking: continue even if mailbox creation fails
      }
    }
  }
}

