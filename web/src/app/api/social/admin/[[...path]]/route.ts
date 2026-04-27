import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { 
  applyRefreshedTokens, 
  getAuthenticatedTokens,
  clearAuthCookies
} from "@/lib/server-auth";
import { backendApiRequest, buildProxyHeaders } from "@/lib/backend-api";

export const dynamic = "force-dynamic";

/**
 * Social Admin API Proxy
 * Handles GET (activity), etc.
 */
async function handleRequest(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const pathArray = (await params).path || [];
  const subPath = pathArray.join("/");
  
  // Notice the backend prefix is /social/admin
  const backendPath = `/social/admin${subPath ? `/${subPath}` : ""}`;
  
  const searchParams = request.nextUrl.searchParams.toString();
  const fullPath = backendPath + (searchParams ? `?${searchParams}` : "");
  
  const method = request.method;
  const body = ["POST", "PUT", "PATCH"].includes(method) ? await request.text() : undefined;
  
  try {
    // 1. Get tokens
    const tokens = await getAuthenticatedTokens(request.headers);
    
    // 2. Perform request
    const data = await backendApiRequest<any>(fullPath, {
      method,
      body,
      token: tokens?.accessToken,
      headers: buildProxyHeaders(request.headers)
    });

    const response = NextResponse.json({ isSuccess: true, ...data });
    
    // 3. Apply refreshed tokens
    if (tokens?.refreshedTokens) {
      applyRefreshedTokens(response, tokens.refreshedTokens);
    }
    
    return response;
  } catch (error) {
    if (isApiErrorLike(error) && (error.status === 401 || error.status === 403)) {
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

    console.error(`[SOCIAL_ADMIN_PROXY_ERROR] ${method} ${fullPath}:`, error);
    return NextResponse.json({ isSuccess: false, message: "İşlem gerçekleştirilemedi." }, { status: 500 });
  }
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
