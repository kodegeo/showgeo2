import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PaymentsService } from "./payments.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCheckoutDto, CreateRefundDto } from "./dto";
import { OrderType, OrderStatus, PaymentMethod, UserRole } from "@prisma/client";
import Stripe from "stripe";
import { TestUtils } from "../../../test/test-utils";

// Mock Stripe
jest.mock("stripe");

describe("PaymentsService", () => {
  let service: PaymentsService;
  let prismaService: PrismaService;
  let configService: ConfigService;
  let mockStripe: jest.Mocked<Stripe>;

  beforeEach(async () => {
    // Create mock Stripe instance
    mockStripe = {
      checkout: {
        sessions: {
          create: jest.fn(),
        },
      },
      webhooks: {
        constructEvent: jest.fn(),
      },
      paymentIntents: {
        retrieve: jest.fn(),
      },
      refunds: {
        create: jest.fn(),
      },
    } as any;

    (Stripe as unknown as jest.Mock).mockImplementation(() => mockStripe);

    const module: TestingModule = await TestUtils.createTestingModule({
      imports: [],
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: TestUtils.createMockPrismaService(),
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "STRIPE_SECRET_KEY") return "sk_test_mock";
              if (key === "STRIPE_WEBHOOK_SECRET") return "whsec_mock";
              if (key === "FRONTEND_URL") return "http://localhost:5173";
              return undefined;
            }),
          },
        },
      ],
    });

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);

    (prismaService as any).reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createCheckoutSession", () => {
    it("should successfully create Stripe checkout session", async () => {
      const userId = "user-123";
      const createDto: CreateCheckoutDto = {
        type: OrderType.TICKET,
        eventId: "event-123",
        items: [
          {
            name: "VIP Ticket",
            unitPrice: 99.99,
            quantity: 2,
          },
        ],
      };

      const event = {
        id: "event-123",
        entityId: "entity-123",
      };

      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(event);
      (prismaService.orders.create as jest.Mock).mockResolvedValue({
        id: "order-123",
        userId,
        ...createDto,
        status: OrderStatus.PENDING,
        totalAmount: 199.98,
        createdAt: new Date(),
      });

      (mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
        id: "session-123",
        url: "https://checkout.stripe.com/test",
      });

      const result = await service.createCheckoutSession(createDto, userId);

      expect(result).toHaveProperty("sessionId");
      expect(result).toHaveProperty("url");
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalled();
      expect(prismaService.orders.create).toHaveBeenCalled();
    });

    it("should throw BadRequestException if no items provided", async () => {
      const createDto: CreateCheckoutDto = {
        type: OrderType.TICKET,
        items: [],
      };

      await expect(service.createCheckoutSession(createDto, "user-123")).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException if event not found", async () => {
      const createDto: CreateCheckoutDto = {
        type: OrderType.TICKET,
        eventId: "invalid-event",
        items: [
          {
            name: "Ticket",
            unitPrice: 50,
            quantity: 1,
          },
        ],
      };

      (prismaService.events.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.createCheckoutSession(createDto, "user-123")).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException if Stripe not configured", async () => {
      // Create service without Stripe
      const serviceWithoutStripe = new PaymentsService(prismaService, {
        get: () => undefined,
      } as unknown as ConfigService);

      const createDto: CreateCheckoutDto = {
        type: OrderType.TICKET,
        items: [
          {
            name: "Ticket",
            unitPrice: 50,
            quantity: 1,
          },
        ],
      };

      await expect(serviceWithoutStripe.createCheckoutSession(createDto, "user-123")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("createRefund", () => {
    it("should successfully create refund", async () => {
      const userId = "user-123";
      const createRefundDto: CreateRefundDto = {
        orderId: "order-123",
      };

      const order = {
        id: "order-123",
        userId,
        totalAmount: 100,
        status: OrderStatus.COMPLETED,
        payments: [
          {
            id: "payment-123",
            status: "succeeded",
            stripeChargeId: "ch_test",
          },
        ],
      };

      (prismaService.orders.findUnique as jest.Mock).mockResolvedValue(order);

      (mockStripe.refunds.create as jest.Mock).mockResolvedValue({
        id: "refund-123",
        amount: 10000,
      });

      const result = await service.createRefund(createRefundDto, userId, UserRole.USER);

      expect(result).toHaveProperty("refundId");
      expect(result).toHaveProperty("amount");
      expect(mockStripe.refunds.create).toHaveBeenCalled();
    });

    it("should throw NotFoundException if order not found", async () => {
      const createRefundDto: CreateRefundDto = {
        orderId: "invalid-order",
      };

      (prismaService.orders.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.createRefund(createRefundDto, "user-123", UserRole.USER)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException if user doesn't own order", async () => {
      const createRefundDto: CreateRefundDto = {
        orderId: "order-123",
      };

      const order = {
        id: "order-123",
        userId: "other-user",
        totalAmount: 100,
        status: OrderStatus.COMPLETED,
        payments: [],
      };

      (prismaService.orders.findUnique as jest.Mock).mockResolvedValue(order);

      await expect(service.createRefund(createRefundDto, "user-123", UserRole.USER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should allow admin to refund any order", async () => {
      const createRefundDto: CreateRefundDto = {
        orderId: "order-123",
      };

      const order = {
        id: "order-123",
        userId: "other-user",
        totalAmount: 100,
        status: OrderStatus.COMPLETED,
        payments: [
          {
            id: "payment-123",
            status: "succeeded",
            stripeChargeId: "ch_test",
          },
        ],
      };

      (prismaService.orders.findUnique as jest.Mock).mockResolvedValue(order);

      (mockStripe.refunds.create as jest.Mock).mockResolvedValue({
        id: "refund-123",
        amount: 10000,
      });

      const result = await service.createRefund(createRefundDto, "admin-123", UserRole.ADMIN);

      expect(result).toHaveProperty("refundId");
      expect(mockStripe.refunds.create).toHaveBeenCalled();
    });
  });

  describe("getOrders", () => {
    it("should return paginated orders for user", async () => {
      const userId = "user-123";
      const orders = [
        {
          id: "order-1",
          userId,
          status: OrderStatus.COMPLETED,
          createdAt: new Date(),
        },
        {
          id: "order-2",
          userId,
          status: OrderStatus.PENDING,
          createdAt: new Date(),
        },
      ];

      (prismaService.orders.findMany as jest.Mock).mockResolvedValue(orders);
      (prismaService.orders.count as jest.Mock).mockResolvedValue(2);

      const result = await service.getOrders({}, userId, UserRole.USER);

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it("should allow admin to see all orders", async () => {
      const orders = [
        {
          id: "order-1",
          userId: "user-1",
          status: OrderStatus.COMPLETED,
          createdAt: new Date(),
        },
        {
          id: "order-2",
          userId: "user-2",
          status: OrderStatus.PENDING,
          createdAt: new Date(),
        },
      ];

      (prismaService.orders.findMany as jest.Mock).mockResolvedValue(orders);
      (prismaService.orders.count as jest.Mock).mockResolvedValue(2);

      const result = await service.getOrders({ userId: "user-1" }, "admin-123", UserRole.ADMIN);

      expect(result.data).toHaveLength(2);
    });
  });

  describe("getOrder", () => {
    it("should return order details", async () => {
      const orderId = "order-123";
      const userId = "user-123";
      const order = {
        id: orderId,
        userId,
        status: OrderStatus.COMPLETED,
        items: [],
        payments: [],
        createdAt: new Date(),
      };

      (prismaService.orders.findUnique as jest.Mock).mockResolvedValue(order);

      const result = await service.getOrder(orderId, userId, UserRole.USER);

      expect(result).toHaveProperty("id", orderId);
      expect(prismaService.orders.findUnique).toHaveBeenCalled();
    });

    it("should throw NotFoundException if order not found", async () => {
      (prismaService.orders.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getOrder("invalid-id", "user-123", UserRole.USER)).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException if user doesn't own order", async () => {
      const order = {
        id: "order-123",
        userId: "other-user",
        status: OrderStatus.COMPLETED,
      };

      (prismaService.orders.findUnique as jest.Mock).mockResolvedValue(order);

      await expect(service.getOrder("order-123", "user-123", UserRole.USER)).rejects.toThrow(ForbiddenException);
    });
  });

  describe("handleWebhook", () => {
    it("should process checkout.session.completed event", async () => {
      const payload = Buffer.from("test");
      const signature = "test-signature";

      const mockEvent = {
        type: "checkout.session.completed",
        data: {
          object: {
            id: "session-123",
            client_reference_id: "order-123",
            payment_intent: "pi_test",
            customer_email: "test@example.com",
          },
        },
      };

      (mockStripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

      const order = {
        id: "order-123",
        totalAmount: 100,
        currency: "USD",
        type: OrderType.TICKET,
        eventId: "event-123",
        items: [
          {
            id: "item-1",
            quantity: 1,
            ticketId: null,
          },
        ],
      };

      (prismaService.orders.findUnique as jest.Mock).mockResolvedValue(order);
      (prismaService.orders.update as jest.Mock).mockResolvedValue({ ...order, status: OrderStatus.COMPLETED });
      (prismaService.payments.create as jest.Mock).mockResolvedValue({
        id: "payment-123",
        orderId: "order-123",
      });

      await service.handleWebhook(payload, signature);

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalled();
      expect(prismaService.orders.update).toHaveBeenCalled();
    });

    it("should throw BadRequestException if webhook secret not configured", async () => {
      const serviceWithoutSecret = new PaymentsService(prismaService, {
        get: (key: string) => {
          if (key === "STRIPE_SECRET_KEY") return "sk_test";
          return undefined;
        },
      } as ConfigService);

      const payload = Buffer.from("test");
      const signature = "test-signature";

      await expect(serviceWithoutSecret.handleWebhook(payload, signature)).rejects.toThrow(BadRequestException);
    });
  });
});

