import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/** Ledger row status strings (DB tables may not be in generated Prisma schema). */
const EscrowLedgerStatus = {
  HELD: "HELD",
  RELEASED: "RELEASED",
  REFUNDED: "REFUNDED",
} as const;

const PayoutStatus = {
  READY: "READY",
} as const;

export interface FinancialSummarySplit {
  id: string;
  collaboratorId: string;
  role: string;
  sharePercent: number;
  expectedPayout: number;
  approved: boolean;
  approvedAt: string | null;
}

export interface FinancialSummary {
  eventId: string;
  ticketsSold: number;
  totalRevenue: number;
  escrowHeld: number;
  escrowStatus: "HELD" | "RELEASED" | "REFUNDED" | "MIXED";
  splitsLocked: boolean;
  splits: FinancialSummarySplit[];
}

@Injectable()
export class EscrowService {
  constructor(private readonly prisma: PrismaService) {}

  /** Delegates for tables not present on generated PrismaService typings. */
  private get p(): any {
    return this.prisma as any;
  }

  /**
   * Create escrow ledger entry when a ticket order is completed. Revenue is HELD until event completes.
   */
  async createLedgerEntry(
    eventId: string,
    orderId: string,
    amount: number,
  ): Promise<void> {
    if (amount <= 0) return;
    await this.p.escrow_ledger.create({
      data: {
        eventId,
        orderId,
        amount,
        status: EscrowLedgerStatus.HELD,
      },
    });
  }

  /**
   * Ensure the user is the event owner (entity) or a collaborator. Throws 403 otherwise.
   */
  async assertCanViewFinancials(eventId: string, userId: string): Promise<void> {
    const event = await this.p.events.findUnique({
      where: { id: eventId },
      select: {
        entityId: true,
        event_revenue_splits: { select: { collaboratorId: true } },
      },
    });
    if (!event) throw new NotFoundException("Event not found");

    const owner = await this.prisma.entities.findUnique({
      where: { id: event.entityId },
      select: { ownerId: true },
    });
    if (owner?.ownerId === userId) return;

    const allowedEntityIds = new Set<string>([event.entityId]);
    (event as any).event_revenue_splits?.forEach((s: { collaboratorId: string }) =>
      allowedEntityIds.add(s.collaboratorId),
    );

    const userOwnsEntity = await this.prisma.entities.findFirst({
      where: { id: { in: [...allowedEntityIds] }, ownerId: userId },
      select: { id: true },
    });
    if (userOwnsEntity) return;

    const userRoleEntityIds = await this.prisma.entity_roles
      .findMany({ where: { userId }, select: { entityId: true } })
      .then((r) => r.map((e) => e.entityId));
    if (userRoleEntityIds.some((eid) => allowedEntityIds.has(eid))) return;

    throw new ForbiddenException("Only the event creator or collaborators can view financials");
  }

  /**
   * GET /events/:eventId/financial-summary - tickets sold, revenue, escrow held, splits with expected payout.
   */
  async getFinancialSummary(eventId: string, userId: string): Promise<FinancialSummary> {
    await this.assertCanViewFinancials(eventId, userId);

    const [event, ticketsCount, heldRows, allLedger, splits] = await Promise.all([
      this.prisma.events.findUnique({
        where: { id: eventId },
        select: { id: true },
      }),
      this.prisma.tickets.count({
        where: {
          eventId,
          status: "ACTIVE",
          type: "PAID",
        },
      }),
      this.p.escrow_ledger.findMany({
        where: { eventId, status: EscrowLedgerStatus.HELD },
        select: { amount: true },
      }),
      this.p.escrow_ledger.findMany({
        where: { eventId },
        select: { amount: true, status: true },
      }),
      this.p.event_revenue_splits.findMany({
        where: { eventId },
        orderBy: { sharePercent: "desc" },
      }),
    ]);

    if (!event) throw new NotFoundException("Event not found");

    const totalRevenue = allLedger
      .filter((r) => r.status === EscrowLedgerStatus.HELD || r.status === EscrowLedgerStatus.RELEASED)
      .reduce((sum, r) => sum + Number(r.amount), 0);
    const escrowHeld = heldRows.reduce((sum, r) => sum + Number(r.amount), 0);

    const statuses = [...new Set(allLedger.map((r) => r.status))];
    let escrowStatus: FinancialSummary["escrowStatus"] = "HELD";
    if (statuses.length > 1) escrowStatus = "MIXED";
    else if (statuses[0] === EscrowLedgerStatus.RELEASED) escrowStatus = "RELEASED";
    else if (statuses[0] === EscrowLedgerStatus.REFUNDED) escrowStatus = "REFUNDED";

    const totalPercent = splits.reduce((s, r) => s + Number(r.sharePercent), 0);
    if (totalPercent > 100) {
      throw new BadRequestException("Revenue splits total cannot exceed 100%");
    }

    const revenueForSplits = totalRevenue;
    const splitsResponse: FinancialSummarySplit[] = splits.map((s) => ({
      id: s.id,
      collaboratorId: s.collaboratorId,
      role: s.role ?? "Collaborator",
      sharePercent: Number(s.sharePercent),
      expectedPayout: Math.round((revenueForSplits * Number(s.sharePercent)) / 100 * 100) / 100,
      approved: s.approved ?? false,
      approvedAt: s.approvedAt?.toISOString() ?? null,
    }));

    return {
      eventId,
      ticketsSold: ticketsCount,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      escrowHeld: Math.round(escrowHeld * 100) / 100,
      escrowStatus,
      splitsLocked: false,
      splits: splitsResponse,
    };
  }

