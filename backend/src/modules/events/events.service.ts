import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateEventDto, UpdateEventDto, EventQueryDto, PhaseTransitionDto } from "./dto";
import { EventType, EventPhase, EventStatus, StreamingAccessLevel } from "./dto/create-event.dto";

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createEventDto: CreateEventDto, createdBy: string) {
    const { collaboratorEntityIds, ticketTypes, ...eventData } = createEventDto;

    // Convert ticket types to JSON
    const ticketTypesJson = ticketTypes ? JSON.parse(JSON.stringify(ticketTypes)) : null;

    // Ensure geoRegions is an array
    const geoRegions = eventData.geoRegions || [];

    const event = await this.prisma.event.create({
      data: {
        ...eventData,
        ticketTypes: ticketTypesJson,
        geoRegions,
        lastLaunchedBy: createdBy,
        collaborators: collaboratorEntityIds
          ? {
              connect: collaboratorEntityIds.map((id) => ({ id })),
            }
          : undefined,
      },
      include: {
        entity: true,
        coordinator: true,
        tour: true,
        collaborators: true,
        tickets: true,
        geofencing: true,
        chatRooms: true,
      },
    });

    return event;
  }

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
    if (location) where.location = { contains: location, mode: "insensitive" };

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate);
      if (endDate) where.startTime.lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        include: {
          entity: true,
          coordinator: {
            select: {
              id: true,
              email: true,
              profile: true,
            },
          },
          tour: true,
          collaborators: true,
          _count: {
            select: {
              tickets: true,
              chatRooms: true,
            },
          },
        },
        orderBy: { startTime: "asc" },
        skip,
        take: limit,
      }),
      this.prisma.event.count({ where }),
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
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        entity: true,
        coordinator: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
        tour: true,
        collaborators: true,
        tickets: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: true,
              },
            },
          },
        },
        geofencing: true,
        chatRooms: true,
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto, updatedBy: string) {
    const event = await this.findOne(id);

    const { collaboratorEntityIds, ticketTypes, ...updateData } = updateEventDto;

    // Prepare collaborators update
    const collaboratorsUpdate = collaboratorEntityIds
      ? {
          set: collaboratorEntityIds.map((entityId) => ({ id: entityId })),
        }
      : undefined;

    // Convert ticket types to JSON if provided
    const ticketTypesJson = ticketTypes ? JSON.parse(JSON.stringify(ticketTypes)) : undefined;

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        ...updateData,
        ...(ticketTypesJson && { ticketTypes: ticketTypesJson }),
        lastLaunchedBy: updatedBy,
        ...(collaboratorsUpdate && { collaborators: collaboratorsUpdate }),
      },
      include: {
        entity: true,
        coordinator: true,
        tour: true,
        collaborators: true,
      },
    });

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.event.delete({
      where: { id },
    });

    return { message: "Event deleted successfully" };
  }

  async transitionPhase(id: string, phaseTransitionDto: PhaseTransitionDto, userId: string) {
    const event = await this.findOne(id);

    // Validate phase transition
    const validTransitions = this.getValidPhaseTransitions(event.phase);
    if (!validTransitions.includes(phaseTransitionDto.phase)) {
      throw new BadRequestException(
        `Invalid phase transition from ${event.phase} to ${phaseTransitionDto.phase}`,
      );
    }

    const updateData: any = {
      phase: phaseTransitionDto.phase,
      lastLaunchedBy: userId,
    };

    // Update status based on phase
    if (phaseTransitionDto.phase === EventPhase.CONCERT) {
      updateData.status = EventStatus.LIVE;
    } else if (phaseTransitionDto.phase === EventPhase.POST_CONCERT) {
      // Could be completed or still live
      if (!updateData.status) {
        updateData.status = event.status;
      }
    }

    // Handle scheduled time
    if (phaseTransitionDto.scheduledTime) {
      updateData.startTime = new Date(phaseTransitionDto.scheduledTime);
    }

    const updated = await this.prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        entity: true,
        coordinator: true,
      },
    });

    return updated;
  }

  async extendPhase(id: string, additionalMinutes: number, userId: string) {
    const event = await this.findOne(id);

    if (event.endTime) {
      const newEndTime = new Date(event.endTime);
      newEndTime.setMinutes(newEndTime.getMinutes() + additionalMinutes);

      return this.prisma.event.update({
        where: { id },
        data: {
          endTime: newEndTime,
          lastLaunchedBy: userId,
        },
        include: {
          entity: true,
          coordinator: true,
        },
      });
    }

    throw new BadRequestException("Event does not have an end time set");
  }

  async updateLiveMetrics(id: string, metrics: Record<string, unknown>, userId: string) {
    const event = await this.findOne(id);

    const currentMetrics = (event.liveMetrics as Record<string, unknown>) || {};
    const updatedMetrics = { ...currentMetrics, ...metrics, updatedAt: new Date().toISOString() };

    return this.prisma.event.update({
      where: { id },
      data: {
        liveMetrics: updatedMetrics,
        lastLaunchedBy: userId,
      },
    });
  }

  async addTestResult(id: string, testResult: Record<string, unknown>, userId: string) {
    const event = await this.findOne(id);

    const currentLogs = (event.testResultLogs as Record<string, unknown>[]) || [];
    const newLog = {
      ...testResult,
      timestamp: new Date().toISOString(),
      userId,
    };

    return this.prisma.event.update({
      where: { id },
      data: {
        testResultLogs: [...currentLogs, newLog],
        lastLaunchedBy: userId,
      },
    });
  }

  private getValidPhaseTransitions(currentPhase: EventPhase): EventPhase[] {
    switch (currentPhase) {
      case EventPhase.PRE_CONCERT:
        return [EventPhase.CONCERT];
      case EventPhase.CONCERT:
        return [EventPhase.POST_CONCERT];
      case EventPhase.POST_CONCERT:
        return []; // Post-concert is final
      default:
        return [];
    }
  }

  async getEventMetrics(id: string) {
    const event = await this.findOne(id);

    const ticketCount = await this.prisma.ticket.count({
      where: { eventId: id },
    });

    const chatRoomCount = await this.prisma.chatRoom.count({
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

