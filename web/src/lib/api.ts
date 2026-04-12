const DEFAULT_API_BASE_URL = "/api";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ?? DEFAULT_API_BASE_URL;

export type ApiResult<T> = {
  isSuccess?: boolean;
  IsSuccess?: boolean;
  message?: string;
  Message?: string;
  data?: T;
  Data?: T;
  errors?: string[] | Record<string, string[]> | null;
  Errors?: string[] | Record<string, string[]> | null;
};

export class ApiError extends Error {
  status: number;
  errors: string[];

  constructor(message: string, status: number, errors: string[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

export function isApiErrorLike(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    "status" in error &&
    typeof (error as { message?: unknown }).message === "string" &&
    typeof (error as { status?: unknown }).status === "number"
  );
}

type RequestOptions = RequestInit & {
  token?: string | null;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;
  const method = rest.method?.toUpperCase() || "GET";
  const isWriteMethod = ["POST", "PUT", "PATCH"].includes(method);
  const body = rest.body === undefined && isWriteMethod ? JSON.stringify({}) : rest.body;
  const hasJsonBody = typeof body !== "undefined" && !(body instanceof FormData);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    method,
    body,
    cache: "no-store",
    credentials: rest.credentials ?? "include", // Oturum çerezlerini (cookies) iletmek için kritik
    headers: {
      ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");
  const text = await response.text();

  // Eğer yanıt JSON DEĞİLSE ve başarılıysa, ham veriyi döndürelim
  if (!isJson && response.ok) {
    return text as T;
  }

  let payload: ApiResult<T> | null = null;
  if (text) {
    try {
      payload = JSON.parse(text) as ApiResult<T>;
    } catch {
      throw new ApiError("API yanıtı geçersiz JSON döndü.", response.status);
    }
  }

  const result = (payload?.isSuccess !== undefined ? payload.isSuccess : payload?.IsSuccess) ?? false;
  const msg = (payload?.message !== undefined ? payload.message : payload?.Message) ?? "";
  const errs = payload?.errors !== undefined ? payload.errors : payload?.Errors;
  const resData = payload?.data !== undefined ? payload.data : payload?.Data;

  let formattedErrs: string[] = [];
  if (Array.isArray(errs)) {
    formattedErrs = errs.filter(Boolean) as string[];
  } else if (errs && typeof errs === "object") {
    formattedErrs = Object.values(errs).flat().filter(Boolean) as string[];
  }

  if (!response.ok || !result) {
    throw new ApiError(
      msg ?? "API istegi basarisiz oldu.",
      response.status,
      formattedErrs
    );
  }

  if (typeof resData === "undefined") {
    throw new ApiError("API yanitinda veri bulunamadi.", response.status);
  }

  return resData as T;
}

/**
 * Medya URL'lerini frontend'in erişebileceği hale getirir.
 * Eğer URL 'epiknovel_api' (docker dâhili host) içeriyorsa, bunu 'localhost:8080' ile değiştirir.
 * Eğer URL '/' ile başlıyorsa, bunu backend origin'i ile tamamlar (veya Next.js rewrite mekanizmasına bırakır).
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return "";

  // 1. Eğer URL bizim proxy adresimizse, doğrudan içindeki yolu alalım.
  // Bu hem URL'yi kısaltır hem de Next.js'in /uploads rewrite mekanizmasını kullanmasını sağlar.
  if (url.includes("/api/media/file?path=")) {
    const parts = url.split("/api/media/file?path=");
    if (parts.length > 1) {
      // Decode the path if it's encoded in the query
      try {
        return decodeURIComponent(parts[1]);
      } catch {
        return parts[1];
      }
    }
  }

  // 2. Docker internal host'u browser'ın anlayacağı hale getir (Fallback)
  if (url.includes("epiknovel_api:8080")) {
    return url.replace("epiknovel_api:8080", "localhost:8080");
  }

  return url;
}
