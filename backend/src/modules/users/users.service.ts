import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
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
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------
  // PROFILE CREATION
  // ------------------------------------------------------
  async createUserProfile(userId: string, createUserProfileDto: CreateUserProfileDto) {
    const appUser = await this.prisma.app_users.findUnique({
      where: { id: userId },
    });
    if (!appUser) {
      throw new NotFoundException("User not found");
    }
    const existingProfileForUser = await this.prisma.user_profiles.findUnique({
      where: { userId },
    });
    if (existingProfileForUser) {
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

    const { preferences, socialLinks, ...restDto } = createUserProfileDto;
    const createData: any = {
      ...restDto,
      userId,
      id: randomUUID(),
      updatedAt: new Date(),
    };
    if (preferences !== undefined) createData.preferences = preferences as Prisma.InputJsonValue;
    if (socialLinks !== undefined) createData.socialLinks = socialLinks as Prisma.InputJsonValue;

    const profile = await this.prisma.user_profiles.create({
      data: createData,
    });
    const user = await this.prisma.app_users.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, createdAt: true, updatedAt: true },
    });
    return { ...profile, app_users: user };
  }

  async getUserEntities(userId: string) {
    try {
      // Owned: ownerId match, OR entity primary key equals app user id (creator profile id pattern)
      const owned = await (this.prisma as any).entities.findMany({
        where: {
          OR: [{ ownerId: userId }, { id: userId }],
        },
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
            in: [EntityRoleType.ADMIN, EntityRoleType.MANAGER, EntityRoleType.COORDINATOR],
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
      const now = new Date();
      const createData: any = {
        id: randomUUID(), // user_profiles.id is required (no default)
        userId,
        updatedAt: now,
        ...restDto,
      };

      if (preferences !== undefined) {
        createData.preferences = preferences as Prisma.InputJsonValue;
      }
      if (socialLinks !== undefined) {
        createData.socialLinks = socialLinks as Prisma.InputJsonValue;
      }

      updated = await this.prisma.user_profiles.create({
        data: createData as any,
      });
    } else {
      const updateData: Prisma.user_profilesUpdateInput = {
        ...restDto,
      };
      if (preferences !== undefined) {
        updateData.preferences = preferences as Prisma.InputJsonValue;
      }
      if (socialLinks !== undefined) {
        updateData.socialLinks = socialLinks as Prisma.InputJsonValue;
      }
      updated = await this.prisma.user_profiles.update({
        where: { userId },
        data: updateData,
      });
    }
    const appUser = await this.prisma.app_users.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, createdAt: true, updatedAt: true },
    });
    return {
      ...appUser,
      profile: updated,
    } as any;
  }

  /**
   * Idempotent: merge `preferences.consent` so streaming / live gates pass {@link checkCodeOfConductConsent}.
   * Uses upsert with explicit `updatedAt` so new profiles persist (create via updateProfile omits required updatedAt).
   */
  async acceptCodeOfConduct(userId: string): Promise<{ success: true }> {
    if (!userId || typeof userId !== "string") {
      this.logger.warn("[acceptCodeOfConduct] Invalid userId");
      throw new BadRequestException("Invalid user");
    }
    this.logger.log(`[acceptCodeOfConduct] persisting consent userId=${userId}`);

    try {
      const appUser = await this.prisma.app_users.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!appUser) {
        throw new NotFoundException("User not found");
      }

      const existing = await this.prisma.user_profiles.findUnique({
        where: { userId },
        select: { preferences: true },
      });
      const existingPrefs = (existing?.preferences as Record<string, unknown>) ?? {};
      const prevConsent = (existingPrefs.consent as Record<string, unknown>) ?? {};
      const preferences = {
        ...existingPrefs,
        consent: {
          ...prevConsent,
          codeOfConductAccepted: true,
          acceptedAt: new Date().toISOString(),
        },
      };

      const existingPreferences =
      (existing?.preferences as Record<string, any>) ?? {};
    
      await this.prisma.user_profiles.upsert({
      where: { userId },
    
      create: {
        id: uuidv4(),
        userId, // ✅ removed uuidv4
        preferences: {
          consent: {
            codeOfConductAccepted: true,
            acceptedAt: new Date().toISOString(),
          },
        },
        visibility: "public",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    
      update: {
        preferences: {
          ...existingPreferences,
          consent: {
            codeOfConductAccepted: true,
            acceptedAt: new Date().toISOString(),
          },
        },
        updatedAt: new Date(),
      },
    });

      return { success: true };
    } catch (err: unknown) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      this.logger.error(`[acceptCodeOfConduct] DB error userId=${userId}`, err);
      throw new BadRequestException(
        "Unable to save Code of Conduct acceptance. Please try again.",
      );
    }
  }

  // ------------------------------------------------------
  // LIST USERS (ADMIN / INTERNAL)
  // ------------------------------------------------------
  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.app_users.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.app_users.count(),
    ]);
    const profileMap = new Map<string, any>();
    if (users.length > 0) {
      const profiles = await this.prisma.user_profiles.findMany({
        where: { userId: { in: users.map((u) => u.id) } },
      });
      profiles.forEach((p) => profileMap.set(p.userId, p));
    }
    const usersWithProfiles = users.map(({ password, ...user }) => ({
      ...user,
      user_profiles: profileMap.get(user.id) ?? null,
    }));

    return {
      data: usersWithProfiles,
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
    const user = await this.prisma.app_users.findUnique({
      where: { authUserId },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const [userProfile, entityRoles] = await Promise.all([
      this.prisma.user_profiles.findUnique({ where: { userId: user.id } }),
      this.prisma.entity_roles.findMany({
        where: { userId: user.id },
        select: { id: true, entityId: true, role: true },
      }),
    ]);
    return { ...user, user_profiles: userProfile, entity_roles: entityRoles };
  }
  
  // ------------------------------------------------------
  // GET SINGLE USER (BY app_users.id)
  // ------------------------------------------------------
  async findOne(id: string, includePrivate = false) {
    const user = await this.prisma.app_users.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const [userProfile, ownedEntities, entityRoles, follows] = await Promise.all([
      this.prisma.user_profiles.findUnique({ where: { userId: id } }),
      this.prisma.entities.findMany({
        where: { ownerId: id },
        select: { id: true, name: true, slug: true, thumbnail: true, type: true, isVerified: true, createdAt: true },
      }),
      this.prisma.entity_roles.findMany({
        where: { userId: id },
        select: { id: true, entityId: true, role: true },
      }),
      this.prisma.follows.findMany({ where: { userId: id } }),
    ]);
    const entityIdsFromRoles = [...new Set(entityRoles.map((r) => r.entityId))];
    const entityIdsFromFollows = [...new Set(follows.map((f: any) => f.targetId).filter(Boolean))];
    const allEntityIds = [...new Set([...entityIdsFromRoles, ...entityIdsFromFollows])];
    const entitiesForRolesAndFollows =
      allEntityIds.length > 0
        ? await this.prisma.entities.findMany({
            where: { id: { in: allEntityIds } },
            select: { id: true, name: true, slug: true, thumbnail: true, type: true, isVerified: true, createdAt: true },
          })
        : [];
    const entityMap = new Map(entitiesForRolesAndFollows.map((e) => [e.id, e]));
    const entity_roles = entityRoles.map((r) => ({ ...r, entities: entityMap.get(r.entityId) ?? null }));
    const followsWithEntities = follows.map((f: any) => ({
      ...f,
      entities: entityMap.get(f.targetId) ?? null,
    }));
    const assembled = {
      ...user,
      user_profiles: userProfile,
      entities: ownedEntities,
      entity_roles,
      follows: followsWithEntities,
      _count: { follows: follows.length },
    };
    if (userProfile?.visibility === "private" && !includePrivate) {
      const { password, ...rest } = assembled;
      return {
        ...rest,
        user_profiles: {
          id: userProfile.id,
          userId: userProfile.userId,
          username: userProfile.username,
          avatarUrl: userProfile.avatarUrl,
          visibility: userProfile.visibility,
        },
      };
    }
    const { password, ...out } = assembled;
    return out;
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
        entityId: true,
        role: true,
      },
    });

    const entityIds = [...new Set(roles.map((r) => r.entityId).filter(Boolean))];
    const entities =
      entityIds.length > 0
        ? await this.prisma.entities.findMany({
            where: { id: { in: entityIds } },
            select: { id: true, name: true, slug: true, type: true },
          })
        : [];
    const entityMap = new Map(entities.map((e) => [e.id, e]));

    const managed = roles.map((r) => {
      const entity = entityMap.get(r.entityId);
      return entity ? { ...entity, role: r.role } : null;
    }).filter(Boolean) as { id: string; name: string; slug: string; type: string; role: string }[];
  
    return {
      owned,
      managed,
    };
  }
  
  // ------------------------------------------------------
  // FIND BY USERNAME (PROFILE)
  // ------------------------------------------------------
  async findByUsername(username: string) {
    const profile = await this.prisma.user_profiles.findUnique({
      where: { username },
    });
    if (!profile) {
      throw new NotFoundException("User profile not found");
    }
    const appUser = await this.prisma.app_users.findUnique({
      where: { id: profile.userId },
      select: { id: true, email: true, role: true, createdAt: true, updatedAt: true },
    });
    if (profile.visibility === "private") {
      return {
        id: profile.id,
        userId: profile.userId,
        username: profile.username,
        avatarUrl: profile.avatarUrl,
        visibility: profile.visibility,
        user: appUser,
      };
    }
    return { ...profile, app_users: appUser };
  }

  // ------------------------------------------------------
  // CONVERT USER TO ENTITY (CREATOR ENTITY CREATION)
  // ------------------------------------------------------
  async convertToEntity(
    userId: string,
    convertToEntityDto: ConvertToEntityDto,
  ) {
    const user = await this.prisma.app_users.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const ownedEntities = await this.prisma.entities.findMany({
      where: { ownerId: userId },
    });
    if (ownedEntities.length > 0) {
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
  
    const entity = await this.prisma.$transaction(async (tx) => {
      const newEntity = await tx.entities.create({
        data: {
          id: randomUUID(),
          ...convertToEntityDto,
          ownerId: userId,
          updatedAt: new Date(),
        },
      });
      await tx.entity_roles.create({
        data: {
          id: randomUUID(),
          userId,
          entityId: newEntity.id,
          role: EntityRoleType.OWNER,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
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
    const user = await this.prisma.app_users.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const pendingApplications = await this.prisma.entity_applications.findMany({
      where: { ownerId: userId, status: "PENDING" },
    });
    if (pendingApplications.length > 0) {
      const entityIds = pendingApplications.map((a) => a.entityId).filter(Boolean);
      const entities = entityIds.length > 0 ? await this.prisma.entities.findMany({ where: { id: { in: entityIds } }, select: { id: true, name: true, slug: true, status: true } }) : [];
      const entityMap = new Map(entities.map((e) => [e.id, e]));
      const applicationDetails = pendingApplications
        .map((app) => `Entity "${entityMap.get(app.entityId)?.name ?? app.entityId}" (ID: ${app.entityId})`)
        .join(", ");
      
      throw new BadRequestException(
        `Cannot promote user: User has ${pendingApplications.length} pending creator application(s). ` +
        `Please resolve the pending application(s) first: ${applicationDetails}. ` +
        `Either accept/reject the application(s) or have the user withdraw them before promoting.`
      );
    }

    // GUARD 3: ownedCount already computed above (informational)
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

    const allUserApplications = await this.prisma.entity_applications.findMany({
      where: { ownerId: userId },
    });
    const appEntityIds = allUserApplications.map((a) => a.entityId).filter(Boolean);
    const appEntities = appEntityIds.length > 0 ? await this.prisma.entities.findMany({ where: { id: { in: appEntityIds } }, select: { id: true, ownerId: true } }) : [];
    const entityOwnerMap = new Map(appEntities.map((e) => [e.id, e.ownerId]));
    const inconsistentApplications = allUserApplications.filter((app) => {
      const ownerId = entityOwnerMap.get(app.entityId);
      return ownerId != null && ownerId !== userId;
    });

    if (inconsistentApplications.length > 0) {
      const inconsistentDetails = inconsistentApplications
        .map((app) => `Application ${app.id} (Entity ${app.entityId})`)
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
          id: randomUUID(),
          ...createData,
          updatedAt: new Date(),
        },
      });
      await tx.entity_roles.create({
        data: {
          id: randomUUID(),
          userId,
          entityId: newEntity.id,
          role: EntityRoleType.OWNER,
          createdAt: new Date(),
          updatedAt: new Date(),
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
