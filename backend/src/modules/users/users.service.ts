import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateUserProfileDto,
  UpdateUserProfileDto,
  ConvertToEntityDto,
} from "./dto";
import {
  UserRole,
  EntityRoleType,
} from "@prisma/client";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------
  // PROFILE CREATION
  // ------------------------------------------------------
  async createUserProfile(userId: string, createUserProfileDto: CreateUserProfileDto) {
    // Check if app user exists (app_users via @@map)
    const user = await (this.prisma as any).app_users.findFirst({
      where: { id: userId },
      include: { user_profiles: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check if profile already exists
    if (user.user_profiles) {
      throw new ConflictException("User profile already exists");
    }

    // Check username uniqueness if provided
    if (createUserProfileDto.username) {
      const existingProfile = await (this.prisma as any).user_profiles.findFirst({
        where: { username: createUserProfileDto.username },
      });

      if (existingProfile) {
        throw new ConflictException("Username already taken");
      }
    }

    // Create profile - ensure JSON fields are properly typed
    const { preferences, socialLinks, ...restDto } = createUserProfileDto;
    const createData: Prisma.user_profilesCreateInput = {
      ...restDto,
      app_users: {
        connect: { id: userId },
      },
    } as any; // Type assertion needed until Prisma types are fully aligned

    if (preferences !== undefined) {
      createData.preferences = preferences as Prisma.InputJsonValue;
    }
    if (socialLinks !== undefined) {
      createData.socialLinks = socialLinks as Prisma.InputJsonValue;
    }

    const profile = await (this.prisma as any).user_profiles.create({
      data: createData,
      include: {
        app_users: {
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

  // ------------------------------------------------------
  // PROFILE UPDATE (IDEMPOTENT: Creates if missing)
  // ------------------------------------------------------
  async updateProfile(userId: string, updateUserProfileDto: UpdateUserProfileDto) {
    // Check if app user exists
    const user = await (this.prisma as any).app_users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check if profile exists
    const existingProfile = await (this.prisma as any).user_profiles.findFirst({
      where: { userId },
    });

    // Check username uniqueness if being updated/created
    if (updateUserProfileDto.username) {
      // Only check uniqueness if username is changing (or being set for first time)
      const isUsernameChanging = !existingProfile || existingProfile.username !== updateUserProfileDto.username;
      
      if (isUsernameChanging) {
        const usernameCheck = await (this.prisma as any).user_profiles.findFirst({
          where: {
            username: updateUserProfileDto.username,
          },
        });

        // Only throw if username is taken by a different user
        if (usernameCheck && usernameCheck.userId !== userId) {
          throw new ConflictException("Username already taken");
        }
      }
    }

    // Prepare data with JSON fields properly typed
    const { preferences, socialLinks, ...restDto } = updateUserProfileDto;

    let updated;

    if (!existingProfile) {
      // Create profile if it doesn't exist (idempotent behavior)
      const createData: any = {
        id: randomUUID(), // user_profiles.id is required (no default)
        userId,
        ...restDto,
      };

      if (preferences !== undefined) {
        createData.preferences = preferences as Prisma.InputJsonValue;
      }
      if (socialLinks !== undefined) {
        createData.socialLinks = socialLinks as Prisma.InputJsonValue;
      }

      updated = await (this.prisma as any).user_profiles.create({
        data: createData,
        include: {
          app_users: {
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
    } else {
      // Update existing profile
      const updateData: Prisma.user_profilesUpdateInput = {
        ...restDto,
      };

      if (preferences !== undefined) {
        updateData.preferences = preferences as Prisma.InputJsonValue;
      }
      if (socialLinks !== undefined) {
        updateData.socialLinks = socialLinks as Prisma.InputJsonValue;
      }

      updated = await (this.prisma as any).user_profiles.update({
        where: { userId },
        data: updateData,
        include: {
          app_users: {
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
    }

    // Transform to match frontend expectation: User & { profile?: UserProfile }
    // Backend returns: UserProfile & { app_users: User }
    // Frontend expects: User & { profile: UserProfile }
    const { app_users, ...profileData } = updated;
    return {
      ...app_users,
      profile: profileData,
    };
  }

  // ------------------------------------------------------
  // LIST USERS (ADMIN / INTERNAL)
  // ------------------------------------------------------
  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      (this.prisma as any).app_users.findMany({
        skip,
        take: limit,
        include: {
          user_profiles: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      (this.prisma as any).app_users.count(),
    ]);

    // Remove passwords from response (defensive – should be null for Supabase users)
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

  // ------------------------------------------------------
  // LOOKUP BY authUserId (Supabase → app_users bridge)
  // ------------------------------------------------------
  async findByAuthUserId(authUserId: string) {
    // Use explicit where clause to avoid TypeScript cache issues
    const user = await (this.prisma as any).app_users.findFirst({
      where: { 
        authUserId: {
          equals: authUserId
        }
      } as any, // Temporary workaround for TypeScript cache issue
      include: {
        user_profiles: true,
        entities: {
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
        entity_roles: {
          include: {
            entities: {
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
      },
    });

    if (!user) {
      // This is the expected error if Supabase user exists but no app_users row was created yet
      throw new NotFoundException("App user not found for this auth user");
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // ------------------------------------------------------
  // GET SINGLE USER (BY app_users.id)
  // ------------------------------------------------------
  async findOne(id: string, includePrivate = false) {
    const user = await (this.prisma as any).app_users.findUnique({
      where: { id },
      include: {
        user_profiles: true,
        entities: {
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
        entity_roles: {
          include: {
            entities: {
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
            entities: {
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
        _count: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Handle private profiles
    if (user.user_profiles && user.user_profiles.visibility === "private" && !includePrivate) {
      const { password, ...userWithoutPassword } = user;
      return {
        ...userWithoutPassword,
        user_profiles: {
          id: user.user_profiles.id,
          userId: user.user_profiles.userId,
          username: user.user_profiles.username,
          avatarUrl: user.user_profiles.avatarUrl,
          visibility: user.user_profiles.visibility,
        },
      };
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // ------------------------------------------------------
  // DELETE USER (app_users)
  // ------------------------------------------------------
  async delete(id: string) {
    const user = await (this.prisma as any).app_users.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    await (this.prisma as any).app_users.delete({
      where: { id },
    });

    return { message: "User deleted successfully" };
  }

  // ------------------------------------------------------
  // FIND ENTITIES FOR A USER
  // ------------------------------------------------------
  async findEntities(userId: string) {
    const user = await (this.prisma as any).app_users.findUnique({
      where: { id: userId },
      include: {
        entities: {
          include: {
            _count: true,
          },
        },
        entity_roles: {
          include: {
            entities: {
              include: {
                _count: true,
              },
            },
          },
        },
        follows: {
          include: {
            entities: {
              include: {
                _count: true,
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
      owned: user.entities,
      managed: user.entity_roles.map((role) => ({
        ...role.entities,
        role: role.role,
      })),
      followed: user.follows.map((follow) => follow.entities),
    };
  }

  // ------------------------------------------------------
  // FIND BY USERNAME (PROFILE)
  // ------------------------------------------------------
  async findByUsername(username: string) {
    const profile = await (this.prisma as any).user_profiles.findUnique({
      where: { username },
      include: {
        app_users: {
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

    // Respect private visibility
    if (profile.visibility === "private") {
      return {
        id: profile.id,
        userId: profile.userId,
        username: profile.username,
        avatarUrl: profile.avatarUrl,
        visibility: profile.visibility,
        user: profile.app_users,
      };
    }

    return profile;
  }

  // ------------------------------------------------------
  // CONVERT USER TO ENTITY (CREATOR ENTITY CREATION)
  // ------------------------------------------------------
  async convertToEntity(userId: string, convertToEntityDto: ConvertToEntityDto) {
    // Check if user exists
    const user = await (this.prisma as any).app_users.findUnique({
      where: { id: userId },
      include: {
        entities: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check if user already owns an entity
    if (user.entities.length > 0) {
      throw new BadRequestException(
        "User already owns an entity. Use the entities endpoint to create additional entities.",
      );
    }

    // Check if slug already exists
    const existingEntity = await (this.prisma as any).entities.findUnique({
      where: { slug: convertToEntityDto.slug },
    });

    if (existingEntity) {
      throw new ConflictException("Entity with this slug already exists");
    }

    // Create entity with user as owner + owner role
    const entity = await (this.prisma as any).entities.create({
      data: {
        ...convertToEntityDto,
        ownerId: userId,
        entity_roles: {
          create: {
            userId,
            role: EntityRoleType.OWNER,
          },
        },
      },
      include: {
        app_users: {
          select: {
            id: true,
            email: true,
            user_profiles: true,
          },
        },
        entity_roles: {
          include: {
            app_users: {
              select: {
                id: true,
                email: true,
                user_profiles: true,
              },
            },
          },
        },
      },
    });

    // Optionally update user role to ENTITY if still USER
    if (user.role === UserRole.USER) {
      await (this.prisma as any).app_users.update({
        where: { id: userId },
        data: { role: UserRole.ENTITY },
      });
    }

    return entity;
  }

  // ------------------------------------------------------
  // UPGRADE TO CREATOR (ROLE ONLY – ENTITY IS SEPARATE)
  // ------------------------------------------------------
  async upgradeToCreator(userId: string) {
    const user = await (this.prisma as any).app_users.findUnique({
      where: { id: userId },
      include: {
        user_profiles: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Idempotent: if already ENTITY or ADMIN etc., don't downgrade
    if (user.role === UserRole.ENTITY || user.role === UserRole.ADMIN) {
      return user;
    }

    const updatedUser = await (this.prisma as any).app_users.update({
      where: { id: userId },
      data: { role: UserRole.ENTITY },
      include: {
        user_profiles: true,
      },
    });

    return updatedUser;
  }

  // ------------------------------------------------------
  // LINK SUPABASE USER (FOR MIGRATION / FIXING AUTH)
  // ------------------------------------------------------
  async linkSupabaseUser(userId: string, authUserId: string) {
    // Check if user exists
    const user = await (this.prisma as any).app_users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check if authUserId is already linked to another user
    const existingLink = await (this.prisma as any).app_users.findFirst({
      where: { 
        authUserId: {
          equals: authUserId
        }
      } as any, // Temporary workaround for TypeScript cache issue
    });

    if (existingLink && existingLink.id !== userId) {
      throw new ConflictException("This Supabase auth user is already linked to another app user");
    }

    // Update user with authUserId
    const updatedUser = await (this.prisma as any).app_users.update({
      where: { id: userId },
      data: { authUserId: authUserId } as any, // Temporary workaround for TypeScript cache issue
      include: {
        user_profiles: true,
      },
    });

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }
}
