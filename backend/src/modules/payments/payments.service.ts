import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCheckoutDto, CreateRefundDto, PaymentQueryDto } from "./dto";
import { Order, OrderStatus, OrderType, PaymentMethod, UserRole } from "@prisma/client";
import Stripe from "stripe";

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>("STRIPE_SECRET_KEY");
    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2024-10-28.acacia",
      });
    }
  }

  async createCheckoutSession(
    createCheckoutDto: CreateCheckoutDto,
    userId: string,
  ): Promise<{ sessionId: string; url: string }> {
    if (!this.stripe) {
      throw new BadRequestException("Stripe is not configured");
    }

    const { type, eventId, storeId, items, successUrl, cancelUrl } = createCheckoutDto;

    // Validate items
    if (!items || items.length === 0) {
      throw new BadRequestException("At least one item is required");
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    if (totalAmount <= 0) {
      throw new BadRequestException("Total amount must be greater than 0");
    }

    // Validate event or store exists
    let entityId: string | undefined;
    if (type === OrderType.TICKET && eventId) {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        select: { entityId: true },
      });
      if (!event) {
        throw new NotFoundException("Event not found");
      }
      entityId = event.entityId;
    } else if (type === OrderType.PRODUCT && storeId) {
      const store = await this.prisma.store.findUnique({
        where: { id: storeId },
        select: { entityId: true },
      });
      if (!store) {
        throw new NotFoundException("Store not found");
      }
      entityId = store.entityId;
    }

    // Create order in database
    const order = await this.prisma.order.create({
      data: {
        userId,
        entityId,
        eventId,
        storeId,
        type,
        status: OrderStatus.PENDING,
        totalAmount: totalAmount,
        currency: "USD",
        items: {
          create: items.map((item) => ({
            ticketId: item.ticketId,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
            name: item.name,
            description: item.description,
          })),
        },
      },
    });

    // Create Stripe checkout session
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: items.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
            description: item.description || undefined,
          },
          unit_amount: Math.round(item.unitPrice * 100), // Convert to cents
        },
        quantity: item.quantity,
      })),
      mode: "payment",
      success_url: successUrl || `${this.configService.get<string>("FRONTEND_URL") || "http://localhost:5173"}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${this.configService.get<string>("FRONTEND_URL") || "http://localhost:5173"}/payments/cancel`,
      client_reference_id: order.id,
      metadata: {
        orderId: order.id,
        userId,
        type,
        eventId: eventId || "",
        storeId: storeId || "",
      },
    });

    // Update order with Stripe session ID
    await this.prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

    return {
      sessionId: session.id,
      url: session.url || "",
    };
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!this.stripe) {
      throw new BadRequestException("Stripe is not configured");
    }

    const webhookSecret = this.configService.get<string>("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new BadRequestException("Stripe webhook secret not configured");
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "payment_intent.succeeded":
        await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.payment_failed":
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case "charge.refunded":
        await this.handleRefund(event.data.object as Stripe.Charge);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const orderId = session.client_reference_id || session.metadata?.orderId;
    if (!orderId) {
      console.error("No order ID found in session");
      return;
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      console.error(`Order not found: ${orderId}`);
      return;
    }

    // Update order status
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.COMPLETED,
        stripePaymentIntentId: session.payment_intent as string,
      },
    });

    // Create payment record
    if (session.payment_intent) {
      await this.prisma.payment.create({
        data: {
          orderId,
          amount: order.totalAmount,
          currency: order.currency,
          status: "succeeded",
          paymentMethod: PaymentMethod.STRIPE,
          stripePaymentId: session.payment_intent as string,
          metadata: {
            sessionId: session.id,
            customerEmail: session.customer_email,
          },
        },
      });
    }

    // Create tickets if order type is TICKET
    if (order.type === OrderType.TICKET && order.eventId) {
      for (const item of order.items) {
        if (item.ticketId) {
          // Ticket already exists, link to order
          await this.prisma.ticket.update({
            where: { id: item.ticketId },
            data: { orderId },
          });
        } else {
          // Create new ticket
          for (let i = 0; i < item.quantity; i++) {
            await this.prisma.ticket.create({
              data: {
                userId: order.userId,
                eventId: order.eventId!,
                orderId,
              },
            });
          }
        }
      }
    }
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const orderId = paymentIntent.metadata?.orderId;
    if (!orderId) {
      return;
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.COMPLETED,
        stripePaymentIntentId: paymentIntent.id,
      },
    });

    // Update or create payment record
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (order) {
      await this.prisma.payment.upsert({
        where: { stripePaymentId: paymentIntent.id },
        update: {
          status: "succeeded",
          stripeChargeId: paymentIntent.latest_charge as string,
        },
        create: {
          orderId,
          amount: order.totalAmount,
          currency: order.currency,
          status: "succeeded",
          paymentMethod: PaymentMethod.STRIPE,
          stripePaymentId: paymentIntent.id,
          stripeChargeId: paymentIntent.latest_charge as string,
        },
      });
    }
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const orderId = paymentIntent.metadata?.orderId;
    if (!orderId) {
      return;
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.FAILED,
      },
    });

    await this.prisma.payment.create({
      data: {
        orderId,
        amount: paymentIntent.amount / 100, // Convert from cents
        currency: paymentIntent.currency,
        status: "failed",
        paymentMethod: PaymentMethod.STRIPE,
        stripePaymentId: paymentIntent.id,
        failureReason: paymentIntent.last_payment_error?.message || "Payment failed",
      },
    });
  }

  private async handleRefund(charge: Stripe.Charge): Promise<void> {
    // Find payment by charge ID
    const payment = await this.prisma.payment.findUnique({
      where: { stripeChargeId: charge.id },
      include: { order: true },
    });

    if (!payment) {
      return;
    }

    // Update payment status
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "refunded",
        refundId: charge.refunds?.data[0]?.id,
      },
    });

    // Update order status if fully refunded
    if (charge.amount_refunded === charge.amount) {
      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: {
          status: OrderStatus.REFUNDED,
        },
      });
    }
  }

  async createRefund(createRefundDto: CreateRefundDto, userId: string, userRole: UserRole): Promise<{ refundId: string; amount: number }> {
    if (!this.stripe) {
      throw new BadRequestException("Stripe is not configured");
    }

    const { orderId, amountPercent } = createRefundDto;

    // Find order
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    // Check permissions (owner or admin)
    if (userRole !== UserRole.ADMIN && order.userId !== userId) {
      throw new ForbiddenException("You can only refund your own orders");
    }

    if (order.status === OrderStatus.REFUNDED) {
      throw new BadRequestException("Order is already refunded");
    }

    // Find payment
    const payment = order.payments.find((p) => p.status === "succeeded" && p.stripeChargeId);
    if (!payment || !payment.stripeChargeId) {
      throw new BadRequestException("No valid payment found for refund");
    }

    // Calculate refund amount
    const refundAmount = amountPercent
      ? (Number(order.totalAmount) * amountPercent) / 100
      : Number(order.totalAmount);

    // Create refund in Stripe
    const refund = await this.stripe.refunds.create({
      charge: payment.stripeChargeId,
      amount: Math.round(refundAmount * 100), // Convert to cents
      reason: "requested_by_customer",
    });

    // Update payment
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "refunded",
        refundId: refund.id,
      },
    });

    // Update order status if fully refunded
    if (refundAmount >= Number(order.totalAmount)) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.REFUNDED,
        },
      });
    } else {
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.PROCESSING, // Partial refund
        },
      });
    }

    return {
      refundId: refund.id,
      amount: refundAmount,
    };
  }

  async getOrders(query: PaymentQueryDto, userId: string, userRole: UserRole) {
    const { userId: queryUserId, entityId, eventId, status, type, page = 1, limit = 20 } = query;

    const where: {
      userId?: string;
      entityId?: string;
      eventId?: string;
      status?: OrderStatus;
      type?: OrderType;
    } = {};

    // Permission check: users can only see their own orders unless admin
    if (userRole !== UserRole.ADMIN) {
      where.userId = userId;
    } else if (queryUserId) {
      where.userId = queryUserId;
    }

    if (entityId) where.entityId = entityId;
    if (eventId) where.eventId = eventId;
    if (status) where.status = status;
    if (type) where.type = type;

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              ticket: {
                select: {
                  id: true,
                  eventId: true,
                },
              },
              product: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                },
              },
            },
          },
          payments: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          event: {
            select: {
              id: true,
              name: true,
              thumbnail: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrder(orderId: string, userId: string, userRole: UserRole) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            ticket: {
              include: {
                event: {
                  select: {
                    id: true,
                    name: true,
                    thumbnail: true,
                    startTime: true,
                  },
                },
              },
            },
            product: {
              include: {
                store: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
        },
        event: {
          select: {
            id: true,
            name: true,
            thumbnail: true,
            startTime: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                username: true,
                firstName: true,
                lastName: true,
              },
            },
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

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    // Check permissions
    if (userRole !== UserRole.ADMIN && order.userId !== userId) {
      throw new ForbiddenException("You can only view your own orders");
    }

    return order;
  }
}

