import { NextRequest, NextResponse } from "next/server";
import { BACKEND_API_BASE_URL } from "@/lib/backend-api";

const BACKEND_PUBLIC_ORIGIN = new URL(BACKEND_API_BASE_URL).origin;
const RETRYABLE_STATUSES = new Set([404, 500, 502, 503, 504]);

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest) {
  const assetPath = request.nextUrl.searchParams.get("path")?.trim();

  if (!assetPath || !assetPath.startsWith("/uploads/")) {
    return NextResponse.json({ isSuccess: false, message: "Gecersiz medya yolu." }, { status: 400 });
  }

  let upstreamResponse: Response | null = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      upstreamResponse = await fetch(`${BACKEND_PUBLIC_ORIGIN}${assetPath}`, {
        method: "GET",
        cache: "no-store",
      });
    } catch {
      upstreamResponse = null;
    }

    if (upstreamResponse?.ok && upstreamResponse.body) {
      break;
    }

    const status = upstreamResponse?.status;
    if (attempt === 4 || (typeof status === "number" && !RETRYABLE_STATUSES.has(status))) {
      break;
    }

    await delay(250 * (attempt + 1));
  }

  if (!upstreamResponse?.ok || !upstreamResponse.body) {
    console.error(`[MEDIA_PROXY_ERROR] Path: ${assetPath} | Status: ${upstreamResponse?.status} | URL: ${BACKEND_PUBLIC_ORIGIN}${assetPath}`);
    return NextResponse.json({ isSuccess: false, message: "Medya dosyasi getirilemedi." }, { status: upstreamResponse?.status || 502 });
  }

  const response = new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
  });

  const contentType = upstreamResponse.headers.get("content-type");
  const cacheControl = upstreamResponse.headers.get("cache-control");

  if (contentType) {
    response.headers.set("content-type", contentType);
  }

  response.headers.set("cache-control", cacheControl ?? "public, max-age=300");
  return response;
}
