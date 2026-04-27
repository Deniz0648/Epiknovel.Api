import { NextRequest, NextResponse } from "next/server";
import { BACKEND_API_BASE_URL } from "@/lib/backend-api";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const BACKEND_PUBLIC_ORIGIN = new URL(BACKEND_API_BASE_URL).origin;
const RETRYABLE_STATUSES = new Set([404, 500, 502, 503, 504]);

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest) {
  const assetPath = request.nextUrl.searchParams.get("path")?.trim();

  // DEBUG LOG
  console.log(`[MEDIA_PROXY] Incoming request path: ${assetPath}`);

  const allowedPaths = ["/uploads/", "/upload/", "logo", "favicon"];
  const isAllowed = assetPath && allowedPaths.some(p => assetPath.toLowerCase().includes(p.toLowerCase()));

  if (!isAllowed) {
    console.error(`[MEDIA_PROXY] Invalid asset path: ${assetPath}`);
    return NextResponse.json({ isSuccess: false, message: "Gecersiz medya yolu." }, { status: 400 });
  }

  let finalAssetPath = assetPath;
  if (finalAssetPath.startsWith("/upload/")) {
    finalAssetPath = finalAssetPath.replace("/upload/", "/uploads/");
    console.log(`[MEDIA_PROXY] Normalizing path: ${assetPath} -> ${finalAssetPath}`);
  }

  const upstreamUrl = `${BACKEND_PUBLIC_ORIGIN}${finalAssetPath}`;
  let upstreamResponse: Response | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      console.log(`[MEDIA_PROXY] Attempt ${attempt + 1}: Fetching from ${upstreamUrl}`);
      upstreamResponse = await fetch(upstreamUrl, {
        method: "GET",
        cache: "no-store",
      });
      
      if (upstreamResponse?.ok) break;
    } catch (err: any) {
      console.error(`[MEDIA_PROXY] Attempt ${attempt + 1} failed: ${err.message}`);
      upstreamResponse = null;
    }

    await delay(100 * (attempt + 1));
  }

  if (!upstreamResponse?.ok || !upstreamResponse.body) {
    console.error(`[MEDIA_PROXY_ERROR] FAILED: ${upstreamUrl} | Status: ${upstreamResponse?.status}`);
    
    // Eğer görsel gerçekten yoksa (404), kırık resim göstermek yerine zarif bir fallback yap
    if (upstreamResponse?.status === 404) {
      try {
        let fallbackPath = "";
        const contentType = "image/svg+xml";

        if (assetPath.includes("/covers/")) {
          fallbackPath = path.join(process.cwd(), "public", "covers", "cover-golge.svg");
        } else if (assetPath.toLowerCase().includes("logo") || assetPath.toLowerCase().includes("favicon")) {
          fallbackPath = path.join(process.cwd(), "public", "favicon.svg");
        } else {
          fallbackPath = path.join(process.cwd(), "public", "favicon.svg");
        }
        
        if (fs.existsSync(fallbackPath)) {
          console.warn(`[MEDIA_PROXY_FALLBACK] Serving fallback image for: ${assetPath}`);
          const fileBuffer = fs.readFileSync(fallbackPath);
          return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=3600"
            }
          });
        }
      } catch (err) {
        console.error(`[MEDIA_PROXY_FALLBACK_ERROR] Could not read fallback file:`, err);
      }
    }

    return NextResponse.json({ isSuccess: false, message: "Medya dosyasi getirilemedi." }, { status: upstreamResponse?.status || 502 });
  }

  console.log(`[MEDIA_PROXY_SUCCESS] Served: ${assetPath} (${upstreamResponse.headers.get("content-type")})`);

  const response = new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
  });

  const contentType = upstreamResponse.headers.get("content-type");
  const cacheControl = upstreamResponse.headers.get("cache-control");

  if (contentType) response.headers.set("content-type", contentType);
  response.headers.set("cache-control", cacheControl ?? "public, max-age=3600");
  
  return response;
}
