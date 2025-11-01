import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Follow } from "@prisma/client";

@Injectable()
export class FollowService {
  constructor(private readonly prisma: PrismaService) {}

  async followEntity(userId: string, entityId: string): Promise<Follow> {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Validate entity exists
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
    });

    if (!entity) {
      throw new NotFoundException("Entity not found");
    }

    // Prevent self-follow (if user owns the entity)
    if (entity.ownerId === userId) {
      throw new BadRequestException("Cannot follow your own entity");
    }

    // Check if already following
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        userId_entityId: {
          userId,
          entityId,
        },
      },
    });

    if (existingFollow) {
      throw new ConflictException("Already following this entity");
    }

    // Create follow relationship
    const follow = await this.prisma.follow.create({
      data: {
        userId,
        entityId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
        entity: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            type: true,
            isVerified: true,
          },
        },
      },
    });

    return follow;
  }

  async unfollowEntity(userId: string, entityId: string): Promise<{ message: string }> {
    // Validate follow exists
    const follow = await this.prisma.follow.findUnique({
      where: {
        userId_entityId: {
          userId,
          entityId,
        },
      },
    });

    if (!follow) {
      throw new NotFoundException("Follow relationship not found");
    }

    // Delete follow relationship
    await this.prisma.follow.delete({
      where: {
        userId_entityId: {
          userId,
          entityId,
        },
      },
    });

    return { message: "Unfollowed successfully" };
  }

  async getFollowers(entityId: string, page = 1, limit = 20) {
    // Validate entity exists
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
    });

    if (!entity) {
      throw new NotFoundException("Entity not found");
    }

    const skip = (page - 1) * limit;

    const [follows, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { entityId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                  bio: true,
                  location: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.follow.count({
        where: { entityId },
      }),
    ]);

    return {
      data: follows.map((follow) => ({
        id: follow.id,
        userId: follow.userId,
        entityId: follow.entityId,
        createdAt: follow.createdAt,
        user: follow.user,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getFollowing(userId: string, page = 1, limit = 20) {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const skip = (page - 1) * limit;

    const [follows, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { userId },
        include: {
          entity: {
            select: {
              id: true,
              name: true,
              slug: true,
              thumbnail: true,
              bannerImage: true,
              type: true,
              isVerified: true,
              location: true,
              bio: true,
              tags: true,
              _count: {
                select: {
                  followers: true,
                  events: true,
                  tours: true,
                  stores: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.follow.count({
        where: { userId },
      }),
    ]);

    return {
      data: follows.map((follow) => ({
        id: follow.id,
        userId: follow.userId,
        entityId: follow.entityId,
        createdAt: follow.createdAt,
        entity: follow.entity,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async isFollowing(userId: string, entityId: string): Promise<boolean> {
    const follow = await this.prisma.follow.findUnique({
      where: {
        userId_entityId: {
          userId,
          entityId,
        },
      },
    });

    return !!follow;
  }

  async getFollowCounts(id: string, type: "entity" | "user"): Promise<{ followers: number; following: number }> {
    if (type === "entity") {
      const followers = await this.prisma.follow.count({
        where: { entityId: id },
      });

      return {
        followers,
        following: 0, // Entities don't have "following" count
      };
    } else {
      const following = await this.prisma.follow.count({
        where: { userId: id },
      });

      return {
        followers: 0, // Users don't have "followers" count in this context
        following,
      };
    }
  }

  async getEntityFollowersCount(entityId: string): Promise<number> {
    return this.prisma.follow.count({
      where: { entityId },
    });
  }

  async getUserFollowingCount(userId: string): Promise<number> {
    return this.prisma.follow.count({
      where: { userId },
    });
  }

  async getUserFollowedEntities(userId: string): Promise<string[]> {
    const follows = await this.prisma.follow.findMany({
      where: { userId },
      select: { entityId: true },
    });

    return follows.map((follow) => follow.entityId);
  }

  async getEntityFollowers(userId: string): Promise<string[]> {
    const follows = await this.prisma.follow.findMany({
      where: { entityId: userId },
      select: { userId: true },
    });

    return follows.map((follow) => follow.userId);
  }
}

