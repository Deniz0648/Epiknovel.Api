import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { applyRefreshedTokens, clearAuthCookies, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await props.params;
  try {
    const result = await performAuthenticatedIdentityRequest<unknown>(
      `/social/library/check/${bookId}`,
      { method: "GET" },
      request.headers,
    );

    const response = NextResponse.json({ isSuccess: true, message: "Kütüphane durumu kontrol edildi.", data: result.data });
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
    return NextResponse.json({ isSuccess: false, message: "Kütüphane durumu kontrol edilemedi." }, { status: 500 });
  }
}
