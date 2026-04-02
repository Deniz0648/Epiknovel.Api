import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api";
import { backendApiRequest } from "@/lib/backend-api";
import { clearAuthCookies, fetchProfileWithAccessToken, setAuthCookies } from "@/lib/server-auth";

type ConfirmEmailResponse = {
  message: string;
  accessToken?: string | null;
  refreshToken?: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { userId?: string; token?: string };
    const data = await backendApiRequest<ConfirmEmailResponse>("/auth/confirm-email", {
      method: "POST",
      body: JSON.stringify({
        userId: body.userId ?? "",
        token: body.token ?? "",
      }),
    });

    const response = NextResponse.json({
      isSuccess: true,
      message: data.message,
      data: { message: data.message, profile: null as unknown },
    });

    if (data.accessToken && data.refreshToken) {
      await setAuthCookies(response, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiryDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
      const profile = await fetchProfileWithAccessToken(data.accessToken);
      return NextResponse.json(
        {
          isSuccess: true,
          message: data.message,
          data: { message: data.message, profile },
        },
        { headers: response.headers },
      );
    }

    clearAuthCookies(response);
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ isSuccess: false, message: error.message, errors: error.errors }, { status: error.status });
    }

    return NextResponse.json({ isSuccess: false, message: "E-posta onayi tamamlanamadi." }, { status: 500 });
  }
}
