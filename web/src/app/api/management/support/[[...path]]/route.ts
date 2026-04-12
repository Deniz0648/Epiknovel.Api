import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { backendApiRequest, buildProxyHeaders } from "@/lib/backend-api";
import { applyRefreshedTokens, getAuthenticatedTokens, clearAuthCookies } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  return handleProxyRequest(request, "GET");
}

export async function POST(request: NextRequest) {
  return handleProxyRequest(request, "POST");
}

export async function PATCH(request: NextRequest) {
  return handleProxyRequest(request, "PATCH");
}

async function handleProxyRequest(request: NextRequest, method: string) {
  try {
    const { pathname, search } = new URL(request.url);
    // Remove the /api/management/support prefix to get the sub-route for the backend
    const subRoute = pathname.replace("/api/management/support", "") || "/";
    
    let body = undefined;
    if (method !== "GET") {
      const json = await request.json().catch(() => ({}));
      body = JSON.stringify(json);
    }

    const tokens = await getAuthenticatedTokens();
    const data = await backendApiRequest<any>(`/management/support${subRoute}${search}`, {
      method,
      token: tokens?.accessToken ?? null,
      headers: buildProxyHeaders(request.headers),
      body
    });

    const response = NextResponse.json({
      isSuccess: true,
      data: data
    });

    applyRefreshedTokens(response, tokens?.refreshedTokens);
    return response;
  } catch (error) {
    if (isApiErrorLike(error)) {
      const resp = NextResponse.json(
        { isSuccess: false, message: error.message, errors: error.errors },
        { status: error.status }
      );
      if (error.status === 401) clearAuthCookies(resp);
      return resp;
    }
    
    console.error(`Support Proxy Error [${method}]:`, error);
    return NextResponse.json(
      { isSuccess: false, message: "Destek servisiyle iletişim kurulurken bir hata oluştu." },
      { status: 500 }
    );
  }
}
