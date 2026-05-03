export interface CreateCheckoutRequest {
  eventId: string;
  quantity: number;
  /** Line item name (e.g. event name or ticket type name) */
  name?: string;
  /** Price per unit in major currency (e.g. 29.99) */
  unitPrice?: number;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CreateRefundRequest {
  orderId: string;
  /** Percentage to refund (0-100); omit for full refund */
  amountPercent?: number;
  reason?: string;
}

export interface GetOrdersParams {
  userId?: string;
  entityId?: string;
  eventId?: string;
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export interface OrdersResponse {
  data: Order[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface Order {
  id: string;
  userId?: string;
  eventId?: string;
  status: string;
  type: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt?: string;
  items?: OrderItem[];
  event?: { id: string; name: string; thumbnail?: string; startTime?: string };
  payments?: { id: string; status: string }[];
}

export interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  name: string;
  ticket?: { id: string; eventId: string; type?: string; status?: string };
}
