"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { getToastEventName, type ToastPayload } from "@/lib/toast";

type ToastItem = ToastPayload & {
  id: string;
};

type ToastContextValue = {
  pushToast: (payload: ToastPayload) => void;
};

const DEFAULT_DURATION_MS = 4000;

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

function createToastId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function resolveToastStyles(tone: ToastPayload["tone"]) {
  switch (tone) {
    case "success":
      return {
        icon: CheckCircle2,
        ring: "border-success/30 bg-success/10 text-success",
      };
    case "error":
      return {
        icon: AlertCircle,
        ring: "border-error/30 bg-error/10 text-error",
      };
    default:
      return {
        icon: Info,
        ring: "border-primary/25 bg-primary/10 text-primary",
      };
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  function removeToast(id: string) {
    const timerId = timersRef.current.get(id);
    if (timerId) {
      window.clearTimeout(timerId);
      timersRef.current.delete(id);
    }

    setItems((current) => current.filter((item) => item.id !== id));
  }

  function pushToast(payload: ToastPayload) {
    const id = createToastId();
    const durationMs = payload.durationMs ?? DEFAULT_DURATION_MS;
    setItems((current) => [...current.slice(-3), { ...payload, id }]);

    const timerId = window.setTimeout(() => {
      removeToast(id);
    }, durationMs);
    timersRef.current.set(id, timerId);
  }

  useEffect(() => {
    const eventName = getToastEventName();

    function handleToast(event: Event) {
      const customEvent = event as CustomEvent<ToastPayload>;
      pushToast(customEvent.detail);
    }

    window.addEventListener(eventName, handleToast);
    return () => {
      window.removeEventListener(eventName, handleToast);
      for (const timerId of timersRef.current.values()) {
        window.clearTimeout(timerId);
      }
      timersRef.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex justify-center px-4">
        <div className="flex w-full max-w-lg flex-col gap-3">
          {items.map((item) => {
            const styles = resolveToastStyles(item.tone);
            const Icon = styles.icon;

            return (
              <div
                key={item.id}
                className="glass-frame pointer-events-auto flex items-start gap-3 rounded-[1.4rem] border border-base-content/14 bg-base-100/88 px-4 py-3 shadow-2xl"
              >
                <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border ${styles.ring}`}>
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-base-content/90">{item.title}</p>
                  {item.description ? (
                    <p className="mt-1 text-sm leading-relaxed text-base-content/68">{item.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(item.id)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-2xl text-base-content/50 transition hover:bg-base-100/45 hover:text-base-content/78"
                  aria-label="Tosti kapat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }

  return context;
}
