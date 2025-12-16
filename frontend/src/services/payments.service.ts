import type {
    CreateCheckoutRequest,
    CreateRefundRequest,
    GetOrdersParams,
  } from "../../../packages/shared/types/payments.types";
  
  export interface Order {
    id: string;
    status: string;
    total: number;
    createdAt: string;
  }
  
  export const paymentsService = {
    createCheckout: async (_payload: CreateCheckoutRequest) => {
      return Promise.resolve({ checkoutUrl: "" });
    },
  
    getOrders: async (_params?: GetOrdersParams): Promise<Order[]> => {
      return Promise.resolve([]);
    },
  
    // ✅ ADD THIS — required by useOrder()
    getOrder: async (_orderId: string): Promise<Order | null> => {
      return Promise.resolve(null);
    },
  
    createRefund: async (_payload: CreateRefundRequest) => {
      return Promise.resolve({ success: true });
    },
  };
 
  