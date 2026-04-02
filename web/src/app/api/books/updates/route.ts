import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { toMediaProxyUrl } from "@/lib/media";
import { backendApiRequest, buildProxyHeaders } from "@/lib/backend-api";
import { applyRefreshedTokens, getAuthenticatedTokens } from "@/lib/server-auth";

type BackendUpdateItem = {
  chapterId: string;
  chapterTitle: string;
  chapterSlug: string;
  order: number;
  publishedAt: string;
  bookTitle: string;
  bookSlug: string;
  bookCoverImageUrl?: string | null;
  bookCategories: string[];
};

type BackendUpdatePagedResult = {
  updates: BackendUpdateItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  hasNextPage: boolean;
};

/**
 * GET /api/books/updates
 * En son bölümler (updates) listesini backend'e yönlendirir.
 */
export async function GET(request: NextRequest) {
  try {
    const params = new URLSearchParams();
    const allowedKeys = ["pageNumber", "pageSize", "Search"];

    for (const key of allowedKeys) {
      const value = request.nextUrl.searchParams.get(key);
      if (value?.trim()) {
        params.set(key, value.trim());
      }
    }

    const tokens = await getAuthenticatedTokens();
    const data = await backendApiRequest<BackendUpdatePagedResult>(`/books/updates?${params.toString()}`, {
      method: "GET",
      token: tokens?.accessToken ?? null,
      headers: buildProxyHeaders(request.headers),
    });

    // Medya URL'lerini (kapak resimlerini) proxy üzerinden geçir
    const sanitizedUpdates = data.updates.map((item) => ({
      ...item,
      bookCoverImageUrl: toMediaProxyUrl(item.bookCoverImageUrl),
    }));

    const response = NextResponse.json({
      isSuccess: true,
      message: "Guncellemeler getirildi.",
      data: {
        updates: sanitizedUpdates,
        totalCount: data.totalCount,
        pageNumber: data.pageNumber,
        pageSize: data.pageSize,
        hasNextPage: data.hasNextPage,
      },
    });

    applyRefreshedTokens(response, tokens?.refreshedTokens);
    return response;
  } catch (error) {
    console.error("Updates Proxy Error:", error);
    if (isApiErrorLike(error)) {
      return NextResponse.json(
        { isSuccess: false, message: error.message, errors: error.errors },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { isSuccess: false, message: "Guncellemeler getirilemedi." },
      { status: 500 }
    );
  }
}
