import { NextRequest, NextResponse } from "next/server";
import { BACKEND_API_BASE_URL } from "@/lib/backend-api";

export async function POST(request: NextRequest) {
  try {
    // Iyzico formu 'token' verisini application/x-www-form-urlencoded olarak gönderir
    const formData = await request.formData();
    const params = new URLSearchParams();
    formData.forEach((value, key) => {
      params.append(key, value.toString());
    });
    
    // Backend'e yönlendir
    const response = await fetch(`${BACKEND_API_BASE_URL}/wallet/orders/callback`, {
      method: "POST",
      body: params,
    });

    const text = await response.text();
    const encodedText = encodeURIComponent(text);
    const htmlStart = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script>`;
    const htmlEnd = `</script></body></html>`;
    
    // Tarayıcı bu POST isteğini iFrame veya popup içinde yapar, bu yüzden parent'ı yönlendiriyoruz.
    if (response.ok) {
       return new NextResponse(
         `${htmlStart}window.parent.location.href = "/wallet/result?status=success&message=" + "${encodedText}";${htmlEnd}`,
         { headers: { "Content-Type": "text/html; charset=utf-8" } }
       );
    }

    return new NextResponse(
      `${htmlStart}window.parent.location.href = "/wallet/result?status=error&message=" + "${encodedText}";${htmlEnd}`,
      { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    console.error("[CALLBACK_PROXY_ERROR]", error);
    const fallbackText = encodeURIComponent("Ödeme sonucu işlenirken bir hata oluştu.");
    return new NextResponse(
      `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script>window.parent.location.href = "/wallet/result?status=error&message=" + "${fallbackText}";</script></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
    );
  }
}
