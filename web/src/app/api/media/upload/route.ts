import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { applyRefreshedTokens, clearAuthCookies, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

type UploadResponse = {
  url: string;
  fileName: string;
};

export async function POST(request: NextRequest) {
  console.log("[MEDIA_PROXY] Starting upload request...");
  try {
    const source = await request.formData();
    const file = source.get("file");

    if (!(file instanceof File)) {
      console.error("[MEDIA_PROXY] ERROR: No file found in request.");
      return NextResponse.json({ isSuccess: false, message: "Yuklenecek dosya bulunamadi." }, { status: 400 });
    }

    console.log(`[MEDIA_PROXY] File: ${file.name} | Size: ${file.size} bytes | Type: ${file.type}`);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("category", String(source.get("category") ?? "general"));

    const width = source.get("width");
    const height = source.get("height");

    if (width) formData.set("width", String(width));
    if (height) formData.set("height", String(height));

    console.log("[MEDIA_PROXY] Calling backend API /media/upload...");
    const result = await performAuthenticatedIdentityRequest<UploadResponse>("/media/upload", {
      method: "POST",
      body: formData,
    });

    console.log("[MEDIA_PROXY] Backend response SUCCESS:", result.data);
    const response = NextResponse.json({ isSuccess: true, message: "Medya yuklendi.", data: result.data });
    applyRefreshedTokens(response, result.refreshedTokens);
    return response;
  } catch (error: any) {
    console.error("[MEDIA_PROXY] CATAL ERROR:", error.message || error);
    if (isApiErrorLike(error)) {
      console.error(`[MEDIA_PROXY] API ERROR Status: ${error.status} | Msg: ${error.message}`);
      const response = NextResponse.json({ isSuccess: false, message: error.message, errors: error.errors }, { status: error.status });
      if (error.status === 401) {
        clearAuthCookies(response);
      }
      return response;
    }

    return NextResponse.json({ isSuccess: false, message: "Medya yuklenemedi (Unexpected Proxy Error)." }, { status: 500 });
  }
}
