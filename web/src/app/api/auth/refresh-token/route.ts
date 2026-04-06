import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { clearAuthCookies, getSessionTokens, refreshSessionTokens, setAuthCookies } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await getSessionTokens();

    if (!refreshToken) {
      const response = NextResponse.json({ isSuccess: false, message: "Refresh token bulunamadi." }, { status: 401 });
      clearAuthCookies(response);
      return response;
    }

    const data = await refreshSessionTokens(refreshToken, request.headers);
    const response = NextResponse.json({ isSuccess: true, message: "Oturum yenilendi.", data });
    await setAuthCookies(response, data);
    return response;
  } catch (error) {
    if (isApiErrorLike(error)) {
      const response = NextResponse.json({ isSuccess: false, message: error.message, errors: error.errors }, { status: error.status });
      clearAuthCookies(response);
      return response;
    }

    const response = NextResponse.json({ isSuccess: false, message: "Oturum yenilenemedi." }, { status: 500 });
    clearAuthCookies(response);
    return response;
  }
}
