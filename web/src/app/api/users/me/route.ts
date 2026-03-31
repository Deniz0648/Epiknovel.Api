import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { toMediaProxyUrl } from "@/lib/media";
import { applyRefreshedTokens, clearAuthCookies, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

type MyProfileResponse = {
  userId: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  followersCount: number;
  followingCount: number;
  emailConfirmed: boolean;
};

type UpdateProfilePayload = {
  displayName?: string;
  slug?: string;
  bio?: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const result = await performAuthenticatedIdentityRequest<MyProfileResponse>("/users/me", {
      method: "GET",
    }, request.headers);

    const response = NextResponse.json({
      isSuccess: true,
      message: "Profil getirildi.",
      data: {
        ...result.data,
        avatarUrl: toMediaProxyUrl(result.data.avatarUrl),
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

    return NextResponse.json({ isSuccess: false, message: "Profil getirilemedi." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as UpdateProfilePayload;
    const profile = await performAuthenticatedIdentityRequest<MyProfileResponse>("/users/me", {
      method: "GET",
    }, request.headers);

    const result = await performAuthenticatedIdentityRequest<{ message: string }>("/users/me", {
      method: "PUT",
      body: JSON.stringify({
        userId: profile.data.userId,
        displayName: body.displayName?.trim() ?? "",
        slug: body.slug?.trim() ?? null,
        bio: body.bio ?? null,
      }),
    }, request.headers);

    const response = NextResponse.json({ isSuccess: true, message: result.data.message, data: result.data });
    applyRefreshedTokens(response, result.refreshedTokens ?? profile.refreshedTokens);
    return response;
  } catch (error) {
    if (isApiErrorLike(error)) {
      const response = NextResponse.json({ isSuccess: false, message: error.message, errors: error.errors }, { status: error.status });
      if (error.status === 401) {
        clearAuthCookies(response);
      }
      return response;
    }

    return NextResponse.json({ isSuccess: false, message: "Profil guncellenemedi." }, { status: 500 });
  }
}
