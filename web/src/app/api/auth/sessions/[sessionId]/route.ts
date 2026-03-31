import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { applyRefreshedTokens, clearAuthCookies, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    const result = await performAuthenticatedIdentityRequest<{ message: string }>(
      `/identity/sessions/${sessionId}`,
      { method: "DELETE" },
      _request.headers,
    );

    const response = NextResponse.json({ isSuccess: true, message: result.data.message, data: result.data });
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

    return NextResponse.json({ isSuccess: false, message: "Oturum kapatilamadi." }, { status: 500 });
  }
}
