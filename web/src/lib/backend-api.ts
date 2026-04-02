import { ApiError } from "@/lib/api";

const DEFAULT_BACKEND_API_BASE_URL = "http://localhost:8080/api";

export const BACKEND_API_BASE_URL =
  process.env.API_BASE_URL?.replace(/\/+$/, "") ??
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ??
  DEFAULT_BACKEND_API_BASE_URL;

type BackendResult<T> = {
  isSuccess: boolean;
  message: string;
  data?: T;
  errors?: string[] | null;
};

type BackendRequestOptions = RequestInit & {
  token?: string | null;
};

export function buildProxyHeaders(sourceHeaders: Headers): HeadersInit {
  const forwardedHeaders = new Headers();
  const headerNames = [
    "user-agent",
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto",
    "x-forwarded-port",
    "x-real-ip",
    "cf-connecting-ip",
    "true-client-ip",
  ];

  for (const headerName of headerNames) {
    const value = sourceHeaders.get(headerName);
    if (value) {
      forwardedHeaders.set(headerName, value);
    }
  }

  return forwardedHeaders;
}

export async function backendApiRequest<T>(
  path: string,
  options: BackendRequestOptions = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const hasJsonBody = typeof rest.body !== "undefined" && !(rest.body instanceof FormData);
  const response = await fetch(`${BACKEND_API_BASE_URL}${path}`, {
    ...rest,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const text = await response.text();
  let payload: BackendResult<T> | null = null;

  if (text) {
    try {
      payload = JSON.parse(text) as BackendResult<T>;
    } catch {
      throw new ApiError("Backend yaniti gecersiz JSON dondu.", response.status);
    }
  }

  if (!response.ok || !payload?.isSuccess) {
    throw new ApiError(
      payload?.message ?? "Backend istegi basarisiz oldu.",
      response.status,
      payload?.errors?.filter(Boolean) ?? [],
    );
  }

  if (typeof payload.data === "undefined") {
    throw new ApiError("Backend yanitinda veri bulunamadi.", response.status);
  }

  return payload.data;
}
