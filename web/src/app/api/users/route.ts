import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { toMediaProxyUrl } from "@/lib/media";
import { applyRefreshedTokens, clearAuthCookies, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

type PublicProfileListItem = {
  slug: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  isAuthor: boolean;
  booksCount: number;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  joinedAt: string;
};

type PublicProfilesResponse = {
  items: PublicProfileListItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
};

export async function GET(request: NextRequest) {
  try {
    const pageNumber = request.nextUrl.searchParams.get("pageNumber") ?? "1";
    const pageSize = request.nextUrl.searchParams.get("pageSize") ?? "20";
    const query = request.nextUrl.searchParams.get("query");
    const isAuthor = request.nextUrl.searchParams.get("isAuthor");
    const sortBy = request.nextUrl.searchParams.get("sortBy");
    const sortDirection = request.nextUrl.searchParams.get("sortDirection");

    const searchParams = new URLSearchParams({
      pageNumber,
      pageSize,
    });

    if (query?.trim()) {
      searchParams.set("query", query.trim());
    }
    if (isAuthor?.trim()) {
      searchParams.set("isAuthor", isAuthor.trim());
    }
    if (sortBy?.trim()) {
      searchParams.set("sortBy", sortBy.trim());
    }
    if (sortDirection?.trim()) {
      searchParams.set("sortDirection", sortDirection.trim());
    }

    const result = await performAuthenticatedIdentityRequest<PublicProfilesResponse>(
      `/users?${searchParams.toString()}`,
      { method: "GET" },
      request.headers,
    );

    const response = NextResponse.json({
      isSuccess: true,
      message: "Public profiller getirildi.",
      data: {
        ...result.data,
        items: result.data.items.map((item) => ({
          ...item,
          avatarUrl: toMediaProxyUrl(item.avatarUrl),
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

    return NextResponse.json({ isSuccess: false, message: "Public profiller getirilemedi." }, { status: 500 });
  }
}
