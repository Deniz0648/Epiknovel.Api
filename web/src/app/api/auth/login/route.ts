import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { exchangeLoginWithHeaders, fetchProfileWithAccessToken, setAuthCookies } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    
    // Client IP bilgisini yakala (Docker gateway yerine gercek IP için)
    const clientIp = request.headers.get("x-forwarded-for")?.split(',')[0] || request.headers.get("x-real-ip") || "unknown";
    const headers = new Headers(request.headers);
    if (clientIp !== "unknown" && !headers.has("x-forwarded-for")) {
      headers.set("x-forwarded-for", clientIp);
    }

    const tokens = await exchangeLoginWithHeaders({
      email: body.email?.trim() ?? "",
      password: body.password ?? "",
    }, headers);
    const profile = await fetchProfileWithAccessToken(tokens.accessToken);
    const response = NextResponse.json({
      isSuccess: true,
      message: "Giris basarili.",
      data: profile,
    });
    await setAuthCookies(response, tokens);
    return response;
  } catch (error) {
    if (isApiErrorLike(error)) {
      return NextResponse.json(
        {
          isSuccess: false,
          message: error.message,
          errors: error.errors,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        isSuccess: false,
        message: "Giris sirasinda beklenmeyen bir hata olustu.",
      },
      { status: 500 },
    );
  }
}
