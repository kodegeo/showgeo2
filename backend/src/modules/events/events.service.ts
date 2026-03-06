import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateEventDto,
  UpdateEventDto,
  EventQueryDto,
  PhaseTransitionDto,
} from "./dto";
import { EventPhase, EventStatus, EventType, UserRole, EntityRoleType, EventAccessRole, EventOperationalRole } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { RegistrationsService, EventReminderType } from "../registrations/registrations.service";
import { EventAnalyticsDto } from "./dto/event-analytics.dto";
import { AudienceActionDto, AudienceActionType } from "./dto/audience-action.dto";
import { CreateReminderDto, ReminderType } from "./dto/create-reminder.dto";
import { CreateBlastDto } from "./dto/create-blast.dto";


@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => RegistrationsService))
    private readonly registrationsService: RegistrationsService,
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
        entryCodeRequired,
        entryCodeDelivery,
        testingEnabled,
        ticketTypes,
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

      // Domain Rule: Only ACTIVE entities can create events
      const entity = await this.prisma.entities.findUnique({
        where: { id: createEventDto.entityId },
        select: { status: true, name: true },
      });

      if (!entity) {
        throw new NotFoundException(`Entity with id "${createEventDto.entityId}" not found. entityId is required to create an event.`);
      }

      const entityStatus = String(entity.status);
      if (entityStatus !== "ACTIVE") {
        throw new ForbiddenException(
          `Entity "${entity.name}" is ${entityStatus}. Only ACTIVE entities can create events.`
        );
      }
    
      // ✅ Create JSON-safe ticketTypes before prisma.events.create()
      const ticketTypesJson = (ticketTypes ?? []).map(t => ({
        type: t.type,
        price: t.price,
        currency: t.currency,
        availability: t.availability,
      }));
    
      // ✅ Apply safe defaults - Event creation only persists the event, nothing else
      return this.prisma.events.create({
        data: {
          id: randomUUID(),
          name,
          description,
          startTime: new Date(startTime),
          endTime: endTime ? new Date(endTime) : undefined,
          location,
          isVirtual: isVirtual ?? false,
          streamUrl,

          // Relations (Prisma 7: use connect, not direct FK)
          entities_events_entityIdToentities: { connect: { id: createEventDto.entityId } },
          app_users: { connect: { id: userId } },

          // ✅ SAFE DEFAULTS - Applied automatically on creation
          eventType: eventType ?? "LIVE",
          phase: phase ?? EventPhase.PRE_LIVE,
          status: status ?? EventStatus.SCHEDULED,
          geoRestricted: geoRestricted ?? false,
          ticketRequired: ticketRequired ?? true,
          ticketTypes: ticketTypesJson as unknown as Prisma.InputJsonValue,
          entryCodeRequired: entryCodeRequired ?? false,
          entryCodeDelivery: entryCodeDelivery ?? false,
          testingEnabled: testingEnabled ?? false,
          updatedAt: new Date(),

          customBranding: customBranding as Prisma.InputJsonValue,
        },
      });
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
              entities_events_entityIdToentities: {
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
              app_users: {
                select: {
                  id: true,
                  email: true,
                  user_profiles: true,
                },
              },
              tours: true,
              entities_EventCollaborators: true,
              _count: {
                select: {
                  tickets: true,
                  chat_rooms: true,
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
    
  async findOne(id: string) {
    const event = await (this.prisma as any).events.findUnique({
      where: { id },
      include: {
        // previously `entity`
        entities_events_entityIdToentities: {
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
        // previously `coordinator`
        app_users: {
          select: {
            id: true,
            email: true,
            user_profiles: true, // previously `profile`
          },
        },
        // previously `tour`
        tours: true,
        // previously `collaborators`
        entities_EventCollaborators: true,
        tickets: {
          include: {
            // previously `user` with `profile`
            app_users: {
              select: {
                id: true,
                email: true,
                user_profiles: true,
              },
            },
          },
        },
        geofencing: true,
        // previously `chatRooms`
        chat_rooms: true,
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

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

    return event;
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
    return this.prisma.event_roles.findMany({
      where: { eventId },
      include: { app_users: { select: { id: true, email: true, user_profiles: true } } },
      orderBy: { createdAt: "asc" },
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
    return this.prisma.event_roles.upsert({
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
      include: { app_users: { select: { id: true, email: true, user_profiles: true } } },
    });
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
    if (!row) throw new ForbiddenException("You do not have permission to perform this action on this event");
    const allowed =
      row.accessRole === EventAccessRole.OWNER ||
      row.accessRole === EventAccessRole.ADMIN ||
      row.operationalRoles.includes(EventOperationalRole.COORDINATOR);
    if (!allowed) throw new ForbiddenException("You do not have permission to perform this action on this event");
  }

  async assertBroadcasterPermission(eventId: string, userId: string) {
    const user = await this.prisma.app_users.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === UserRole.ADMIN) return;
    const row = await this.prisma.event_roles.findUnique({
      where: { userId_eventId: { userId, eventId } },
      select: { accessRole: true, operationalRoles: true },
    });
    if (!row) throw new ForbiddenException("You do not have broadcaster access to this event");
    const allowed =
      row.operationalRoles.includes(EventOperationalRole.BROADCASTER) ||
      row.accessRole === EventAccessRole.OWNER ||
      row.accessRole === EventAccessRole.ADMIN;
    if (!allowed) throw new ForbiddenException("You do not have broadcaster access to this event");
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
      data.entities_events_entityIdToentities = { connect: { id: updateData.entityId } };
    if (updateData.eventCoordinatorId !== undefined)
      data.app_users = { connect: { id: updateData.eventCoordinatorId } };
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
    if (updateData.ticketRequired !== undefined)
      data.ticketRequired = updateData.ticketRequired;
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
      data.entities_EventCollaborators = collaboratorsUpdate;

    const updated = await (this.prisma as any).events.update({
      where: { id },
      data,
      include: {
        entities_events_entityIdToentities: true,
        app_users: true,
        tours: true,
        entities_EventCollaborators: true,
      },
    });

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

    const updated = await (this.prisma as any).events.update({
      where: { id },
      data: updateData,
      include: {
        entities_events_entityIdToentities: true,
        app_users: true,
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
      // Notify asynchronously to avoid blocking phase transition
      setImmediate(async () => {
        try {
          await this.registrationsService.notifyLiveEvent(id);
        } catch (error) {
          console.error("[EventsService] Failed to notify eligible users:", error);
          // Don't throw - notification failure shouldn't block phase transition
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

      return (this.prisma as any).events.update({
        where: { id },
        data: {
          endTime: newEndTime,
          lastLaunchedBy: userId,
        },
        include: {
          entities_events_entityIdToentities: true,
          app_users: true,
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

    // 5. Aggregate viewers who joined (tickets with joinedAt)
    const viewersJoined = await (this.prisma as any).tickets.count({
      where: {
        eventId,
        joinedAt: { not: null },
      },
    });

    // 6. Calculate join rate
    const joinRate = ticketsIssued > 0 ? (viewersJoined / ticketsIssued) * 100 : 0;

    // 7. Aggregate guest vs logged-in viewers
    const guestViewers = await (this.prisma as any).tickets.count({
      where: {
        eventId,
        joinedAt: { not: null },
        userId: null,
      },
    });

    const loggedInViewers = await (this.prisma as any).tickets.count({
      where: {
        eventId,
        joinedAt: { not: null },
        userId: { not: null },
      },
    });

    // 8. Aggregate reminder notifications sent
    // Get all EVENT_UPDATE mailbox items and filter by eventId in metadata
    // Note: Prisma doesn't support JSON field filtering directly, so we fetch and filter in memory
    const allMailboxItems = await (this.prisma as any).mailbox_items.findMany({
      where: {
        type: "EVENT_UPDATE",
      },
      select: {
        metadata: true,
      },
    });

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
    const event = await this.prisma.events.findUnique({
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
      throw new NotFoundException(`Event with id "${eventId}" not found`);
    }

    // Check if user is entity owner or has admin/manager role
    const entityId = event.entityId;
    if (!entityId) {
      throw new BadRequestException("Event must have an entityId");
    }

    // Check entity ownership or role
    const entity = await (this.prisma as any).entities.findUnique({
      where: { id: entityId },
      include: {
        entity_roles: {
          where: {
            userId,
            role: {
              in: [EntityRoleType.OWNER, EntityRoleType.ADMIN, EntityRoleType.MANAGER],
            },
          },
        },
      },
    });

    if (!entity || (entity.ownerId !== userId && entity.entity_roles.length === 0)) {
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
    const event = await this.prisma.events.findUnique({
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
      throw new NotFoundException(`Event with id "${eventId}" not found`);
    }

    const entityId = event.entityId;
    if (!entityId) {
      throw new BadRequestException("Event must have an entityId");
    }

    // Check entity ownership or role
    const entity = await (this.prisma as any).entities.findUnique({
      where: { id: entityId },
      include: {
        entity_roles: {
          where: {
            userId,
            role: {
              in: [EntityRoleType.OWNER, EntityRoleType.ADMIN, EntityRoleType.MANAGER],
            },
          },
        },
      },
    });

    if (!entity || (entity.ownerId !== userId && entity.entity_roles.length === 0)) {
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
    const event = await this.prisma.events.findUnique({
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
      throw new NotFoundException(`Event with id "${eventId}" not found`);
    }

    const entityId = event.entityId;
    if (!entityId) {
      throw new BadRequestException("Event must have an entityId");
    }

    // Check entity ownership or role
    const entity = await (this.prisma as any).entities.findUnique({
      where: { id: entityId },
      include: {
        entity_roles: {
          where: {
            userId,
            role: {
              in: [EntityRoleType.OWNER, EntityRoleType.ADMIN, EntityRoleType.MANAGER],
            },
          },
        },
      },
    });

    if (!entity || (entity.ownerId !== userId && entity.entity_roles.length === 0)) {
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
    const event = await this.prisma.events.findUnique({
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
      throw new NotFoundException(`Event with id "${eventId}" not found`);
    }

    const entityId = event.entityId;
    if (!entityId) {
      throw new BadRequestException("Event must have an entityId");
    }

    // Check entity ownership or role
    const entity = await (this.prisma as any).entities.findUnique({
      where: { id: entityId },
      include: {
        entity_roles: {
          where: {
            userId,
            role: {
              in: [EntityRoleType.OWNER, EntityRoleType.ADMIN, EntityRoleType.MANAGER],
            },
          },
        },
      },
    });

    if (!entity || (entity.ownerId !== userId && entity.entity_roles.length === 0)) {
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
        // Get all users following this entity
        const follows = await (this.prisma as any).follows.findMany({
          where: { entityId },
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

    // Create audience_message records for each recipient
    let deliveredCount = 0;
    for (const recipientUserId of recipientUserIds) {
      try {
        await (this.prisma as any).audience_messages.create({
          data: {
            eventId,
            entityId,
            senderId: userId,
            recipientUserId,
            title: dto.title,
            message: dto.message,
            channel: dto.channel,
            readAt: null,
          },
        });
        deliveredCount++;
      } catch (error) {
        // Log error but continue with other recipients
        console.error(`Failed to deliver message to user ${recipientUserId}:`, error);
      }
    }

    // Create mailbox item for creator audit trail
    await (this.prisma as any).mailbox_items.create({
      data: {
        id: randomUUID(),
        userId: entity.ownerId,
        email: null,
        type: "NOTIFICATION",
        title: "Blast Sent",
        message: `Blast "${dto.title}" sent to ${deliveredCount} ${dto.audience === "FOLLOWERS" ? "followers" : "ticket holders"}`,
        metadata: {
          eventId,
          entityId,
          audience: dto.audience,
          channel: dto.channel,
          title: dto.title,
          actionType: "BLAST_SENT",
          recipientsCount: deliveredCount,
          timestamp: new Date().toISOString(),
        } as Prisma.InputJsonValue,
        isRead: false,
        registrationId: null,
      },
    });

    return { success: true, recipientsCount: deliveredCount };
  }
}
