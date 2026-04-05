import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ApiError, isApiErrorLike } from "@/lib/api";
import { backendApiRequest, buildProxyHeaders } from "@/lib/backend-api";
import type { MyProfile } from "@/lib/auth";
import { toMediaProxyUrl } from "@/lib/media";

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiryDate: string;
};

type LogoutResponse = {
  message: string;
};

type SessionTokens = {
  accessToken: string | null;
  refreshToken: string | null;
  refreshedTokens?: LoginResponse;
};

const ACCESS_TOKEN_COOKIE = "epiknovel_at";
const REFRESH_TOKEN_COOKIE = "epiknovel_rt";
// Cookie omru (Access token icin 1 saat, Refresh icin 7 gun)
const ACCESS_TOKEN_MAX_AGE = 60 * 60;
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7;

function isSecureCookie() {
  const envSecure = process.env.NEXT_PUBLIC_COOKIE_SECURE ?? process.env.COOKIE_SECURE;
  if (envSecure === "false") return false;
  if (envSecure === "true") return true;
  return process.env.NODE_ENV === "production";
}

function baseCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecureCookie(),
    path: "/",
    maxAge,
  };
}

export async function setAuthCookies(response: NextResponse, tokens: LoginResponse) {
  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, baseCookieOptions(ACCESS_TOKEN_MAX_AGE));
  response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, baseCookieOptions(REFRESH_TOKEN_MAX_AGE));
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", { ...baseCookieOptions(0), expires: new Date(0) });
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", { ...baseCookieOptions(0), expires: new Date(0) });
}

export async function exchangeLoginWithHeaders(
  credentials: { email: string; password: string },
  requestHeaders: Headers,
) {
  return backendApiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
    headers: buildProxyHeaders(requestHeaders),
  });
}

export async function forwardLogout(): Promise<LogoutResponse> {
  const { accessToken, refreshToken } = await getCookieTokens();

  if (!refreshToken) {
    return { message: "Oturum zaten kapali." };
  }

  try {
    return await backendApiRequest<LogoutResponse>("/auth/logout", {
      method: "POST",
      token: accessToken,
      body: JSON.stringify({ refreshToken }),
    });
  } catch (error) {
    if (isApiErrorLike(error) && error.status === 401) {
      return { message: "Oturum gecersiz, kapatildi." };
    }
    throw error;
  }
}

async function getCookieTokens() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null;
    return { accessToken, refreshToken };
  } catch (err) {
    console.error("[AUTH_SERVER] Cookies okunamadi:", err);
    return { accessToken: null, refreshToken: null };
  }
}

export async function getSessionTokens(): Promise<SessionTokens> {
  return await getCookieTokens();
}

export async function getAuthenticatedTokens(): Promise<SessionTokens | null> {
  const tokens = await getCookieTokens();

  // Access token varsa dogrudan dondur (Backend 401 verirse performAuthenticatedIdentityRequest icinde yenileme denenecek)
  if (tokens.accessToken) {
    return tokens;
  }

  // Access token yoksa ama refresh token varsa yenilemeyi dene
  if (tokens.refreshToken) {
    try {
      console.log("[AUTH_SERVER] Access token eksik, yenileme (refresh) basliyor...");
      const refreshedTokens = await refreshSessionTokens(tokens.refreshToken);
      return {
        accessToken: refreshedTokens.accessToken,
        refreshToken: refreshedTokens.refreshToken,
        refreshedTokens,
      };
    } catch (error) {
      console.error("[AUTH_SERVER] Otomatik token yenileme basarisiz oldu:", error);
      return null; // Yenileme de basarisizsa oturum bitmis demektir
    }
  }

  return null;
}

