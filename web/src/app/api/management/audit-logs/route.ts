import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { backendApiRequest, buildProxyHeaders } from "@/lib/backend-api";
import { applyRefreshedTokens, getAuthenticatedTokens, clearAuthCookies } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  try {
    const params = new URLSearchParams();
    const allowedKeys = ["cursor", "take", "userId", "module", "action", "traceId", "state"];

    for (const key of allowedKeys) {
      const value = request.nextUrl.searchParams.get(key);
      if (value?.trim()) {
        params.set(key, value.trim());
      }
    }

    const tokens = await getAuthenticatedTokens();
    const data = await backendApiRequest<any>(`/management/audit-logs?${params.toString()}`, {
      method: "GET",
      token: tokens?.accessToken ?? null,
      headers: buildProxyHeaders(request.headers),
    });

    const response = NextResponse.json({
      isSuccess: true,
      message: "Audit kayitlari getirildi.",
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

    return NextResponse.json(
      { isSuccess: false, message: "Audit kayitlari getirilemedi." },
      { status: 500 }
    );
  }
}
