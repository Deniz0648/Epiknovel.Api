import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { backendApiRequest } from "@/lib/backend-api";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string };
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      "https://test.epiknovel.com";
    const data = await backendApiRequest<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({
        email: body.email?.trim() ?? "",
        baseUrl,
      }),
    });

    return NextResponse.json({
      isSuccess: true,
      message: data.message,
      data,
    });
  } catch (error) {
    if (isApiErrorLike(error)) {
      return NextResponse.json({ isSuccess: false, message: error.message, errors: error.errors }, { status: error.status });
    }

    return NextResponse.json({ isSuccess: false, message: "Sifre sifirlama istegi gonderilemedi." }, { status: 500 });
  }
}
