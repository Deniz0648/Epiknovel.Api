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
  args: unknown[];
};

type ConnectNotificationHubOptions = {
  onInvocation: (message: HubInvocation) => void | Promise<void>;
  onUnauthorized?: () => Promise<boolean>;
  reconnectDelayMs?: number;
};

function resolveHubUrl(path: string) {
  // 📚 PROXY SUPPORT (SignalR'ın 8080 yerine 3000 üzerinden geçmesi için)
  // Eğer tarayıcı tarafındaysak göreceli yol kullan, Next.js /hubs/* isteklerini otomatik proxy'ler.
  if (typeof window !== "undefined") {
    return path;
  }

  let apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_BACKEND_API_BASE_URL;
  
  apiBaseUrl = apiBaseUrl.replace(/\/+$/, "");
  const hubBaseUrl = apiBaseUrl.endsWith("/api") ? apiBaseUrl.slice(0, -4) : apiBaseUrl;
  return `${hubBaseUrl.replace(/\/+$/, "")}${path}`;
}

function toWebSocketUrl(url: string) {
  const resolvedUrl = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  resolvedUrl.protocol = resolvedUrl.protocol === "https:" ? "wss:" : "ws:";
  return resolvedUrl.toString();
}

async function negotiateConnection(hubUrl: string, signal: AbortSignal) {
  const response = await fetch(`${hubUrl}/negotiate?negotiateVersion=1`, {
    method: "POST",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
    credentials: "include", // 🔐 Kimlik doğrulama çerezlerini gönder
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

export function connectHub(path: string, options: ConnectNotificationHubOptions) {
  const hubUrl = resolveHubUrl(path);
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
          args: message.arguments ?? [],
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

  const invoke = (target: string, ...args: unknown[]) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(`${JSON.stringify({ type: 1, target, arguments: args })}${RECORD_SEPARATOR}`);
    } else {
      console.warn(`Cannot invoke ${target}: Socket is not open.`);
    }
  };

  void start();

  return {
    invoke,
    dispose: () => {
      disposed = true;
      clearReconnectTimer();
      negotiateAbortController?.abort();
      socket?.close(1000, "dispose");
      socket = null;
    }
  };
}
