import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { toMediaProxyUrl } from "@/lib/media";
import { applyRefreshedTokens, clearAuthCookies, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

type UploadResponse = {
  url: string;
  fileName: string;
};

type AvatarResponse = {
  avatarUrl: string;
  message: string;
};

export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ isSuccess: false, message: "Avatar dosyasi bulunamadi." }, { status: 400 });
    }

    const tokens = await performAuthenticatedIdentityRequest<UploadResponse>("/media/upload", {
      method: "POST",
      body: (() => {
        const uploadData = new FormData();
        uploadData.set("file", file);
        uploadData.set("category", "profiles");
        uploadData.set("width", "512");
        uploadData.set("height", "512");
        return uploadData;
      })(),
      headers: {},
    }, request.headers);

    const result = await performAuthenticatedIdentityRequest<AvatarResponse>("/users/me/avatar", {
      method: "PUT",
      body: JSON.stringify({ fileName: tokens.data.fileName }),
    }, request.headers);

    const response = NextResponse.json({
      isSuccess: true,
      message: result.data.message,
      data: {
        ...result.data,
        avatarUrl: toMediaProxyUrl(result.data.avatarUrl) ?? "",
      },
    });
    applyRefreshedTokens(response, result.refreshedTokens ?? tokens.refreshedTokens);
    return response;
  } catch (error) {
    if (isApiErrorLike(error)) {
      const response = NextResponse.json({ isSuccess: false, message: error.message, errors: error.errors }, { status: error.status });
      if (error.status === 401) {
        clearAuthCookies(response);
      }
      return response;
    }

    return NextResponse.json({ isSuccess: false, message: "Avatar guncellenemedi." }, { status: 500 });
  }
}
