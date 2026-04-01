import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { toMediaProxyUrl } from "@/lib/media";
import { applyRefreshedTokens, clearAuthCookies, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

type BackendMyBookItem = {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImageUrl?: string | null;
  status: string;
  contentRating: string;
  chapterCount: number;
  createdAt: string;
  updatedAt: string;
};

type BackendMyBookPagedResult = {
  items: BackendMyBookItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
};

export async function GET(request: NextRequest) {
  try {
    const params = new URLSearchParams();
    const allowedKeys = ["pageNumber", "pageSize", "search", "status", "sortBy", "sortDescending", "type"];

    for (const key of allowedKeys) {
      const value = request.nextUrl.searchParams.get(key);
      if (value?.trim()) {
        params.set(key, value.trim());
      }
    }

    const result = await performAuthenticatedIdentityRequest<BackendMyBookPagedResult>(
      `/books/mine${params.size > 0 ? `?${params.toString()}` : ""}`,
      { method: "GET" },
      request.headers,
    );

    const response = NextResponse.json({
      isSuccess: true,
      message: "Kitaplar getirildi.",
      data: {
        ...result.data,
        items: result.data.items.map((item) => ({
          ...item,
          coverImageUrl: toMediaProxyUrl(item.coverImageUrl),
        })),
      },
    });
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

    return NextResponse.json({ isSuccess: false, message: "Kitaplar getirilemedi." }, { status: 500 });
  }
}
