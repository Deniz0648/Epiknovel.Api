import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { backendApiRequest, buildProxyHeaders } from "@/lib/backend-api";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      displayName?: string;
    };

    const data = await backendApiRequest<{ message: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: body.email?.trim() ?? "",
        password: body.password ?? "",
        displayName: body.displayName?.trim() ?? "",
      }),
      headers: buildProxyHeaders(request.headers),
    });

    return NextResponse.json({
      isSuccess: true,
      message: data.message,
      data,
    });
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
        message: "Kayit sirasinda beklenmeyen bir hata olustu.",
      },
      { status: 500 },
    );
  }
}
