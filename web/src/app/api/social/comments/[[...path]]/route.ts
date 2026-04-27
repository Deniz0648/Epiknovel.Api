import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { 
  applyRefreshedTokens, 
  clearAuthCookies, 
  getAuthenticatedTokens,
  refreshSessionTokensWithHeaders 
} from "@/lib/server-auth";
import { backendApiRequest, buildProxyHeaders } from "@/lib/backend-api";

export const dynamic = "force-dynamic";

/**
 * Social Comments API Proxy
 * Handles GET (list), POST (create), POST (like), GET (reveal)
 */
async function handleRequest(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const pathArray = (await params).path || [];
  const subPath = pathArray.join("/");
  const backendPath = `/social/comments${subPath ? `/${subPath}` : ""}`;
  
  const searchParams = request.nextUrl.searchParams.toString();
  const fullPath = backendPath + (searchParams ? `?${searchParams}` : "");
  
  const method = request.method;
  const body = ["POST", "PUT", "PATCH"].includes(method) ? await request.text() : undefined;
  
  try {
    // 1. Get tokens (handles refresh if access token is expired but refresh token exists)
    const tokens = await getAuthenticatedTokens(request.headers);
    
    // 2. Perform request
    const data = await backendApiRequest<any>(fullPath, {
      method,
      body,
      token: tokens?.accessToken,
      headers: buildProxyHeaders(request.headers)
    });

    const response = NextResponse.json({ isSuccess: true, data });
    
    // 3. Apply refreshed tokens to cookies if refresh occurred
    if (tokens?.refreshedTokens) {
      applyRefreshedTokens(response, tokens.refreshedTokens);
    }
    
    return response;
  } catch (error) {
    // 4. Handle 401/403 with retry (Similar to performAuthenticatedIdentityRequest but more lenient for GET)
    if (isApiErrorLike(error) && (error.status === 401 || error.status === 403)) {
      // If we haven't tried refreshing yet, we could try here, 
      // but getAuthenticatedTokens already tried it once.
      // If it still fails, it means the session is truly dead.
      const response = NextResponse.json(
        { isSuccess: false, message: error.message, errors: error.errors }, 
        { status: error.status }
      );
      if (error.status === 401) {
        clearAuthCookies(response);
      }
      return response;
    }

    if (isApiErrorLike(error)) {
      return NextResponse.json(
        { isSuccess: false, message: error.message, errors: error.errors }, 
        { status: error.status }
      );
    }

    console.error(`[COMMENTS_PROXY_ERROR] ${method} ${fullPath}:`, error);
    return NextResponse.json({ isSuccess: false, message: "İşlem gerçekleştirilemedi." }, { status: 500 });
  }
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
