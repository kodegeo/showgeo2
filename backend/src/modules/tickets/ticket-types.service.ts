import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService, asPrismaDb } from "../../prisma/prisma.service";
import { CreateTicketTypeDto } from "./dto/create-ticket-type.dto";
import type { TicketTierInputDto } from "./dto/save-ticket-types.dto";

/** Shape of `events.ticketTypes` JSON from Studio / PATCH body */
type EventTicketTierJson = Record<string, unknown>;

/**
 * Catalog operations for `ticket_types` (Supabase-aligned).
 * For purchased tickets, see {@link TicketsService}.
 */
@Injectable()
export class TicketTypesService {
  constructor(private readonly prisma: PrismaService) {}

  private get ext() {
    return asPrismaDb(this.prisma);
  }

  private async ensureEventCreator(
    eventId: string,
    userId: string,
  ): Promise<void> {
    const event = await this.prisma.events.findUnique({
      where: { id: eventId },
      include: { entity: true },
    });
    if (!event) throw new NotFoundException("Event not found");
    const entity = event.entity;
    if (!entity || entity.ownerId !== userId) {
      throw new ForbiddenException(
        "Only the event creator can manage ticket types",
      );
    }
  }

  async createTicketType(
    eventId: string,
    data: CreateTicketTypeDto,
    creatorUserId: string,
  ) {
    await this.ensureEventCreator(eventId, creatorUserId);

    const price =
      data.price !== undefined && data.price !== null
        ? new Prisma.Decimal(String(data.price))
        : undefined;

    return this.ext.ticket_types.create({
      data: {
        event_id: eventId,
        name: data.name,
        ...(price !== undefined ? { price } : {}),
        currency: data.currency ?? "USD",
        capacity: data.capacity ?? null,
        visibility: data.visibility ?? "PUBLIC",
        requires_invite: data.requiresInvite ?? false,
      },
    });
  }

  async getTicketTypes(eventId: string) {
    const ticketTypes = this.ext.ticket_types;
    if (!ticketTypes) {
      return [];
    }
    return ticketTypes.findMany({
      where: { event_id: eventId },
      orderBy: { created_at: "asc" },
    });
  }

  /**
   * Single source of truth: replace `ticket_types` rows and mirror `events.ticketTypes` JSON.
   * POST /events/:eventId/ticket-types body `{ tickets }`.
   */
  async replaceTicketTypes(
    eventId: string,
    tickets: TicketTierInputDto[],
    userId: string,
  ) {
    await this.ensureEventCreator(eventId, userId);

    const rows = tickets.map((t) => {
      const priceNum = Number(t.price ?? 0);
      const price = new Prisma.Decimal(
        String(Number.isFinite(priceNum) ? priceNum : 0),
      );
      const capacity =
        t.quantity !== undefined && t.quantity !== null
          ? Math.max(0, Math.floor(Number(t.quantity)))
          : null;
      const requiresInvite = t.accessLevel === "VIP";
      return {
        id: randomUUID(),
        event_id: eventId,
        name: t.name?.trim() || "General Admission",
        price,
        currency: t.currency ?? "USD",
        capacity,
        visibility: "PUBLIC" as const,
        requires_invite: requiresInvite,
      };
    });

    const jsonMirror: Prisma.InputJsonValue = tickets.map((t) => ({
      name: t.name,
      price: Number(t.price ?? 0),
      currency: t.currency ?? "USD",
      quantity: t.quantity ?? 0,
      accessLevel: t.accessLevel ?? "GENERAL",
    })) as unknown as Prisma.InputJsonValue;

    await this.prisma.$transaction([
      this.ext.ticket_types.deleteMany({ where: { event_id: eventId } }),
      ...(rows.length > 0
        ? [this.ext.ticket_types.createMany({ data: rows })]
        : []),
      this.prisma.events.update({
        where: { id: eventId },
        data: {
          ticketTypes: (rows.length > 0 ? jsonMirror : []) as Prisma.InputJsonValue,
        },
      }),
    ]);

    return this.getTicketTypes(eventId);
  }

  /**
   * Used by event create / legacy JSON sync — maps unknown tier shapes to DB + JSON.
   */
  async syncCatalogFromEventTicketTypesJson(
    eventId: string,
    tiers: unknown,
  ): Promise<void> {
    const parsed = this.mapUnknownTiersToInputs(tiers);
    if (parsed.length === 0) {
      await this.prisma.$transaction([
        this.ext.ticket_types.deleteMany({ where: { event_id: eventId } }),
        this.prisma.events.update({
          where: { id: eventId },
          data: { ticketTypes: [] as unknown as Prisma.InputJsonValue },
        }),
      ]);
      return;
    }

    const rows = parsed.map((t) => {
      const priceNum = Number(t.price ?? 0);
      const price = new Prisma.Decimal(
        String(Number.isFinite(priceNum) ? priceNum : 0),
      );
      const capRaw = t.quantity ?? t.availability ?? t.capacity;
      let capacity: number | null = null;
      if (capRaw !== undefined && capRaw !== null && capRaw !== "") {
        const n = Math.floor(Number(capRaw));
        if (Number.isFinite(n) && n >= 0) {
          capacity = n;
        }
      }
      const requiresInvite =
        t.accessLevel === "VIP" ||
        t.requiresInvite === true ||
        t.requires_invite === true;
      return {
        id: randomUUID(),
        event_id: eventId,
        name:
          (typeof t.name === "string" && t.name.trim()) ||
          (typeof t.type === "string" && t.type.trim()) ||
          "General Admission",
        price,
        currency: typeof t.currency === "string" ? t.currency : "USD",
        capacity,
        visibility: "PUBLIC" as const,
        requires_invite: Boolean(requiresInvite),
      };
    });

    const jsonMirror = parsed.map((t) => ({
      name:
        (typeof t.name === "string" && t.name) ||
        (typeof t.type === "string" && t.type) ||
        "General Admission",
      price: Number((t as EventTicketTierJson).price ?? 0),
      currency: ((t as EventTicketTierJson).currency as string) ?? "USD",
      quantity: Number(
        (t as EventTicketTierJson).quantity ??
          (t as EventTicketTierJson).availability ??
          0,
      ),
      accessLevel:
        ((t as EventTicketTierJson).accessLevel as string) === "VIP"
          ? "VIP"
          : "GENERAL",
    })) as unknown as Prisma.InputJsonValue;

    await this.prisma.$transaction([
      this.ext.ticket_types.deleteMany({ where: { event_id: eventId } }),
      ...(rows.length > 0
        ? [this.ext.ticket_types.createMany({ data: rows })]
        : []),
      this.prisma.events.update({
        where: { id: eventId },
        data: { ticketTypes: jsonMirror },
      }),
    ]);
  }

  private mapUnknownTiersToInputs(tiers: unknown): EventTicketTierJson[] {
    if (!Array.isArray(tiers)) return [];
    return tiers as EventTicketTierJson[];
  }

  /** Map DB rows to legacy JSON shape for GET /events/:id `ticketTypes` when catalog is non-empty */
  static mapDbRowsToTicketTypesJson(
    rows: Array<{
      id: string;
      name: string;
      price: Prisma.Decimal | null;
      currency: string | null;
      capacity: number | null;
      requires_invite: boolean | null;
    }>,
  ) {
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      price: r.price != null ? Number(r.price) : 0,
      currency: r.currency ?? "USD",
      quantity: r.capacity ?? 0,
      accessLevel: r.requires_invite ? ("VIP" as const) : ("GENERAL" as const),
    }));
  }
}
