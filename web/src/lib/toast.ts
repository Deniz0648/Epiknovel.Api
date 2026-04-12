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
  info: (payload: Omit<ToastPayload, "tone">) => showToast({ ...payload, tone: "info" }),
  success: (payload: Omit<ToastPayload, "tone">) => showToast({ ...payload, tone: "success" }),
  error: (payload: Omit<ToastPayload, "tone">) => showToast({ ...payload, tone: "error" }),
};
