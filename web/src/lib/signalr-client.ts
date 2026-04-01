const RECORD_SEPARATOR = "\u001e";
const DEFAULT_BACKEND_API_BASE_URL = "http://localhost:8080/api";

type NegotiationResponse = {
  connectionId?: string;
  connectionToken?: string;
};

type InvocationMessage = {
  type?: number;
  target?: string;
  arguments?: unknown[];
};

class HubUnauthorizedError extends Error {}

export type HubInvocation = {
  target: string;
  payload: unknown;
};

type ConnectNotificationHubOptions = {
  onInvocation: (message: HubInvocation) => void | Promise<void>;
  onUnauthorized?: () => Promise<boolean>;
  reconnectDelayMs?: number;
};

function resolveHubUrl() {
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_BACKEND_API_BASE_URL).replace(/\/+$/, "");
  const hubBaseUrl = apiBaseUrl.endsWith("/api") ? apiBaseUrl.slice(0, -4) : apiBaseUrl;
  return `${hubBaseUrl}/hubs/notifications`;
}

function toWebSocketUrl(url: string) {
  const resolvedUrl = new URL(url, window.location.origin);
  resolvedUrl.protocol = resolvedUrl.protocol === "https:" ? "wss:" : "ws:";
  return resolvedUrl.toString();
}

async function negotiateConnection(hubUrl: string, signal: AbortSignal) {
  const response = await fetch(`${hubUrl}/negotiate?negotiateVersion=1`, {
    method: "POST",
    credentials: "include",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
    signal,
  });

  if (response.status === 401 || response.status === 403) {
    throw new HubUnauthorizedError("Hub authentication failed.");
  }

  if (!response.ok) {
    throw new Error(`SignalR negotiate failed with status ${response.status}.`);
  }

  return (await response.json()) as NegotiationResponse;
}

async function readFrameData(rawData: Blob | ArrayBuffer | string) {
  if (typeof rawData === "string") {
    return rawData;
  }

  if (rawData instanceof Blob) {
    return rawData.text();
  }

  return new TextDecoder().decode(rawData);
}

export function connectNotificationHub(options: ConnectNotificationHubOptions) {
  const hubUrl = resolveHubUrl();
  const reconnectDelayMs = options.reconnectDelayMs ?? 5000;

  let disposed = false;
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let negotiateAbortController: AbortController | null = null;

  const clearReconnectTimer = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const scheduleReconnect = (delayMs = reconnectDelayMs) => {
    if (disposed || reconnectTimer) {
      return;
    }

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void start();
    }, delayMs);
  };

  const handleSocketMessage = async (rawData: Blob | ArrayBuffer | string) => {
    const data = await readFrameData(rawData);
    const frames = data.split(RECORD_SEPARATOR).filter(Boolean);

    for (const frame of frames) {
      const message = JSON.parse(frame) as InvocationMessage;
      if (message.type === 1 && typeof message.target === "string") {
        await options.onInvocation({
          target: message.target,
          payload: message.arguments?.[0] ?? null,
        });
      }

      if (message.type === 7) {
        socket?.close();
      }
    }
  };

  const start = async () => {
    if (disposed) {
      return;
    }

    negotiateAbortController?.abort();
    clearReconnectTimer();
    negotiateAbortController = new AbortController();

    try {
      const negotiation = await negotiateConnection(hubUrl, negotiateAbortController.signal);
      if (disposed) {
        return;
      }

      const connectionToken = negotiation.connectionToken ?? negotiation.connectionId;
      if (!connectionToken) {
        throw new Error("SignalR negotiate response did not include a connection token.");
      }

      const nextSocket = new WebSocket(`${toWebSocketUrl(hubUrl)}?id=${encodeURIComponent(connectionToken)}`);
      socket = nextSocket;

      nextSocket.onopen = () => {
        nextSocket.send(`${JSON.stringify({ protocol: "json", version: 1 })}${RECORD_SEPARATOR}`);
      };

      nextSocket.onmessage = (event) => {
        void handleSocketMessage(event.data);
      };

      nextSocket.onerror = () => {
        nextSocket.close();
      };

      nextSocket.onclose = () => {
        if (socket === nextSocket) {
          socket = null;
        }

        if (!disposed) {
          scheduleReconnect();
        }
      };
    } catch (error) {
      if (disposed) {
        return;
      }

      if (error instanceof HubUnauthorizedError && options.onUnauthorized) {
        const recovered = await options.onUnauthorized();
        if (recovered && !disposed) {
          scheduleReconnect(250);
        }
        return;
      }

      scheduleReconnect();
    }
  };

  void start();

  return () => {
    disposed = true;
    clearReconnectTimer();
    negotiateAbortController?.abort();
    socket?.close(1000, "dispose");
    socket = null;
  };
}
