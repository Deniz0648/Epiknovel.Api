import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { backendApiRequest, buildProxyHeaders } from "@/lib/backend-api";
import { toMediaProxyUrl } from "@/lib/media";
import { applyRefreshedTokens, getAuthenticatedTokens } from "@/lib/server-auth";

type PublicProfileResponse = {
  slug: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isAuthor: boolean;
  isRedirected: boolean;
};

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const tokens = await getAuthenticatedTokens();
    const data = await backendApiRequest<PublicProfileResponse>(`/users/${slug}`, {
      method: "GET",
      token: tokens?.accessToken ?? null,
      headers: buildProxyHeaders(_request.headers),
    });

    const response = NextResponse.json({
      isSuccess: true,
      message: "Profil getirildi.",
      data: {
        ...data,
        avatarUrl: toMediaProxyUrl(data.avatarUrl),
      },
    });
    applyRefreshedTokens(response, tokens?.refreshedTokens);
    return response;
  } catch (error) {
    if (isApiErrorLike(error)) {
      return NextResponse.json({ isSuccess: false, message: error.message, errors: error.errors }, { status: error.status });
    }

    return NextResponse.json({ isSuccess: false, message: "Kullanici profili getirilemedi." }, { status: 500 });
  }
}
