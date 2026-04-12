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

export async function PUT(request: NextRequest) {
  return handleProxyRequest(request, "PUT");
}

export async function DELETE(request: NextRequest) {
  return handleProxyRequest(request, "DELETE");
}

async function handleProxyRequest(request: NextRequest, method: string) {
  try {
    const { pathname, search } = new URL(request.url);
    // Remove the /api prefix to get the route for the backend
    // Backend expects /wallet/transactions, we are at /api/wallet/transactions
    const backendPath = pathname.replace("/api", "");
    
    let body = undefined;
    if (method !== "GET" && method !== "DELETE") {
      const json = await request.json().catch(() => ({}));
      body = JSON.stringify(json);
    }

    const tokens = await getAuthenticatedTokens();
    const data = await backendApiRequest<any>(`${backendPath}${search}`, {
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
    
    console.error(`Wallet Proxy Error [${method}]:`, error);
    return NextResponse.json(
      { isSuccess: false, message: "Cüzdan servisiyle iletişim kurulurken bir hata oluştu." },
      { status: 500 }
    );
  }
}
