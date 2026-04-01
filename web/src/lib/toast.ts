export type ToastTone = "info" | "success" | "error";

export type ToastPayload = {
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
};

const TOAST_EVENT_NAME = "epiknovel:toast";

export function showToast(payload: ToastPayload) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<ToastPayload>(TOAST_EVENT_NAME, { detail: payload }));
}

export function getToastEventName() {
  return TOAST_EVENT_NAME;
}
