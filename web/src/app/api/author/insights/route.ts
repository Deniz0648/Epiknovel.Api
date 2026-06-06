import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { applyRefreshedTokens, clearAuthCookies, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

type MyBook = {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImageUrl?: string | null;
  status: string | number;
  chapterCount: number;
  viewCount?: number;
  voteCount?: number;
  averageRating?: number;
  createdAt: string;
  updatedAt: string;
};

type MyBooksResponse = {
  items: MyBook[];
  totalCount: number;
};

type MyChapter = {
  id: string;
  title: string;
  slug: string;
  status: string | number;
  viewCount?: number;
  createdAt: string;
  publishedAt?: string;
};

type MyChaptersResponse = {
  items: MyChapter[];
};

type AuditLog = {
  tableName?: string;
  operation?: string;
  userId?: string;
  createdAt?: string;
  keyValues?: string;
  oldValues?: string;
  newValues?: string;
  changedColumns?: string;
};

type BackendAuthorInsights = {
  funnel?: {
    bookViews: number;
    chapterOpens: number;
    chapterCompletions: number;
    votes: number;
  };
  revisionTimeline?: Array<{
    createdAt: string;
    module: string;
    action: string;
    entityName: string;
    state: string;
    changedColumns?: string;
    primaryKeys?: string;
  }>;
};

export async function GET(request: NextRequest) {
  try {
    const qs = new URLSearchParams();
    const allowed = ["days", "bookId", "action", "entity", "startDate", "endDate"];
    for (const key of allowed) {
      const value = request.nextUrl.searchParams.get(key);
      if (value?.trim()) qs.set(key, value.trim());
    }

    const booksResult = await performAuthenticatedIdentityRequest<MyBooksResponse>(
      "/books/mine?pageNumber=1&pageSize=200&sortBy=UpdatedAt&sortDescending=true",
      { method: "GET" },
      request.headers
    );

    const books = booksResult.data.items ?? [];

    const chaptersByBook = await Promise.all(
      books.map(async (book) => {
        const chapterRes = await performAuthenticatedIdentityRequest<MyChaptersResponse>(
          `/books/mine/${book.slug}/chapters?pageNumber=1&pageSize=200`,
          { method: "GET" },
          request.headers
        );
        return { bookId: book.id, bookSlug: book.slug, items: chapterRes.data.items ?? [] };
      })
    );

    let auditLogs: AuditLog[] = [];
    let backendInsights: BackendAuthorInsights | null = null;
    try {
      const auditRes = await performAuthenticatedIdentityRequest<AuditLog[]>(
        "/management/audit-logs?page=1&pageSize=200",
        { method: "GET" },
        request.headers
      );
      auditLogs = auditRes.data ?? [];
    } catch {
      auditLogs = [];
    }

    try {
      const insightsRes = await performAuthenticatedIdentityRequest<BackendAuthorInsights>(
        `/author/insights${qs.size > 0 ? `?${qs.toString()}` : "?days=30"}`,
        { method: "GET" },
        request.headers
      );
      backendInsights = insightsRes.data ?? null;
    } catch {
      backendInsights = null;
    }

    const response = NextResponse.json({
      isSuccess: true,
      message: "Author insights getirildi.",
      data: {
        books,
        chaptersByBook,
        auditLogs,
        backendInsights,
      },
    });
    applyRefreshedTokens(response, booksResult.refreshedTokens);
    return response;
  } catch (error) {
    if (isApiErrorLike(error)) {
      const response = NextResponse.json(
        { isSuccess: false, message: error.message, errors: error.errors },
        { status: error.status }
      );
      if (error.status === 401) clearAuthCookies(response);
      return response;
    }
    return NextResponse.json({ isSuccess: false, message: "Author insights getirilemedi." }, { status: 500 });
  }
}
