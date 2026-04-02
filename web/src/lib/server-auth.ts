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
const ACCESS_TOKEN_GRACE_SECONDS = 60 * 60;
const REFRESH_TOKEN_GRACE_SECONDS = 60 * 60 * 24 * 7;

function isSecureCookie() {
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
  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, baseCookieOptions(ACCESS_TOKEN_GRACE_SECONDS));
  response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, baseCookieOptions(REFRESH_TOKEN_GRACE_SECONDS));
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", { ...baseCookieOptions(0), expires: new Date(0) });
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", { ...baseCookieOptions(0), expires: new Date(0) });
}

export async function exchangeLogin(credentials: { email: string; password: string }) {
  return backendApiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
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

export async function forwardRegister(payload: { email: string; password: string; displayName: string }) {
  return backendApiRequest<{ message: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
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

async function getCookieTokens() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null;

  return { accessToken, refreshToken };
}

export async function getSessionTokens(): Promise<SessionTokens> {
  const { accessToken, refreshToken } = await getCookieTokens();
  return { accessToken, refreshToken };
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

export async function getAuthenticatedTokens(): Promise<SessionTokens | null> {
  const tokens = await getSessionTokens();

  if (tokens.accessToken) {
    return tokens;
  }

  if (!tokens.refreshToken) {
    return null;
  }

  try {
    const refreshedTokens = await refreshSessionTokens(tokens.refreshToken);
    return {
      accessToken: refreshedTokens.accessToken,
      refreshToken: refreshedTokens.refreshToken,
      refreshedTokens,
    };
  } catch (error) {
    const unauthorized = isApiErrorLike(error) && error.status === 401;
    if (unauthorized) {
      return null;
    }

    throw error;
  }
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
      const unauthorized = isApiErrorLike(error) && error.status === 401;
      if (!unauthorized) {
        throw error;
      }
    }
  }

  if (!refreshToken) {
    return null;
  }

  try {
    const refreshedTokens = await refreshSessionTokens(refreshToken);
    const profile = await fetchProfileWithAccessToken(refreshedTokens.accessToken);

    return { profile, refreshedTokens };
  } catch (error) {
    const unauthorized = isApiErrorLike(error) && error.status === 401;
    if (unauthorized) {
      return null;
    }

    throw error;
  }
}

export async function performAuthenticatedIdentityRequest<T>(
  path: string,
  options: RequestInit = {},
  requestHeaders?: Headers,
): Promise<{ data: T; refreshedTokens?: LoginResponse }> {
  const tokens = await getAuthenticatedTokens();

  if (!tokens?.accessToken) {
    throw new ApiError("Oturum bulunamadi.", 401);
  }

  try {
    const data = await backendApiRequest<T>(path, {
      ...options,
      token: tokens.accessToken,
      headers: {
        ...buildProxyHeaders(requestHeaders ?? new Headers()),
        ...(options.headers ?? {}),
      },
    });

    return { data, refreshedTokens: tokens.refreshedTokens };
  } catch (error) {
    const unauthorized = isApiErrorLike(error) && error.status === 401;
    if (!unauthorized || !tokens.refreshToken) {
      throw error;
    }

    const refreshedTokens = await refreshSessionTokensWithHeaders(tokens.refreshToken, requestHeaders ?? new Headers());
    const data = await backendApiRequest<T>(path, {
      ...options,
      token: refreshedTokens.accessToken,
      headers: {
        ...buildProxyHeaders(requestHeaders ?? new Headers()),
        ...(options.headers ?? {}),
      },
    });

    return { data, refreshedTokens };
  }
}

export function applyRefreshedTokens(response: NextResponse, refreshedTokens?: LoginResponse) {
  if (refreshedTokens) {
    setAuthCookies(response, refreshedTokens);
  }
}

export async function forwardLogout(): Promise<LogoutResponse> {
  const { accessToken, refreshToken } = await getCookieTokens();

  if (!refreshToken) {
    return { message: "Oturum kapatildi." };
  }

  try {
    return await backendApiRequest<LogoutResponse>("/auth/logout", {
      method: "POST",
      token: accessToken,
      body: JSON.stringify({ refreshToken }),
    });
  } catch (error) {
    const unauthorized = isApiErrorLike(error) && error.status === 401;
    if (unauthorized) {
      return { message: "Oturum kapatildi." };
    }

    throw error;
  }
}
