import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { applyRefreshedTokens, clearAuthCookies, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

type ResendConfirmEmailResponse = {
  message: string;
};

export async function POST(request: NextRequest) {
  try {
    const result = await performAuthenticatedIdentityRequest<ResendConfirmEmailResponse>("/auth/confirm-email/resend", {
      method: "POST",
    }, request.headers);

    const response = NextResponse.json({
      isSuccess: true,
      message: result.data.message,
      data: result.data,
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

    return NextResponse.json({ isSuccess: false, message: "Onay baglantisi gonderilemedi." }, { status: 500 });
  }
}
