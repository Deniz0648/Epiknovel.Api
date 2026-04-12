import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { backendApiRequest, buildProxyHeaders } from "@/lib/backend-api";
import { applyRefreshedTokens, getAuthenticatedTokens, clearAuthCookies } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  try {
    const { pathname, search } = new URL(request.url);
    const subPath = pathname.replace("/api/management/settings", "") || "/";
    
    const tokens = await getAuthenticatedTokens();
    const data = await backendApiRequest<any>(`/management/settings${subPath}${search}`, {
      method: "GET",
      token: tokens?.accessToken ?? null,
      headers: buildProxyHeaders(request.headers),
    });

    const response = NextResponse.json({
      isSuccess: true,
      data: data
    });
    applyRefreshedTokens(response, tokens?.refreshedTokens);
    return response;
  } catch (error) {
    return handleProxyError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { pathname, search } = new URL(request.url);
    const subPath = pathname.replace("/api/management/settings", "") || "/";
    const body = await request.json();

    const tokens = await getAuthenticatedTokens();
    const data = await backendApiRequest<any>(`/management/settings${subPath}${search}`, {
      method: "PUT",
      token: tokens?.accessToken ?? null,
      headers: buildProxyHeaders(request.headers),
      body: JSON.stringify(body)
    });

    const response = NextResponse.json({
      isSuccess: true,
      data: data
    });
    applyRefreshedTokens(response, tokens?.refreshedTokens);
    return response;
  } catch (error) {
    return handleProxyError(error);
  }
}

function handleProxyError(error: any) {
  if (isApiErrorLike(error)) {
    const response = NextResponse.json(
      { isSuccess: false, message: error.message, errors: error.errors },
      { status: error.status }
    );
    if (error.status === 401) clearAuthCookies(response);
    return response;
  }

  console.error("Settings Proxy Error:", error);
  return NextResponse.json(
    { isSuccess: false, message: "Ayar verileri işlenemedi." },
    { status: 500 }
  );
}
