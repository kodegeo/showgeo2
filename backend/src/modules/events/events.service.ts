import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { PrismaService, asPrismaDb } from "@/prisma/prisma.service";
import {
  CreateEventDto,
  UpdateEventDto,
  EventQueryDto,
  PhaseTransitionDto,
} from "./dto";
import { EventPhase, EventStatus, EventType, UserRole, EntityRoleType, EventAccessRole, EventOperationalRole } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { RegistrationsService, EventReminderType } from "@/modules/registrations/registrations.service";
import { EventAnalyticsDto } from "./dto/event-analytics.dto";
import { AudienceActionDto, AudienceActionType } from "./dto/audience-action.dto";
import { CreateReminderDto, ReminderType } from "./dto/create-reminder.dto";
import { CreateBlastDto } from "./dto/create-blast.dto";
import { NotificationsService } from "@/modules/notifications/notifications.service";
import { EscrowService } from "@/modules/escrow/escrow.service";
import { TicketTypesService } from "@/modules/tickets/ticket-types.service";


@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => RegistrationsService))
    private readonly registrationsService: RegistrationsService,
    private readonly notificationsService: NotificationsService,
    private readonly escrowService: EscrowService,
    private readonly ticketTypesService: TicketTypesService,
  ) {}
  
    // ------------------------------------------------------------
    // CREATE EVENT
    // ------------------------------------------------------------
  async create(createEventDto: CreateEventDto, userId: string) {
      const {
        name,
        description,
        startTime,
        endTime,
        location,
        isVirtual,
        streamUrl,
        customBranding,
        eventType,
        phase,
        status,
        geoRestricted,
        ticketRequired,
        registrationAccess,
        entryCodeRequired,
        entryCodeDelivery,
        testingEnabled,
        ticketTypes,
        ticketPrice,
      } = createEventDto;

      // ✅ Validate required fields with clear error messages
      if (!name) {
        throw new BadRequestException("name is required to create an event");
      }

      if (!startTime) {
        throw new BadRequestException("startTime is required to create an event");
      }

      if (!createEventDto.entityId) {
        throw new BadRequestException("entityId is required to create an event");
      }

      // Domain Rule: entities blocked by moderation cannot create events
      const entity = await this.prisma.entities.findUnique({
        where: { id: createEventDto.entityId },
        select: { status: true, name: true, ownerId: true },
      });

      if (!entity) {
        throw new NotFoundException(`Entity with id "${createEventDto.entityId}" not found. entityId is required to create an event.`);
      }

      const entityStatus = String(entity.status);
      const blockedStatuses = new Set(["REJECTED", "SUSPENDED", "DISABLED"]);
      if (blockedStatuses.has(entityStatus)) {
        throw new ForbiddenException(
          `Entity "${entity.name}" is ${entityStatus}. This entity cannot create events.`
        );
      }

      const requester = await this.prisma.app_users.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (requester?.role !== UserRole.ADMIN) {
        const hasEntityRole = await this.prisma.entity_roles.findFirst({
          where: {
            userId,
            entityId: createEventDto.entityId,
          },
          select: { id: true },
        });

        if (entity.ownerId !== userId && !hasEntityRole) {
          throw new ForbiddenException(
            "You do not have permission to create events for this entity."
          );
        }
      }

      // Quick create: status DRAFT, single ticket tier from ticketPrice
      const isQuickCreate = ticketPrice != null;
      const resolvedStatus = isQuickCreate ? EventStatus.DRAFT : (status ?? EventStatus.SCHEDULED);
      const ticketTypesJson = isQuickCreate && ticketPrice != null
        ? [{ name: "General Admission", price: Number(ticketPrice), currency: "USD", quantity: 1000, accessLevel: "GENERAL" as const }]
        : (ticketTypes ?? []).map(t => ({
            name: t.name,
            price: t.price,
            currency: t.currency,
            quantity: t.quantity,
            accessLevel: t.accessLevel,
            ...(t.requiresInvite !== undefined && { requiresInvite: t.requiresInvite }),
          }));

      const eventId = randomUUID();
      const sessionKey = `sk_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const roomId = randomUUID();

      const event = await this.prisma.$transaction(async (tx) => {
        const created = await (tx as any).events.create({
          data: {
            id: eventId,
            name,
            description,
            startTime: new Date(startTime),
            endTime: endTime ? new Date(endTime) : undefined,
            location,
            isVirtual: isVirtual ?? false,
            streamUrl,
            entity: { connect: { id: createEventDto.entityId } },
            eventCoordinatorId: userId,
            eventType: eventType ?? "LIVE",
            phase: phase ?? EventPhase.PRE_LIVE,
            status: resolvedStatus,
            geoRestricted: geoRestricted ?? false,
            ticketRequired: ticketRequired ?? true,
            ticketTypes: ticketTypesJson as unknown as Prisma.InputJsonValue,
            entryCodeRequired: entryCodeRequired ?? false,
            entryCodeDelivery: entryCodeDelivery ?? false,
            testingEnabled: testingEnabled ?? false,
            updatedAt: new Date(),
            customBranding: customBranding as Prisma.InputJsonValue,
            ...(registrationAccess != null && { registrationAccess }),
          } as unknown as Prisma.eventsCreateInput,
        });

        await (tx as any).streaming_sessions.create({
          data: {
            id: randomUUID(),
            eventId: created.id,
            entityId: createEventDto.entityId,
            roomId,
            sessionKey,
            accessLevel: "PUBLIC",
            geoRegions: [],
            updatedAt: new Date(),
          },
        });

        // Grant the entity owner OWNER access so phase-transition guards pass.
        // Also grant the requesting user (may differ from ownerId if a collaborator
        // created the event on behalf of the entity) COORDINATOR access.
        const ownerRoleExists = await (tx as any).event_roles.findUnique({
          where: { userId_eventId: { userId: entity.ownerId, eventId: created.id } },
          select: { id: true },
        });
        if (!ownerRoleExists) {
          await (tx as any).event_roles.create({
            data: {
              userId: entity.ownerId,
              eventId: created.id,
              accessRole: EventAccessRole.OWNER,
              operationalRoles: [EventOperationalRole.COORDINATOR, EventOperationalRole.BROADCASTER],
            },
          });
        }
        if (userId !== entity.ownerId) {
          const requesterRoleExists = await (tx as any).event_roles.findUnique({
            where: { userId_eventId: { userId, eventId: created.id } },
            select: { id: true },
          });
          if (!requesterRoleExists) {
            await (tx as any).event_roles.create({
              data: {
                userId,
                eventId: created.id,
                accessRole: EventAccessRole.ADMIN,
                operationalRoles: [EventOperationalRole.COORDINATOR],
              },
            });
          }
        }

        return created;
      });

      await this.ticketTypesService.syncCatalogFromEventTicketTypesJson(
        event.id,
        ticketTypesJson as unknown[],
      );

      if (event.status === EventStatus.SCHEDULED && createEventDto.entityId) {
        this.notificationsService
          .notifyEventScheduled(
            event.id,
            createEventDto.entityId,
            event.name,
            event.startTime ?? undefined,
          )
          .catch((err) => console.warn("[EventsService.create] notifyEventScheduled failed", err));
      }

      return event;
    }
        
    // ------------------------------------------------------------
    // (All other service methods remain untouched)
    // ------------------------------------------------------------


    async findAll(filters: {
      q?: string;
      creatorId?: string;
      virtual?: string;
      vip?: string;
      fromDate?: string;
      toDate?: string;
      status?: string;
      sort?: string;
      page?: number;
      limit?: number;
      search?: string;
      eventType?: EventType;
      phase?: EventPhase;
      entityId?: string;
      tourId?: string;
      isVirtual?: boolean;
      startDate?: string;
      endDate?: string;
      streamingAccessLevel?: string;
      location?: string;
    }) {
      try {
        const where: any = {};

        const q = filters.q ?? filters.search;
        if (q) {
          where.OR = [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ];
        }

        const creatorId = filters.creatorId ?? filters.entityId;
        if (creatorId) {
          where.entityId = creatorId;
        }

        if (filters.virtual === "true" || filters.isVirtual === true) {
          where.isVirtual = true;
        } else if (filters.virtual === "false" || filters.isVirtual === false) {
          where.isVirtual = false;
        }

        if (filters.vip === "true") {
          where.ticketRequired = true;
        }

        const fromDate = filters.fromDate ?? filters.startDate;
        const toDate = filters.toDate ?? filters.endDate;
        if (fromDate || toDate) {
          where.startTime = {};
          if (fromDate) where.startTime.gte = new Date(fromDate);
          if (toDate) where.startTime.lte = new Date(toDate);
        }

        if (filters.status) {
          where.status = filters.status;
        }

        if (filters.eventType) where.eventType = filters.eventType;
        if (filters.phase) where.phase = filters.phase;
        if (filters.tourId) where.tourId = filters.tourId;
        if (filters.streamingAccessLevel) where.streamingAccessLevel = filters.streamingAccessLevel;
        if (filters.location) {
          where.location = { contains: filters.location, mode: "insensitive" };
        }

        // Public browse: only upcoming or currently live, unless an explicit calendar range is requested.
        const hasExplicitRange = Boolean(
          filters.fromDate ?? filters.startDate ?? filters.toDate ?? filters.endDate,
        );
        if (!hasExplicitRange) {
          const now = new Date();
          const upcomingOrLive = {
            OR: [
              { startTime: { gte: now } },
              { phase: EventPhase.LIVE },
              { status: EventStatus.LIVE },
            ],
          };
          if (where.OR) {
            where.AND = [{ OR: where.OR }, upcomingOrLive];
            delete where.OR;
          } else {
            where.AND = [upcomingOrLive];
          }
        }

        const orderBy: any = {};
        switch (filters.sort) {
          case "upcoming":
            orderBy.startTime = "asc";
            break;
          case "newest":
            orderBy.createdAt = "desc";
            break;
          case "trending":
            orderBy.tickets = { _count: "desc" };
            break;
          default:
            orderBy.startTime = "asc";
        }

        const page = filters.page ?? 1;
        const requestedLimit = filters.limit ?? 12;
        const limit = Math.min(requestedLimit, 50); // hard cap at 50
        const skip = (page - 1) * limit;
        const take = limit;
        
        const [data, total] = await this.prisma.$transaction([
          this.prisma.events.findMany({
            where,
            orderBy,
            skip,
            take,
            include: {
              entity: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  thumbnail: true,
                  type: true,
                  isVerified: true,
                  createdAt: true,
                },
              },
              tours: true,
              _count: {
                select: {
                  tickets: true,
                },
              },
            },
          }),
          this.prisma.events.count({ where }),
        ]);

        const pagination = {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };
        return {
          data,
          pagination,
          meta: pagination,
        };
      } catch (err) {
        console.error("🔥 EVENTS.findAll FAILED", err);
        throw err;
      }
    }

  /**
   * Get upcoming or live events from entities the current user follows.
   * Used for "From Creators You Follow" feed.
   */
  async getFollowedEvents(userId: string) {
    const follows = await (this.prisma as any).follows.findMany({
      where: {
        userId,
        targetType: "ENTITY",
      },
      select: { targetId: true },
    });
    const entityIds = follows.map((f: { targetId: string }) => f.targetId).filter(Boolean);
    if (entityIds.length === 0) {
      return { data: [] };
    }

    const now = new Date();
    const events = await (this.prisma as any).events.findMany({
      where: {
        entityId: { in: entityIds },
        OR: [
          { startTime: { gte: now } },
          { phase: EventPhase.LIVE },
        ],
      },
      orderBy: { startTime: "asc" },
      take: 20,
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
          },
        },
      },
    });

    return { data: events };
  }

  /**
   * Get events for the current user's entities (owner or collaborator) with dashboard stats.
   * Used by GET /events/my-events for creator dashboard.
   */
  async getMyEvents(userId: string): Promise<{
    events: Array<{
      id: string;
      name: string;
      startTime: Date;
      status: string;
      phase: string;
      lastLaunchedBy: string | null;
      entityId: string;
      ticketsSold: number;
      grossRevenue: number;
      escrowHeld: number;
      estimatedPayout: number;
    }>;
    recentClips: Array<{
      id: string;
      eventId: string;
      title: string | null;
      thumbnailUrl: string | null;
      views: number;
      createdAt: Date;
      event?: { id: string; name: string };
    }>;
  }> {
    // Normal case: ownerId === app user. Legacy / split accounts: entities.id === app_users.id
    // (creator row keyed by profile id while ownerId points at a different account).
    const ownedEntityIds = await this.prisma.entities
      .findMany({
        where: {
          OR: [{ ownerId: userId }, { id: userId }],
        },
        select: { id: true },
      })
      .then((r) => r.map((e) => e.id));
    const roleEntityIds = await this.prisma.entity_roles.findMany({
      where: { userId },
      select: { entityId: true },
    }).then((r) => r.map((e) => e.entityId));
    const entityIds = [...new Set([...ownedEntityIds, ...roleEntityIds])];

    const eventRoleRows = await this.prisma.event_roles.findMany({
      where: { userId },
      select: { eventId: true },
    });
    const eventIdsFromRoles = [...new Set(eventRoleRows.map((r) => r.eventId))];

    const accessOr: Prisma.eventsWhereInput[] = [];
    if (entityIds.length > 0) {
      accessOr.push({ entityId: { in: entityIds } });
    }
    if (eventIdsFromRoles.length > 0) {
      accessOr.push({ id: { in: eventIdsFromRoles } });
    }
    accessOr.push({ eventCoordinatorId: userId });

    const eventsList = await this.prisma.events.findMany({
      where: accessOr.length === 1 ? accessOr[0]! : { OR: accessOr },
      orderBy: { startTime: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        startTime: true,
        status: true,
        phase: true,
        lastLaunchedBy: true,
        entityId: true,
      },
    });

    if (eventsList.length === 0) {
      return { events: [], recentClips: [] };
    }

    const eventIds = eventsList.map((e) => e.id);
    const db = this.prisma as any;

    const [ticketCounts, escrowByEvent, splitsByEvent] = await Promise.all([
      this.prisma.tickets.groupBy({
        by: ["eventId"],
        where: { eventId: { in: eventIds }, status: "ACTIVE" },
        _count: { id: true },
      }),
      typeof db.escrow_ledger?.groupBy === "function"
        ? db.escrow_ledger.groupBy({
            by: ["eventId", "status"],
            where: { eventId: { in: eventIds } },
            _sum: { amount: true },
          })
        : Promise.resolve([]),
      typeof db.event_revenue_splits?.findMany === "function"
        ? db.event_revenue_splits.findMany({
            where: { eventId: { in: eventIds } },
            select: { eventId: true, collaboratorId: true, sharePercent: true },
          })
        : Promise.resolve([]),
    ]);

    const ticketsByEvent = new Map<string, number>();
    ticketCounts.forEach((g) => {
      ticketsByEvent.set(g.eventId, g._count.id);
    });

    const escrowHeldByEvent = new Map<string, number>();
    const grossRevenueByEvent = new Map<string, number>();
    escrowByEvent.forEach((g) => {
      const amt = Number(g._sum.amount ?? 0);
      if (g.status === "HELD") {
        escrowHeldByEvent.set(g.eventId, (escrowHeldByEvent.get(g.eventId) ?? 0) + amt);
      } else if (g.status === "RELEASED") {
        grossRevenueByEvent.set(g.eventId, (grossRevenueByEvent.get(g.eventId) ?? 0) + amt);
      }
    });
    escrowByEvent.forEach((g) => {
      if (g.status === "HELD") {
        const held = escrowHeldByEvent.get(g.eventId) ?? 0;
        grossRevenueByEvent.set(g.eventId, (grossRevenueByEvent.get(g.eventId) ?? 0) + held);
      }
    });

    const totalRevenueByEvent = new Map<string, number>();
    eventsList.forEach((e) => {
      // grossRevenueByEvent already contains HELD + RELEASED per event
      const total = grossRevenueByEvent.get(e.id) ?? 0;
      totalRevenueByEvent.set(e.id, total);
    });

    const payoutByEventAndCollaborator = new Map<string, number>();
    splitsByEvent.forEach((s) => {
      const total = totalRevenueByEvent.get(s.eventId) ?? 0;
      const share = (total * Number(s.sharePercent)) / 100;
      const key = `${s.eventId}:${s.collaboratorId}`;
      payoutByEventAndCollaborator.set(key, share);
    });

    const entityIdSet = new Set(entityIds);
    const events = eventsList.map((e) => {
      const ticketsSold = ticketsByEvent.get(e.id) ?? 0;
      const grossRevenue = Math.round((totalRevenueByEvent.get(e.id) ?? 0) * 100) / 100;
      const escrowHeld = Math.round((escrowHeldByEvent.get(e.id) ?? 0) * 100) / 100;
      let estimatedPayout = 0;
      entityIdSet.forEach((entId) => {
        const key = `${e.id}:${entId}`;
        estimatedPayout += payoutByEventAndCollaborator.get(key) ?? 0;
      });
      estimatedPayout = Math.round(estimatedPayout * 100) / 100;
      return {
        id: e.id,
        name: e.name,
        startTime: e.startTime,
        status: e.status,
        phase: String(e.phase),
        lastLaunchedBy: e.lastLaunchedBy ?? null,
        entityId: e.entityId,
        ticketsSold,
        grossRevenue,
        escrowHeld,
        estimatedPayout,
      };
    });

    type ClipRow = {
      id: string;
      eventId: string;
      title: string | null;
      thumbnailUrl: string | null;
      views: number | null;
      createdAt: Date | null;
      event?: { id: string; name: string } | null;
    };
    const clipsRaw = (typeof db.event_clips?.findMany === "function"
      ? await db.event_clips.findMany({
          where: { eventId: { in: eventIds } },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            eventId: true,
            title: true,
            thumbnailUrl: true,
            views: true,
            createdAt: true,
            event: { select: { id: true, name: true } },
          },
        })
      : []) as ClipRow[];
    const recentClips = clipsRaw.map((c) => ({
      id: c.id,
      eventId: c.eventId,
      title: c.title ?? null,
      thumbnailUrl: c.thumbnailUrl ?? null,
      views: c.views ?? 0,
      createdAt: c.createdAt,
      event: c.event ? { id: c.event.id, name: c.event.name } : undefined,
    }));

    return { events, recentClips };
  }

  /** Get streaming session info for Event Studio (RTMP URL, stream key). */
  async getEventEntityOwnerId(eventId: string): Promise<string | null> {
    const row = await this.prisma.events.findUnique({
      where: { id: eventId },
      select: { entity: { select: { ownerId: true } } },
    });
    return row?.entity?.ownerId ?? null;
  }

  async getStreamForEvent(eventId: string) {
    const session = await (this.prisma as any).streaming_sessions.findFirst({
      where: { eventId },
      select: { id: true, sessionKey: true, roomId: true, active: true },
      orderBy: { createdAt: "desc" },
    });
    if (!session) {
      return { rtmpUrl: null, streamKey: null, status: "NO_SESSION", sessionId: null };
    }
    const rtmpUrl = process.env.RTMP_SERVER_URL ?? "rtmp://stream.showgeo.com/live";
    return {
      rtmpUrl,
      streamKey: session.sessionKey,
      status: session.active ? "ACTIVE" : "INACTIVE",
      sessionId: session.id,
    };
  }
    
  async findOne(id: string) {
    const event = await this.prisma.events.findUnique({
      where: { id },
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            type: true,
            isVerified: true,
            createdAt: true,
          },
        },
        tours: true,
        tickets: true,
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    const catalog = await this.ticketTypesService.getTicketTypes(id);

    const ticketTypesFromDb =
      catalog.length > 0
        ? TicketTypesService.mapDbRowsToTicketTypesJson(catalog)
        : null;
    const ticketTypesResolved =
      ticketTypesFromDb ??
      (Array.isArray(event.ticketTypes) ? event.ticketTypes : []);

    const coordinator = event.eventCoordinatorId
      ? await this.prisma.app_users.findUnique({
          where: { id: event.eventCoordinatorId },
          select: { id: true, email: true },
        })
      : null;
    const eventWithCoordinator = {
      ...event,
      ticketTypes: ticketTypesResolved,
      ticket_types: catalog,
      app_users: coordinator,
      collaborators: (event as any).event_revenue_splits ?? [],
    };

    // Phase 2B: Opportunistic reminder triggering (non-blocking)
    // Trigger reminders when someone views a LIVE event
    // This is best-effort and must not block the API response
    if (event.phase === "LIVE" || event.status === "LIVE") {
      setImmediate(async () => {
        try {
          // Calculate time since event went LIVE
          const now = new Date();
          const startTime = event.startTime ? new Date(event.startTime) : null;
          
          if (startTime) {
            const minutesSinceStart = Math.floor(
              (now.getTime() - startTime.getTime()) / (1000 * 60),
            );

            // Trigger 10-minute reminder if event has been LIVE for 10-30 minutes
            if (minutesSinceStart >= 10 && minutesSinceStart < 30) {
              await this.registrationsService.notifyLiveReminder(
                id,
                EventReminderType.LIVE_10_MIN,
              );
            }
            // Trigger 30-minute reminder if event has been LIVE for 30+ minutes
            else if (minutesSinceStart >= 30) {
              await this.registrationsService.notifyLiveReminder(
                id,
                EventReminderType.LIVE_30_MIN,
              );
            }
          }
        } catch (error) {
          // Log but don't throw - reminder failures must not affect event fetching
          console.error(
            `[EventsService] Failed to trigger opportunistic reminder for event ${id}:`,
            error,
          );
        }
      });
    }

    return eventWithCoordinator;
  }

  // --------------- Event-scoped RBAC ---------------

  async getAccess(eventId: string, userId: string | null): Promise<{ accessRole: EventAccessRole; operationalRoles: EventOperationalRole[] } | null> {
    if (!userId) return null;
    const event = await this.prisma.events.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!event) throw new NotFoundException(`Event with ID ${eventId} not found`);
    const row = await this.prisma.event_roles.findUnique({
      where: { userId_eventId: { userId, eventId } },
      select: { accessRole: true, operationalRoles: true },
    });
    return row;
  }

  async getRoles(eventId: string, byUserId: string) {
    const event = await this.prisma.events.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!event) throw new NotFoundException(`Event with ID ${eventId} not found`);
    await this.assertCanManageRoles(eventId, byUserId);
    const roles = await this.prisma.event_roles.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" },
    });
    const userIds = roles.map((r) => r.userId).filter(Boolean);
    const [users, profiles] = await Promise.all([
      userIds.length > 0 ? this.prisma.app_users.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } }) : [],
      userIds.length > 0 ? this.prisma.user_profiles.findMany({ where: { userId: { in: userIds } }, select: { userId: true, username: true, firstName: true, lastName: true } }) : [],
    ]);
    const userById = new Map(users.map((u) => [u.id, u] as [string, { id: string; email: string | null }]));
    const profileByUserId = new Map(profiles.map((p) => [p.userId, p] as [string, typeof p]));
    return roles.map((role) => {
      const user = userById.get(role.userId);
      return {
        ...role,
        app_users: user ? { ...user, user_profiles: profileByUserId.get(role.userId) ?? null } : null,
      };
    });
  }

  async upsertRole(eventId: string, targetUserId: string, dto: { accessRole?: EventAccessRole; operationalRoles?: EventOperationalRole[] }, byUserId: string) {
    const event = await this.prisma.events.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!event) throw new NotFoundException(`Event with ID ${eventId} not found`);
    await this.assertCanManageRoles(eventId, byUserId);
    const existing = await this.prisma.event_roles.findUnique({
      where: { userId_eventId: { userId: targetUserId, eventId } },
    });
    const accessRole = dto.accessRole ?? existing?.accessRole ?? EventAccessRole.VIEWER;
    const operationalRoles = dto.operationalRoles ?? existing?.operationalRoles ?? [];
    const mergedOps = existing && dto.operationalRoles
      ? [...new Set([...existing.operationalRoles, ...dto.operationalRoles])]
      : operationalRoles;
    const role = await this.prisma.event_roles.upsert({
      where: { userId_eventId: { userId: targetUserId, eventId } },
      create: {
        userId: targetUserId,
        eventId,
        accessRole,
        operationalRoles: mergedOps,
        updatedAt: new Date(),
      },
      update: {
        ...(dto.accessRole !== undefined && { accessRole: dto.accessRole }),
        ...(dto.operationalRoles !== undefined && { operationalRoles: mergedOps }),
        updatedAt: new Date(),
      },
    });
    const [user, profile] = await Promise.all([
      this.prisma.app_users.findUnique({ where: { id: targetUserId }, select: { id: true, email: true } }),
      this.prisma.user_profiles.findUnique({ where: { userId: targetUserId }, select: { username: true, firstName: true, lastName: true } }),
    ]);
    return {
      ...role,
      app_users: user ? { ...user, user_profiles: profile } : null,
    };
  }

  async removeRole(eventId: string, targetUserId: string, byUserId: string) {
    const event = await this.prisma.events.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!event) throw new NotFoundException(`Event with ID ${eventId} not found`);
    await this.assertCanManageRoles(eventId, byUserId);
    await this.prisma.event_roles.deleteMany({
      where: { eventId, userId: targetUserId },
    });
    return { ok: true };
  }

  private async assertCanManageRoles(eventId: string, userId: string) {
    const allowed = await this.canManageEventRoles(eventId, userId);
    if (!allowed) throw new ForbiddenException("You do not have permission to manage event roles");
  }

  private async canManageEventRoles(eventId: string, userId: string): Promise<boolean> {
    const user = await this.prisma.app_users.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === UserRole.ADMIN) return true;
    const row = await this.prisma.event_roles.findUnique({
      where: { userId_eventId: { userId, eventId } },
      select: { accessRole: true },
    });
    return row?.accessRole === EventAccessRole.OWNER || row?.accessRole === EventAccessRole.ADMIN;
  }

  async assertPhasePermission(eventId: string, userId: string) {
    const user = await this.prisma.app_users.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === UserRole.ADMIN) return;

    const row = await this.prisma.event_roles.findUnique({
      where: { userId_eventId: { userId, eventId } },
      select: { accessRole: true, operationalRoles: true },
    });

    const allowed =
      row?.accessRole === EventAccessRole.OWNER ||
      row?.accessRole === EventAccessRole.ADMIN ||
      (row?.operationalRoles ?? []).includes(EventOperationalRole.COORDINATOR);

    if (allowed) return;

    // Entity owner or designated event coordinator can manage lifecycle even
    // when no event_roles row exists (common for creator-owned events).
    const event = await this.prisma.events.findUnique({
      where: { id: eventId },
      select: {
        eventCoordinatorId: true,
        entity: { select: { ownerId: true } },
      },
    });
    if (event?.entity?.ownerId === userId || event?.eventCoordinatorId === userId) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[assertPhasePermission] DEV: no event_roles row and user is not owner/coordinator.` +
          ` Allowing anyway for local testing.`,
      );
      return;
    }

    throw new ForbiddenException("You do not have permission to perform this action on this event");
  }

  async assertBroadcasterPermission(eventId: string, userId: string) {
    const user = await this.prisma.app_users.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === UserRole.ADMIN) return;
    const row = await this.prisma.event_roles.findUnique({
      where: { userId_eventId: { userId, eventId } },
      select: { accessRole: true, operationalRoles: true },
    });
    if (row) {
      const allowed =
        row.operationalRoles.includes(EventOperationalRole.BROADCASTER) ||
        row.accessRole === EventAccessRole.OWNER ||
        row.accessRole === EventAccessRole.ADMIN;
      if (allowed) return;
    }

    const event = await this.prisma.events.findUnique({
      where: { id: eventId },
      select: {
        eventCoordinatorId: true,
        entity: { select: { ownerId: true } },
      },
    });
    if (event?.entity?.ownerId === userId || event?.eventCoordinatorId === userId) {
      return;
    }

    throw new ForbiddenException("You do not have broadcaster access to this event");
  }

  async update(id: string, updateEventDto: UpdateEventDto, updatedBy: string) {
    const event = await this.findOne(id); // ensure exists

    const { collaboratorEntityIds, ticketTypes, customBranding, liveIntroduction, ...updateData } =
      updateEventDto;

    // ✅ Live Introduction validation: Only editable in PRE_LIVE phase
    if (liveIntroduction !== undefined) {
      if (event.phase !== EventPhase.PRE_LIVE) {
        throw new BadRequestException(
          "Live Introduction can only be configured when event is in PRE_LIVE phase",
        );
      }

      // If enabled, videoUrl is required
      if (liveIntroduction.enabled === true && !liveIntroduction.videoUrl) {
        throw new BadRequestException(
          "videoUrl is required when Live Introduction is enabled",
        );
      }
    }

    // Prepare collaborators update
    const collaboratorsUpdate = collaboratorEntityIds
      ? {
          set: collaboratorEntityIds.map((entityId) => ({ id: entityId })),
        }
      : undefined;

    // Convert ticket types to JSON if provided with proper Prisma typing
    const ticketTypesJson = ticketTypes
      ? (JSON.parse(JSON.stringify(ticketTypes)) as Prisma.InputJsonValue)
      : undefined;
    const customBrandingJson =
      customBranding !== undefined
        ? (customBranding as Prisma.InputJsonValue)
        : undefined;
    
    // ✅ Live Introduction: Normalize to plain JSON object for Prisma JSON field
    const liveIntroductionJson = liveIntroduction !== undefined
      ? ({
          enabled: liveIntroduction.enabled,
          ...(liveIntroduction.videoUrl && { videoUrl: liveIntroduction.videoUrl }),
        } as Prisma.InputJsonValue)
      : undefined;

    // Build update data object explicitly to avoid type conflicts
    const data: any = {
      lastLaunchedBy: updatedBy,
    };

    // Add fields only if they're provided
    if (updateData.name !== undefined) data.name = updateData.name;
    if (updateData.description !== undefined)
      data.description = updateData.description;
    if (updateData.thumbnail !== undefined) data.thumbnail = updateData.thumbnail;
    if (updateData.eventType !== undefined) data.eventType = updateData.eventType;
    if (updateData.phase !== undefined) data.phase = updateData.phase;
    if (updateData.startTime !== undefined)
      data.startTime = new Date(updateData.startTime);
    if (updateData.endTime !== undefined)
      data.endTime = updateData.endTime
        ? new Date(updateData.endTime)
        : null;
    if (updateData.location !== undefined) data.location = updateData.location;
    if (updateData.status !== undefined) data.status = updateData.status;
    if (updateData.entityId !== undefined)
      data.entity = { connect: { id: updateData.entityId } };
    if (updateData.eventCoordinatorId !== undefined)
      data.eventCoordinatorId = updateData.eventCoordinatorId;
    if (updateData.tourId !== undefined)
      data.tours = updateData.tourId ? { connect: { id: updateData.tourId } } : { disconnect: true };
    if (updateData.isVirtual !== undefined) data.isVirtual = updateData.isVirtual;
    if (updateData.streamUrl !== undefined) data.streamUrl = updateData.streamUrl;
    if (updateData.testStreamUrl !== undefined)
      data.testStreamUrl = updateData.testStreamUrl;
    if (updateData.videoUrl !== undefined) data.videoUrl = updateData.videoUrl;
    if (updateData.streamingAccessLevel !== undefined)
      data.streamingAccessLevel = updateData.streamingAccessLevel;
    if (updateData.geoRegions !== undefined) data.geoRegions = updateData.geoRegions;
    if (updateData.geoRestricted !== undefined)
      data.geoRestricted = updateData.geoRestricted;
    if ((updateData as any).visibility !== undefined)
      (data as any).visibility = (updateData as any).visibility;
    if (updateData.ticketRequired !== undefined)
      data.ticketRequired = updateData.ticketRequired;
    if ((updateData as any).registrationAccess !== undefined)
      data.registrationAccess = (updateData as any).registrationAccess;
    if (ticketTypesJson !== undefined) data.ticketTypes = ticketTypesJson;
    if (updateData.entryCodeRequired !== undefined)
      data.entryCodeRequired = updateData.entryCodeRequired;
    if (updateData.entryCodeDelivery !== undefined)
      data.entryCodeDelivery = updateData.entryCodeDelivery;
    if (updateData.ticketEmailTemplate !== undefined)
      data.ticketEmailTemplate = updateData.ticketEmailTemplate;
    if (updateData.testingEnabled !== undefined)
      data.testingEnabled = updateData.testingEnabled;
    if (customBrandingJson !== undefined)
      data.customBranding = customBrandingJson;
    
    // ✅ Live Introduction: Store as JSONB (normalized to plain object)
    if (liveIntroductionJson !== undefined) {
      data.liveIntroduction = liveIntroductionJson;
    }
    
    if (collaboratorsUpdate)
      (data as any).collaborators = collaboratorsUpdate;

    const updated = await this.prisma.events.update({
      where: { id },
      data,
      include: {
        entity: true,
        tours: true,
      },
    });

    if (updateData.status === EventStatus.CANCELLED) {
      setImmediate(async () => {
        try {
          await this.escrowService.markEscrowRefunded(id);
        } catch (error) {
          console.error("[EventsService] Mark escrow refunded failed for event " + id, error);
        }
      });
    }

    if (updateData.status === EventStatus.COMPLETED) {
      setImmediate(async () => {
        try {
          await this.escrowService.releaseEscrowAndCreatePayouts(id);
        } catch (error) {
          console.error("[EventsService] Escrow release failed for event " + id, error);
        }
      });
    }

    if (ticketTypes !== undefined) {
      await this.ticketTypesService.syncCatalogFromEventTicketTypesJson(
        id,
        ticketTypes,
      );
    }

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);

    await (this.prisma as any).events.delete({
      where: { id },
    });

    return { message: "Event deleted successfully" };
  }

  async transitionPhase(
    id: string,
    phaseTransitionDto: PhaseTransitionDto,
    userId: string,
  ) {
    const event = await this.findOne(id);
    const oldPhase = event.phase;

    // Validate phase transition
    const validTransitions = this.getValidPhaseTransitions(event.phase);
    if (!validTransitions.includes(phaseTransitionDto.phase)) {
      throw new BadRequestException(
        `Invalid phase transition from ${event.phase} to ${phaseTransitionDto.phase}`,
      );
    }

    // Business rule: require ticket types only if ticketRequired is true
    if (
      phaseTransitionDto.phase === EventPhase.LIVE &&
      event.ticketRequired === true &&
      (!event.ticketTypes || (Array.isArray(event.ticketTypes) && event.ticketTypes.length === 0))
    ) {
      throw new BadRequestException(
        "At least one ticket type is required before going live",
      );
    }

    const updateData: any = {
      phase: phaseTransitionDto.phase,
      lastLaunchedBy: userId,
    };

    // Update status based on phase
    if (phaseTransitionDto.phase === EventPhase.LIVE) {
      updateData.status = EventStatus.LIVE;
    } else if (phaseTransitionDto.phase === EventPhase.POST_LIVE) {
      // POST_LIVE phase means event is completed
      updateData.status = EventStatus.COMPLETED;
    }

    // Handle scheduled time
    if (phaseTransitionDto.scheduledTime) {
      updateData.startTime = new Date(phaseTransitionDto.scheduledTime);
    }

    const updated = await this.prisma.events.update({
      where: { id },
      data: updateData,
      include: {
        entity: true,
        tours: true,
      },
    });

    // Teardown streaming sessions when transitioning from LIVE to POST_LIVE
    if (oldPhase === EventPhase.LIVE && phaseTransitionDto.phase === EventPhase.POST_LIVE) {
      try {
        await (this.prisma as any).streaming_sessions.updateMany({
          where: {
            eventId: id,
            active: true,
          },
          data: {
            active: false,
            endTime: new Date(),
          },
        });
        console.log(`[EventsService] Teardown: Deactivated streaming sessions for event ${id}`);
      } catch (error) {
        console.error(`[EventsService] Failed to teardown streaming sessions for event ${id}:`, error);
        // Don't throw - session teardown failure shouldn't block phase transition
      }
    }

    // Notify eligible users when event goes LIVE
    if (phaseTransitionDto.phase === EventPhase.LIVE) {
      setImmediate(async () => {
        try {
          await this.registrationsService.notifyLiveEvent(id);
        } catch (error) {
          console.error("[EventsService] Failed to notify eligible users:", error);
        }
      });
    }

    // When event becomes COMPLETED: release escrow and create payouts from revenue splits
    if (phaseTransitionDto.phase === EventPhase.POST_LIVE && updateData.status === EventStatus.COMPLETED) {
      setImmediate(async () => {
        try {
          await this.escrowService.releaseEscrowAndCreatePayouts(id);
        } catch (error) {
          console.error("[EventsService] Escrow release failed for event " + id, error);
        }
      });
    }

    return updated;
  }

  async extendPhase(id: string, additionalMinutes: number, userId: string) {
    const event = await this.findOne(id);

    if (event.endTime) {
      const newEndTime = new Date(event.endTime);
      newEndTime.setMinutes(newEndTime.getMinutes() + additionalMinutes);

      return this.prisma.events.update({
        where: { id },
        data: {
          endTime: newEndTime,
          lastLaunchedBy: userId,
        },
        include: {
          entity: true,
          tours: true,
        },
      });
    }

    throw new BadRequestException("Event does not have an end time set");
  }

  async updateLiveMetrics(
    id: string,
    metrics: Record<string, unknown>,
    userId: string,
  ) {
    const event = await this.findOne(id);

    const currentMetrics =
      (event.liveMetrics as Record<string, unknown>) || {};
    const updatedMetrics = {
      ...currentMetrics,
      ...metrics,
      updatedAt: new Date().toISOString(),
    } as Prisma.InputJsonValue;

    return (this.prisma as any).events.update({
      where: { id },
      data: {
        liveMetrics: updatedMetrics,
        lastLaunchedBy: userId,
      },
    });
  }

  async addTestResult(
    id: string,
    testResult: Record<string, unknown>,
    userId: string,
  ) {
    const event = await this.findOne(id);

    const currentLogs =
      (event.testResultLogs as Record<string, unknown>[]) || [];
    const newLog = {
      ...testResult,
      timestamp: new Date().toISOString(),
      userId,
    };

    return (this.prisma as any).events.update({
      where: { id },
      data: {
        testResultLogs: [...currentLogs, newLog] as Prisma.InputJsonValue,
        lastLaunchedBy: userId,
      },
    });
  }

  private getValidPhaseTransitions(currentPhase: EventPhase): EventPhase[] {
    switch (currentPhase) {
      case EventPhase.PRE_LIVE:
        return [EventPhase.LIVE];
      case EventPhase.LIVE:
        return [EventPhase.POST_LIVE];
      case EventPhase.POST_LIVE:
        return []; // Post-live is final
      default:
        return [];
    }
  }

  async getEventMetrics(id: string) {
    const event = await this.findOne(id);

    const ticketCount = await (this.prisma as any).tickets.count({
      where: { eventId: id },
    });

    const chatRoomCount = await (this.prisma as any).chat_rooms.count({
      where: { eventId: id },
    });

    return {
      event: {
        id: event.id,
        name: event.name,
        phase: event.phase,
        status: event.status,
      },
      metrics: {
        tickets: ticketCount,
        chatRooms: chatRoomCount,
        liveMetrics: event.liveMetrics,
        testResults: event.testResultLogs,
      },
    };
  }

  async assertProductionPermission(eventId: string, userId: string) {
    const role = await this.prisma.event_roles.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });
  
    if (!role) {
      throw new ForbiddenException("No event role");
    }
  
    const isOwnerOrAdmin =
      role.accessRole === "OWNER" ||
      role.accessRole === "ADMIN";
  
    const isCoordinator =
      role.operationalRoles.includes("COORDINATOR");
  
    if (!isOwnerOrAdmin && !isCoordinator) {
      throw new ForbiddenException("No production access");
    }
  
    return true;
  }

  /**
   * Get event analytics (Phase 3B)
   * Read-only engagement metrics for event creators
   */
  async getEventAnalytics(eventId: string, requesterUserId: string): Promise<EventAnalyticsDto> {
    // 1. Verify event exists
    const event = await (this.prisma as any).events.findUnique({
      where: { id: eventId },
      include: {
        entity: {
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

    // 2. Verify requester has permission (event owner or entity admin)
    await this.checkEventAnalyticsPermissions(event, requesterUserId);

    // 3. Aggregate registrations count
    const registrationsCount = await (this.prisma as any).event_registrations.count({
      where: {
        eventId,
        status: "REGISTERED", // Only count registered users
      },
    });

    // 4. Aggregate ACTIVE tickets issued (ticket holders)
    const ticketsIssued = await (this.prisma as any).tickets.count({
      where: {
        eventId,
        status: "ACTIVE",
        userId: { not: null }, // Only count tickets with userId (logged-in users)
      },
    });

    // 5. Viewers who joined: tickets model has no joinedAt; use ACTIVE tickets with userId as proxy for logged-in viewers
    const viewersJoined = ticketsIssued;

    // 6. Calculate join rate
    const joinRate = ticketsIssued > 0 ? 100 : 0;

    // 7. Guest vs logged-in viewers (by userId presence)
    const guestViewers = await (this.prisma as any).tickets.count({
      where: {
        eventId,
        status: "ACTIVE",
        userId: null,
      },
    });

    const loggedInViewers = await (this.prisma as any).tickets.count({
      where: {
        eventId,
        status: "ACTIVE",
        userId: { not: null },
      },
    });

    // 8. Aggregate reminder notifications sent
    // Get all EVENT_UPDATE mailbox items and filter by eventId in metadata
    // Note: Prisma doesn't support JSON field filtering directly, so we fetch and filter in memory
    let allMailboxItems: Array<{ metadata: unknown }> = [];
    try {
      allMailboxItems = await (this.prisma as any).mailbox_items.findMany({
        where: {
          type: "EVENT_UPDATE",
        },
        select: {
          metadata: true,
        },
      });
    } catch {
      // Keep analytics endpoint resilient when mailbox_items model is absent.
      allMailboxItems = [];
    }

    // Filter for this event and count by reminder type
    let remindersSent10Min = 0;
    let remindersSent30Min = 0;

    for (const item of allMailboxItems) {
      const metadata = item.metadata as any;
      if (metadata?.eventId === eventId) {
        if (metadata?.reminderType === "LIVE_10_MIN") {
          remindersSent10Min++;
        } else if (metadata?.reminderType === "LIVE_30_MIN") {
          remindersSent30Min++;
        }
      }
    }

    return {
      registrationsCount,
      ticketsIssued,
      viewersJoined,
      joinRate: Math.round(joinRate * 100) / 100, // Round to 2 decimal places
      guestViewers,
      loggedInViewers,
      remindersSent10Min,
      remindersSent30Min,
    };
  }

  /**
   * Check if requester has permission to view event analytics
   * Must be: event coordinator, entity owner, or entity admin/manager
   */
  private async checkEventAnalyticsPermissions(event: any, userId: string): Promise<void> {
    // Admin can view any event analytics
    // Note: We don't have userRole here, so we'll check entity roles instead

    // Check if user is event coordinator
    if (event.eventCoordinatorId === userId) {
      return;
    }

    // Check if user is entity owner
    if (event.entity?.ownerId === userId) {
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
      "You do not have permission to view analytics for this event",
    );
  }

  // ---------------------------------------------------------------------------
  // AUDIENCE & PROMOTION ACTIONS
  // ---------------------------------------------------------------------------

  /**
   * Handle audience actions (send reminder, invite audience, schedule reminder)
   * Creates a mailbox item as an audit trail
   */
  async handleAudienceAction(
    eventId: string,
    userId: string,
    dto: AudienceActionDto,
  ): Promise<{ success: boolean; message: string }> {
    // Validate event exists and user has permission
    const event = await (this.prisma as any).events.findUnique({
      where: { id: eventId },
      include: {
        entity: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with id "${eventId}" not found`);
    }

    // Check if user is entity owner or has admin/manager role
    const entityId = event.entityId;
    if (!entityId) {
      throw new BadRequestException("Event must have an entityId");
    }

    const entity = await this.prisma.entities.findUnique({
      where: { id: entityId },
      select: { id: true, ownerId: true },
    });
    if (!entity) {
      throw new ForbiddenException(
        "You do not have permission to perform audience actions for this event",
      );
    }
    const hasRole = await this.prisma.entity_roles.findFirst({
      where: {
        entityId,
        userId,
        role: { in: [EntityRoleType.ADMIN, EntityRoleType.MANAGER] },
      },
    });
    if (entity.ownerId !== userId && !hasRole) {
      throw new ForbiddenException(
        "You do not have permission to perform audience actions for this event",
      );
    }

    // Create mailbox item based on action type
    const mailboxType = this.getMailboxTypeForAction(dto.actionType);
    const { title, message } = this.getMailboxMessageForAction(dto.actionType, event.name);

    // Create mailbox item for the entity owner (creator)
    await (this.prisma as any).mailbox_items.create({
      data: {
        id: randomUUID(),
        userId: entity.ownerId, // Send to entity owner
        email: null,
        type: mailboxType,
        title,
        message,
        metadata: {
          eventId,
          entityId,
          actionType: dto.actionType,
          timestamp: new Date().toISOString(),
          ...(dto.scheduledFor && { scheduledFor: dto.scheduledFor }),
        } as Prisma.InputJsonValue,
        isRead: false,
        registrationId: null,
      },
    });

    // TODO: In the future, actually send reminders/invitations to registered users
    // For now, this is just creating the audit trail

    return {
      success: true,
      message: this.getSuccessMessageForAction(dto.actionType),
    };
  }

  /**
   * Map audience action type to mailbox item type
   */
  private getMailboxTypeForAction(actionType: AudienceActionType): string {
    switch (actionType) {
      case AudienceActionType.SEND_REMINDER:
      case AudienceActionType.SCHEDULE_REMINDER:
        return "NOTIFICATION";
      case AudienceActionType.INVITE_AUDIENCE:
        return "INVITATION";
      default:
        return "NOTIFICATION";
    }
  }

  /**
   * Generate mailbox message based on action type
   */
  private getMailboxMessageForAction(
    actionType: AudienceActionType,
    eventName: string,
  ): { title: string; message: string } {
    switch (actionType) {
      case AudienceActionType.SEND_REMINDER:
        return {
          title: "Reminder Sent",
          message: `Reminder sent for event "${eventName}"`,
        };
      case AudienceActionType.INVITE_AUDIENCE:
        return {
          title: "Invitation Sent",
          message: `Audience invitation sent for event "${eventName}"`,
        };
      case AudienceActionType.SCHEDULE_REMINDER:
        return {
          title: "Reminder Scheduled",
          message: `Reminder scheduled for event "${eventName}"`,
        };
      default:
        return {
          title: "Action Completed",
          message: `Action completed for event "${eventName}"`,
        };
    }
  }

  /**
   * Get success message for frontend
   */
  private getSuccessMessageForAction(actionType: AudienceActionType): string {
    switch (actionType) {
      case AudienceActionType.SEND_REMINDER:
        return "Reminder sent successfully";
      case AudienceActionType.INVITE_AUDIENCE:
        return "Invitation sent successfully";
      case AudienceActionType.SCHEDULE_REMINDER:
        return "Reminder scheduled successfully";
      default:
        return "Action completed successfully";
    }
  }

  // ---------------------------------------------------------------------------
  // REMINDER SCHEDULING
  // ---------------------------------------------------------------------------

  /**
   * Create a scheduled reminder for an event
   */
  async createReminder(
    eventId: string,
    userId: string,
    dto: CreateReminderDto,
  ): Promise<any> {
    // Validate event exists and user has permission
    const event = await (this.prisma as any).events.findUnique({
      where: { id: eventId },
      include: {
        entity: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with id "${eventId}" not found`);
    }

    const entityId = event.entityId;
    if (!entityId) {
      throw new BadRequestException("Event must have an entityId");
    }

    const entity = await this.prisma.entities.findUnique({
      where: { id: entityId },
      select: { id: true, ownerId: true },
    });
    if (!entity) {
      throw new ForbiddenException(
        "You do not have permission to create reminders for this event",
      );
    }
    const hasRole = await this.prisma.entity_roles.findFirst({
      where: {
        entityId,
        userId,
        role: { in: [EntityRoleType.ADMIN, EntityRoleType.MANAGER] },
      },
    });
    if (entity.ownerId !== userId && !hasRole) {
      throw new ForbiddenException(
        "You do not have permission to create reminders for this event",
      );
    }

    // Validate scheduledFor is in the future
    const scheduledFor = new Date(dto.scheduledFor);
    if (scheduledFor <= new Date()) {
      throw new BadRequestException("scheduledFor must be in the future");
    }

    // Create reminder record
    const reminder = await (this.prisma as any).event_reminders.create({
      data: {
        eventId,
        entityId,
        type: dto.type,
        scheduledFor,
        messageTemplate: dto.messageTemplate || null,
        status: "SCHEDULED",
      },
    });

    // Create mailbox item for confirmation
    await (this.prisma as any).mailbox_items.create({
      data: {
        id: randomUUID(),
        userId: entity.ownerId,
        email: null,
        type: "NOTIFICATION",
        title: "Reminder Scheduled",
        message: `Reminder scheduled for ${scheduledFor.toLocaleString()}`,
        metadata: {
          eventId,
          entityId,
          reminderId: reminder.id,
          actionType: "SCHEDULE_REMINDER",
          scheduledFor: scheduledFor.toISOString(),
          timestamp: new Date().toISOString(),
        } as Prisma.InputJsonValue,
        isRead: false,
        registrationId: null,
      },
    });

    return reminder;
  }

  /**
   * Get all reminders for an event
   */
  async getReminders(eventId: string, userId: string): Promise<any[]> {
    // Validate event exists and user has permission
    const event = await (this.prisma as any).events.findUnique({
      where: { id: eventId },
      include: {
        entity: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with id "${eventId}" not found`);
    }

    const entityId = event.entityId;
    if (!entityId) {
      throw new BadRequestException("Event must have an entityId");
    }

    const entity = await this.prisma.entities.findUnique({
      where: { id: entityId },
      select: { id: true, ownerId: true },
    });
    if (!entity) {
      throw new ForbiddenException(
        "You do not have permission to view reminders for this event",
      );
    }
    const hasRole = await this.prisma.entity_roles.findFirst({
      where: {
        entityId,
        userId,
        role: { in: [EntityRoleType.ADMIN, EntityRoleType.MANAGER] },
      },
    });
    if (entity.ownerId !== userId && !hasRole) {
      throw new ForbiddenException(
        "You do not have permission to view reminders for this event",
      );
    }

    // Get all reminders for this event
    return (this.prisma as any).event_reminders.findMany({
      where: { eventId },
      orderBy: { scheduledFor: "asc" },
    });
  }

  // ---------------------------------------------------------------------------
  // BLAST COMPOSER
  // ---------------------------------------------------------------------------

  /**
   * Create a blast (message blast to audience)
   */
  async createBlast(
    eventId: string,
    userId: string,
    dto: CreateBlastDto,
  ): Promise<{ success: boolean; recipientsCount: number }> {
    // Validate event exists and user has permission
    const event = await (this.prisma as any).events.findUnique({
      where: { id: eventId },
      include: {
        entity: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with id "${eventId}" not found`);
    }

    const entityId = event.entityId;
    if (!entityId) {
      throw new BadRequestException("Event must have an entityId");
    }

    const entity = await this.prisma.entities.findUnique({
      where: { id: entityId },
      select: { id: true, ownerId: true },
    });
    if (!entity) {
      throw new ForbiddenException(
        "You do not have permission to create blasts for this event",
      );
    }
    const hasRole = await this.prisma.entity_roles.findFirst({
      where: {
        entityId,
        userId,
        role: { in: [EntityRoleType.ADMIN, EntityRoleType.MANAGER] },
      },
    });
    if (entity.ownerId !== userId && !hasRole) {
      throw new ForbiddenException(
        "You do not have permission to create blasts for this event",
      );
    }

    // Validate channel
    if (dto.channel !== "IN_APP") {
      throw new BadRequestException("Only IN_APP channel is supported at this time");
    }

    // Resolve audience to get recipient userIds
    let recipientUserIds: string[] = [];

    switch (dto.audience) {
      case "FOLLOWERS": {
        // Get event's entity to resolve followers
        const eventRow = await (this.prisma as any).events.findUnique({
          where: { id: eventId },
          select: { entityId: true },
        });
        const entityIdForFollowers = eventRow?.entityId;
        if (!entityIdForFollowers) break;
        const follows = await (this.prisma as any).follows.findMany({
          where: { targetId: entityIdForFollowers, targetType: "ENTITY" },
          select: { userId: true },
        });
        recipientUserIds = follows.map((f: any) => f.userId).filter((id: string) => id);
        break;
      }
      case "TICKET_HOLDERS": {
        // Get all users with ACTIVE tickets for this event
        // Ticket holder definition: status === ACTIVE AND eventId matches
        const tickets = await (this.prisma as any).tickets.findMany({
          where: {
            eventId,
            status: "ACTIVE",
            userId: { not: null },
          },
          select: { userId: true },
        });
        
        // Extract distinct userIds and filter out null/undefined
        recipientUserIds = [...new Set(tickets.map((t: any) => t.userId))].filter(
          (id: string | null | undefined): id is string => !!id
        );
        
        // If no ticket holders exist, return empty array (don't throw error)
        // This allows the blast to succeed with deliveredCount = 0
        break;
      }
      case "CUSTOM": {
        throw new BadRequestException("CUSTOM audience is not yet implemented");
      }
      default: {
        throw new BadRequestException(`Invalid audience type: ${dto.audience}`);
      }
    }

    // Remove duplicates and filter out null/undefined
    recipientUserIds = [...new Set(recipientUserIds)].filter((id): id is string => !!id);

    // Create direct messages + invite tracking records for each recipient.
    // This uses existing schema models (`messages`, `invites`) instead of legacy tables.
    let deliveredCount = 0;
    for (const recipientUserId of recipientUserIds) {
      try {
        const inviteRecord = await this.prisma.invites.create({
          data: {
            inviterUserId: userId,
            email: `user-${recipientUserId}`,
            targetType: "EVENT",
            targetId: eventId,
            status: "PENDING",
          },
        });

        await asPrismaDb(this.prisma).messages.create({
          data: {
            senderId: userId,
            recipientId: recipientUserId,
            content: dto.message,
          },
        });

        await this.prisma.invites.update({
          where: { id: inviteRecord.id },
          data: { status: "SENT" },
        });

        deliveredCount++;
      } catch (error) {
        // Keep blast best-effort; mark invite failure when available and continue.
        try {
          const existing = await this.prisma.invites.findFirst({
            where: {
              inviterUserId: userId,
              targetType: "EVENT",
              targetId: eventId,
              email: `user-${recipientUserId}`,
            },
            orderBy: { createdAt: "desc" },
          });
          if (existing) {
            await this.prisma.invites.update({
              where: { id: existing.id },
              data: { status: "FAILED" },
            });
          }
        } catch {
          // no-op: secondary failure should not fail whole blast loop
        }
        console.error(`Failed to deliver message to user ${recipientUserId}:`, error);
      }
    }

    return { success: true, recipientsCount: deliveredCount };
  }
}
