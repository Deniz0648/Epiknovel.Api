import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { backendApiRequest, buildProxyHeaders } from "@/lib/backend-api";
import { applyRefreshedTokens, clearAuthCookies, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  try {
    const data = await backendApiRequest<{ categories: unknown[] }>("/books/categories", {
      method: "GET",
      headers: buildProxyHeaders(request.headers),
    });

    const response = NextResponse.json({
      isSuccess: true,
      message: "Kategoriler getirildi.",
      data,
    });
    return response;
  } catch (error) {
    if (isApiErrorLike(error)) {
      return NextResponse.json({ isSuccess: false, message: error.message, errors: error.errors }, { status: error.status });
    }

    return NextResponse.json({ isSuccess: false, message: "Kategoriler getirilemedi." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const result = await performAuthenticatedIdentityRequest<unknown>(
      "/books/categories",
      {
        method: "POST",
        body,
      },
      request.headers,
    );

    const response = NextResponse.json({ isSuccess: true, message: "Kategori olusturuldu.", data: result.data }, { status: 201 });
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

    return NextResponse.json({ isSuccess: false, message: "Kategori olusturulamadi." }, { status: 500 });
  }
}
