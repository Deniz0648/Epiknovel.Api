import { ApiError } from "@/lib/api";

/**
 * Backend API Base URL tespiti.
 */
const getBackendUrl = () => {
  const isServer = typeof window === "undefined";
  // SERVER-SIDE: Docker icinde calisiyorsak konteyner ismine (epiknovel_api) gitmeliyiz.
  // Not: Eger docker-compose'da 'localhost' alias'i tanimliysa burasi 'localhost:8080' de olabilir.
  const serverUrl = process.env.API_BASE_URL || "http://epiknovel_api:8080/api";
  const clientUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";
  return isServer ? serverUrl : clientUrl;
};

export const BACKEND_API_BASE_URL = getBackendUrl().replace(/\/+$/, "");

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
  const headerStrings = [
    "user-agent",
    "accept-language",
    "x-forwarded-for",
    "x-forwarded-proto",
    "x-real-ip",
  ];

  for (const name of headerStrings) {
    const value = sourceHeaders.get(name);
    if (value) forwardedHeaders.set(name, value);
  }

  return forwardedHeaders;
}

export async function backendApiRequest<T>(
  path: string,
  options: BackendRequestOptions = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const method = rest.method?.toUpperCase() || "GET";
  
  const finalHeaders = new Headers(headers);
  finalHeaders.set("Accept", "application/json");

  if (token) {
    finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  if (rest.body && !(rest.body instanceof FormData)) {
    finalHeaders.set("Content-Type", "application/json");
  }

  const url = `${BACKEND_API_BASE_URL}${path}`;
  
  if (typeof window === "undefined") {
    const maskedToken = token ? `${token.substring(0, 10)}...${token.substring(token.length - 10)}` : "MISSING";
    console.log(`[BACKEND_REQUEST] ${method} ${url} | Token: [${maskedToken}]`);
  }

  const response = await fetch(url, {
    ...rest,
    method,
    headers: finalHeaders,
    cache: "no-store",
  });

  const text = await response.text();
  
  if (response.status === 401) {
    throw new ApiError("Backend tarafindan yetki hatasi alindi (401). Token gecersiz veya yetersiz.", 401);
  }

  let payload: BackendResult<T> | null = null;
  if (text) {
    try {
      payload = JSON.parse(text) as BackendResult<T>;
    } catch {
      throw new ApiError("Backend gecersiz JSON dondu.", response.status);
    }
  }

  const result = payload?.isSuccess ?? payload?.IsSuccess;
  const msg = payload?.message ?? payload?.Message;
  const resData = payload?.data ?? payload?.Data;

  if (!response.ok || !result) {
    throw new ApiError(msg ?? "Backend hatasi.", response.status);
  }

  return resData as T;
}
