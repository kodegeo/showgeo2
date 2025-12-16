import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentsService } from "@/services";
import type { CreateCheckoutRequest, CreateRefundRequest } from "../../../packages/shared/types/payments.types";
import type { QueryParams } from "@/services";

export function useOrders(
  params?: QueryParams & {
    userId?: string;
    entityId?: string;
    eventId?: string;
    status?: string;
    type?: string;
  },
) {
  return useQuery({
    queryKey: ["payments", "orders", params],
    queryFn: () => paymentsService.getOrders(params),
  });
}

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ["payments", "orders", orderId],
    queryFn: () => paymentsService.getOrder(orderId),
    enabled: !!orderId,
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: (data: CreateCheckoutRequest) => paymentsService.createCheckout(data),
  });
}

export function useCreateRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRefundRequest) => paymentsService.createRefund(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["payments", "orders", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["payments", "orders"] });
    },
  });
}













