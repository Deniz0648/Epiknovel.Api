import { NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { applyRefreshedTokens, clearAuthCookies, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

export async function GET() {
  try {
    const result = await performAuthenticatedIdentityRequest<
      Array<{ sessionId: string; device: string; ipAddress: string; createdAt: string; isCurrent: boolean }>
    >("/identity/sessions", {
      method: "GET",
    });

    const response = NextResponse.json({ isSuccess: true, message: "Oturumlar getirildi.", data: result.data });
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

    return NextResponse.json({ isSuccess: false, message: "Oturumlar getirilemedi." }, { status: 500 });
  }
}
