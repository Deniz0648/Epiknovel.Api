import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { backendApiRequest, buildProxyHeaders } from "@/lib/backend-api";
import { applyRefreshedTokens, clearAuthCookies, getAuthenticatedTokens, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

type RouteContext = {
  params: Promise<{ chapterRef: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { chapterRef } = await context.params;
    const tokens = await getAuthenticatedTokens();
    const data = await backendApiRequest<unknown>(`/books/chapters/${chapterRef}`, {
      method: "GET",
      token: tokens?.accessToken ?? null,
      headers: buildProxyHeaders(request.headers),
    });

    const response = NextResponse.json({ isSuccess: true, message: "Bolum getirildi.", data });
    applyRefreshedTokens(response, tokens?.refreshedTokens);
    return response;
  } catch (error) {
    if (isApiErrorLike(error)) {
      return NextResponse.json({ isSuccess: false, message: error.message, errors: error.errors }, { status: error.status });
    }

    return NextResponse.json({ isSuccess: false, message: "Bolum getirilemedi." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { chapterRef } = await context.params;
    const result = await performAuthenticatedIdentityRequest<unknown>(
      `/books/chapters/${chapterRef}`,
      {
        method: "DELETE",
      },
      request.headers,
    );

    const response = NextResponse.json({ isSuccess: true, message: "Bolum kaldirildi.", data: result.data });
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

    return NextResponse.json({ isSuccess: false, message: "Bolum kaldirilamadi." }, { status: 500 });
  }
}

