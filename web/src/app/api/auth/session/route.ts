import { NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { clearAuthCookies, fetchProfileWithSession, setAuthCookies } from "@/lib/server-auth";

export async function GET() {
  try {
    const session = await fetchProfileWithSession();

    if (!session) {
      const response = NextResponse.json(
        {
          isSuccess: true,
          message: "Oturum bulunamadi.",
          data: null,
        },
        { status: 200 },
      );
      clearAuthCookies(response);
      return response;
    }

    const response = NextResponse.json({
      isSuccess: true,
      message: "Oturum bulundu.",
      data: session.profile,
    });

    if (session.refreshedTokens) {
      await setAuthCookies(response, session.refreshedTokens);
    }

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
        message: "Oturum kontrolu sirasinda beklenmeyen bir hata olustu.",
      },
      { status: 500 },
    );
  }
}
