import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  Req,
  Headers,
  ForbiddenException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiExcludeEndpoint } from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";
import { CreateCheckoutDto, CreateRefundDto, PaymentQueryDto } from "./dto";
import { RolesGuard } from "../../common/guards";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { Roles, CurrentUser, Public } from "../../common/decorators";

type User = any;

@ApiTags("payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("checkout")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create Stripe checkout session" })
  @ApiResponse({ status: 201, description: "Checkout session created successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Event or Store not found" })
  async createCheckout(@Body() createCheckoutDto: CreateCheckoutDto, @CurrentUser() user: User) {
    return this.paymentsService.createCheckoutSession(createCheckoutDto, user.id);
  }

  @Post("webhook")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint() // Exclude from Swagger docs (Stripe webhook)
  @ApiOperation({ summary: "Stripe webhook handler (public)" })
  @ApiResponse({ status: 200, description: "Webhook processed successfully" })
  @ApiResponse({ status: 400, description: "Webhook signature verification failed" })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string,
  ) {
    if (!signature) {
      throw new ForbiddenException("Missing Stripe signature");
    }

    const payload = req.rawBody;
    if (!payload) {
      throw new ForbiddenException("Missing request body");
    }

    await this.paymentsService.handleWebhook(payload, signature);
    return { received: true };
  }

  @Get("orders")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get orders for current user (paginated)" })
  @ApiQuery({ name: "userId", required: false, type: String })
  @ApiQuery({ name: "entityId", required: false, type: String })
  @ApiQuery({ name: "eventId", required: false, type: String })
  @ApiQuery({ name: "status", required: false, enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED", "REFUNDED"] })
  @ApiQuery({ name: "type", required: false, enum: ["TICKET", "PRODUCT", "SUBSCRIPTION"] })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "List of orders with pagination metadata" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  getOrders(@Query() query: PaymentQueryDto, @CurrentUser() user: User) {
    return this.paymentsService.getOrders(query, user.id, user.role);
  }

  @Get("orders/:id")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get order details (self/Admin)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Order details" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Only self or Admin" })
  @ApiResponse({ status: 404, description: "Order not found" })
  getOrder(@Param("id") id: string, @CurrentUser() user: User) {
    return this.paymentsService.getOrder(id, user.id, user.role);
  }

  @Post("refund")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create refund for order (self/Admin)" })
  @ApiResponse({ status: 200, description: "Refund created successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Only self or Admin" })
  @ApiResponse({ status: 404, description: "Order not found" })
  async createRefund(@Body() createRefundDto: CreateRefundDto, @CurrentUser() user: User) {
    return this.paymentsService.createRefund(createRefundDto, user.id, user.role);
  }
}

