import { ApiError } from "@/lib/api";

const DEFAULT_BACKEND_API_BASE_URL = "http://localhost:8080/api";

export const BACKEND_API_BASE_URL =
  process.env.API_BASE_URL?.replace(/\/+$/, "") ??
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ??
  DEFAULT_BACKEND_API_BASE_URL;

type BackendResult<T> = {
  isSuccess?: boolean;
  IsSuccess?: boolean;
  message?: string;
  Message?: string;
  data?: T;
  Data?: T;
  errors?: string[] | Record<string, string[]> | null;
  Errors?: string[] | Record<string, string[]> | null;
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
  const method = rest.method?.toUpperCase() || "GET";
  const isWriteMethod = ["POST", "PUT", "PATCH"].includes(method);
  const body = rest.body === undefined && isWriteMethod ? JSON.stringify({}) : rest.body;
  const hasJsonBody = typeof body !== "undefined" && !(body instanceof FormData);

  const response = await fetch(`${BACKEND_API_BASE_URL}${path}`, {
    ...rest,
    method,
    body,
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

  const result = payload?.isSuccess ?? payload?.IsSuccess;
  const msg = payload?.message ?? payload?.Message;
  const errs = payload?.errors ?? payload?.Errors;
  const resData = payload?.data ?? payload?.Data;

  let formattedErrs: string[] = [];
  if (Array.isArray(errs)) {
    formattedErrs = errs.filter(Boolean) as string[];
  } else if (errs && typeof errs === "object") {
    formattedErrs = Object.values(errs).flat().filter(Boolean) as string[];
  }

  if (!response.ok || !result) {
    throw new ApiError(
      msg ?? "Backend istegi basarisiz oldu.",
      response.status,
      formattedErrs
    );
  }

  if (typeof resData === "undefined") {
    throw new ApiError("Backend yanitinda veri bulunamadi.", response.status);
  }

  return resData as T;
}
