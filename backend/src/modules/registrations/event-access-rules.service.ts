import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { RegisterDto } from "./dto";

export type EventAccessRuleType = "PUBLIC" | "CODE" | "INVITE" | "TICKET";

export interface EventAccessRule {
  type: EventAccessRuleType;
  code: string | null;
  user_id: string | null;
  ticket_type_id: string | null;
}

export interface ResolvedRegistration {
  id: string;
  eventId: string;
  userId: string | null;
  email: string | null;
  status: string | null;
  accessCode: string | null;
}

/**
 * Unified event access rule model. Replaces branching on
 * events.registrationAccess / ticketRequired / entryCodeRequired.
 * Single rule per event determines access.
 */
@Injectable()
export class EventAccessRulesService {
  constructor(private readonly prisma: PrismaService) {}

  private get p(): any {
    return this.prisma as any;
  }

  /**
   * Fetch the single access rule for an event.
   * If no row exists, derive a legacy rule from event fields (backward compatibility).
   */
  async getEffectiveRule(eventId: string): Promise<EventAccessRule | null> {
    const table = (this.prisma as any).event_access_rules;
    if (!table?.findFirst) return null;
    const ruleRow = await table.findFirst({
      where: { eventId },
    });

    if (ruleRow) {
      return {
        type: ruleRow.type,
        code: ruleRow.code ?? null,
        user_id: ruleRow.userId ?? null,
        ticket_type_id: ruleRow.ticket_type_id ?? null,
      };
    }

    return null;
  }

  /**
   * Build a legacy rule from event flags for backward compatibility
   * when event_access_rules has no row for this event.
   */
  buildLegacyRule(event: {
    registrationAccess?: string | null;
    ticketRequired?: boolean;
    entryCodeRequired?: boolean;
  }): EventAccessRule {
    const access = (event.registrationAccess as string)?.toUpperCase?.() || "PUBLIC";
    if (event.ticketRequired === true && access === "PUBLIC") {
      return { type: "TICKET", code: null, user_id: null, ticket_type_id: null };
    }
    if (access === "ACCESS_CODE" || access === "CODE" || event.entryCodeRequired) {
      return { type: "CODE", code: null, user_id: null, ticket_type_id: null };
    }
    if (access === "INVITE_ONLY" || access === "INVITE") {
      return { type: "INVITE", code: null, user_id: null, ticket_type_id: null };
    }
    return { type: "PUBLIC", code: null, user_id: null, ticket_type_id: null };
  }

