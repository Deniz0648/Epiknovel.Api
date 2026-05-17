"use client";

type EventPayload = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function trackEvent(event: string, payload: EventPayload = {}) {
  if (typeof window === "undefined") return;
  const entry = { event, ...payload, ts: Date.now() };
  if (!window.dataLayer) window.dataLayer = [];
  window.dataLayer.push(entry);
}
