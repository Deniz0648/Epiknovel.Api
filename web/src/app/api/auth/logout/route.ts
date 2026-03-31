import { NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { clearAuthCookies, forwardLogout } from "@/lib/server-auth";

export async function POST() {
  try {
    const result = await forwardLogout();
    const response = NextResponse.json({
      isSuccess: true,
      message: result.message,
      data: result,
    });
    clearAuthCookies(response);
    return response;
  } catch (error) {
    if (isApiErrorLike(error)) {
      const response = NextResponse.json(
        {
          isSuccess: false,
          message: error.message,
          errors: error.errors,
        },
        { status: error.status },
      );
      clearAuthCookies(response);
      return response;
    }

    const response = NextResponse.json(
      {
        isSuccess: false,
        message: "Cikis sirasinda beklenmeyen bir hata olustu.",
      },
      { status: 500 },
    );
    clearAuthCookies(response);
    return response;
  }
}
