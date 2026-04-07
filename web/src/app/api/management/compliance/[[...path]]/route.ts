import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { backendApiRequest, buildProxyHeaders } from "@/lib/backend-api";
import { applyRefreshedTokens, getAuthenticatedTokens, clearAuthCookies } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  try {
    const { pathname, search } = new URL(request.url);
    const subPath = pathname.replace("/api/management/compliance", "") || "/";
    
    const tokens = await getAuthenticatedTokens();
    const data = await backendApiRequest<any>(`/management/compliance${subPath}${search}`, {
      method: "GET",
      token: tokens?.accessToken ?? null,
      headers: buildProxyHeaders(request.headers),
    });

    const response = NextResponse.json({
      isSuccess: true,
      data: data,
    });

    applyRefreshedTokens(response, tokens?.refreshedTokens);
    return response;
  } catch (error) {
    if (isApiErrorLike(error)) {
      const response = NextResponse.json(
        { isSuccess: false, message: error.message, errors: error.errors },
        { status: error.status }
      );
      if (error.status === 401) {
        clearAuthCookies(response);
      }
      return response;
    }

    console.error("Compliance Proxy Error:", error);
    return NextResponse.json(
      { isSuccess: false, message: "Denetim verileri getirilemedi." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return handleProxyRequest(request, "POST");
}

export async function PUT(request: NextRequest) {
  return handleProxyRequest(request, "PUT");
}

export async function DELETE(request: NextRequest) {
  return handleProxyRequest(request, "DELETE");
}

async function handleProxyRequest(request: NextRequest, method: string) {
  try {
    const { pathname, search } = new URL(request.url);
    const subRoute = pathname.replace("/api/management/compliance", "") || "/";
    let body = undefined;
    if (method !== "GET") {
      const json = await request.json().catch(() => ({}));
      body = JSON.stringify(json);
    }

    const tokens = await getAuthenticatedTokens();
    const data = await backendApiRequest<any>(`/management/compliance${subRoute}${search}`, {
      method,
      token: tokens?.accessToken ?? null,
      headers: buildProxyHeaders(request.headers),
      body
    });

    const response = NextResponse.json(data);
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
    return NextResponse.json(
      { isSuccess: false, message: "Islem tamamlanamadi." },
      { status: 500 }
    );
  }
}
