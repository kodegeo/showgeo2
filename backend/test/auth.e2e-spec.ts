import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { UserRole } from "@prisma/client";

describe("Auth (e2e)", () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        user: {
          findUnique: jest.fn(),
          create: jest.fn(),
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix("api");
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("/auth/register (POST)", () => {
    it("should register a new user", () => {
      return request(app.getHttpServer())
        .post("/api/auth/register")
        .send({
          email: "test@example.com",
          password: "password123",
          role: UserRole.USER,
          firstName: "Test",
          lastName: "User",
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty("accessToken");
          expect(res.body).toHaveProperty("refreshToken");
          expect(res.body).toHaveProperty("user");
        });
    });

    it("should fail with invalid email", () => {
      return request(app.getHttpServer())
        .post("/api/auth/register")
        .send({
          email: "invalid-email",
          password: "password123",
        })
        .expect(400);
    });

    it("should fail with short password", () => {
      return request(app.getHttpServer())
        .post("/api/auth/register")
        .send({
          email: "test@example.com",
          password: "short",
        })
        .expect(400);
    });
  });

  describe("/auth/login (POST)", () => {
    it("should login with valid credentials", () => {
      return request(app.getHttpServer())
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "password123",
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("accessToken");
          expect(res.body).toHaveProperty("refreshToken");
        });
    });

    it("should fail with invalid credentials", () => {
      return request(app.getHttpServer())
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "wrongpassword",
        })
        .expect(401);
    });
  });

  describe("/auth/refresh (POST)", () => {
    it("should refresh tokens with valid refresh token", () => {
      return request(app.getHttpServer())
        .post("/api/auth/refresh")
        .send({
          refreshToken: "valid-refresh-token",
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("accessToken");
          expect(res.body).toHaveProperty("refreshToken");
        });
    });

    it("should fail with invalid refresh token", () => {
      return request(app.getHttpServer())
        .post("/api/auth/refresh")
        .send({
          refreshToken: "invalid-token",
        })
        .expect(401);
    });
  });
});

