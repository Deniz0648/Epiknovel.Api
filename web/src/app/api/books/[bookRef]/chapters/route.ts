import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { backendApiRequest, buildProxyHeaders } from "@/lib/backend-api";
import { applyRefreshedTokens, getAuthenticatedTokens } from "@/lib/server-auth";

type RouteContext = {
  params: Promise<{ bookRef: string }>;
};

type BookLookupResponse = {
  id: string;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { bookRef } = await context.params;
    const query = request.nextUrl.searchParams.toString();
    const tokens = await getAuthenticatedTokens();
    const book = await backendApiRequest<BookLookupResponse>(`/books/${bookRef}`, {
      method: "GET",
      token: tokens?.accessToken ?? null,
      headers: buildProxyHeaders(request.headers),
    });

    const data = await backendApiRequest<unknown>(`/books/${book.id}/chapters${query ? `?${query}` : ""}`, {
      method: "GET",
      token: tokens?.accessToken ?? null,
      headers: buildProxyHeaders(request.headers),
    });

    const response = NextResponse.json({ isSuccess: true, message: "Kitap bolumleri getirildi.", data });
    applyRefreshedTokens(response, tokens?.refreshedTokens);
    return response;
  } catch (error) {
    if (isApiErrorLike(error)) {
      return NextResponse.json({ isSuccess: false, message: error.message, errors: error.errors }, { status: error.status });
    }

    return NextResponse.json({ isSuccess: false, message: "Kitap bolumleri getirilemedi." }, { status: 500 });
  }
}
