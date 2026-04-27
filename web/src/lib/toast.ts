export type ToastTone = "info" | "success" | "error";

export type ToastPayload = {
  title?: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
};

const TOAST_EVENT_NAME = "epiknovel:toast";

export function showToast(payload: ToastPayload) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<ToastPayload>(TOAST_EVENT_NAME, { 
    detail: { 
      ...payload, 
      title: payload.title || (payload.tone === "error" ? "Hata" : payload.tone === "success" ? "Başarılı" : "Bilgi")
    } 
  }));
}

export function getToastEventName() {
  return TOAST_EVENT_NAME;
}

export const toast = {
  info: (payload: string | Omit<ToastPayload, "tone">) => 
    showToast(typeof payload === "string" ? { description: payload, tone: "info" } : { ...payload, tone: "info" }),
  success: (payload: string | Omit<ToastPayload, "tone">) => 
    showToast(typeof payload === "string" ? { description: payload, tone: "success" } : { ...payload, tone: "success" }),
  error: (payload: string | Omit<ToastPayload, "tone">) => 
    showToast(typeof payload === "string" ? { description: payload, tone: "error" } : { ...payload, tone: "error" }),
};
