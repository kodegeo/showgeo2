import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateStoreDto,
  UpdateStoreDto,
  CreateProductDto,
  UpdateProductDto,
  StoreQueryDto,
} from "./dto";
import {
  stores as Store,
  StoreStatus,
  StoreVisibility,
  UserRole,
  EntityRoleType,
} from "@prisma/client";

@Injectable()
export class StoreService {
  constructor(private readonly prisma: PrismaService) {}

  // Helper: map Prisma store shape → frontend shape (Option C)
  private mapStoreToResponse(store: any) {
    if (!store) return store;

    const {
      entities_stores_entityIdToentities,
      events,
      tours_stores_tourIdTotours,
      entities_StoreCollaborators,
      ...rest
    } = store;

    return {
      ...rest,
      entity: entities_stores_entityIdToentities || null,
      event: events || null,
      tour: tours_stores_tourIdTotours || null,
      collaborators: entities_StoreCollaborators || [],
    };
  }

  // ------------------------------------------------------
  // CREATE STORE
  // ------------------------------------------------------
  async createStore(
    createStoreDto: CreateStoreDto,
    entityId: string,
  ): Promise<any> {
    const { slug, name, collaborators, eventId, tourId, ...storeData } =
      createStoreDto;

    // Check if slug already exists
    const existingStore = await (this.prisma as any).stores.findUnique({
      where: { slug },
    });

    if (existingStore) {
      throw new ConflictException("Store with this slug already exists");
    }

    // Validate entity exists
    const entity = await (this.prisma as any).entities.findUnique({
      where: { id: entityId },
    });

    if (!entity) {
      throw new NotFoundException("Entity not found");
    }

    // Validate event exists if provided
    if (eventId) {
      const event = await (this.prisma as any).events.findUnique({
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
      const tour = await (this.prisma as any).tours.findUnique({
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

    // Prepare collaborators relation update (Entity IDs)
    const collaboratorsUpdate = collaborators
      ? {
          connect: collaborators.map((id) => ({ id })),
        }
      : undefined;

    // Create store
    const store = await (this.prisma as any).stores.create({
      data: {
        ...storeData,
        name,
        slug,
        entityId,
        eventId,
        tourId,
        ...(collaboratorsUpdate && {
          entities_StoreCollaborators: collaboratorsUpdate,
        }),
      },
      include: {
        entities_stores_entityIdToentities: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            type: true,
            isVerified: true,
            ownerId: true,
          },
        },
        events: {
          select: {
            id: true,
            name: true,
            thumbnail: true,
            startTime: true,
          },
        },
        tours_stores_tourIdTotours: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            startDate: true,
          },
        },
        entities_StoreCollaborators: {
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
    });

    return this.mapStoreToResponse(store);
  }

  // ------------------------------------------------------
  // UPDATE STORE
  // ------------------------------------------------------
  async updateStore(
    id: string,
    updateStoreDto: UpdateStoreDto,
    userId: string,
    userRole: UserRole,
  ): Promise<any> {
    const store = await this.findOneRaw(id); // internal raw fetch

    // Check permissions: Owner or Manager with ADMIN/MANAGER role, or Admin
    await this.checkStorePermissions(store, userId, userRole);

    const { slug, name, collaborators, ...updateData } = updateStoreDto;

    // Check slug uniqueness if being updated
    if (slug && slug !== store.slug) {
      const existingStore = await (this.prisma as any).stores.findUnique({
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
    const updated = await (this.prisma as any).stores.update({
      where: { id },
      data: {
        ...updateData,
        ...(slug && { slug }),
        ...(name && { name }),
        ...(collaboratorsUpdate && {
          entities_StoreCollaborators: collaboratorsUpdate,
        }),
      },
      include: {
        entities_stores_entityIdToentities: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            type: true,
            isVerified: true,
            ownerId: true,
          },
        },
        events: {
          select: {
            id: true,
            name: true,
            thumbnail: true,
            startTime: true,
          },
        },
        tours_stores_tourIdTotours: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            startDate: true,
          },
        },
        entities_StoreCollaborators: {
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
    });

    return this.mapStoreToResponse(updated);
  }

  // ------------------------------------------------------
  // LIST / SEARCH STORES
  // ------------------------------------------------------
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

    // Only show public stores by default (unless explicitly requesting other visibilities)
    if (
      visibility !== StoreVisibility.UNLISTED &&
      visibility !== StoreVisibility.PRIVATE
    ) {
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
      (this.prisma as any).stores.findMany({
        where,
        include: {
          entities_stores_entityIdToentities: {
            select: {
              id: true,
              name: true,
              slug: true,
              thumbnail: true,
              type: true,
              isVerified: true,
            },
          },
          events: {
            select: {
              id: true,
              name: true,
              thumbnail: true,
              startTime: true,
            },
          },
          tours_stores_tourIdTotours: {
            select: {
              id: true,
              name: true,
              slug: true,
              thumbnail: true,
              startDate: true,
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
      (this.prisma as any).stores.count({ where }),
    ]);

    return {
      data: stores.map((s: any) => this.mapStoreToResponse(s)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ------------------------------------------------------
  // INTERNAL RAW FIND (no mapping)
  // ------------------------------------------------------
  private async findOneRaw(id: string): Promise<Store> {
    const store = await (this.prisma as any).stores.findUnique({
      where: { id },
    });

    if (!store) {
      throw new NotFoundException("Store not found");
    }

    return store;
  }

  // ------------------------------------------------------
  // PUBLIC FIND ONE (mapped)
  // ------------------------------------------------------
  async findOne(id: string): Promise<any> {
    const store = await (this.prisma as any).stores.findUnique({
      where: { id },
      include: {
        entities_stores_entityIdToentities: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            type: true,
            isVerified: true,
            ownerId: true,
          },
        },
        events: {
          select: {
            id: true,
            name: true,
            thumbnail: true,
            startTime: true,
          },
        },
        tours_stores_tourIdTotours: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            startDate: true,
          },
        },
        entities_StoreCollaborators: {
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

    return this.mapStoreToResponse(store);
  }

  // ------------------------------------------------------
  // GET STORES FOR AN ENTITY
  // ------------------------------------------------------
  async getEntityStore(entityId: string): Promise<any[]> {
    // Validate entity exists
    const entity = await (this.prisma as any).entities.findUnique({
      where: { id: entityId },
    });

    if (!entity) {
      throw new NotFoundException("Entity not found");
    }

    const stores = await (this.prisma as any).stores.findMany({
      where: { entityId },
      include: {
        events: {
          select: {
            id: true,
            name: true,
            thumbnail: true,
            startTime: true,
          },
        },
        tours_stores_tourIdTotours: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            startDate: true,
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

    return stores.map((s: any) => this.mapStoreToResponse(s));
  }

  // ------------------------------------------------------
  // PRODUCTS
  // ------------------------------------------------------
  async addProduct(
    storeId: string,
    createProductDto: CreateProductDto,
    userId: string,
    userRole: UserRole,
  ) {
    const store = await this.findOneRaw(storeId);

    // Check permissions
    await this.checkStorePermissions(store, userId, userRole);

    // Create product
    const product = await (this.prisma as any).products.create({
      data: {
        ...createProductDto,
        storeId,
      },
      include: {
        stores: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // map relation name → frontend-friendly
    const { stores, ...rest } = product;
    return {
      ...rest,
      store: stores,
    };
  }

  async updateProduct(
    productId: string,
    updateProductDto: UpdateProductDto,
    userId: string,
    userRole: UserRole,
  ) {
    // Find product with store
    const product = await (this.prisma as any).products.findUnique({
      where: { id: productId },
      include: {
        stores: true,
      },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    // Check permissions on store
    await this.checkStorePermissions(product.stores, userId, userRole);

    // Update product
    const updated = await (this.prisma as any).products.update({
      where: { id: productId },
      data: updateProductDto,
      include: {
        stores: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    const { stores, ...rest } = updated;
    return {
      ...rest,
      store: stores,
    };
  }

  async removeProduct(
    productId: string,
    userId: string,
    userRole: UserRole,
  ) {
    // Find product with store
    const product = await (this.prisma as any).products.findUnique({
      where: { id: productId },
      include: {
        stores: true,
      },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    // Check permissions on store
    await this.checkStorePermissions(product.stores, userId, userRole);

    // Delete product
    await (this.prisma as any).products.delete({
      where: { id: productId },
    });

    return { message: "Product deleted successfully" };
  }

  // ------------------------------------------------------
  // DELETE STORE
  // ------------------------------------------------------
  async delete(id: string, userId: string, userRole: UserRole) {
    const store = await (this.prisma as any).stores.findUnique({
      where: { id },
      include: {
        entities_stores_entityIdToentities: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException("Store not found");
    }

    const ownerId = store.entities_stores_entityIdToentities?.ownerId;

    // Only owner or admin can delete
    if (ownerId && ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException("Only owner or admin can delete store");
    }

    // Products are cascade deleted automatically
    await (this.prisma as any).stores.delete({
      where: { id },
    });

    return { message: "Store deleted successfully" };
  }

  // ------------------------------------------------------
  // PERMISSION CHECK
  // ------------------------------------------------------
  private async checkStorePermissions(
    store: Store,
    userId: string,
    userRole: UserRole,
  ) {
    if (userRole === UserRole.ADMIN) {
      return; // Admin can manage anything
    }

    // Check if user owns the entity or has roles on it
    const entity = await (this.prisma as any).entities.findUnique({
      where: { id: store.entityId },
      include: {
        entity_roles: {
          where: {
            userId,
          },
        },
      },
    });

    if (!entity) {
      throw new NotFoundException("Entity not found");
    }

    // Direct owner
    if (entity.ownerId === userId) {
      return;
    }

    // Check if user is a manager with ADMIN or MANAGER role
    const entityRole = entity.entity_roles.find(
      (role: any) =>
        role.userId === userId &&
        (role.role === EntityRoleType.ADMIN ||
          role.role === EntityRoleType.MANAGER),
    );

    if (entityRole) {
      return;
    }

    throw new ForbiddenException(
      "You do not have permission to manage this store",
    );
  }
}