  /**
   * GET /events/:id/revenue - dashboard shape: ticketsSold, grossRevenue, escrowHeld, estimatedPayout, collaborators with name.
   */
  async getEventRevenue(eventId: string, userId: string): Promise<{
    ticketsSold: number;
    grossRevenue: number;
    escrowHeld: number;
    estimatedPayout: number;
    collaborators: Array<{ name: string; role: string; sharePercent: number }>;
  }> {
    const summary = await this.getFinancialSummary(eventId, userId);
    const estimatedPayout = summary.splits.reduce((sum, s) => sum + s.expectedPayout, 0);
    const collaboratorIds = summary.splits.map((s) => s.collaboratorId);
    const entities =
      collaboratorIds.length > 0
        ? await this.prisma.entities.findMany({
            where: { id: { in: collaboratorIds } },
            select: { id: true, name: true },
          })
        : [];
    const nameById = new Map(entities.map((e) => [e.id, e.name]));
    const collaborators = summary.splits.map((s) => ({
      name: nameById.get(s.collaboratorId) ?? "Unknown",
      role: s.role,
      sharePercent: s.sharePercent,
    }));
    return {
      ticketsSold: summary.ticketsSold,
      grossRevenue: summary.totalRevenue,
      escrowHeld: summary.escrowHeld,
      estimatedPayout: Math.round(estimatedPayout * 100) / 100,
      collaborators,
    };
  }

  /**
   * When event status becomes COMPLETED: release escrow and create payout records from splits.
   */
  async releaseEscrowAndCreatePayouts(eventId: string): Promise<void> {
    const event = await this.prisma.events.findUnique({
      where: { id: eventId },
      select: { status: true },
    });
    if (!event || event.status !== "COMPLETED") {
      throw new BadRequestException("Event must be COMPLETED to release escrow");
    }

    const [heldLedger, splits] = await Promise.all([
      this.p.escrow_ledger.findMany({
        where: { eventId, status: EscrowLedgerStatus.HELD },
      }),
      this.p.event_revenue_splits.findMany({
        where: { eventId },
      }),
    ]);

    const totalHeld = heldLedger.reduce((sum, r) => sum + Number(r.amount), 0);
    const totalPercent = splits.reduce((s, r) => s + Number(r.sharePercent), 0);
    if (totalPercent > 100) {
      throw new BadRequestException("Revenue splits total cannot exceed 100%");
    }

    await this.prisma.$transaction(async (tx) => {
      const t = tx as any;
      for (const row of heldLedger) {
        await t.escrow_ledger.update({
          where: { id: row.id },
          data: { status: EscrowLedgerStatus.RELEASED },
        });
      }
      for (const s of splits) {
        const amount = (totalHeld * Number(s.sharePercent)) / 100;
        await t.payouts.create({
          data: {
            eventId,
            collaboratorId: s.collaboratorId,
            amount: Math.round(amount * 100) / 100,
            status: PayoutStatus.READY,
          },
        });
      }
    });
  }

