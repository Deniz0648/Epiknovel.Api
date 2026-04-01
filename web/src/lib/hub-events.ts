import type { HubInvocation } from "@/lib/signalr-client";

const HUB_INVOCATION_EVENT_NAME = "epiknovel:hub-invocation";

export function dispatchHubInvocation(message: HubInvocation) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<HubInvocation>(HUB_INVOCATION_EVENT_NAME, { detail: message }));
}

export function getHubInvocationEventName() {
  return HUB_INVOCATION_EVENT_NAME;
}
