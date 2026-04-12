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
    "x-forwarded-host",
    "host",
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
  const response = await backendFetch(path, options);

  if (response.status === 401) {
    throw new ApiError("Backend tarafindan yetki hatasi alindi (401). Token gecersiz veya yetersiz.", 401);
  }

  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");

  const text = await response.text();
  
  if (!isJson) {
      // JSON degilse ama response ok ise, text olarak don (veya hata firlat)
      // Ancak mevcut backendApiRequest kontrati T donduruyor, genellikle JSON beklenir.
      if (response.ok) return text as any;
      throw new ApiError("Backend gecersiz format dondu.", response.status);
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

/**
 * Backend'e ham istek atar ve Response objesini doner.
 * Proxy ve streaming islemleri icin kullanilir.
 */
export async function backendFetch(
    path: string,
    options: BackendRequestOptions = {},
): Promise<Response> {
    const { token, headers, ...rest } = options;
    const method = rest.method?.toUpperCase() || "GET";
    
    const finalHeaders = new Headers(headers);
    if (!finalHeaders.has("Accept")) {
        finalHeaders.set("Accept", "application/json, application/octet-stream, */*");
    }

    if (token) {
        finalHeaders.set("Authorization", `Bearer ${token}`);
    }

    if (rest.body && !(rest.body instanceof FormData) && !finalHeaders.has("Content-Type")) {
        finalHeaders.set("Content-Type", "application/json");
    }

    const url = `${BACKEND_API_BASE_URL}${path}`;
    
    if (typeof window === "undefined") {
        const maskedToken = token ? `${token.substring(0, 10)}...${token.substring(token.length - 10)}` : "MISSING";
        console.log(`[BACKEND_FETCH] ${method} ${url} | Token: [${maskedToken}]`);
    }

    return fetch(url, {
        ...rest,
        method,
        headers: finalHeaders,
        cache: "no-store",
    });
}