  /**
   * Validate request against the access rule and resolve or create registration.
   * Returns the registration to confirm (update to REGISTERED) or throws 403/400/404.
   */
  async validateAndResolveRegistration(
    eventId: string,
    rule: EventAccessRule,
    dto: RegisterDto,
    userId: string | undefined,
    event: { id: string; name?: string },
  ): Promise<ResolvedRegistration> {
    const { type } = rule;

    switch (type) {
      case "PUBLIC": {
        const existing = await this.findExistingRegistration(eventId, dto, userId);
        if (existing) {
          if (existing.status === "REGISTERED") return existing;
          if (existing.status === "CANCELLED") {
            throw new ForbiddenException("This registration was cancelled.");
          }
          const updated = await this.p.event_registrations.update({
            where: { id: existing.id },
            data: {
              status: "REGISTERED",
              userId: userId ?? existing.userId,
              email: dto.email ?? existing.email ?? null,
            },
          });
          return updated;
        }
        if (!userId && !dto.email?.trim()) {
          throw new BadRequestException("Email or login is required to register.");
        }
        const created = await this.p.event_registrations.create({
          data: {
            id: randomUUID(),
            eventId,
            userId: userId ?? null,
            email: dto.email ?? null,
            accessCode: null,
            status: "REGISTERED",
          },
        });
        return created;
      }

      case "CODE": {
        const suppliedCode = dto.accessCode?.trim();
        if (!suppliedCode) {
          throw new BadRequestException("Access code is required for this event.");
        }
        const pass = await this.p.access_passes.findFirst({
          where: { event_id: eventId, access_code: suppliedCode },
        });
        if (!pass) {
          throw new BadRequestException("Invalid access code.");
        }
        if (pass.status === "CONVERTED" || pass.used_at != null) {
          throw new BadRequestException("This access code has already been used.");
        }
        if (pass.user_id && userId && pass.user_id !== userId) {
          throw new ForbiddenException("This access code is for another account.");
        }
        if (pass.user_id && !userId) {
          throw new BadRequestException("Please sign in to use this access code.");
        }
        const passCode = pass.access_code ?? suppliedCode;
        let existing: ResolvedRegistration | null = null;
        if (userId) {
          existing = await this.p.event_registrations.findFirst({
            where: { eventId, userId },
          });
        }
        if (!existing && dto.email?.trim()) {
          existing = await this.p.event_registrations.findFirst({
            where: { eventId, email: dto.email.trim() },
          });
        }
        if (!existing && pass.user_id) {
          existing = await this.p.event_registrations.findFirst({
            where: { eventId, userId: pass.user_id },
          });
        }
        if (!existing && pass.email) {
          existing = await this.p.event_registrations.findFirst({
            where: { eventId, email: pass.email },
          });
        }
        if (existing) {
          if (existing.status === "REGISTERED") return existing;
          const updated = await this.p.event_registrations.update({
            where: { id: existing.id },
            data: {
              status: "REGISTERED",
              userId: userId ?? existing.userId ?? pass.user_id,
              email: dto.email ?? existing.email ?? pass.email ?? null,
              accessCode: passCode,
            },
          });
          return updated;
        }
        const created = await this.p.event_registrations.create({
          data: {
            id: randomUUID(),
            eventId,
            userId: userId ?? pass.user_id ?? null,
            email: dto.email ?? pass.email ?? null,
            accessCode: passCode,
            status: "REGISTERED",
          },
        });
        return created;
      }

      case "INVITE": {
        let existing = await this.findExistingRegistration(eventId, dto, userId);
        if (!existing && dto.accessCode?.trim()) {
          const pass = await this.p.access_passes.findFirst({
            where: { event_id: eventId, access_code: dto.accessCode.trim() },
          });
          if (pass) {
            const or: Array<{ userId: string } | { email: string }> = [];
            if (userId) or.push({ userId });
            if (dto.email?.trim()) or.push({ email: dto.email.trim() });
            if (pass.user_id) or.push({ userId: pass.user_id });
            if (pass.email) or.push({ email: pass.email });
            if (or.length) {
              existing = await this.p.event_registrations.findFirst({
                where: { eventId, OR: or },
              });
            }
          }
        }
        if (!existing) {
          throw new ForbiddenException(
            "Only invited users can register for this event.",
          );
        }
        if (existing.status === "REGISTERED") {
          return existing;
        }
        if (existing.status === "CANCELLED") {
          throw new ForbiddenException("This registration was cancelled.");
        }
        const passForCode = dto.accessCode?.trim()
          ? await this.p.access_passes.findFirst({
              where: { event_id: eventId, access_code: dto.accessCode.trim() },
              select: { access_code: true },
            })
          : null;
        const updated = await this.p.event_registrations.update({
          where: { id: existing.id },
          data: {
            status: "REGISTERED",
            userId: userId ?? existing.userId,
            email: dto.email ?? existing.email ?? null,
            ...(passForCode?.access_code != null
              ? { accessCode: passForCode.access_code }
              : {}),
          },
        });
        return updated;
      }

      case "TICKET": {
        throw new BadRequestException(
          "This event requires a ticket. Please purchase a ticket to register.",
        );
      }

      default: {
        throw new ForbiddenException("Registration is not allowed for this event.");
      }
    }
  }

  private async findExistingRegistration(
    eventId: string,
    dto: RegisterDto,
    userId: string | undefined,
  ): Promise<ResolvedRegistration | null> {
    if (dto.registrationId) {
      const r = await this.p.event_registrations.findFirst({
        where: { id: dto.registrationId, eventId },
      });
      return r ?? null;
    }
    if (userId) {
      const r = await this.p.event_registrations.findFirst({
        where: { eventId, userId },
      });
      return r ?? null;
    }
    if (dto.email) {
      const r = await this.p.event_registrations.findFirst({
        where: { eventId, email: dto.email },
      });
      return r ?? null;
    }
    return null;
  }
}
