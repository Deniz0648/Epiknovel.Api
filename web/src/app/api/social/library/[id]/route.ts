import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { applyRefreshedTokens, clearAuthCookies, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * DELETE /api/social/library/[id]
 * Kütüphaneden kitap çıkarır.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const result = await performAuthenticatedIdentityRequest<string>(
      `/social/library/${id}`,
      { method: "DELETE" },
      request.headers,
    );

    const response = NextResponse.json({ isSuccess: true, message: "Kütüphaneden kaldırıldı.", data: result.data });
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
    return NextResponse.json({ isSuccess: false, message: "Kütüphaneden kaldırılamadı." }, { status: 500 });
  }
}

/**
 * PATCH /api/social/library/[id]
 * Kitap okuma durumunu günceller.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const body = await request.json();
    const result = await performAuthenticatedIdentityRequest<string>(
      `/social/library`, // Backend Patch("/social/library") expects { id, status }
      {
        method: "PATCH",
        body: JSON.stringify({ ...body, id }),
      },
      request.headers,
    );

    const response = NextResponse.json({ isSuccess: true, message: "Okuma durumu güncellendi.", data: result.data });
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
    return NextResponse.json({ isSuccess: false, message: "Durum güncellenemedi." }, { status: 500 });
  }
}
