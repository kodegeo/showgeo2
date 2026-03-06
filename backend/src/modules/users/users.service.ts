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
  PromoteToEntityDto,
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

  async getUserEntities(userId: string) {
    try {
      // Owned entities (safe, direct)
      const owned = await (this.prisma as any).entities.findMany({
        where: { ownerId: userId },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
    
      // Roles (safe, direct)
      const roles = await (this.prisma as any).entity_roles.findMany({
        where: {
          userId,
          role: {
            in: [EntityRoleType.ADMIN, EntityRoleType.MANAGER],
          },
        },
        select: { entityId: true, role: true },
      });
    
      const roleEntityIds = Array.from(new Set(roles.map((r: any) => r.entityId)));
    
      // Managed entities (exclude owned duplicates)
      const ownedIds = new Set(owned.map((e: any) => e.id));
      const managedIds = roleEntityIds.filter((id: string) => !ownedIds.has(id));
    
      const managed =
        managedIds.length === 0
          ? []
          : await (this.prisma as any).entities.findMany({
              where: { id: { in: managedIds } },
              select: {
                id: true,
                name: true,
                slug: true,
                createdAt: true,
                updatedAt: true,
              },
              orderBy: { createdAt: "desc" },
            });
    
      return { owned, managed };
    } catch (error) {
      console.error("[UsersService.getUserEntities] Error:", error);
      // Return empty arrays instead of throwing to prevent blocking creator routes
      return { owned: [], managed: [] };
    }
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
    const user = await (this.prisma as any).app_users.findUnique({
      where: { authUserId },
      include: {
        user_profiles: true,
        // keep this shallow to avoid relation-name runtime explosions
        entity_roles: {
          select: {
            id: true,
            entityId: true,
            role: true,
          },
        },
      },
    });
  
    if (!user) {
      throw new NotFoundException("User not found");
    }
  
    return user;
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
    const owned = await this.prisma.entities.findMany({
      where: { ownerId: userId },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  
    const roles = await this.prisma.entity_roles.findMany({
      where: {
        userId,
        role: { in: ["ADMIN", "MANAGER"] },
      },
      select: {
        entities: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
          },
        },
        role: true,
      },
    });
  
    const managed = roles.map(r => ({
      ...r.entities,
      role: r.role,
    }));
  
    return {
      owned,
      managed,
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
  async convertToEntity(
    userId: string,
    convertToEntityDto: ConvertToEntityDto,
  ) {
    // 1️⃣ Check if user exists
    const user = await (this.prisma as any).app_users.findUnique({
      where: { id: userId },
      include: { entities: true },
    });
  
    if (!user) {
      throw new NotFoundException("User not found");
    }
  
    // 2️⃣ Check if user already owns an entity
    if (user.entities.length > 0) {
      throw new BadRequestException(
        "User already owns an entity. Use the entities endpoint to create additional entities.",
      );
    }
  
    // 3️⃣ Check slug uniqueness
    const existingEntity = await (this.prisma as any).entities.findUnique({
      where: { slug: convertToEntityDto.slug },
    });
  
    if (existingEntity) {
      throw new ConflictException("Entity with this slug already exists");
    }
  
    // 4️⃣ Decide role promotion BEFORE transaction
    const shouldPromoteRole = user.role === UserRole.USER;
  
    // 5️⃣ Atomic transaction
    const entity = await (this.prisma as any).$transaction(async (tx: any) => {
      const newEntity = await tx.entities.create({
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
  
      // Promote user role atomically
      if (shouldPromoteRole) {
        await tx.app_users.update({
          where: { id: userId },
          data: { role: UserRole.ENTITY },
        });
      }
  
      return newEntity;
    });
  
    return entity;
  }

  // ------------------------------------------------------
  // PROMOTE USER TO ENTITY (ADMIN ONLY)
  // ------------------------------------------------------
  /**
   * ADMIN-only method to promote a user to ENTITY creator.
   * Creates a new entity owned by the user and sets user.role = ENTITY.
   * This bypasses the normal creator application process.
   * 
   * INVARIANTS ENFORCED:
   * 1. User cannot have pending creator applications (must resolve first)
   * 2. Entity ownership must be consistent with entity_application ownership
   * 3. All operations are atomic (transaction-wrapped)
   */
  async promoteUserToEntity(userId: string, promoteDto: PromoteToEntityDto) {
    // GUARD 1: Check if user exists
    const user = await (this.prisma as any).app_users.findUnique({
      where: { id: userId },
      include: {
        entities: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // GUARD 2: Check if user has pending creator applications
    // This prevents promotion when there's an unresolved application
    const pendingApplications = await (this.prisma as any).entity_applications.findMany({
      where: {
        owner_id: userId,
        status: "PENDING",
      },
      include: {
        entities: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    if (pendingApplications.length > 0) {
      const applicationDetails = pendingApplications
        .map((app: any) => `Entity "${app.entities?.name || app.entity_id}" (ID: ${app.entity_id})`)
        .join(", ");
      
      throw new BadRequestException(
        `Cannot promote user: User has ${pendingApplications.length} pending creator application(s). ` +
        `Please resolve the pending application(s) first: ${applicationDetails}. ` +
        `Either accept/reject the application(s) or have the user withdraw them before promoting.`
      );
    }

    // GUARD 3: Check if user already owns entities
    // This is informational - we allow multiple entities per user
    // But we log it for audit purposes
    if (user.entities && user.entities.length > 0) {
      // Note: We allow multiple entities, but this is worth noting
      // The promotion will create an additional entity
    }

    // GUARD 4: Check if slug already exists
    const existingEntity = await (this.prisma as any).entities.findUnique({
      where: { slug: promoteDto.slug },
    });

    if (existingEntity) {
      throw new ConflictException(
        `Entity with slug "${promoteDto.slug}" already exists. ` +
        `Please choose a different slug.`
      );
    }

    // GUARD 5: Check if name already exists
    const existingByName = await (this.prisma as any).entities.findFirst({
      where: { name: promoteDto.name },
    });

    if (existingByName) {
      throw new ConflictException(
        `Entity with name "${promoteDto.name}" already exists. ` +
        `Please choose a different name.`
      );
    }

    // GUARD 6: Verify consistency - check for any entity_applications with mismatched ownership
    // This ensures data integrity: if entity_applications exist, they must match the user
    const allUserApplications = await (this.prisma as any).entity_applications.findMany({
      where: {
        owner_id: userId,
      },
      include: {
        entities: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    });

    // Verify ownership consistency: entity_applications.owner_id must match entities.ownerId
    const inconsistentApplications = allUserApplications.filter((app: any) => {
      // If application has an entity, verify ownership matches
      if (app.entities && app.entities.ownerId !== userId) {
        return true;
      }
      return false;
    });

    if (inconsistentApplications.length > 0) {
      const inconsistentDetails = inconsistentApplications
        .map((app: any) => `Application ${app.id} (Entity ${app.entity_id})`)
        .join(", ");
      
      throw new BadRequestException(
        `Data integrity violation: Found ${inconsistentApplications.length} entity application(s) ` +
        `where application ownership does not match entity ownership: ${inconsistentDetails}. ` +
        `This indicates a data consistency issue that must be resolved before promotion.`
      );
    }

    // Create entity with user as owner + owner role
    // Use transaction to ensure atomicity and data consistency
    const entity = await (this.prisma as any).$transaction(async (tx: any) => {
      // Create entity
      const { socialLinks, ...restDto } = promoteDto;
      const createData: any = { ...restDto, ownerId: userId };
      if (socialLinks !== undefined) {
        createData.socialLinks = socialLinks as Prisma.InputJsonValue;
      }

      const newEntity = await tx.entities.create({
        data: {
          ...createData,
          // Create owner role automatically
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

      // Update user role to ENTITY atomically
      // This ensures entity ownership and user role are consistent
      await tx.app_users.update({
        where: { id: userId },
        data: {
          role: UserRole.ENTITY,
        },
      });

      // POST-CREATION VERIFICATION: Ensure entity ownership matches user
      // This is a defensive check within the transaction
      const verificationEntity = await tx.entities.findUnique({
        where: { id: newEntity.id },
        select: { ownerId: true },
      });

      if (!verificationEntity || verificationEntity.ownerId !== userId) {
        throw new Error(
          `Data integrity violation: Created entity ${newEntity.id} but ownership verification failed. ` +
          `Expected ownerId: ${userId}, Found: ${verificationEntity?.ownerId || "null"}. ` +
          `Transaction will be rolled back.`
        );
      }

      return newEntity;
    });

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
