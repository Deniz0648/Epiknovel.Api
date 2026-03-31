import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { applyRefreshedTokens, clearAuthCookies, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

type FollowResponse = {
  followersCount: number;
  message: string;
};

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const result = await performAuthenticatedIdentityRequest<FollowResponse>(`/users/${slug}/follow`, {
      method: "POST",
    }, _request.headers);

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

    return NextResponse.json({ isSuccess: false, message: "Takip islemi tamamlanamadi." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const result = await performAuthenticatedIdentityRequest<FollowResponse>(`/users/${slug}/follow`, {
      method: "DELETE",
    }, _request.headers);

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

    return NextResponse.json({ isSuccess: false, message: "Takipten cikma islemi tamamlanamadi." }, { status: 500 });
  }
}
