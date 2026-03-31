import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { applyRefreshedTokens, clearAuthCookies, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

type UploadResponse = {
  url: string;
  fileName: string;
};

export async function POST(request: NextRequest) {
  try {
    const source = await request.formData();
    const file = source.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ isSuccess: false, message: "Yuklenecek dosya bulunamadi." }, { status: 400 });
    }

    const formData = new FormData();
    formData.set("file", file);
    formData.set("category", String(source.get("category") ?? "general"));

    const width = source.get("width");
    const height = source.get("height");

    if (width) {
      formData.set("width", String(width));
    }

    if (height) {
      formData.set("height", String(height));
    }

    const result = await performAuthenticatedIdentityRequest<UploadResponse>("/media/upload", {
      method: "POST",
      body: formData,
    });

    const response = NextResponse.json({ isSuccess: true, message: "Medya yuklendi.", data: result.data });
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

    return NextResponse.json({ isSuccess: false, message: "Medya yuklenemedi." }, { status: 500 });
  }
}
