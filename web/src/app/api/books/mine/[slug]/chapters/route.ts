import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { applyRefreshedTokens, clearAuthCookies, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const searchParams = request.nextUrl.searchParams;

    const queryParams = new URLSearchParams();
    queryParams.set("bookSlug", slug);

    const pageNumber = searchParams.get("pageNumber");
    if (pageNumber) queryParams.set("pageNumber", pageNumber);

    const pageSize = searchParams.get("pageSize");
    if (pageSize) queryParams.set("pageSize", pageSize);

    const search = searchParams.get("search");
    if (search) queryParams.set("search", search);

    const status = searchParams.get("status");
    if (status) queryParams.set("status", status);

    const result = await performAuthenticatedIdentityRequest<any>(
      `/books/mine/${slug}/chapters?${queryParams.toString()}`,
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

    console.error(`[API_PROXY_ERROR] GetMyChapters (${(await params).slug}):`, error);
    return NextResponse.json(
      { isSuccess: false, message: "Bolumler getirilemedi." }, 
      { status: 500 }
    );
  }
}
