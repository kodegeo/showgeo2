import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { PrismaService } from "../src/prisma/prisma.service";
import { ConfigModule } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import type { app_users as User, entities as Entity, events as Event, stores as Store, products as Product, follows as Follow } from "@prisma/client";
import { UserRole } from "@prisma/client";

export class TestUtils {
  static async createTestingModule(moduleMetadata: any): Promise<TestingModule> {
    return Test.createTestingModule({
      ...moduleMetadata,
      imports: [
        ...(moduleMetadata.imports || []),
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ".env.test",
        }),
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(this.createMockPrismaService())
      .compile();
  }

  static async createTestApp(module: any): Promise<INestApplication> {
    const moduleFixture = await Test.createTestingModule({
      imports: [module],
    })
      .overrideProvider(PrismaService)
      .useValue(this.createMockPrismaService())
      .compile();

    const app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix("api");
    return app;
  }

  static createMockPrismaService() {
    const mockData = {
      users: [] as User[],
      entities: [] as Entity[],
      events: [] as Event[],
      stores: [] as Store[],
      products: [] as Product[],
      follows: [] as Follow[],
    };

    return {
      user: {
        findUnique: jest.fn(({ where }) => {
          return Promise.resolve(mockData.users.find((u) => u.id === where.id || u.email === where.email) || null);
        }),
        findFirst: jest.fn(({ where }) => {
          return Promise.resolve(mockData.users.find((u) => u.id === where.id || u.email === where.email) || null);
        }),
        findMany: jest.fn(() => Promise.resolve(mockData.users)),
        create: jest.fn(({ data }) => {
          const user = { id: `user-${Date.now()}`, ...data, createdAt: new Date(), updatedAt: new Date() };
          mockData.users.push(user);
          return Promise.resolve(user);
        }),
        update: jest.fn(({ where, data }) => {
          const index = mockData.users.findIndex((u) => u.id === where.id);
          if (index >= 0) {
            mockData.users[index] = { ...mockData.users[index], ...data, updatedAt: new Date() };
            return Promise.resolve(mockData.users[index]);
          }
          return Promise.resolve(null);
        }),
        delete: jest.fn(({ where }) => {
          const index = mockData.users.findIndex((u) => u.id === where.id);
          if (index >= 0) {
            mockData.users.splice(index, 1);
            return Promise.resolve(mockData.users[index]);
          }
          return Promise.resolve(null);
        }),
        count: jest.fn(() => Promise.resolve(mockData.users.length)),
      },
      entity: {
        findUnique: jest.fn(({ where }) => {
          return Promise.resolve(mockData.entities.find((e) => e.id === where.id || e.slug === where.slug) || null);
        }),
        findFirst: jest.fn(({ where }) => {
          return Promise.resolve(mockData.entities.find((e) => e.id === where.id || e.slug === where.slug) || null);
        }),
        findMany: jest.fn(() => Promise.resolve(mockData.entities)),
        create: jest.fn(({ data }) => {
          const entity = { id: `entity-${Date.now()}`, ...data, createdAt: new Date(), updatedAt: new Date() };
          mockData.entities.push(entity);
          return Promise.resolve(entity);
        }),
        update: jest.fn(({ where, data }) => {
          const index = mockData.entities.findIndex((e) => e.id === where.id);
          if (index >= 0) {
            mockData.entities[index] = { ...mockData.entities[index], ...data, updatedAt: new Date() };
            return Promise.resolve(mockData.entities[index]);
          }
          return Promise.resolve(null);
        }),
        delete: jest.fn(({ where }) => {
          const index = mockData.entities.findIndex((e) => e.id === where.id);
          if (index >= 0) {
            mockData.entities.splice(index, 1);
            return Promise.resolve(mockData.entities[index]);
          }
          return Promise.resolve(null);
        }),
        count: jest.fn(() => Promise.resolve(mockData.entities.length)),
      },
      event: {
        findUnique: jest.fn(({ where }) => {
          return Promise.resolve(mockData.events.find((e) => e.id === where.id) || null);
        }),
        findFirst: jest.fn(({ where }) => {
          return Promise.resolve(mockData.events.find((e) => e.id === where.id) || null);
        }),
        findMany: jest.fn(() => Promise.resolve(mockData.events)),
        create: jest.fn(({ data }) => {
          const event = { id: `event-${Date.now()}`, ...data, createdAt: new Date(), updatedAt: new Date() };
          mockData.events.push(event);
          return Promise.resolve(event);
        }),
        update: jest.fn(({ where, data }) => {
          const index = mockData.events.findIndex((e) => e.id === where.id);
          if (index >= 0) {
            mockData.events[index] = { ...mockData.events[index], ...data, updatedAt: new Date() };
            return Promise.resolve(mockData.events[index]);
          }
          return Promise.resolve(null);
        }),
        delete: jest.fn(({ where }) => {
          const index = mockData.events.findIndex((e) => e.id === where.id);
          if (index >= 0) {
            mockData.events.splice(index, 1);
            return Promise.resolve(mockData.events[index]);
          }
          return Promise.resolve(null);
        }),
        count: jest.fn(() => Promise.resolve(mockData.events.length)),
      },
      follow: {
        findUnique: jest.fn(({ where }) => {
          return Promise.resolve(
            mockData.follows.find(
              (f) =>
                (f.userId === where.userId_entityId?.userId && f.entityId === where.userId_entityId?.entityId) ||
                f.id === where.id,
            ) || null,
          );
        }),
        findMany: jest.fn(({ where }) => {
          if (where.entityId) {
            return Promise.resolve(mockData.follows.filter((f) => f.entityId === where.entityId));
          }
          if (where.userId) {
            return Promise.resolve(mockData.follows.filter((f) => f.userId === where.userId));
          }
          return Promise.resolve(mockData.follows);
        }),
        create: jest.fn(({ data }) => {
          const follow = { id: `follow-${Date.now()}`, ...data, createdAt: new Date() };
          mockData.follows.push(follow);
          return Promise.resolve(follow);
        }),
        delete: jest.fn(({ where }) => {
          const index = mockData.follows.findIndex(
            (f) => f.userId === where.userId_entityId?.userId && f.entityId === where.userId_entityId?.entityId,
          );
          if (index >= 0) {
            mockData.follows.splice(index, 1);
            return Promise.resolve(mockData.follows[index]);
          }
          return Promise.resolve(null);
        }),
        count: jest.fn(({ where }) => {
          if (where.entityId) {
            return Promise.resolve(mockData.follows.filter((f) => f.entityId === where.entityId).length);
          }
          if (where.userId) {
            return Promise.resolve(mockData.follows.filter((f) => f.userId === where.userId).length);
          }
          return Promise.resolve(mockData.follows.length);
        }),
      },
      store: {
        findUnique: jest.fn(({ where }) => {
          return Promise.resolve(mockData.stores.find((s) => s.id === where.id || s.slug === where.slug) || null);
        }),
        findMany: jest.fn(() => Promise.resolve(mockData.stores)),
        create: jest.fn(({ data }) => {
          const store = { id: `store-${Date.now()}`, ...data, createdAt: new Date(), updatedAt: new Date() };
          mockData.stores.push(store);
          return Promise.resolve(store);
        }),
        update: jest.fn(({ where, data }) => {
          const index = mockData.stores.findIndex((s) => s.id === where.id);
          if (index >= 0) {
            mockData.stores[index] = { ...mockData.stores[index], ...data, updatedAt: new Date() };
            return Promise.resolve(mockData.stores[index]);
          }
          return Promise.resolve(null);
        }),
        delete: jest.fn(({ where }) => {
          const index = mockData.stores.findIndex((s) => s.id === where.id);
          if (index >= 0) {
            mockData.stores.splice(index, 1);
            return Promise.resolve(mockData.stores[index]);
          }
          return Promise.resolve(null);
        }),
        count: jest.fn(() => Promise.resolve(mockData.stores.length)),
      },
      product: {
        findUnique: jest.fn(({ where }) => {
          return Promise.resolve(mockData.products.find((p) => p.id === where.id) || null);
        }),
        findMany: jest.fn(() => Promise.resolve(mockData.products)),
        create: jest.fn(({ data }) => {
          const product = { id: `product-${Date.now()}`, ...data, createdAt: new Date(), updatedAt: new Date() };
          mockData.products.push(product);
          return Promise.resolve(product);
        }),
        update: jest.fn(({ where, data }) => {
          const index = mockData.products.findIndex((p) => p.id === where.id);
          if (index >= 0) {
            mockData.products[index] = { ...mockData.products[index], ...data, updatedAt: new Date() };
            return Promise.resolve(mockData.products[index]);
          }
          return Promise.resolve(null);
        }),
        delete: jest.fn(({ where }) => {
          const index = mockData.products.findIndex((p) => p.id === where.id);
          if (index >= 0) {
            mockData.products.splice(index, 1);
            return Promise.resolve(mockData.products[index]);
          }
          return Promise.resolve(null);
        }),
        count: jest.fn(() => Promise.resolve(mockData.products.length)),
        aggregate: jest.fn(() => Promise.resolve({ _sum: { price: 0 }, _avg: { price: 0 } })),
      },
      ticket: {
        findUnique: jest.fn(() => Promise.resolve(null)),
        findFirst: jest.fn(() => Promise.resolve(null)),
        findMany: jest.fn(() => Promise.resolve([])),
        create: jest.fn(({ data }) => {
          return Promise.resolve({
            id: `ticket-${Date.now()}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }),
        count: jest.fn(() => Promise.resolve(0)),
      },
      notification: {
        findUnique: jest.fn(() => Promise.resolve(null)),
        findMany: jest.fn(() => Promise.resolve([])),
        create: jest.fn(({ data }) => {
          return Promise.resolve({
            id: `notification-${Date.now()}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }),
        update: jest.fn(({ where, data }) => {
          return Promise.resolve({
            id: where.id,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }),
        updateMany: jest.fn(() => Promise.resolve({ count: 0 })),
        deleteMany: jest.fn(() => Promise.resolve({ count: 0 })),
        count: jest.fn(() => Promise.resolve(0)),
        groupBy: jest.fn(() => Promise.resolve([])),
      },
      streamingSession: {
        findUnique: jest.fn(() => Promise.resolve(null)),
        findFirst: jest.fn(() => Promise.resolve(null)),
        findMany: jest.fn(() => Promise.resolve([])),
        create: jest.fn(({ data }) => {
          return Promise.resolve({
            id: `session-${Date.now()}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }),
        update: jest.fn(({ where, data }) => {
          return Promise.resolve({
            id: where.id,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }),
        count: jest.fn(() => Promise.resolve(0)),
        aggregate: jest.fn(() => Promise.resolve({ _avg: { viewers: 0 } })),
      },
      order: {
        findUnique: jest.fn(() => Promise.resolve(null)),
        findMany: jest.fn(() => Promise.resolve([])),
        create: jest.fn(({ data }) => {
          return Promise.resolve({
            id: `order-${Date.now()}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }),
        update: jest.fn(({ where, data }) => {
          return Promise.resolve({
            id: where.id,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }),
        count: jest.fn(() => Promise.resolve(0)),
      },
      payment: {
        findUnique: jest.fn(() => Promise.resolve(null)),
        create: jest.fn(({ data }) => {
          return Promise.resolve({
            id: `payment-${Date.now()}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }),
        update: jest.fn(({ where, data }) => {
          return Promise.resolve({
            id: where.id,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }),
        upsert: jest.fn(({ where, update, create }) => {
          return Promise.resolve({ id: where.stripePaymentId || `payment-${Date.now()}`, ...create, ...update });
        }),
      },
      analyticsSummary: {
        findUnique: jest.fn(() => Promise.resolve(null)),
        findMany: jest.fn(() => Promise.resolve([])),
        upsert: jest.fn(({ where, update, create }) => {
          return Promise.resolve({ id: `summary-${Date.now()}`, ...create, ...update });
        }),
      },
      entityRole: {
        findUnique: jest.fn(() => Promise.resolve(null)),
        findMany: jest.fn(() => Promise.resolve([])),
        create: jest.fn(({ data }) => {
          return Promise.resolve({
            id: `role-${Date.now()}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }),
      },
      userProfile: {
        findUnique: jest.fn(() => Promise.resolve(null)),
        findFirst: jest.fn(() => Promise.resolve(null)),
        create: jest.fn(({ data }) => {
          return Promise.resolve({
            id: `profile-${Date.now()}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }),
        update: jest.fn(({ where, data }) => {
          return Promise.resolve({
            id: where.id || where.userId,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }),
      },
      geofencing: {
        findUnique: jest.fn(() => Promise.resolve(null)),
      },
      chatRoom: {
        findMany: jest.fn(() => Promise.resolve([])),
      },
      tour: {
        findUnique: jest.fn(() => Promise.resolve(null)),
        findMany: jest.fn(() => Promise.resolve([])),
      },
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $transaction: jest.fn((callback) => callback(this)),
      reset: () => {
        mockData.users = [];
        mockData.entities = [];
        mockData.events = [];
        mockData.stores = [];
        mockData.products = [];
        mockData.follows = [];
      },
    };
  }

  static async createTestUser(overrides: Partial<User> = {}): Promise<User> {
    const hashedPassword = await bcrypt.hash("password123", 10);
    return {
      id: `user-${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
      password: hashedPassword,
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as User;
  }

  static async createTestEntity(overrides: Partial<Entity> = {}): Promise<Entity> {
    return {
      id: `entity-${Date.now()}`,
      ownerId: `user-${Date.now()}`,
      name: `Test Entity ${Date.now()}`,
      slug: `test-entity-${Date.now()}`,
      type: "ARTIST",
      isPublic: true,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as Entity;
  }
}

