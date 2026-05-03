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
import { randomUUID } from "crypto";
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

  // Helper: map store + optional fetched relations → frontend shape (stores has no relations in schema)
  private mapStoreToResponse(store: any, opts?: { entity?: any; event?: any; tour?: any; collaborators?: any[] }) {
    if (!store) return store;
    const { entityId, eventId, tourId, collaborators: collabIds, ...rest } = store;
    return {
      ...rest,
      entityId,
      eventId,
      tourId,
      entity: opts?.entity ?? null,
      event: opts?.event ?? null,
      tour: opts?.tour ?? null,
      collaborators: opts?.collaborators ?? [],
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

    const ownerEntity = await this.prisma.entities.findUnique({
      where: { id: entityId },
    });
    if (!ownerEntity) {
      throw new NotFoundException("Entity not found");
    }

    if (eventId) {
      const event = await this.prisma.events.findUnique({
        where: { id: eventId },
      });
      if (!event) {
        throw new NotFoundException("Event not found");
      }
      if (event.entityId !== ownerEntity.id) {
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

    const store = await this.prisma.stores.create({
      data: {
        id: randomUUID(),
        name,
        slug,
        entityId,
        eventId: eventId ?? null,
        tourId: tourId ?? null,
        collaborators: collaborators ?? [],
        tags: (storeData as any).tags ?? [],
        updatedAt: new Date(),
        ...(typeof (storeData as any).description !== "undefined" && { description: (storeData as any).description }),
        ...(typeof (storeData as any).bannerImage !== "undefined" && { bannerImage: (storeData as any).bannerImage }),
        ...(typeof (storeData as any).logoUrl !== "undefined" && { logoUrl: (storeData as any).logoUrl }),
        ...(typeof (storeData as any).currency !== "undefined" && { currency: (storeData as any).currency }),
        ...(typeof (storeData as any).status !== "undefined" && { status: (storeData as any).status }),
        ...(typeof (storeData as any).visibility !== "undefined" && { visibility: (storeData as any).visibility }),
      },
    });

    const [entityRel, event, tour, collabEntities] = await Promise.all([
      this.prisma.entities.findUnique({ where: { id: entityId }, select: { id: true, name: true, slug: true, thumbnail: true, type: true, isVerified: true, ownerId: true } }),
      eventId ? this.prisma.events.findUnique({ where: { id: eventId }, select: { id: true, name: true, thumbnail: true, startTime: true } }) : null,
      tourId ? this.prisma.tours.findUnique({ where: { id: tourId }, select: { id: true, name: true, slug: true, thumbnail: true, startDate: true } }) : null,
      (collaborators?.length ? this.prisma.entities.findMany({ where: { id: { in: collaborators } }, select: { id: true, name: true, slug: true, thumbnail: true } }) : []) as Promise<any[]>,
    ]);
    return this.mapStoreToResponse(store, { entity: entityRel ?? null, event: event ?? null, tour: tour ?? null, collaborators: collabEntities ?? [] });
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

    // Update store (stores has no relations; collaborators is String[])
    const updated = await this.prisma.stores.update({
      where: { id },
      data: {
        ...updateData,
        ...(slug && { slug }),
        ...(name && { name }),
        ...(collaborators && { collaborators }),
        updatedAt: new Date(),
      },
    });

    const [entity, event, tour, collabEntities] = await Promise.all([
      this.prisma.entities.findUnique({ where: { id: updated.entityId }, select: { id: true, name: true, slug: true, thumbnail: true, type: true, isVerified: true, ownerId: true } }),
      updated.eventId ? this.prisma.events.findUnique({ where: { id: updated.eventId }, select: { id: true, name: true, thumbnail: true, startTime: true } }) : null,
      updated.tourId ? this.prisma.tours.findUnique({ where: { id: updated.tourId }, select: { id: true, name: true, slug: true, thumbnail: true, startDate: true } }) : null,
      (updated.collaborators?.length ? this.prisma.entities.findMany({ where: { id: { in: updated.collaborators } }, select: { id: true, name: true, slug: true, thumbnail: true } }) : []) as Promise<any[]>,
    ]);
    return this.mapStoreToResponse(updated, { entity: entity ?? null, event: event ?? null, tour: tour ?? null, collaborators: collabEntities ?? [] });
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
      this.prisma.stores.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.stores.count({ where }),
    ]);

    const entityIds = [...new Set(stores.map((s: any) => s.entityId))];
    const eventIds = [...new Set(stores.map((s: any) => s.eventId).filter(Boolean))];
    const tourIds = [...new Set(stores.map((s: any) => s.tourId).filter(Boolean))];
    const [entities, events, tours] = await Promise.all([
      entityIds.length ? this.prisma.entities.findMany({ where: { id: { in: entityIds } }, select: { id: true, name: true, slug: true, thumbnail: true, type: true, isVerified: true } }) : [],
      eventIds.length ? this.prisma.events.findMany({ where: { id: { in: eventIds } }, select: { id: true, name: true, thumbnail: true, startTime: true } }) : [],
      tourIds.length ? this.prisma.tours.findMany({ where: { id: { in: tourIds } }, select: { id: true, name: true, slug: true, thumbnail: true, startDate: true } }) : [],
    ]);
    const entityMap = new Map(entities.map((e: any) => [e.id, e] as [string, any]));
    const eventMap = new Map(events.map((e: any) => [e.id, e] as [string, any]));
    const tourMap = new Map(tours.map((t: any) => [t.id, t] as [string, any]));

    return {
      data: stores.map((s: any) => this.mapStoreToResponse(s, {
        entity: entityMap.get(s.entityId) ?? null,
        event: s.eventId ? eventMap.get(s.eventId) ?? null : null,
        tour: s.tourId ? tourMap.get(s.tourId) ?? null : null,
        collaborators: [],
      })),
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
    const store = await this.prisma.stores.findUnique({
      where: { id },
    });

    if (!store) {
      throw new NotFoundException("Store not found");
    }

    const [entity, event, tour, collabEntities] = await Promise.all([
      this.prisma.entities.findUnique({ where: { id: store.entityId }, select: { id: true, name: true, slug: true, thumbnail: true, type: true, isVerified: true, ownerId: true } }),
      store.eventId ? this.prisma.events.findUnique({ where: { id: store.eventId }, select: { id: true, name: true, thumbnail: true, startTime: true } }) : null,
      store.tourId ? this.prisma.tours.findUnique({ where: { id: store.tourId }, select: { id: true, name: true, slug: true, thumbnail: true, startDate: true } }) : null,
      (store.collaborators?.length ? this.prisma.entities.findMany({ where: { id: { in: store.collaborators } }, select: { id: true, name: true, slug: true, thumbnail: true } }) : []) as Promise<any[]>,
    ]);
    return this.mapStoreToResponse(store, { entity: entity ?? null, event: event ?? null, tour: tour ?? null, collaborators: collabEntities ?? [] });
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

    const stores = await this.prisma.stores.findMany({
      where: { entityId },
      orderBy: { createdAt: "desc" },
    });

    const entityIds = [...new Set(stores.map((s: any) => s.entityId))];
    const eventIds = [...new Set(stores.map((s: any) => s.eventId).filter(Boolean))];
    const tourIds = [...new Set(stores.map((s: any) => s.tourId).filter(Boolean))];
    const [entities, events, tours] = await Promise.all([
      entityIds.length ? this.prisma.entities.findMany({ where: { id: { in: entityIds } }, select: { id: true, name: true, slug: true, thumbnail: true, type: true, isVerified: true } }) : [],
      eventIds.length ? this.prisma.events.findMany({ where: { id: { in: eventIds } }, select: { id: true, name: true, thumbnail: true, startTime: true } }) : [],
      tourIds.length ? this.prisma.tours.findMany({ where: { id: { in: tourIds } }, select: { id: true, name: true, slug: true, thumbnail: true, startDate: true } }) : [],
    ]);
    const entityMap = new Map(entities.map((e: any) => [e.id, e] as [string, any]));
    const eventMap = new Map(events.map((e: any) => [e.id, e] as [string, any]));
    const tourMap = new Map(tours.map((t: any) => [t.id, t] as [string, any]));

    return stores.map((s: any) => this.mapStoreToResponse(s, {
      entity: entityMap.get(s.entityId) ?? null,
      event: s.eventId ? eventMap.get(s.eventId) ?? null : null,
      tour: s.tourId ? tourMap.get(s.tourId) ?? null : null,
      collaborators: [],
    }));
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
    const store = await this.prisma.stores.findUnique({
      where: { id },
    });

    if (!store) {
      throw new NotFoundException("Store not found");
    }

    const entity = await this.prisma.entities.findUnique({
      where: { id: store.entityId },
      select: { ownerId: true },
    });
    const ownerId = entity?.ownerId;

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

    // Check if user owns the entity or has roles on it (entities has no entity_roles relation; query separately)
    const entity = await this.prisma.entities.findUnique({
      where: { id: store.entityId },
    });

    if (!entity) {
      throw new NotFoundException("Entity not found");
    }

    if (entity.ownerId === userId) {
      return;
    }

    const entityRole = await this.prisma.entity_roles.findFirst({
      where: {
        entityId: store.entityId,
        userId,
        role: { in: [EntityRoleType.ADMIN, EntityRoleType.MANAGER] },
      },
    });

    if (entityRole) {
      return;
    }

    throw new ForbiddenException(
      "You do not have permission to manage this store",
    );
  }
}
