export type HeaderOverlayName = "mobile-nav" | "notifications" | "profile" | "theme";

const HEADER_OVERLAY_EVENT_NAME = "epiknovel:header-overlay-open";

export function dispatchHeaderOverlayOpen(name: HeaderOverlayName) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<HeaderOverlayName>(HEADER_OVERLAY_EVENT_NAME, {
      detail: name,
    }),
  );
}

export function getHeaderOverlayEventName() {
  return HEADER_OVERLAY_EVENT_NAME;
}
