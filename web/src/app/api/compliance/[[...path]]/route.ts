import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { backendFetch, buildProxyHeaders } from "@/lib/backend-api";
import { applyRefreshedTokens, getAuthenticatedTokens, clearAuthCookies } from "@/lib/server-auth";

/**
 * Compliance modülü için genel proxy.
 * /api/compliance/** isteklerini backend'deki /compliance/** rotasına yönlendirir.
 */
export async function GET(request: NextRequest) {
  return handleProxyRequest(request, "GET");
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
    // /api/compliance/moderation/tickets -> /compliance/moderation/tickets
    const subRoute = pathname.replace("/api/compliance", "") || "/";
    
    let body = undefined;
    if (method !== "GET" && request.headers.get("content-type")?.includes("application/json")) {
      const json = await request.json().catch(() => ({}));
      body = JSON.stringify(json);
    } else if (method !== "GET" && request.headers.get("content-type")?.includes("multipart/form-data")) {
      // Multipart form data handling (for document uploads)
      body = await request.formData();
    }

    const tokens = await getAuthenticatedTokens();
    const headers = buildProxyHeaders(request.headers);

    const backendResponse = await backendFetch(`/compliance${subRoute}${search}`, {
      method,
      token: tokens?.accessToken ?? null,
      headers,
      body
    });

    // Eğer backend hata döndüyse (ve JSON değilse), ApiError fırlatabiliriz veya doğrudan yansıtabiliriz.
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
    
    // Eğer yanıt JSON ise, standart formatta sarmalayıp dönelim (mevcut frontend beklentisi için)
    if (contentType?.includes("application/json")) {
        const data = await backendResponse.json();
        const response = NextResponse.json({
            isSuccess: true,
            data: data.data || data // Backend'den dönen data'yı al veya direkt objeyi
        });
        if (tokens?.refreshedTokens) applyRefreshedTokens(response, tokens.refreshedTokens);
        return response;
    }

    // Eğer yanıt JSON DEĞİLSE (Dosya indirme v.s.), ham body'yi stream olarak dönelim
    const responseHeaders = new Headers();
    if (contentType) responseHeaders.set("Content-Type", contentType);
    
    const contentDisposition = backendResponse.headers.get("content-disposition");
    if (contentDisposition) responseHeaders.set("Content-Disposition", contentDisposition);

    const response = new NextResponse(backendResponse.body, {
        status: backendResponse.status,
        headers: responseHeaders,
    });

    if (tokens?.refreshedTokens) applyRefreshedTokens(response, tokens.refreshedTokens);
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

    console.error("Compliance Proxy Error:", error);
    return NextResponse.json(
      { isSuccess: false, message: "İşlem sırasında sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
