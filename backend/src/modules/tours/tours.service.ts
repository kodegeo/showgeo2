import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma, TourStatus } from "@prisma/client";
import { randomUUID } from "crypto";
import type { CreateTourDto } from "./dto/create-tour.dto";
import type { UpdateTourDto } from "./dto/update-tour.dto";
import type { TourQueryDto } from "./dto/tour-query.dto";
import { NotificationsService } from "../notifications/notifications.service";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

@Injectable()
export class ToursService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(query: TourQueryDto) {
    const where: { primaryEntityId?: string } = {};
    if (query.entityId) {
      where.primaryEntityId = query.entityId;
    }

    const include: { events?: boolean | object } = {};
    if (query.includeEvents) {
      include.events = {
        orderBy: { startTime: "asc" as const },
        select: {
          id: true,
          name: true,
          startTime: true,
          endTime: true,
          location: true,
          status: true,
          phase: true,
          thumbnail: true,
          entityId: true,
        },
      };
    }

    const tours = await this.prisma.tours.findMany({
      where,
      include: Object.keys(include).length > 0 ? include : undefined,
      orderBy: { startDate: "asc" },
    });

    return { data: tours };
  }

  async findOne(id: string, includeEvents = false) {
    const include = includeEvents
      ? {
          events: {
            orderBy: { startTime: "asc" as const },
            select: {
              id: true,
              name: true,
              startTime: true,
              endTime: true,
              location: true,
              status: true,
              phase: true,
              thumbnail: true,
              entityId: true,
            },
          },
          primaryEntity: {
            select: { id: true, name: true, slug: true, thumbnail: true },
          },
        }
      : {
          primaryEntity: {
            select: { id: true, name: true, slug: true, thumbnail: true },
          },
        };

    const tour = await this.prisma.tours.findUnique({
      where: { id },
      include,
    });

    if (!tour) {
      throw new NotFoundException(`Tour with id "${id}" not found`);
    }

    return tour;
  }

  async findBySlug(slug: string, includeEvents = false) {
    const include = includeEvents
      ? {
          events: {
            orderBy: { startTime: "asc" as const },
            select: {
              id: true,
              name: true,
              startTime: true,
              endTime: true,
              location: true,
              status: true,
              phase: true,
              thumbnail: true,
              entityId: true,
            },
          },
          primaryEntity: {
            select: { id: true, name: true, slug: true, thumbnail: true },
          },
        }
      : {
          primaryEntity: {
            select: { id: true, name: true, slug: true, thumbnail: true },
          },
        };

    const tour = await this.prisma.tours.findUnique({
      where: { slug },
      include,
    });

    if (!tour) {
      throw new NotFoundException(`Tour with slug "${slug}" not found`);
    }

    return tour;
  }

  async create(dto: CreateTourDto) {
    const entity = await this.prisma.entities.findUnique({
      where: { id: dto.primaryEntityId },
    });
    if (!entity) {
      throw new NotFoundException(`Entity with id "${dto.primaryEntityId}" not found`);
    }

    let slug = dto.slug?.trim() || slugify(dto.name);
    if (!slug) slug = `tour-${randomUUID().slice(0, 8)}`;

    const existingBySlug = await this.prisma.tours.findUnique({ where: { slug } });
    if (existingBySlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const existingByName = await this.prisma.tours.findUnique({ where: { name: dto.name } });
    if (existingByName) {
      throw new ConflictException(`A tour with name "${dto.name}" already exists`);
    }

    const tour = await this.prisma.tours.create({
      data: {
        id: randomUUID(),
        name: dto.name,
        slug,
        description: dto.description ?? null,
        thumbnail: dto.thumbnail ?? null,
        bannerImage: dto.bannerImage ?? null,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        status: (dto.status as TourStatus) ?? TourStatus.DRAFT,
        tags: dto.tags ?? [],
        geoRestricted: dto.geoRestricted ?? false,
        streamingAccessLevel: dto.streamingAccessLevel ?? null,
        geoRegions: dto.geoRegions ?? [],
        updatedAt: new Date(),
        primaryEntityId: dto.primaryEntityId,
      },
    });

    // Creator follower alert: notify followers when a tour is launched
    const entityId = dto.primaryEntityId;
    if (entityId) {
      this.notificationsService
        .notifyTourLaunched(entityId, tour.name, tour.id, tour.slug)
        .catch((err) =>
          console.warn("[ToursService.create] notifyTourLaunched failed", err),
        );
    }

    return tour;
  }

  async update(id: string, dto: UpdateTourDto) {
    const existing = await this.prisma.tours.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Tour with id "${id}" not found`);
    }

    if (dto.name !== undefined && dto.name !== existing.name) {
      const byName = await this.prisma.tours.findUnique({ where: { name: dto.name } });
      if (byName) {
        throw new ConflictException(`A tour with name "${dto.name}" already exists`);
      }
    }

    if (dto.slug !== undefined && dto.slug !== existing.slug) {
      const bySlug = await this.prisma.tours.findUnique({ where: { slug: dto.slug } });
      if (bySlug) {
        throw new ConflictException(`A tour with slug "${dto.slug}" already exists`);
      }
    }

    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.primaryEntityId !== undefined) data.primaryEntityId = dto.primaryEntityId;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.thumbnail !== undefined) data.thumbnail = dto.thumbnail;
    if (dto.bannerImage !== undefined) data.bannerImage = dto.bannerImage;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.geoRestricted !== undefined) data.geoRestricted = dto.geoRestricted;
    if (dto.streamingAccessLevel !== undefined)
      data.streamingAccessLevel = dto.streamingAccessLevel;
    if (dto.geoRegions !== undefined) data.geoRegions = dto.geoRegions;

    return this.prisma.tours.update({
      where: { id },
      data: data as Prisma.toursUpdateInput,
    });
  }

  async getEvents(tourId: string) {
    const tour = await this.prisma.tours.findUnique({
      where: { id: tourId },
      select: { id: true },
    });
    if (!tour) {
      throw new NotFoundException(`Tour with id "${tourId}" not found`);
    }

    const events = await this.prisma.events.findMany({
      where: { tourId },
      orderBy: { startTime: "asc" },
      include: {
        entity: {
          select: { id: true, name: true, slug: true, thumbnail: true },
        },
      },
    });

    return { data: events };
  }
}
