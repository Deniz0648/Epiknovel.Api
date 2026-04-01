import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { applyRefreshedTokens, clearAuthCookies, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const result = await performAuthenticatedIdentityRequest<unknown>(
      "/books/chapters",
      {
        method: "POST",
        body,
      },
      request.headers,
    );

    const response = NextResponse.json({ isSuccess: true, message: "Bolum olusturuldu.", data: result.data }, { status: 201 });
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

    return NextResponse.json({ isSuccess: false, message: "Bolum olusturulamadi." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.text();
    const result = await performAuthenticatedIdentityRequest<unknown>(
      "/books/chapters",
      {
        method: "PATCH",
        body,
      },
      request.headers,
    );

    const response = NextResponse.json({ isSuccess: true, message: "Bolum guncellendi.", data: result.data });
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

    return NextResponse.json({ isSuccess: false, message: "Bolum guncellenemedi." }, { status: 500 });
  }
}

