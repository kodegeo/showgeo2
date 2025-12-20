export interface CreateCheckoutRequest {
    eventId: string;
    quantity: number;
  }
  
  export interface CreateRefundRequest {
    paymentId: string;
    orderId: string;
    reason?: string;
  }
  
  export interface GetOrdersParams {
    userId?: string;
    entityId?: string;
    eventId?: string;
    status?: string;
    type?: string;
  }
  
  
  