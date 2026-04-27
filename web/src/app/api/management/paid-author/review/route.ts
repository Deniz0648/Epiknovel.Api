import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { backendApiRequest, buildProxyHeaders } from "@/lib/backend-api";
import { applyRefreshedTokens, getAuthenticatedTokens, clearAuthCookies } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tokens = await getAuthenticatedTokens();
    
    if (!tokens?.accessToken) {
       return NextResponse.json({ isSuccess: false, message: "Unauthorized" }, { status: 401 });
    }

    const data = await backendApiRequest<any>(`/management/paid-author/review`, {
      method: "POST",
      body: JSON.stringify(body),
      token: tokens.accessToken,
      headers: buildProxyHeaders(request.headers),
    });

    const response = NextResponse.json({
      isSuccess: true,
      data: data
    });

    applyRefreshedTokens(response, tokens.refreshedTokens);
    return response;
  } catch (error) {
    return handleProxyError(error);
  }
}

function handleProxyError(error: any) {
  if (isApiErrorLike(error)) {
    const response = NextResponse.json(
      { isSuccess: false, message: error.message, errors: (error as any).errors },
      { status: error.status }
    );
    if (error.status === 401) clearAuthCookies(response);
    return response;
  }

  console.error("Paid Author Review Proxy Error:", error);
  return NextResponse.json(
    { isSuccess: false, message: "İşlem tamamlanamadı." },
    { status: 500 }
  );
}
