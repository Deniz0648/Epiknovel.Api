import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { toMediaProxyUrl } from "@/lib/media";
import { applyRefreshedTokens, clearAuthCookies, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const result = await performAuthenticatedIdentityRequest<any>(
      `/books/mine/${slug}`,
      { method: "GET" },
      request.headers,
    );

    const responseData = {
      ...result.data,
      coverImageUrl: toMediaProxyUrl(result.data.coverImageUrl),
    };

    const response = NextResponse.json({
      isSuccess: true,
      message: "Kitap detaylari getirildi.",
      data: responseData,
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

    console.error(`[API_PROXY_ERROR] GetMyBookBySlug (${(await params).slug}):`, error);
    return NextResponse.json(
      { isSuccess: false, message: "Kitap detaylari getirilemedi." }, 
      { status: 500 }
    );
  }
}
