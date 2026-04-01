import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { backendApiRequest, buildProxyHeaders } from "@/lib/backend-api";

export async function GET(request: NextRequest) {
  try {
    const data = await backendApiRequest<{ tags: unknown[] }>("/books/tags", {
      method: "GET",
      headers: buildProxyHeaders(request.headers),
    });

    return NextResponse.json({
      isSuccess: true,
      message: "Etiketler getirildi.",
      data,
    });
  } catch (error) {
    if (isApiErrorLike(error)) {
      return NextResponse.json({ isSuccess: false, message: error.message, errors: error.errors }, { status: error.status });
    }

    return NextResponse.json({ isSuccess: false, message: "Etiketler getirilemedi." }, { status: 500 });
  }
}
