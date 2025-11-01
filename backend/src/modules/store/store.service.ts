import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateStoreDto, UpdateStoreDto, CreateProductDto, UpdateProductDto, StoreQueryDto } from "./dto";
import { Store, StoreStatus, StoreVisibility, UserRole, EntityRoleType } from "@prisma/client";

@Injectable()
export class StoreService {
  constructor(private readonly prisma: PrismaService) {}

  async createStore(createStoreDto: CreateStoreDto, entityId: string): Promise<Store> {
    const { slug, name, collaborators, eventId, tourId, ...storeData } = createStoreDto;

    // Check if slug already exists
    const existingStore = await this.prisma.store.findUnique({
      where: { slug },
    });

    if (existingStore) {
      throw new ConflictException("Store with this slug already exists");
    }

    // Validate entity exists
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
    });

    if (!entity) {
      throw new NotFoundException("Entity not found");
    }

    // Validate event exists if provided
    if (eventId) {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new NotFoundException("Event not found");
      }

      // Verify event belongs to entity
      if (event.entityId !== entityId) {
        throw new ForbiddenException("Event does not belong to this entity");
      }
    }

    // Validate tour exists if provided
    if (tourId) {
      const tour = await this.prisma.tour.findUnique({
        where: { id: tourId },
      });

      if (!tour) {
        throw new NotFoundException("Tour not found");
      }

      // Verify tour belongs to entity
      if (tour.primaryEntityId !== entityId) {
        throw new ForbiddenException("Tour does not belong to this entity");
      }
    }

    // Prepare collaborators update
    const collaboratorsUpdate = collaborators
      ? {
          connect: collaborators.map((id) => ({ id })),
        }
      : undefined;

    // Create store
    const store = await this.prisma.store.create({
      data: {
        ...storeData,
        name,
        slug,
        entityId,
        eventId,
        tourId,
        ...(collaboratorsUpdate && { collaboratingEntities: collaboratorsUpdate }),
      },
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
            thumbnail: true,
          },
        },
        tour: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
          },
        },
        collaboratingEntities: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    return store;
  }

  async updateStore(
    id: string,
    updateStoreDto: UpdateStoreDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Store> {
    const store = await this.findOne(id);

    // Check permissions: Owner or Manager with ADMIN/MANAGER role, or Admin
    await this.checkStorePermissions(store, userId, userRole);

    const { slug, name, collaborators, ...updateData } = updateStoreDto;

    // Check slug uniqueness if being updated
    if (slug && slug !== store.slug) {
      const existingStore = await this.prisma.store.findUnique({
        where: { slug },
      });

      if (existingStore) {
        throw new ConflictException("Store with this slug already exists");
      }
    }

    // Prepare collaborators update if provided
    const collaboratorsUpdate = collaborators
      ? {
          set: collaborators.map((entityId) => ({ id: entityId })),
        }
      : undefined;

    // Update store
    const updated = await this.prisma.store.update({
      where: { id },
      data: {
        ...updateData,
        ...(slug && { slug }),
        ...(name && { name }),
        ...(collaboratorsUpdate && { collaboratingEntities: collaboratorsUpdate }),
      },
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
            thumbnail: true,
          },
        },
        tour: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
          },
        },
        collaboratingEntities: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    return updated;
  }

  async findAll(query: StoreQueryDto) {
    const {
      search,
      entityId,
      eventId,
      tourId,
      status,
      visibility,
      isActive,
      tag,
      page = 1,
      limit = 20,
    } = query;

    const where: any = {};

    // Only show public stores by default (unless admin)
    if (visibility !== StoreVisibility.UNLISTED && visibility !== StoreVisibility.PRIVATE) {
      where.visibility = StoreVisibility.PUBLIC;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    if (entityId) where.entityId = entityId;
    if (eventId) where.eventId = eventId;
    if (tourId) where.tourId = tourId;
    if (status) where.status = status;
    if (visibility) where.visibility = visibility;
    if (isActive !== undefined) {
      where.status = isActive ? StoreStatus.ACTIVE : StoreStatus.INACTIVE;
    }
    if (tag) where.tags = { has: tag };

    const skip = (page - 1) * limit;

    const [stores, total] = await Promise.all([
      this.prisma.store.findMany({
        where,
        include: {
          entity: {
            select: {
              id: true,
              name: true,
              slug: true,
              thumbnail: true,
            },
          },
          event: {
            select: {
              id: true,
              name: true,
              thumbnail: true,
            },
          },
          tour: {
            select: {
              id: true,
              name: true,
              slug: true,
              thumbnail: true,
            },
          },
          _count: {
            select: {
              products: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.store.count({ where }),
    ]);

    return {
      data: stores,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Store> {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: {
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
        event: {
          select: {
            id: true,
            name: true,
            thumbnail: true,
            startTime: true,
          },
        },
        tour: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            startDate: true,
          },
        },
        collaboratingEntities: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
          },
        },
        products: {
          where: {
            isAvailable: true,
          },
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException("Store not found");
    }

    return store;
  }

  async getEntityStore(entityId: string): Promise<Store[]> {
    // Validate entity exists
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
    });

    if (!entity) {
      throw new NotFoundException("Entity not found");
    }

    const stores = await this.prisma.store.findMany({
      where: { entityId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            thumbnail: true,
          },
        },
        tour: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return stores;
  }

  async addProduct(
    storeId: string,
    createProductDto: CreateProductDto,
    userId: string,
    userRole: UserRole,
  ) {
    const store = await this.findOne(storeId);

    // Check permissions
    await this.checkStorePermissions(store, userId, userRole);

    // Create product
    const product = await this.prisma.product.create({
      data: {
        ...createProductDto,
        storeId,
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return product;
  }

  async updateProduct(
    productId: string,
    updateProductDto: UpdateProductDto,
    userId: string,
    userRole: UserRole,
  ) {
    // Find product with store
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        store: true,
      },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    // Check permissions on store
    await this.checkStorePermissions(product.store, userId, userRole);

    // Update product
    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: updateProductDto,
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return updated;
  }

  async removeProduct(productId: string, userId: string, userRole: UserRole) {
    // Find product with store
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        store: true,
      },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    // Check permissions on store
    await this.checkStorePermissions(product.store, userId, userRole);

    // Delete product
    await this.prisma.product.delete({
      where: { id: productId },
    });

    return { message: "Product deleted successfully" };
  }

  async delete(id: string, userId: string, userRole: UserRole) {
    const store = await this.findOne(id);

    // Only owner or admin can delete
    if (store.entityId && store.entity.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException("Only owner or admin can delete store");
    }

    // Products are cascade deleted automatically
    await this.prisma.store.delete({
      where: { id },
    });

    return { message: "Store deleted successfully" };
  }

  private async checkStorePermissions(store: Store, userId: string, userRole: UserRole) {
    if (userRole === UserRole.ADMIN) {
      return; // Admin can manage anything
    }

    // Check if user owns the entity
    const entity = await this.prisma.entity.findUnique({
      where: { id: store.entityId },
      include: {
        owner: true,
        roles: {
          where: {
            userId,
          },
        },
      },
    });

    if (!entity) {
      throw new NotFoundException("Entity not found");
    }

    if (entity.ownerId === userId) {
      return; // Owner can manage
    }

    // Check if user is a manager with ADMIN or MANAGER role
    const entityRole = entity.roles.find((role) => role.userId === userId);

    if (entityRole && (entityRole.role === EntityRoleType.ADMIN || entityRole.role === EntityRoleType.MANAGER)) {
      return; // Manager with ADMIN/MANAGER role can manage
    }

    throw new ForbiddenException("You do not have permission to manage this store");
  }
}

