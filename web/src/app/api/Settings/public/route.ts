import { NextRequest, NextResponse } from "next/server";
import { backendApiRequest } from "@/lib/backend-api";
import { isApiErrorLike } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const data = await backendApiRequest<Record<string, string>>("/Settings/public", {
      method: "GET",
      cache: "no-store", // Onbelleği devre dişi birak
    });

    return NextResponse.json({
      isSuccess: true,
      data: data,
      message: "Ayarlar başarıyla yüklendi."
    });
  } catch (error) {
    if (isApiErrorLike(error)) {
      return NextResponse.json({ isSuccess: false, message: error.message }, { status: error.status });
    }

    return NextResponse.json({ isSuccess: false, message: "Ayarlar yuklenemedi." }, { status: 500 });
  }
}
