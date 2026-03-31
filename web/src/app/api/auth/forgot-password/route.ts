import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { backendApiRequest } from "@/lib/backend-api";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string };
    const data = await backendApiRequest<{ message: string }>("/identity/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: body.email?.trim() ?? "" }),
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
