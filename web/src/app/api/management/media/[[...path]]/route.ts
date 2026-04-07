import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { BACKEND_API_BASE_URL, buildProxyHeaders } from "@/lib/backend-api";
import { applyRefreshedTokens, getAuthenticatedTokens, clearAuthCookies } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  try {
    const { pathname, search } = new URL(request.url);
    const subRoute = pathname.replace("/api/management/media", "") || "/";
    
    const tokens = await getAuthenticatedTokens();
    const formData = await request.formData();

    // Use regular fetch for FormData to avoid backendApiRequest structure overhead
    const response = await fetch(`${BACKEND_API_BASE_URL}/management/media${subRoute}${search}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tokens?.accessToken}`,
        ...Object.fromEntries(buildProxyHeaders(request.headers) as any)
      },
      body: formData
    });

    const data = await response.json();
    const nextResponse = NextResponse.json(data, { status: response.status });
    
    applyRefreshedTokens(nextResponse, tokens?.refreshedTokens);
    return nextResponse;

  } catch (error) {
    if (isApiErrorLike(error)) {
      const resp = NextResponse.json(
        { isSuccess: false, message: error.message, errors: error.errors },
        { status: error.status }
      );
      if (error.status === 401) clearAuthCookies(resp);
      return resp;
    }

    console.error("Media Proxy Error:", error);
    return NextResponse.json(
      { isSuccess: false, message: "Dosya yuklenemedi." },
      { status: 500 }
    );
  }
}
