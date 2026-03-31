import { NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { clearAuthCookies, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

export async function DELETE() {
  try {
    const result = await performAuthenticatedIdentityRequest<{ message: string }>("/identity/sessions/all", {
      method: "DELETE",
    });

    const response = NextResponse.json({ isSuccess: true, message: result.data.message, data: result.data });
    clearAuthCookies(response);
    return response;
  } catch (error) {
    if (isApiErrorLike(error)) {
      const response = NextResponse.json({ isSuccess: false, message: error.message, errors: error.errors }, { status: error.status });
      if (error.status === 401) {
        clearAuthCookies(response);
      }
      return response;
    }

    return NextResponse.json({ isSuccess: false, message: "Tum oturumlar kapatilamadi." }, { status: 500 });
  }
}
