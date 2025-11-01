import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ForbiddenException, ConflictException } from "@nestjs/common";
import { StoreService } from "./store.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateStoreDto, UpdateStoreDto, CreateProductDto } from "./dto";
import { StoreStatus, StoreVisibility, UserRole, EntityRoleType } from "@prisma/client";
import { TestUtils } from "../../../test/test-utils";

describe("StoreService", () => {
  let service: StoreService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await TestUtils.createTestingModule({
      imports: [],
      providers: [
        StoreService,
        {
          provide: PrismaService,
          useValue: TestUtils.createMockPrismaService(),
        },
      ],
    });

    service = module.get<StoreService>(StoreService);
    prismaService = module.get<PrismaService>(PrismaService);

    (prismaService as any).reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createStore", () => {
    it("should successfully create a store", async () => {
      const entityId = "entity-123";
      const createDto: CreateStoreDto = {
        name: "Test Store",
        slug: "test-store",
        description: "Test description",
        status: StoreStatus.ACTIVE,
        visibility: StoreVisibility.PUBLIC,
      };

      const entity = await TestUtils.createTestEntity({ id: entityId });
      (prismaService.entity.findUnique as jest.Mock).mockResolvedValue(entity);
      (prismaService.store.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.store.create as jest.Mock).mockResolvedValue({
        id: "store-123",
        entityId,
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createStore(createDto, entityId);

      expect(result).toHaveProperty("name", createDto.name);
      expect(result).toHaveProperty("entityId", entityId);
      expect(prismaService.store.create).toHaveBeenCalled();
    });

    it("should throw NotFoundException if entity not found", async () => {
      (prismaService.entity.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.createStore({} as CreateStoreDto, "invalid-entity")).rejects.toThrow(NotFoundException);
    });

    it("should throw ConflictException if slug already exists", async () => {
      const entityId = "entity-123";
      const createDto: CreateStoreDto = {
        name: "Test Store",
        slug: "existing-store",
      };

      const entity = await TestUtils.createTestEntity({ id: entityId });
      (prismaService.entity.findUnique as jest.Mock).mockResolvedValue(entity);
      (prismaService.store.findUnique as jest.Mock).mockResolvedValue({
        id: "existing-store-id",
        slug: "existing-store",
      });

      await expect(service.createStore(createDto, entityId)).rejects.toThrow(ConflictException);
    });
  });

  describe("addProduct", () => {
    it("should successfully add product to store", async () => {
      const storeId = "store-123";
      const createDto: CreateProductDto = {
        name: "Test Product",
        description: "Test description",
        price: 99.99,
        currency: "USD",
        isDigital: false,
        isAvailable: true,
      };

      const store = {
        id: storeId,
        entityId: "entity-123",
        status: StoreStatus.ACTIVE,
      };

      (prismaService.store.findUnique as jest.Mock).mockResolvedValue(store);
      (prismaService.product.create as jest.Mock).mockResolvedValue({
        id: "product-123",
        storeId,
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.addProduct(storeId, createDto, "user-123", UserRole.USER);

      expect(result).toHaveProperty("name", createDto.name);
      expect(result).toHaveProperty("storeId", storeId);
      expect(prismaService.product.create).toHaveBeenCalled();
    });

    it("should throw NotFoundException if store not found", async () => {
      (prismaService.store.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.addProduct("invalid-store", {} as CreateProductDto, "user-123", UserRole.USER)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findAll", () => {
    it("should return paginated list of stores", async () => {
      const stores = [
        {
          id: "store-1",
          name: "Store 1",
          status: StoreStatus.ACTIVE,
          visibility: StoreVisibility.PUBLIC,
          createdAt: new Date(),
        },
        {
          id: "store-2",
          name: "Store 2",
          status: StoreStatus.ACTIVE,
          visibility: StoreVisibility.PUBLIC,
          createdAt: new Date(),
        },
      ];

      (prismaService.store.findMany as jest.Mock).mockResolvedValue(stores);
      (prismaService.store.count as jest.Mock).mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });
  });

  describe("findOne", () => {
    it("should return store by id", async () => {
      const storeId = "store-123";
      const store = {
        id: storeId,
        name: "Test Store",
        products: [],
        createdAt: new Date(),
      };

      (prismaService.store.findUnique as jest.Mock).mockResolvedValue(store);

      const result = await service.findOne(storeId);

      expect(result).toHaveProperty("id", storeId);
      expect(prismaService.store.findUnique).toHaveBeenCalled();
    });

    it("should throw NotFoundException if store not found", async () => {
      (prismaService.store.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne("invalid-id")).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateStore", () => {
    it("should successfully update store", async () => {
      const storeId = "store-123";
      const updateDto: UpdateStoreDto = {
        name: "Updated Store Name",
        description: "Updated description",
      };

      const existingStore = {
        id: storeId,
        entityId: "entity-123",
        name: "Original Name",
        createdAt: new Date(),
      };

      (prismaService.store.findUnique as jest.Mock).mockResolvedValue(existingStore);
      (prismaService.store.update as jest.Mock).mockResolvedValue({
        ...existingStore,
        ...updateDto,
        updatedAt: new Date(),
      });

      const result = await service.updateStore(storeId, updateDto, "user-123", UserRole.USER);

      expect(result).toHaveProperty("name", updateDto.name);
      expect(prismaService.store.update).toHaveBeenCalled();
    });

    it("should throw NotFoundException if store not found", async () => {
      (prismaService.store.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.updateStore("invalid-id", {}, "user-123", UserRole.USER)).rejects.toThrow(NotFoundException);
    });
  });

  describe("removeStore", () => {
    it("should successfully delete store", async () => {
      const storeId = "store-123";
      const store = {
        id: storeId,
        name: "Test Store",
        createdAt: new Date(),
      };

      (prismaService.store.findUnique as jest.Mock).mockResolvedValue(store);
      (prismaService.store.delete as jest.Mock).mockResolvedValue(store);

      await service.removeStore(storeId, "user-123", UserRole.USER);

      expect(prismaService.store.delete).toHaveBeenCalledWith({ where: { id: storeId } });
    });

    it("should throw NotFoundException if store not found", async () => {
      (prismaService.store.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.removeStore("invalid-id", "user-123", UserRole.USER)).rejects.toThrow(NotFoundException);
    });
  });
});

