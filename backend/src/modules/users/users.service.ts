import { Injectable, NotFoundException, ForbiddenException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateUserProfileDto, UpdateUserProfileDto } from "./dto";
import { User, UserRole } from "@prisma/client";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUserProfile(userId: string, createUserProfileDto: CreateUserProfileDto) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check if profile already exists
    if (user.profile) {
      throw new ConflictException("User profile already exists");
    }

    // Check username uniqueness if provided
    if (createUserProfileDto.username) {
      const existingProfile = await this.prisma.userProfile.findUnique({
        where: { username: createUserProfileDto.username },
      });

      if (existingProfile) {
        throw new ConflictException("Username already taken");
      }
    }

    // Create profile
    const profile = await this.prisma.userProfile.create({
      data: {
        userId,
        ...createUserProfileDto,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return profile;
  }

  async updateProfile(userId: string, updateUserProfileDto: UpdateUserProfileDto) {
    // Check if profile exists
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException("User profile not found");
    }

    // Check username uniqueness if being updated
    if (updateUserProfileDto.username && updateUserProfileDto.username !== profile.username) {
      const existingProfile = await this.prisma.userProfile.findUnique({
        where: { username: updateUserProfileDto.username },
      });

      if (existingProfile) {
        throw new ConflictException("Username already taken");
      }
    }

    // Update profile
    const updated = await this.prisma.userProfile.update({
      where: { userId },
      data: updateUserProfileDto,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return updated;
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        include: {
          profile: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count(),
    ]);

    // Remove passwords from response
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);

    return {
      data: usersWithoutPasswords,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, includePrivate = false) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        ownedEntities: {
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
        entityRoles: {
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
          },
        },
        follows: {
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
          },
        },
        _count: {
          select: {
            tickets: true,
            follows: true,
            ownedEntities: true,
            entityRoles: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check profile visibility
    if (user.profile && user.profile.visibility === "private" && !includePrivate) {
      // Return limited info for private profiles
      const { password, ...userWithoutPassword } = user;
      return {
        ...userWithoutPassword,
        profile: {
          id: user.profile.id,
          userId: user.profile.userId,
          username: user.profile.username,
          avatarUrl: user.profile.avatarUrl,
          visibility: user.profile.visibility,
        },
      };
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async delete(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: "User deleted successfully" };
  }

  async findEntities(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedEntities: {
          include: {
            _count: {
              select: {
                events: true,
                tours: true,
                stores: true,
                followers: true,
              },
            },
          },
        },
        entityRoles: {
          include: {
            entity: {
              include: {
                _count: {
                  select: {
                    events: true,
                    tours: true,
                    stores: true,
                    followers: true,
                  },
                },
              },
            },
          },
        },
        follows: {
          include: {
            entity: {
              include: {
                _count: {
                  select: {
                    events: true,
                    tours: true,
                    stores: true,
                    followers: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      owned: user.ownedEntities,
      managed: user.entityRoles.map((role) => ({
        ...role.entity,
        role: role.role,
      })),
      followed: user.follows.map((follow) => follow.entity),
    };
  }

  async findByUsername(username: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { username },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException("User profile not found");
    }

    // Check visibility
    if (profile.visibility === "private") {
      return {
        id: profile.id,
        userId: profile.userId,
        username: profile.username,
        avatarUrl: profile.avatarUrl,
        visibility: profile.visibility,
        user: profile.user,
      };
    }

    return profile;
  }
}

