import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UserRole } from "@prisma/client";
import { CreateAdminReportDto, ResolveAdminReportDto } from "./dto";
import * as crypto from "crypto";

type User = any;

export enum AdminReportStatus {
  OPEN = "OPEN",
  RESOLVED = "RESOLVED",
  DISMISSED = "DISMISSED",
}

@Injectable()
export class AdminReportsService {
  private readonly logger = new Logger(AdminReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an admin report (authenticated users)
   * - Records reporter information
   * - Stores message and optional entityId/eventId
   * - Sets status to OPEN
   */
  async createReport(
    dto: CreateAdminReportDto,
    reporterUserId: string,
    reporterRole: UserRole,
  ): Promise<any> {
    // Validate that at least one context is provided (entityId or eventId)
    // Or allow general platform reports (neither required)
    if (dto.entityId) {
      const entity = await (this.prisma as any).entities.findUnique({
        where: { id: dto.entityId },
      });
      if (!entity) {
        throw new NotFoundException(`Entity ${dto.entityId} not found`);
      }
    }

    if (dto.eventId) {
      const event = await (this.prisma as any).events.findUnique({
        where: { id: dto.eventId },
      });
      if (!event) {
        throw new NotFoundException(`Event ${dto.eventId} not found`);
      }
    }

    // Create report
    const report = await (this.prisma as any).admin_reports.create({
      data: {
        id: crypto.randomUUID(),
        reporterUserId,
        reporterRole,
        message: dto.message,
        entityId: dto.entityId || null,
        eventId: dto.eventId || null,
        status: "OPEN", // Use string literal to match enum
      },
    });

    this.logger.log(
      `[ADMIN_REPORT] Report ${report.id} created by user ${reporterUserId} (${reporterRole})`,
    );

    return report;
  }

  /**
   * List all admin reports (ADMIN only)
   * - Returns all reports with optional filtering
   * - Includes reporter and related entity/event info
   */
  async listReports(status?: AdminReportStatus): Promise<any[]> {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const reports = await (this.prisma as any).admin_reports.findMany({
      where,
      include: {
        app_users_reporter: {
          select: {
            id: true,
            email: true,
            user_profiles: {
              select: {
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        app_users_resolver: {
          select: {
            id: true,
            email: true,
            user_profiles: {
              select: {
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        entities: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        events: {
          select: {
            id: true,
            name: true,
            status: true,
            phase: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return reports;
  }

  /**
   * Resolve an admin report (ADMIN only)
   * - Updates status to RESOLVED
   * - Records resolution timestamp
   * - Reports are immutable after resolution
   */
  async resolveReport(
    reportId: string,
    adminId: string,
    dto: ResolveAdminReportDto,
  ): Promise<any> {
    // Fetch report
    const report = await (this.prisma as any).admin_reports.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }

    // Check if already resolved
    if (report.status === "RESOLVED" || report.status === "DISMISSED") {
      throw new BadRequestException(
        "Report is already resolved or dismissed and cannot be modified",
      );
    }

    // Update report status to RESOLVED
    const updatedReport = await (this.prisma as any).admin_reports.update({
      where: { id: reportId },
      data: {
        status: "RESOLVED", // Use string literal to match enum
        resolvedAt: new Date(),
        resolvedBy: adminId,
        resolutionNotes: dto.resolutionNotes || null,
      },
    });

    this.logger.log(
      `[ADMIN_REPORT] Report ${reportId} resolved by admin ${adminId}`,
    );

    // Fetch with relations
    const fullReport = await (this.prisma as any).admin_reports.findUnique({
      where: { id: reportId },
      include: {
        app_users_reporter: {
          select: {
            id: true,
            email: true,
            user_profiles: {
              select: {
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        app_users_resolver: {
          select: {
            id: true,
            email: true,
            user_profiles: {
              select: {
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        entities: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        events: {
          select: {
            id: true,
            name: true,
            status: true,
            phase: true,
          },
        },
      },
    });

    return fullReport;
  }
}

