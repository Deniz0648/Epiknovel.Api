import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { toMediaProxyUrl } from "@/lib/media";
import { backendApiRequest, buildProxyHeaders } from "@/lib/backend-api";
import { applyRefreshedTokens, clearAuthCookies, getAuthenticatedTokens, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

type BackendBookItem = {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImageUrl?: string | null;
  authorName?: string | null;
  authorSlug?: string | null;
  authorId: string;
};

type BackendBookPagedResult = {
  items: BackendBookItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
};

type SanitizedBookItem = {
  title: string;
  slug: string;
  description: string;
  coverImageUrl?: string | null;
  authorName?: string | null;
  authorSlug?: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const params = new URLSearchParams();
    const allowedKeys = ["pageNumber", "pageSize", "search", "sortBy", "sortDescending", "status", "authorSlug"];

    for (const key of allowedKeys) {
      const value = request.nextUrl.searchParams.get(key);
      if (value?.trim()) {
        params.set(key, value.trim());
      }
    }

    if (!params.has("pageNumber")) {
      params.set("pageNumber", "1");
    }
    if (!params.has("pageSize")) {
      params.set("pageSize", "50");
    }
    if (!params.has("sortBy")) {
      params.set("sortBy", "CreatedAt");
    }
    if (!params.has("sortDescending")) {
      params.set("sortDescending", "true");
    }

    const tokens = await getAuthenticatedTokens();
    const data = await backendApiRequest<BackendBookPagedResult>(`/books?${params.toString()}`, {
      method: "GET",
      token: tokens?.accessToken ?? null,
      headers: buildProxyHeaders(request.headers),
    });

    const sanitizedItems: SanitizedBookItem[] = data.items.map((item) => ({
      title: item.title,
      slug: item.slug,
      description: item.description,
      authorName: item.authorName,
      authorSlug: item.authorSlug,
      coverImageUrl: toMediaProxyUrl(item.coverImageUrl),
    }));

    const response = NextResponse.json({
      isSuccess: true,
      message: "Kitaplar getirildi.",
      data: {
        items: sanitizedItems,
        pageNumber: data.pageNumber,
        pageSize: data.pageSize,
        totalCount: data.totalCount,
      },
    });

    applyRefreshedTokens(response, tokens?.refreshedTokens);
    return response;
  } catch (error) {
    if (isApiErrorLike(error)) {
      return NextResponse.json({ isSuccess: false, message: error.message, errors: error.errors }, { status: error.status });
    }

    return NextResponse.json({ isSuccess: false, message: "Kitap listesi getirilemedi." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const result = await performAuthenticatedIdentityRequest<unknown>(
      "/books",
      {
        method: "POST",
        body,
      },
      request.headers,
    );

    const response = NextResponse.json({ isSuccess: true, message: "Kitap olusturuldu.", data: result.data }, { status: 201 });
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

    return NextResponse.json({ isSuccess: false, message: "Kitap olusturulamadi." }, { status: 500 });
  }
}
