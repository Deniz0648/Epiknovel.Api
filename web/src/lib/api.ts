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

let isRefreshing = false;
let refreshSubscribers: ((success: boolean) => void)[] = [];
let sharedRefreshPromise: Promise<boolean> | null = null;

function notifySubscribers(success: boolean) {
  refreshSubscribers.forEach((cb) => cb(success));
  refreshSubscribers = [];
}

async function performTokenRefresh(): Promise<boolean> {
  if (sharedRefreshPromise) {
    return sharedRefreshPromise;
  }

  sharedRefreshPromise = (async () => {
    try {
      console.log("[API] Attempting token refresh via shared promise...");
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      });

      if (refreshResponse.ok) {
        console.log("[API] Token refreshed sucessfully.");
        return true;
      }
      return false;
    } catch (err) {
      console.error("[API] Automatic refresh failed:", err);
      return false;
    } finally {
      sharedRefreshPromise = null;
    }
  })();

  return sharedRefreshPromise;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;
  const method = rest.method?.toUpperCase() || "GET";
  const isWriteMethod = ["POST", "PUT", "PATCH"].includes(method);
  const body = rest.body === undefined && isWriteMethod ? JSON.stringify({}) : rest.body;
  const hasJsonBody = typeof body !== "undefined" && !(body instanceof FormData);

  // Özel Durum: Refresh token isteği gelirse onu deduplicate olan paylaşılan fonksiyona yönlendir.
  // Bu sayede AuthProvider ile API interceptor aynı anda refresh yapmaya kalktığında çakışma yaşanmaz.
  if (path === "/auth/refresh-token") {
    const success = await performTokenRefresh();
    if (!success) {
      throw new ApiError("Token refresh failed.", 401);
    }
    // refreshToken payload'ı bekleyen fonksiyonlar için temsili bir dönüş yapabiliriz, genelde cookie ile çözülüyor
    return {} as T;
  }

  const makeRequest = async (currentOptions: RequestOptions) => {
    return fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      method,
      body,
      cache: "no-store",
      credentials: rest.credentials ?? "include",
      headers: {
        ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
        ...(currentOptions.token ? { Authorization: `Bearer ${currentOptions.token}` } : {}),
        ...headers,
      },
    });
  };

  // İyileştirme: Eğer arka planda aktif bir token yenileme işlemi varsa bekle.
  if (typeof window !== "undefined" && path !== "/auth/refresh-token" && path !== "/auth/login") {
    let waitLoops = 0;
    const checkLock = () => {
      const raw = window.localStorage.getItem("epiknovel.auth.refresh.lock");
      if (!raw) return false;
      try {
        const lock = JSON.parse(raw);
        return lock.expiresAt && lock.expiresAt > Date.now();
      } catch { return false; }
    };

    while (checkLock() && waitLoops < 30) {
      await new Promise(r => window.setTimeout(r, 100)); 
      waitLoops++;
    }
  }

  let response = await makeRequest(options);

  // 🛡️ 401 Interceptor: Revoke durumlarında token tazelemeyi dene ve eşzamanlı istekleri beklet
  if (response.status === 401 && path !== "/auth/login") {
    if (isRefreshing) {
      // Hali hazırda bir yenileme işlemi var, kuyruğa gir ve bitmesini bekle
      const success = await new Promise<boolean>((resolve) => {
        refreshSubscribers.push(resolve);
      });
      // Yenileme başarılıysa tekrar dene (Cookie üzerinden otomatik gidecektir)
      if (success) {
        response = await makeRequest(options);
      }
    } else {
      isRefreshing = true;
      try {
        const success = await performTokenRefresh();
        notifySubscribers(success);
        
        if (success) {
          console.log(`[API] Retrying queued request for ${path}...`);
          response = await makeRequest(options);
        }
      } finally {
        isRefreshing = false;
      }
    }
  }

  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");
  const text = await response.text();

  if (!isJson && response.ok) {
    return text as T;
  }

  let payload: ApiResult<T> | null = null;
  if (text) {
    try {
      payload = JSON.parse(text) as ApiResult<T>;
    } catch {
      throw new ApiError("API yaniti gecersiz JSON dondu.", response.status);
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
      msg || "API istegi basarisiz oldu.",
      response.status,
      formattedErrs
    );
  }

  if (typeof resData === "undefined") {
    throw new ApiError("API yanitinda veri bulunamadi.", response.status);
  }

  return resData as T;
}

export const COVER_DEFAULT = "/covers/cover-golge.svg";

/**
 * Medya URL'lerini frontend'in erişebileceği hale getirir.
 */
export function resolveMediaUrl(url?: string | null, category: string = "covers"): string {
  if (!url) return "";

  // 1. Base64 veya Zaten Proxy'lenmiş URL ise dokunma
  if (url.startsWith("data:") || url.includes("/api/media/file?path=")) {
    return url;
  }

  // 2. Agresif Yakalama: URL içinde '/uploads/' (çoğul) veya '/upload/' (tekil) geçiyorsa
  // veya doğrudan epiknovel.com üzerinden bir görsel geliyorsa proxy üzerinden geçiri
  if (url.includes("/uploads/") || url.includes("/upload/") || url.includes("epiknovel.com")) {
    let assetPath = "";
    if (url.includes("/uploads/")) {
      assetPath = "/uploads/" + url.split("/uploads/")[1];
    } else if (url.includes("/upload/")) {
      assetPath = "/upload/" + url.split("/upload/")[1];
    } else if (url.includes("epiknovel.com")) {
      // https://epiknovel.com/something.png -> /something.png
      try {
        const parsed = new URL(url);
        assetPath = parsed.pathname;
      } catch {
        assetPath = url;
      }
    }
    
    // Eğer favicon ise doğrudan public dizinine güvenebiliriz, değilse proxy'ye at
    if (assetPath === "/favicon.ico") return "/favicon.svg";
    
    // 🚀 OPTİMİZASYON: Eğer yol zaten /uploads/ ile başlıyorsa, 
    // next.config.ts'deki rewrite kuralı (source: "/uploads/:path*") bunu otomatik çözer.
    if (assetPath.startsWith("/uploads/")) {
      return assetPath;
    }
    
    return `/api/media/file?path=${encodeURIComponent(assetPath)}`;
  }

  // 2.5 GUID.webp gibi ham dosya isimlerini yakala (Genellikle kapak fotoğraflarıdır)
  // Pattern: 32 karakterlik hex Guid + .webp
  if (/^[0-9a-f]{32}\.webp$/i.test(url)) {
    return `/uploads/${category}/${url}`;
  }

  // 3. Fallback: Eski klasik çözümleme (Eğer /uploads/ geçmiyorsa ama host temizliği gerekiyorsa)
  if (url.includes("epiknovel_api:8080")) {
    return url.replace("epiknovel_api:8080", "localhost:8080");
  }

  return url;
}
