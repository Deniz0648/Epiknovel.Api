import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { applyRefreshedTokens, clearAuthCookies, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bookSlug = searchParams.get("bookSlug");

    if (!bookSlug) {
      return NextResponse.json({ isSuccess: false, message: "BookSlug gereklidir." }, { status: 400 });
    }

    const params = new URLSearchParams();
    params.set("bookSlug", bookSlug);

    const pageNumber = searchParams.get("pageNumber");
    if (pageNumber) params.set("pageNumber", pageNumber);

    const pageSize = searchParams.get("pageSize");
    if (pageSize) params.set("pageSize", pageSize);

    const search = searchParams.get("search");
    if (search) params.set("search", search);

    const status = searchParams.get("status");
    if (status) params.set("status", status);

    const result = await performAuthenticatedIdentityRequest<any>(
      `/chapters/mine?${params.toString()}`,
      { method: "GET" },
      request.headers,
    );

    const response = NextResponse.json({
      isSuccess: true,
      message: "Bolumler getirildi.",
      data: result.data,
    });

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

    return NextResponse.json({ isSuccess: false, message: "Bolumler getirilemedi." }, { status: 500 });
  }
}
