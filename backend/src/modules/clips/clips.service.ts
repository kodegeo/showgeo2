import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService, asPrismaDb } from "../../prisma/prisma.service";
import { CreateClipDto, ShareClipDto } from "./clips.dto";

const BASE_CLIP_URL = "https://showgeo.app/clips";
const HASHTAGS = ["Showgeo", "LiveEvents"];

@Injectable()
export class ClipsService {
  constructor(private readonly prisma: PrismaService) {}

  private get ext() {
    return asPrismaDb(this.prisma);
  }

  private async assertEventCreator(eventId: string, userId: string): Promise<void> {
    const event = await this.prisma.events.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        entityId: true,
        entity: { select: { ownerId: true } },
      },
    });
    if (!event) throw new NotFoundException("Event not found");
    const ownerId = event.entity?.ownerId;
    if (ownerId === userId) return;
    const role = await this.prisma.entity_roles.findFirst({
      where: { entityId: event.entityId, userId },
      select: { id: true },
    });
    if (role) return;
    throw new ForbiddenException("Only the event creator can perform this action");
  }

  async createClip(userId: string, eventId: string, dto: CreateClipDto) {
    await this.assertEventCreator(eventId, userId);

    return this.ext.event_clips.create({
      data: {
        eventId,
        creatorId: userId,
        startTime: Math.round(dto.startTime),
        duration: Math.round(dto.duration),
        title: dto.title ?? null,
        description: dto.description ?? null,
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            entityId: true,
            entity: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });
  }

  async getClipsByEvent(eventId: string) {
    const event = await this.prisma.events.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) throw new NotFoundException("Event not found");

    return this.ext.event_clips.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            entityId: true,
            entity: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });
  }

  /**
   * GET /clips/trending - clips ordered by views (desc), shape for feed.
   */
  async getTrending(): Promise<
    Array<{ id: string; videoUrl: string | null; creatorName: string; eventName: string; views: number }>
  > {
    const clips = await this.ext.event_clips.findMany({
      orderBy: { views: "desc" },
      take: 24,
      select: {
        id: true,
        videoUrl: true,
        views: true,
        event: {
          select: {
            name: true,
            entity: { select: { name: true } },
          },
        },
      },
    });
    return clips.map((c) => ({
      id: c.id,
      videoUrl: c.videoUrl ?? null,
      creatorName: c.event?.entity?.name ?? "Creator",
      eventName: c.event?.name ?? "Event",
      views: c.views ?? 0,
    }));
  }

  async getClip(clipId: string) {
    const clip = await this.ext.event_clips.findUnique({
      where: { id: clipId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            entityId: true,
            thumbnail: true,
            entity: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });
    if (!clip) throw new NotFoundException("Clip not found");

    await this.ext.event_clips.update({
      where: { id: clipId },
      data: { views: { increment: 1 } },
    });

    return {
      ...clip,
      views: (clip.views ?? 0) + 1,
    };
  }

  async deleteClip(clipId: string, userId: string) {
    const clip = await this.ext.event_clips.findUnique({
      where: { id: clipId },
      select: { id: true, eventId: true },
    });
    if (!clip) throw new NotFoundException("Clip not found");
    await this.assertEventCreator(clip.eventId, userId);

    await this.ext.event_clips.delete({
      where: { id: clipId },
    });
  }

  async getShareMetadata(clipId: string, _dto?: ShareClipDto) {
    const clip = await this.ext.event_clips.findUnique({
      where: { id: clipId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            entity: {
              select: { name: true, slug: true },
            },
          },
        },
      },
    });
    if (!clip) throw new NotFoundException("Clip not found");

    const clipUrl = `${BASE_CLIP_URL}/${clipId}`;
    const title = clip.title || "Highlight from a live event";
    const caption = `🔥 ${title}\n\nWatch the full event on Showgeo.`;

    const encodedUrl = encodeURIComponent(clipUrl);
    const text = encodeURIComponent(`${title} - Watch on Showgeo`);

    const shareLinks = {
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${text}&hashtags=${HASHTAGS.join(",")}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    };

    return {
      clipUrl,
      caption,
      hashtags: HASHTAGS,
      shareLinks,
    };
  }
}
