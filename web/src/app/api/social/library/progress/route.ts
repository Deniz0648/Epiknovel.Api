import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { applyRefreshedTokens, clearAuthCookies, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

/**
 * POST /api/social/library/progress
 * Okuma ilerlemesini kaydeder.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await performAuthenticatedIdentityRequest<string>(
      `/social/library/progress`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      request.headers,
    );

    const response = NextResponse.json({ isSuccess: true, data: result.data });
    applyRefreshedTokens(response, result.refreshedTokens);
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
      { isSuccess: false, message: "İlerleme kaydedilemedi." },
      { status: 500 }
    );
  }
}
