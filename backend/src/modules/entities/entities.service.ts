import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateEntityDto, UpdateEntityDto, AddCollaboratorDto, EntityQueryDto } from "./dto";
import { Entity, EntityRoleType, UserRole } from "@prisma/client";

@Injectable()
export class EntitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async createEntity(createEntityDto: CreateEntityDto, ownerId: string): Promise<Entity> {
    const { slug, name } = createEntityDto;

    // Check if slug already exists
    const existingEntity = await this.prisma.entity.findUnique({
      where: { slug },
    });

    if (existingEntity) {
      throw new ConflictException("Entity with this slug already exists");
    }

    // Check if name already exists
    const existingByName = await this.prisma.entity.findFirst({
      where: { name },
    });

    if (existingByName) {
      throw new ConflictException("Entity with this name already exists");
    }

    // Create entity with owner
    const entity = await this.prisma.entity.create({
      data: {
        ...createEntityDto,
        ownerId,
        // Create owner role automatically
        roles: {
          create: {
            userId: ownerId,
            role: EntityRoleType.OWNER,
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
        roles: {
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
      const existingEntity = await this.prisma.entity.findUnique({
        where: { slug: updateEntityDto.slug },
      });

      if (existingEntity) {
        throw new ConflictException("Entity with this slug already exists");
      }
    }

    // Check name uniqueness if being updated
    if (updateEntityDto.name && updateEntityDto.name !== entity.name) {
      const existingEntity = await this.prisma.entity.findFirst({
        where: { name: updateEntityDto.name },
      });

      if (existingEntity && existingEntity.id !== id) {
        throw new ConflictException("Entity with this name already exists");
      }
    }

    // Update entity
    const updated = await this.prisma.entity.update({
      where: { id },
      data: updateEntityDto,
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
        roles: {
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

    // Only show public entities by default (unless admin)
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
    if (location) where.location = { contains: location, mode: "insensitive" };
    if (tag) where.tags = { has: tag };

    const skip = (page - 1) * limit;

    const [entities, total] = await Promise.all([
      this.prisma.entity.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              profile: true,
            },
          },
          _count: {
            select: {
              events: true,
              tours: true,
              stores: true,
              followers: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.entity.count({ where }),
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

  async findOne(id: string): Promise<Entity> {
    const entity = await this.prisma.entity.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
        roles: {
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
        events: {
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
        tours: {
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
        stores: {
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
            events: true,
            tours: true,
            stores: true,
            followers: true,
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
    const entity = await this.prisma.entity.findUnique({
      where: { slug },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
        roles: {
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
        events: {
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
        tours: {
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
        stores: {
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
            events: true,
            tours: true,
            stores: true,
            followers: true,
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
    const user = await this.prisma.user.findUnique({
      where: { id: collaboratorUserId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check if already a collaborator
    const existingRole = await this.prisma.entityRole.findUnique({
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
    const entityRole = await this.prisma.entityRole.create({
      data: {
        entityId,
        userId: collaboratorUserId,
        role,
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
    const entityRole = await this.prisma.entityRole.findUnique({
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
    await this.prisma.entityRole.delete({
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

    const collaborators = await this.prisma.entityRole.findMany({
      where: { entityId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: true,
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
    await this.prisma.entity.delete({
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
    const entityRole = await this.prisma.entityRole.findUnique({
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
    const entityRole = await this.prisma.entityRole.findUnique({
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

