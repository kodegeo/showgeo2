import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateEntityDto,
  UpdateEntityDto,
  AddCollaboratorDto,
  EntityQueryDto,
  CreatorApplicationDto,
} from "./dto";
import {
  EntityRoleType,
  UserRole,
  EntityType,
  Prisma,
} from "@prisma/client";
import { randomUUID } from "crypto";


type Entity = any;

// Define EntityStatus locally to match Prisma schema
type EntityStatus = "PENDING" | "APPROVED" | "REJECTED";
const EntityStatusEnum = {
  PENDING: "PENDING" as EntityStatus,
  APPROVED: "APPROVED" as EntityStatus,
  REJECTED: "REJECTED" as EntityStatus,
};

@Injectable()
export class EntitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async createEntity(createEntityDto: CreateEntityDto, ownerId: string): Promise<Entity> {
    const { slug, name } = createEntityDto;

    // Check if slug already exists
    const existingEntity = await (this.prisma as any).entities.findUnique({
      where: { slug },
    });

    if (existingEntity) {
      throw new ConflictException("Entity with this slug already exists");
    }

    // Check if name already exists
    const existingByName = await (this.prisma as any).entities.findFirst({
      where: { name },
    });

    if (existingByName) {
      throw new ConflictException("Entity with this name already exists");
    }

    // Create entity with owner - ensure JSON fields are properly typed
    const { socialLinks, ...restDto } = createEntityDto;
    const createData: any = { ...restDto, ownerId };
    if (socialLinks !== undefined) {
      createData.socialLinks = socialLinks as Prisma.InputJsonValue;
    }

