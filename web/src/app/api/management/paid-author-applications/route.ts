import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { backendApiRequest, buildProxyHeaders } from "@/lib/backend-api";
import { applyRefreshedTokens, getAuthenticatedTokens, clearAuthCookies } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  try {
    const { search } = new URL(request.url);
    const tokens = await getAuthenticatedTokens();
    
    if (!tokens?.accessToken) {
       return NextResponse.json({ isSuccess: false, message: "Unauthorized" }, { status: 401 });
    }

    const data = await backendApiRequest<any>(`/management/paid-author-applications${search}`, {
      method: "GET",
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

  console.error("Paid Author Applications Proxy Error:", error);
  return NextResponse.json(
    { isSuccess: false, message: "Ucretli yazarlik verileri islenemedi." },
    { status: 500 }
  );
}
