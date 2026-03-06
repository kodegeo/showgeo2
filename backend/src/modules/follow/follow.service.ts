import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";

const ENTITY = "ENTITY" as const;
const USER = "USER" as const;
const EVENT = "EVENT" as const;

@Injectable()
export class FollowService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveAppUser(authUserId: string) {
    return (
      (await this.prisma.app_users.findUnique({
        where: { id: authUserId },
      })) ||
      (await this.prisma.app_users.findFirst({
        where: { authUserId },
      }))
    );
  }

  // =========================================
  // GENERIC ENSURE FOLLOW (UPSERT CORE)
  // =========================================

  private async ensureFollow(
    userId: string,
    targetId: string,
    targetType: "ENTITY" | "USER" | "EVENT",
  ) {
    return this.prisma.follows.upsert({
      where: {
        user_id_target_id_target_type: {
          user_id: userId,
          target_id: targetId,
          target_type: targetType,
        },
      } as Prisma.followsWhereUniqueInput,
      update: {
        updatedAt: new Date(),
      },
      create: {
        id: crypto.randomUUID(),
        user_id: userId,
        target_id: targetId,
        target_type: targetType,
        notify: false,
        updatedAt: new Date(),
      } as Prisma.followsUncheckedCreateInput,
    });
  }

  private async removeFollow(
    userId: string,
    targetId: string,
    targetType: "ENTITY" | "USER" | "EVENT",
  ) {
    await this.prisma.follows.deleteMany({
      where: {
        user_id: userId,
        target_id: targetId,
        target_type: targetType,
      } as Prisma.followsWhereInput,
    });

    return { message: "Unfollowed successfully" };
  }

  // =========================================
  // ENTITY FOLLOW
  // =========================================

  async followEntity(userId: string, entityId: string) {
    const user = await this.resolveAppUser(userId);
    if (!user) throw new NotFoundException("User not found");

    const entity = await this.prisma.entities.findUnique({
      where: { id: entityId },
    });
    if (!entity) throw new NotFoundException("Entity not found");

    if (entity.ownerId === user.id) {
      throw new BadRequestException("Cannot follow your own entity");
    }

    return this.ensureFollow(userId, entityId, ENTITY);
  }

  async unfollowEntity(userId: string, entityId: string) {
    return this.removeFollow(userId, entityId, ENTITY);
  }

  // =========================================
  // EVENT FOLLOW (LIKE EVENT)
  // =========================================

  async followEvent(userId: string, eventId: string) {
    const user = await this.resolveAppUser(userId);
    if (!user) throw new NotFoundException("User not found");

    const event = await this.prisma.events.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException("Event not found");

    return this.ensureFollow(userId, eventId, EVENT);
  }

  async unfollowEvent(userId: string, eventId: string) {
    return this.removeFollow(userId, eventId, EVENT);
  }

  // =========================================
  // NOTIFY TOGGLE (EVENT)
  // =========================================

  async setEventNotify(userId: string, eventId: string, notify: boolean) {
    const follow = await this.ensureFollow(userId, eventId, EVENT);

    const updated = await this.prisma.follows.update({
      where: {
        user_id_target_id_target_type: {
          user_id: userId,
          target_id: eventId,
          target_type: EVENT,
        },
      } as Prisma.followsWhereUniqueInput,
      data: {
        notify,
        updatedAt: new Date(),
      },
    });

    return { notify: updated.notify };
  }

  // =========================================
  // STATUS HELPERS
  // =========================================

  async isFollowingEvent(userId: string, eventId: string) {
    const follow = await this.prisma.follows.findUnique({
      where: {
        user_id_target_id_target_type: {
          user_id: userId,
          target_id: eventId,
          target_type: EVENT,
        },
      } as Prisma.followsWhereUniqueInput,
    });

    return !!follow;
  }

  async isFollowing(userId: string, entityId: string): Promise<boolean> {
    const follow = await this.prisma.follows.findUnique({
      where: {
        user_id_target_id_target_type: {
          user_id: userId,
          target_id: entityId,
          target_type: ENTITY,
        },
      },
    });
  
    return !!follow;
  }

  async getFollowers(entityId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
  
    const [follows, total] = await Promise.all([
      this.prisma.follows.findMany({
        where: {
          target_id: entityId,
          target_type: ENTITY,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.follows.count({
        where: {
          target_id: entityId,
          target_type: ENTITY,
        },
      }),
    ]);
  
    return {
      data: follows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getFollowing(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
  
    const [follows, total] = await Promise.all([
      this.prisma.follows.findMany({
        where: {
          user_id: userId,
          target_type: ENTITY,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.follows.count({
        where: {
          user_id: userId,
          target_type: ENTITY,
        },
      }),
    ]);
  
    return {
      data: follows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getFollowCounts(
    id: string,
    type: "entity" | "user",
  ): Promise<{ followers: number; following: number }> {
    if (type === "entity") {
      const followers = await this.prisma.follows.count({
        where: {
          target_id: id,
          target_type: ENTITY,
        },
      });
  
      return { followers, following: 0 };
    }
  
    const following = await this.prisma.follows.count({
      where: {
        user_id: id,
        target_type: ENTITY,
      },
    });
  
    return { followers: 0, following };
  }

  async getEventFollowStatus(userId: string, eventId: string) {
    const follow = await this.prisma.follows.findUnique({
      where: {
        user_id_target_id_target_type: {
          user_id: userId,
          target_id: eventId,
          target_type: EVENT,
        },
      } as Prisma.followsWhereUniqueInput,
    });

    return {
      isFollowing: !!follow,
      notify: follow?.notify ?? false,
    };
  }
}