    const entity = await (this.prisma as any).entities.create({
      data: {
        ...createData,
        // Create owner role automatically
        entity_roles: {
          create: {
            userId: ownerId,
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

    return entity;
  }

  async updateEntity(
    id: string,
    updateEntityDto: UpdateEntityDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Entity> {
    const entity = await this.findOne(id);

    // Check permissions: Owner, Manager with ADMIN role, or Admin
    await this.checkUpdatePermissions(entity, userId, userRole);

    // Check slug uniqueness if being updated
    if (updateEntityDto.slug && updateEntityDto.slug !== entity.slug) {
      const existingEntity = await (this.prisma as any).entities.findUnique({
        where: { slug: updateEntityDto.slug },
      });

      if (existingEntity) {
        throw new ConflictException("Entity with this slug already exists");
      }
    }

    // Check name uniqueness if being updated
    if (updateEntityDto.name && updateEntityDto.name !== entity.name) {
      const existingEntity = await (this.prisma as any).entities.findFirst({
        where: { name: updateEntityDto.name },
      });

      if (existingEntity && existingEntity.id !== id) {
        throw new ConflictException("Entity with this name already exists");
      }
    }

    // Update entity - ensure JSON fields are properly typed
    const { socialLinks, ...restDto } = updateEntityDto;
    const updateData: any = { ...restDto };
    if (socialLinks !== undefined) {
      updateData.socialLinks = socialLinks as Prisma.InputJsonValue;
    }

    const updated = await (this.prisma as any).entities.update({
      where: { id },
      data: updateData,
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

    return updated;
  }

  async findAll(query: EntityQueryDto) {
    const {
      search,
      type,
      isVerified,
      isPublic,
      location,
      tag,
      page = 1,
      limit = 20,
    } = query;

    const where: any = {};

    // Default: Only show public entities
    if (isPublic !== false) {
      where.isPublic = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { bio: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    if (type) where.type = type;
    if (isVerified !== undefined) where.isVerified = isVerified;
    if (location)
      where.location = { contains: location, mode: "insensitive" };
    if (tag) where.tags = { has: tag };

    const skip = (page - 1) * limit;

    const [entities, total] = await Promise.all([
      (this.prisma as any).entities.findMany({
        where,
        include: {
          app_users: {
            select: {
              id: true,
              email: true,
              user_profiles: true,
            },
          },
          _count: {
            select: {
              events_events_entityIdToentities: true,
              tours_tours_primaryEntityIdToentities: true,
              stores_stores_entityIdToentities: true,
              follows: true,
              },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      (this.prisma as any).entities.count({ where }),
    ]);

    return {
      data: entities,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a creator application (Entity with PENDING status)
   * Called when a user applies to become a creator
   */
  async createCreatorApplication(
    applicationDto: CreatorApplicationDto,
    userId: string
  ): Promise<Entity> {
    const {
      brandName,
      category,
      socialLinks,
      purpose,
      website,
      thumbnail,
      bannerImage,
      termsAccepted,
    } = applicationDto;

    // Must accept terms
    if (!termsAccepted) {
      throw new BadRequestException(
        "You must accept the terms and conditions to submit a creator application."
      );
    }

    // Check if user already has a pending application
    const existingPending = await (this.prisma as any).entities.findFirst({
      where: {
        ownerId: userId,
        status: EntityStatusEnum.PENDING,
      } as any, // Type assertion needed until Prisma client is fully regenerated
    });

    if (existingPending) {
      throw new BadRequestException(
        "You already have a pending creator application. Please wait for approval."
      );
    }

    // Generate slug
    const slug = this.generateSlug(brandName);

    // Check slug uniqueness
    const existingSlug = await (this.prisma as any).entities.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      throw new ConflictException(
        "An entity with this brand name already exists. Please choose a different name."
      );
    }

    // Check brand name uniqueness
    const existingName = await (this.prisma as any).entities.findFirst({
      where: { name: brandName },
    });
    if (existingName) {
      throw new ConflictException(
        "An entity with this brand name already exists. Please choose a different name."
      );
    }

    // Fetch user to determine entity type
    const user = await (this.prisma as any).app_users.findUnique({
      where: { id: userId },
      include: { user_profiles: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Determine entity type automatically
    const userDisplayName =
      user.user_profiles?.firstName && user.user_profiles?.lastName
        ? `${user.user_profiles.firstName} ${user.user_profiles.lastName}`
        : user.email.split("@")[0];

    const entityType =
      brandName.toLowerCase() !== userDisplayName.toLowerCase()
        ? EntityType.ORGANIZATION
        : EntityType.INDIVIDUAL;

    // Prepare creation data
    // Map 'purpose' from DTO to 'bio' field in Entity model
    const createData: any = {
      id: randomUUID(), // 👈 REQUIRED FOR PRISMA
      name: brandName,
      slug,
      ownerId: userId,
      type: entityType,
      status: EntityStatusEnum.PENDING,
      isPublic: false,
      bio: purpose, // Map purpose → bio
      website,
      thumbnail,
      bannerImage,
      tags: [category],
    };

    if (socialLinks !== undefined) {
      createData.socialLinks = socialLinks as Prisma.InputJsonValue;
    }

    // Create entity + owner role
    const entity = await (this.prisma as any).entities.create({
      data: {
        ...createData,
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

    return entity;
  }
  /**
   * Generate a URL-friendly slug from a string
   */
  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
  }

  async findOne(id: string): Promise<Entity> {
    const entity = await (this.prisma as any).entities.findUnique({
      where: { id },
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
        events_events_entityIdToentities: {
          select: {
            id: true,
            name: true,
            thumbnail: true,
            status: true,
            startTime: true,
            phase: true,
            createdAt: true,
          },
          orderBy: { startTime: "desc" },
          take: 10,
        },
        tours_tours_primaryEntityIdToentities: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            status: true,
            startDate: true,
            createdAt: true,
          },
          orderBy: { startDate: "desc" },
          take: 10,
        },
        stores_stores_entityIdToentities: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            events_events_entityIdToentities: true,
            tours_tours_primaryEntityIdToentities: true,
            stores_stores_entityIdToentities: true,
            follows: true,
          },
        },
      },
    });

    if (!entity) {
      throw new NotFoundException("Entity not found");
    }

    return entity;
  }

  async findBySlug(slug: string): Promise<Entity> {
    const entity = await (this.prisma as any).entities.findUnique({
      where: { slug },
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
        events_events_entityIdToentities: {
          select: {
            id: true,
            name: true,
            thumbnail: true,
            status: true,
            startTime: true,
            phase: true,
            createdAt: true,
          },
          orderBy: { startTime: "desc" },
          take: 10,
        },
        tours_tours_primaryEntityIdToentities: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            status: true,
            startDate: true,
            createdAt: true,
          },
          orderBy: { startDate: "desc" },
          take: 10,
        },
        stores_stores_entityIdToentities: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            events_events_entityIdToentities: true,
            tours_tours_primaryEntityIdToentities: true,
            stores_stores_entityIdToentities: true,
            follows: true,
          },
        },
      },
    });

    if (!entity) {
      throw new NotFoundException("Entity not found");
    }

    return entity;
  }

  async addCollaborator(
    entityId: string,
    addCollaboratorDto: AddCollaboratorDto,
    userId: string,
    userRole: UserRole,
  ) {
    const entity = await this.findOne(entityId);

    // Check permissions: Owner, Manager with ADMIN role, or Admin
    await this.checkCollaboratorPermissions(entity, userId, userRole);

    const { userId: collaboratorUserId, role } = addCollaboratorDto;

    // Check if user exists
    const user = await (this.prisma as any).app_users.findUnique({
      where: { id: collaboratorUserId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check if already a collaborator
    const existingRole = await (this.prisma as any).entity_roles.findUnique({
      where: {
        userId_entityId: {
          userId: collaboratorUserId,
          entityId,
        },
      },
    });

    if (existingRole) {
      throw new ConflictException("User is already a collaborator");
    }

    // Cannot add owner as collaborator (owner is already created)
    if (entity.ownerId === collaboratorUserId) {
      throw new BadRequestException("Owner is already assigned to this entity");
    }

    // Create collaborator role
    const entityRole = await (this.prisma as any).entity_roles.create({
      data: {
        entityId,
        userId: collaboratorUserId,
        role,
      },
      include: {
        app_users: {
          select: {
            id: true,
            email: true,
            user_profiles: true,
          },
        },
        entity: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return entityRole;
  }

  async removeCollaborator(entityId: string, collaboratorUserId: string, userId: string, userRole: UserRole) {
    const entity = await this.findOne(entityId);

    // Check permissions
    await this.checkCollaboratorPermissions(entity, userId, userRole);

    // Cannot remove owner
    if (entity.ownerId === collaboratorUserId) {
      throw new BadRequestException("Cannot remove owner from entity");
    }

    // Check if collaborator exists
    const entityRole = await (this.prisma as any).entity_roles.findUnique({
      where: {
        userId_entityId: {
          userId: collaboratorUserId,
          entityId,
        },
      },
    });

    if (!entityRole) {
      throw new NotFoundException("Collaborator not found");
    }

    // Remove collaborator
    await (this.prisma as any).entity_roles.delete({
      where: {
        userId_entityId: {
          userId: collaboratorUserId,
          entityId,
        },
      },
    });

    return { message: "Collaborator removed successfully" };
  }

  async getCollaborators(entityId: string) {
    const entity = await this.findOne(entityId);

    const collaborators = await (this.prisma as any).entity_roles.findMany({
      where: { entityId },
      include: {
        app_users: {
          select: {
            id: true,
            email: true,
            user_profiles: true,
          },
        },
      },
      orderBy: [
        { role: "asc" }, // OWNER first, then ADMIN, MANAGER, COORDINATOR
        { createdAt: "asc" },
      ],
    });

    return collaborators;
  }

  async delete(id: string, userId: string, userRole: UserRole) {
    const entity = await this.findOne(id);

    // Only owner or admin can delete
    if (entity.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException("Only owner or admin can delete entity");
    }

    // Soft delete - set isPublic to false and optionally mark for deletion
    // For now, we'll do a hard delete (can be changed to soft delete)
    await (this.prisma as any).entities.delete({
      where: { id },
    });

    return { message: "Entity deleted successfully" };
  }

  private async checkUpdatePermissions(entity: Entity, userId: string, userRole: UserRole) {
    if (userRole === UserRole.ADMIN) {
      return; // Admin can update anything
    }

    if (entity.ownerId === userId) {
      return; // Owner can update
    }

    // Check if user is a manager with ADMIN role for this entity
    const entityRole = await (this.prisma as any).entity_roles.findUnique({
      where: {
        userId_entityId: {
          userId,
          entityId: entity.id,
        },
      },
    });

    if (entityRole && entityRole.role === EntityRoleType.ADMIN) {
      return; // Manager with ADMIN role can update
    }

    throw new ForbiddenException("You do not have permission to update this entity");
  }

  private async checkCollaboratorPermissions(entity: Entity, userId: string, userRole: UserRole) {
    if (userRole === UserRole.ADMIN) {
      return; // Admin can manage collaborators
    }

    if (entity.ownerId === userId) {
      return; // Owner can manage collaborators
    }

    // Check if user is a manager with ADMIN role for this entity
    const entityRole = await (this.prisma as any).entity_roles.findUnique({
      where: {
        userId_entityId: {
          userId,
          entityId: entity.id,
        },
      },
    });

    if (entityRole && (entityRole.role === EntityRoleType.ADMIN || entityRole.role === EntityRoleType.MANAGER)) {
      return; // Manager with ADMIN or MANAGER role can manage collaborators
    }

    throw new ForbiddenException("You do not have permission to manage collaborators for this entity");
  }
}

