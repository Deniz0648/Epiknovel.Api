import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { applyRefreshedTokens, clearAuthCookies, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { sessionId } = await context.params;
  
  try {
    const result = await performAuthenticatedIdentityRequest<{ message: string }>(
      `/auth/sessions/${sessionId}`,
      { method: "DELETE" },
      request.headers,
    );

    const response = NextResponse.json({ 
      isSuccess: true, 
      message: result.data.message || "Oturum kapatildi.", 
      data: result.data 
    });

    applyRefreshedTokens(response, result.refreshedTokens);
    return response;
  } catch (error) {
    console.error(`[API_PROXY_ERROR] DeleteSession (${sessionId}):`, error);

    // Eger backend 401 veriyorsa, bu oturum zaten backend'de sonlanmis (veya token dusmus) demektir.
    // Kullanici zaten kapatmak istedigi icin, biz de yerel cerezleri temizleyip basarili donmeliyiz.
    if (isApiErrorLike(error) && (error.status === 401 || error.status === 403)) {
      const response = NextResponse.json({ 
        isSuccess: true, 
        message: "Oturum sonlandirildi (Zaten gecersizdi).", 
        data: null 
      });
      
      clearAuthCookies(response);
      return response;
    }

    if (isApiErrorLike(error)) {
      return NextResponse.json({ 
        isSuccess: false, 
        message: error.message, 
        errors: error.errors 
      }, { status: error.status });
    }

    return NextResponse.json({ isSuccess: false, message: "Oturum kapatilamadi." }, { status: 500 });
  }
}
