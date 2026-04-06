"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ApiError } from "@/lib/api";
import { dispatchHubInvocation, getHubInvocationEventName } from "@/lib/hub-events";
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, type NotificationItem } from "@/lib/notifications";
import { connectHub, type HubInvocation } from "@/lib/signalr-client";
import { showToast } from "@/lib/toast";
import { useAuth } from "@/components/providers/auth-provider";

type NotificationsContextValue = {
  items: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

function normalizeRealtimePayload(payload: unknown): { title?: string; message?: string } | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const title = "title" in payload && typeof payload.title === "string" ? payload.title : undefined;
  const message = "message" in payload && typeof payload.message === "string" ? payload.message : undefined;
  return title || message ? { title, message } : null;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRefreshingRef = useRef<Promise<void> | null>(null);
  const lastRealtimeMarkerRef = useRef<string | null>(null);

  async function refreshNotifications() {
    if (!profile) {
      setItems([]);
      setError(null);
      return;
    }

    if (isRefreshingRef.current) {
      return isRefreshingRef.current;
    }

    const promise = (async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getNotifications();
        setItems(data.notifications);
      } catch (loadError) {
        if (loadError instanceof ApiError) {
          setError(loadError.message);
        } else {
          setError("Bildirimler yuklenemedi.");
        }
      } finally {
        setIsLoading(false);
        isRefreshingRef.current = null;
      }
    })();

    isRefreshingRef.current = promise;
    return promise;
  }

  async function markAsRead(notificationId: string) {
    const currentItem = items.find((item) => item.id === notificationId);
    if (!currentItem || currentItem.isRead) {
      return;
    }

    setItems((current) =>
      current.map((item) => (item.id === notificationId ? { ...item, isRead: true } : item)),
    );

    try {
      await markNotificationAsRead(notificationId);
    } catch (error) {
      setItems((current) =>
        current.map((item) => (item.id === notificationId ? { ...item, isRead: false } : item)),
      );

      if (error instanceof ApiError) {
        showToast({
          title: "Bildirim guncellenemedi",
          description: error.message,
          tone: "error",
        });
      }
    }
  }

  async function markAllAsRead() {
    if (unreadCount === 0) return;

    const previousItems = [...items];
    
    // 🎭 Optimistic UI Update
    setItems((current) => current.map((item) => ({ ...item, isRead: true })));

    try {
      await markAllNotificationsAsRead();
      showToast({
        title: "Basarili",
        description: "Tum bildirimler okundu olarak isaretlendi.",
        tone: "success",
      });
    } catch (error) {
      // 🔙 Rollback on failure
      setItems(previousItems);

      if (error instanceof ApiError) {
        showToast({
          title: "Hata",
          description: error.message,
          tone: "error",
        });
      }
    }
  }

  useEffect(() => {
    void refreshNotifications();
  }, [profile?.userId]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const handleInvocation = async (message: HubInvocation) => {
      const normalizedTarget = message.target.toLocaleLowerCase("tr-TR");
      if (!normalizedTarget.includes("notification")) {
        return;
      }

      const payload = normalizeRealtimePayload(message.args[0]);
      const marker = `${message.target}:${payload?.title ?? ""}:${payload?.message ?? ""}`;
      if (lastRealtimeMarkerRef.current !== marker) {
        lastRealtimeMarkerRef.current = marker;
        showToast({
          title: payload?.title ?? "Yeni bildirim",
          description: payload?.message ?? "Bildirimlerin guncellendi.",
          tone: "info",
        });
      }

      await refreshNotifications();
    };

    const eventName = getHubInvocationEventName();

    function onHubInvocation(event: Event) {
      const customEvent = event as CustomEvent<HubInvocation>;
      void handleInvocation(customEvent.detail);
    }

    window.addEventListener(eventName, onHubInvocation);
    
    return () => {
      window.removeEventListener(eventName, onHubInvocation);
    };
  }, [profile?.userId]);

  const unreadCount = items.filter((item) => !item.isRead).length;

  return (
    <NotificationsContext.Provider
      value={{
        items,
        unreadCount,
        isLoading,
        error,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider.");
  }

  return context;
}
