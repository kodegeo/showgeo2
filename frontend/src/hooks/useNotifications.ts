import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Socket } from "socket.io-client";
import { notificationsService } from "@/services";
import type { QueryParams, Notification } from "@/services";
import { createSocketIoClient, getSocketIoOrigin } from "@/lib/apiBase";
import { isDevelopment } from "@/utils/env";

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
    refetchInterval: isDevelopment ? 60000 : 30000, // Slower polling in dev (60s) vs prod (30s)
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
    const isDev = import.meta.env.DEV;
    const socketOrigin = getSocketIoOrigin();
    if (!socketOrigin) {
      if (isDev) {
        console.warn(
          "[useNotificationsSocket] No WebSocket origin; set VITE_API_URL (absolute) or VITE_WS_URL.",
        );
      }
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const newSocket = createSocketIoClient({
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: isDev ? 3 : 5,
      timeout: isDev ? 5000 : 10000,
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
      if (isDev) {
        console.log("Connected to notifications WebSocket");
      }
    });

    newSocket.on("disconnect", (reason) => {
      setIsConnected(false);
      if (isDev) {
        console.log("Disconnected from notifications WebSocket:", reason);
      }
    });

    newSocket.on("connect_error", (error) => {
      if (isDev) {
        console.warn("[useNotificationsSocket] Connection error:", error.message);
      }
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

