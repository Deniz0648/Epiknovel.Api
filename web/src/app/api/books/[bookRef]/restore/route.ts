import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { applyRefreshedTokens, clearAuthCookies, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

type RouteContext = {
  params: Promise<{ bookRef: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { bookRef } = await context.params;
    const result = await performAuthenticatedIdentityRequest<unknown>(
      `/books/${bookRef}/restore`,
      {
        method: "POST",
      },
      request.headers,
    );

    const response = NextResponse.json({ isSuccess: true, message: "Kitap geri yüklendi.", data: result.data });
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

    return NextResponse.json({ isSuccess: false, message: "Kitap geri yuklenemedi." }, { status: 500 });
  }
}

