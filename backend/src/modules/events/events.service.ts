import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateEventDto,
  UpdateEventDto,
  EventQueryDto,
  PhaseTransitionDto,
} from "./dto";
import { EventPhase, EventStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";


@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}
  
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
      } = createEventDto;
    
      if (!name || !startTime) {
        throw new BadRequestException("name and startTime are required");
      }
    
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
    
          // ✅ REQUIRED BY SCHEMA
          entityId: createEventDto.entityId,
    
          // ✅ CORRECT CREATOR FIELD
          eventCoordinatorId: userId,
    
          // ✅ VALID ENUM DEFAULT
          phase: EventPhase.PRE_LIVE,
          status: EventStatus.DRAFT,
    
          customBranding: customBranding as Prisma.InputJsonValue,
        },
      });
    }
        
    // ------------------------------------------------------------
    // (All other service methods remain untouched)
    // ------------------------------------------------------------


  async findAll(query: EventQueryDto) {
    const {
      search,
      eventType,
      phase,
      status,
      entityId,
      tourId,
      isVirtual,
      startDate,
      endDate,
      streamingAccessLevel,
      location,
      page = 1,
      limit = 20,
    } = query;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (eventType) where.eventType = eventType;
    if (phase) where.phase = phase;
    if (status) where.status = status;
    if (entityId) where.entityId = entityId;
    if (tourId) where.tourId = tourId;
    if (isVirtual !== undefined) where.isVirtual = isVirtual;
    if (streamingAccessLevel) where.streamingAccessLevel = streamingAccessLevel;
    if (location) {
      where.location = { contains: location, mode: "insensitive" };
    }

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate);
      if (endDate) where.startTime.lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      (this.prisma as any).events.findMany({
        where,
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
          _count: {
            select: {
              tickets: true,
              chat_rooms: true,
            },
          },
        },
        orderBy: { startTime: "asc" },
        skip,
        take: limit,
      }),
      (this.prisma as any).events.count({ where }),
    ]);

    return {
      data: events,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
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

    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto, updatedBy: string) {
    await this.findOne(id); // ensure exists

    const { collaboratorEntityIds, ticketTypes, customBranding, ...updateData } =
      updateEventDto;

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
    if (updateData.entityId !== undefined) data.entityId = updateData.entityId;
    if (updateData.eventCoordinatorId !== undefined)
      data.eventCoordinatorId = updateData.eventCoordinatorId;
    if (updateData.tourId !== undefined) data.tourId = updateData.tourId;
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
}
