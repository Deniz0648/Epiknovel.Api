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
