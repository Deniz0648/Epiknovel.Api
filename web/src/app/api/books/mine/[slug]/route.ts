import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { toMediaProxyUrl } from "@/lib/media";
import { applyRefreshedTokens, clearAuthCookies, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  
  try {
    // Audit: performAuthenticatedIdentityRequest built-in handling of cookies-to-bearer conversion.
    // Path includes the leading slash which is correctly appended to BACKEND_API_BASE_URL (http://localhost:8080/api)
    const result = await performAuthenticatedIdentityRequest<any>(
      `/books/mine/${slug}`,
      { method: "GET" },
      request.headers,
    );

    // Backend yanitindaki veriyi temizle ve cover URL'sini proxy'le
    const responseData = {
      ...result.data,
      coverImageUrl: toMediaProxyUrl(result.data.coverImageUrl),
    };

    const response = NextResponse.json({
      isSuccess: true,
      message: "Kitap detaylari getirildi.",
      data: responseData,
    });

    // Varsa yenilenmis token'lari cerezlere isle
    applyRefreshedTokens(response, result.refreshedTokens);
    return response;

  } catch (error) {
    // Hata detaylarini sunucu loglarinda goster (Hangi slug ile hata alindigini gorelim)
    console.error(`[API_PROXY_ERROR] GetMyBookBySlug (${slug}):`, error);

    if (isApiErrorLike(error)) {
      const response = NextResponse.json(
        { isSuccess: false, message: error.message, errors: error.errors },
        { status: error.status }
      );
      
      // SADECE gercek bir 401 (Unauthorized) durumunda cerezleri temizle. 
      // Diger hatalarda (500, 404 vb) oturumu kapatma.
      if (error.status === 401) {
        clearAuthCookies(response);
      }
      return response;
    }

    return NextResponse.json(
      { isSuccess: false, message: "Kitap detaylari getirilemedi. Sistem baglantisini kontrol edin." }, 
      { status: 500 }
    );
  }
}
