import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { applyRefreshedTokens, clearAuthCookies, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams.toString();
    const result = await performAuthenticatedIdentityRequest<unknown>(
      `/social/library${params ? `?${params}` : ""}`,
      { method: "GET" },
      request.headers,
    );

    const response = NextResponse.json({ isSuccess: true, data: result.data });
    applyRefreshedTokens(response, result.refreshedTokens);
    return response;
  } catch (error) {
    if (isApiErrorLike(error)) {
      const response = NextResponse.json({ isSuccess: false, message: error.message, errors: error.errors }, { status: error.status });
      if (error.status === 401) {
        clearAuthCookies(response);
      }
      return response;
    }
    return NextResponse.json({ isSuccess: false, message: "Kütüphane listesi getirilemedi." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const result = await performAuthenticatedIdentityRequest<unknown>(
      "/social/library",
      {
        method: "POST",
        body,
      },
      request.headers,
    );

    const response = NextResponse.json({ isSuccess: true, data: result.data });
    applyRefreshedTokens(response, result.refreshedTokens);
    return response;
  } catch (error) {
    if (isApiErrorLike(error)) {
      const response = NextResponse.json({ isSuccess: false, message: error.message, errors: error.errors }, { status: error.status });
      if (error.status === 401) {
        clearAuthCookies(response);
      }
      return response;
    }
    return NextResponse.json({ isSuccess: false, message: "Kütüphaneye eklenemedi." }, { status: 500 });
  }
}
