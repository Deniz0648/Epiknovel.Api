import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { applyRefreshedTokens, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { currentPassword?: string; newPassword?: string };
    const result = await performAuthenticatedIdentityRequest<{ message: string }>("/identity/change-password", {
      method: "POST",
      body: JSON.stringify({
        currentPassword: body.currentPassword ?? "",
        newPassword: body.newPassword ?? "",
      }),
    }, request.headers);

    const response = NextResponse.json({ isSuccess: true, message: result.data.message, data: result.data });
    applyRefreshedTokens(response, result.refreshedTokens);
    return response;
  } catch (error) {
    if (isApiErrorLike(error)) {
      return NextResponse.json({ isSuccess: false, message: error.message, errors: error.errors }, { status: error.status });
    }

    return NextResponse.json({ isSuccess: false, message: "Sifre degistirilemedi." }, { status: 500 });
  }
}