export async function performAuthenticatedIdentityRequest<T>(
  path: string,
  options: RequestInit = {},
  requestHeaders?: Headers,
): Promise<{ data: T; refreshedTokens?: LoginResponse }> {
  const tokens = await getAuthenticatedTokens();

  if (!tokens?.accessToken) {
    if (typeof window === "undefined") {
      console.warn(`[AUTH_SERVER] ${path} istegi icin OTURUM BULUNAMADI (401 firlatiliyor). CEREZLER OKUNAMAMIS OLABILIR.`);
    }
    throw new ApiError("Oturum bulunamadı veya oturum süresi dolmuş.", 401);
  }

  try {
    // Header bilesenlerini dogru sekilde birlestirelim
    const finalHeaders = new Headers();
    
    // 1. Proxy Header'larini ekle (Client IP, User Agent vb.)
    const proxyHeaders = buildProxyHeaders(requestHeaders ?? new Headers());
    if (proxyHeaders instanceof Headers) {
      proxyHeaders.forEach((v, k) => finalHeaders.set(k, v));
    }

    // 2. Options icindeki ek header'lari ekle
    if (options.headers) {
      const optHeaders = new Headers(options.headers);
      optHeaders.forEach((v, k) => finalHeaders.set(k, v));
    }

    const data = await backendApiRequest<T>(path, {
      ...options,
      token: tokens.accessToken,
      headers: finalHeaders,
    });

    return { data, refreshedTokens: tokens.refreshedTokens };
  } catch (error) {
    // Eger asil istek 401 (Unauthorized) veya 403 (Forbidden) donerse, sessizce token yenileyip tekrar denemeyi dene (Retry logic)
    const unauthorized = isApiErrorLike(error) && (error.status === 401 || error.status === 403);
    
    if (unauthorized && tokens.refreshToken) {
      console.log(`[AUTH_SERVER] İstek ${error.status} verdi, token yenileyip tekrar deneniyor: ${path}`);
      try {
        const refreshed = await refreshSessionTokensWithHeaders(tokens.refreshToken, requestHeaders ?? new Headers());
        
        const retryHeaders = new Headers();
        const pHeaders = buildProxyHeaders(requestHeaders ?? new Headers());
        if (pHeaders instanceof Headers) {
          pHeaders.forEach((v, k) => retryHeaders.set(k, v));
        }
        if (options.headers) {
          new Headers(options.headers).forEach((v, k) => retryHeaders.set(k, v));
        }

        const data = await backendApiRequest<T>(path, {
          ...options,
          token: refreshed.accessToken,
          headers: retryHeaders,
        });
        return { data, refreshedTokens: refreshed };
      } catch (retryError) {
        console.error(`[AUTH_SERVER] Yenileme sonrasi tekrar deneme de basarisiz: ${path}`, retryError);
        throw retryError;
      }
    }

    throw error;
  }
}

export async function refreshSessionTokens(refreshToken: string) {
  return backendApiRequest<LoginResponse>("/auth/refresh-token", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export async function refreshSessionTokensWithHeaders(refreshToken: string, requestHeaders: Headers) {
  return backendApiRequest<LoginResponse>("/auth/refresh-token", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
    headers: buildProxyHeaders(requestHeaders),
  });
}

export async function fetchProfileWithAccessToken(accessToken: string) {
  const profile = await backendApiRequest<MyProfile>("/users/me", {
    method: "GET",
    token: accessToken,
  });

  return {
    ...profile,
    avatarUrl: toMediaProxyUrl(profile.avatarUrl),
  };
}

export async function fetchProfileWithSession(): Promise<
  | { profile: MyProfile; refreshedTokens?: LoginResponse }
  | null
> {
  const { accessToken, refreshToken } = await getCookieTokens();

  if (!accessToken && !refreshToken) {
    return null;
  }

  if (accessToken) {
    try {
      const profile = await fetchProfileWithAccessToken(accessToken);
      return { profile };
    } catch (error) {
       if (!(isApiErrorLike(error) && error.status === 401)) {
         throw error;
       }
    }
  }

  if (refreshToken) {
    try {
      const refreshedTokens = await refreshSessionTokens(refreshToken);
      const profile = await fetchProfileWithAccessToken(refreshedTokens.accessToken);
      return { profile, refreshedTokens };
    } catch (error) {
      if (isApiErrorLike(error) && error.status === 401) {
        return null;
      }
      throw error;
    }
  }

  return null;
}

export function applyRefreshedTokens(response: NextResponse, refreshedTokens?: LoginResponse) {
  if (refreshedTokens) {
    setAuthCookies(response, refreshedTokens);
  }
}
