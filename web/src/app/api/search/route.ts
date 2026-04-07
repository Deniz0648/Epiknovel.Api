import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { toMediaProxyUrl } from "@/lib/media";
import { backendApiRequest, buildProxyHeaders } from "@/lib/backend-api";
import { applyRefreshedTokens, getAuthenticatedTokens } from "@/lib/server-auth";

type BackendSearchResultItem = {
  id: string;
  referenceId: string;
  type: number; // 0=Book, 1=User, 2=Category, 3=Tag
  title: string;
  description: string;
  slug: string;
  imageUrl?: string | null;
};

type BackendGlobalSearchResponse = {
  results: BackendSearchResultItem[];
  totalRecords: number;
  totalPages: number;
};

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q");
    if (!query) {
      return NextResponse.json({ isSuccess: true, data: { results: [], totalRecords: 0, totalPages: 0 } });
    }

    const params = new URLSearchParams();
    params.set("q", query);
    
    // Additional filters if provided
    const type = request.nextUrl.searchParams.get("type");
    if (type) params.set("type", type);
    
    const page = request.nextUrl.searchParams.get("page") || "1";
    params.set("page", page);
    
    const size = request.nextUrl.searchParams.get("size") || "20";
    params.set("size", size);

    const tokens = await getAuthenticatedTokens();
    const data = await backendApiRequest<BackendGlobalSearchResponse>(`/search?${params.toString()}`, {
      method: "GET",
      token: tokens?.accessToken ?? null,
      headers: buildProxyHeaders(request.headers),
    });

    const sanitizedResults = data.results.map((item) => ({
      ...item,
      imageUrl: toMediaProxyUrl(item.imageUrl),
    }));

    const response = NextResponse.json({
      isSuccess: true,
      message: "Arama sonuclari getirildi.",
      data: {
        results: sanitizedResults,
        totalRecords: data.totalRecords,
        totalPages: data.totalPages,
      },
    });

    applyRefreshedTokens(response, tokens?.refreshedTokens);
    return response;
  } catch (error) {
    if (isApiErrorLike(error)) {
      return NextResponse.json({ isSuccess: false, message: error.message, errors: error.errors }, { status: error.status });
    }

    return NextResponse.json({ isSuccess: false, message: "Arama yapilirken bir sorun olustu." }, { status: 500 });
  }
}
