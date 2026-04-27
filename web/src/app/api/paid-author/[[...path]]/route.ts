import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { backendFetch, buildProxyHeaders } from "@/lib/backend-api";
import { applyRefreshedTokens, getAuthenticatedTokens, clearAuthCookies } from "@/lib/server-auth";

/**
 * PaidAuthor modülü için genel proxy.
 * /api/paid-author/** isteklerini backend'deki /paid-author/** rotasına yönlendirir.
 */
export async function GET(request: NextRequest) {
  return handleProxyRequest(request, "GET");
}

export async function POST(request: NextRequest) {
  return handleProxyRequest(request, "POST");
}

async function handleProxyRequest(request: NextRequest, method: string) {
  try {
    const { pathname, search } = new URL(request.url);
    // /api/paid-author/apply -> /apply
    const subRoute = pathname.replace("/api/paid-author", "") || "/";
    
    let body = undefined;
    if (method !== "GET") {
      const contentType = request.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const json = await request.json().catch(() => ({}));
        body = JSON.stringify(json);
      } else if (contentType?.includes("multipart/form-data")) {
        body = await request.formData();
      }
    }

    const tokens = await getAuthenticatedTokens();
    const headers = buildProxyHeaders(request.headers);

    const backendResponse = await backendFetch(`/paid-author${subRoute}${search}`, {
      method,
      token: tokens?.accessToken ?? null,
      headers,
      body
    });

    if (!backendResponse.ok) {
        const text = await backendResponse.text();
        try {
            const errorPayload = JSON.parse(text);
            return NextResponse.json(
                { isSuccess: false, message: errorPayload.message || "Backend hatası", errors: errorPayload.errors },
                { status: backendResponse.status }
            );
        } catch {
            return NextResponse.json(
                { isSuccess: false, message: "Backend hatası oluştu." },
                { status: backendResponse.status }
            );
        }
    }

    const contentType = backendResponse.headers.get("content-type");
    
    if (contentType?.includes("application/json")) {
        const data = await backendResponse.json();
        const response = NextResponse.json({
            isSuccess: true,
            data: data.data || data
        });
        if (tokens?.refreshedTokens) applyRefreshedTokens(response, tokens.refreshedTokens);
        return response;
    }

    const responseHeaders = new Headers();
    if (contentType) responseHeaders.set("Content-Type", contentType);
    
    const response = new NextResponse(backendResponse.body, {
        status: backendResponse.status,
        headers: responseHeaders,
    });

    if (tokens?.refreshedTokens) applyRefreshedTokens(response, tokens.refreshedTokens);
    return response;
  } catch (error: any) {
    if (isApiErrorLike(error)) {
      const resp = NextResponse.json(
        { isSuccess: false, message: error.message, errors: error.errors },
        { status: error.status }
      );
      if (error.status === 401) clearAuthCookies(resp);
      return resp;
    }

    console.error("PaidAuthor Proxy Error:", error);
    return NextResponse.json(
      { isSuccess: false, message: "İşlem sırasında sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
