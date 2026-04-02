const DEFAULT_API_BASE_URL = "/api";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ?? DEFAULT_API_BASE_URL;

export type ApiResult<T> = {
  isSuccess: boolean;
  message: string;
  data?: T;
  errors?: string[] | null;
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
  const hasJsonBody = typeof rest.body !== "undefined" && !(rest.body instanceof FormData);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    cache: "no-store",
    headers: {
      ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const text = await response.text();
  let payload: ApiResult<T> | null = null;

  if (text) {
    try {
      payload = JSON.parse(text) as ApiResult<T>;
    } catch {
      throw new ApiError("API yaniti gecersiz JSON dondu.", response.status);
    }
  }

  if (!response.ok || !payload?.isSuccess) {
    throw new ApiError(
      payload?.message ?? "API istegi basarisiz oldu.",
      response.status,
      payload?.errors?.filter(Boolean) ?? [],
    );
  }

  if (typeof payload.data === "undefined") {
    throw new ApiError("API yanitinda veri bulunamadi.", response.status);
  }

  return payload.data;
}

/**
 * Medya URL'lerini frontend'in erişebileceği hale getirir.
 * Eğer URL 'epiknovel_api' (docker dâhili host) içeriyorsa, bunu 'localhost:8080' ile değiştirir.
 * Eğer URL '/' ile başlıyorsa, bunu backend origin'i ile tamamlar (veya Next.js rewrite mekanizmasına bırakır).
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return "";

  // Docker internal host'u browser'ın anlayacağı hale getir
  if (url.includes("epiknovel_api:8080")) {
    return url.replace("epiknovel_api:8080", "localhost:8080");
  }

  // Eğer relative path ise ve browser'da çalışıyorsak (localhost:3000), 
  // Next.js rewrite (/uploads -> localhost:8080/uploads) sayesinde doğrudan çalışır.
  return url;
}
