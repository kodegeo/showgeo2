import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { notificationsService } from "@/services";
import type { QueryParams, Notification } from "@/services";

const WS_URL = "/api"; io(`${WS_URL}/notifications`);


export function useNotifications(params?: QueryParams & { unreadOnly?: boolean }) {
  return useQuery({
    queryKey: ["notifications", params],
    queryFn: () => notificationsService.getAll(params),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationsService.getUnreadCount(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });
}

export function useClearNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (markAsRead?: boolean) => notificationsService.clearAll(markAsRead ?? false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });
}

/**
 * Hook for real-time notifications via WebSocket
 */
export function useNotificationsSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    // Initialize WebSocket connection
    const newSocket = io(`${WS_URL}/notifications`, {
      auth: { token },
      transports: ["websocket"],
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
      console.log("Connected to notifications WebSocket");
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
      console.log("Disconnected from notifications WebSocket");
    });

    newSocket.on("connected", (data: { userId: string }) => {
      console.log("Authenticated:", data.userId);
    });

    newSocket.on("notification", (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    });

    newSocket.on("unread_count", (data: { count: number }) => {
      setUnreadCount(data.count);
      queryClient.setQueryData(["notifications", "unread-count"], data.count);
    });

    setSocket(newSocket);

    // Load initial notifications
    notificationsService
      .getAll({ page: 1, limit: 20 })
      .then((response) => {
        setNotifications(response.data);
      })
      .catch((error) => {
        console.error("Failed to load notifications:", error);
      });

    notificationsService
      .getUnreadCount()
      .then((count) => {
        setUnreadCount(count);
      })
      .catch((error) => {
        console.error("Failed to load unread count:", error);
      });

    return () => {
      newSocket.close();
    };
  }, [queryClient]);

  const ping = useCallback(() => {
    if (socket && isConnected) {
      socket.emit("ping");
    }
  }, [socket, isConnected]);

  return {
    socket,
    notifications,
    unreadCount,
    isConnected,
    ping,
  };
}