  /**
   * Approve a revenue split as the collaborator. Only the collaborator (entity owner or entity role) can approve.
   * Splits must total <= 100%.
   */
  async approveSplit(eventId: string, splitId: string, userId: string): Promise<{ approved: true; splitsLocked: boolean }> {
    const split = await this.p.event_revenue_splits.findFirst({
      where: { id: splitId, eventId },
      include: { event: { select: { id: true } } },
    });
    if (!split) throw new NotFoundException("Revenue split not found");

    const canApprove =
      (await this.prisma.entities.findUnique({
        where: { id: split.collaboratorId },
        select: { ownerId: true },
      }))?.ownerId === userId ||
      (await this.prisma.entity_roles.findFirst({
        where: { entityId: split.collaboratorId, userId },
        select: { entityId: true },
      })) != null;

    if (!canApprove) {
      throw new ForbiddenException("Only the collaborator for this split can approve it");
    }

    if (split.approved) {
      return { approved: true, splitsLocked: false };
    }

    const allSplits = await this.p.event_revenue_splits.findMany({
      where: { eventId },
    });
    const totalPercent = allSplits.reduce((s, r) => s + Number(r.sharePercent), 0);
    if (totalPercent > 100) {
      throw new BadRequestException("Revenue splits total cannot exceed 100%");
    }

    const now = new Date();
    await this.p.event_revenue_splits.update({
      where: { id: splitId },
      data: { approved: true, approvedAt: now },
    });

    const updatedSplits = await this.p.event_revenue_splits.findMany({
      where: { eventId },
      select: { approved: true },
    });
    const allApproved = updatedSplits.length > 0 && updatedSplits.every((s) => s.approved);

    return { approved: true, splitsLocked: allApproved };
  }

  /**
   * When event status becomes CANCELLED: mark all HELD escrow as REFUNDED. Caller should trigger actual refunds.
   */
  async markEscrowRefunded(eventId: string): Promise<void> {
    await this.p.escrow_ledger.updateMany({
      where: { eventId, status: EscrowLedgerStatus.HELD },
      data: { status: EscrowLedgerStatus.REFUNDED },
    });
  }

  /**
   * Get order IDs for event that have HELD escrow (for triggering refunds when event is cancelled).
   */
  async getHeldOrderIdsForEvent(eventId: string): Promise<string[]> {
    const rows = await this.p.escrow_ledger.findMany({
      where: { eventId, status: EscrowLedgerStatus.HELD },
      select: { orderId: true },
    });
    return [...new Set(rows.map((r: { orderId: string }) => r.orderId))] as string[];
  }

  /**
   * Create or update a revenue split. Creator only. Collaborator must be the event owner entity.
   * Splits must total <= 100%.
   */
  async upsertRevenueSplit(
    eventId: string,
    collaboratorId: string,
    sharePercent: number,
    role: string | null,
    userId: string,
  ): Promise<{ id: string }> {
    await this.assertCanViewFinancials(eventId, userId);

    const event = await this.prisma.events.findUnique({
      where: { id: eventId },
      select: { entityId: true },
    });
    if (!event) throw new NotFoundException("Event not found");

    const allowedIds = new Set<string>([event.entityId]);
    if (!allowedIds.has(collaboratorId)) {
      throw new ForbiddenException("Collaborator must be the event owner or an event collaborator entity");
    }

    if (sharePercent < 0 || sharePercent > 100) {
      throw new BadRequestException("Share percent must be between 0 and 100");
    }

    const existing = await this.p.event_revenue_splits.findMany({
      where: { eventId },
      select: { id: true, collaboratorId: true, sharePercent: true },
    });
    const otherTotal = existing
      .filter((s) => s.collaboratorId !== collaboratorId)
      .reduce((sum, s) => sum + Number(s.sharePercent), 0);
    const currentShare = existing.find((s) => s.collaboratorId === collaboratorId);
    const newTotal = otherTotal + sharePercent;
    if (newTotal > 100) {
      throw new BadRequestException(
        `Revenue splits cannot exceed 100% (current other total: ${otherTotal}%, would be ${newTotal}% with this share)`,
      );
    }

    if (currentShare) {
      await this.p.event_revenue_splits.update({
        where: { id: currentShare.id },
        data: {
          sharePercent,
          ...(role != null && { role }),
          approved: false,
          approvedAt: null,
        },
      });
      return { id: currentShare.id };
    }

    const created = await this.p.event_revenue_splits.create({
      data: {
        eventId,
        collaboratorId,
        sharePercent,
        role: role ?? undefined,
      },
    });
    return { id: created.id };
  }
}
