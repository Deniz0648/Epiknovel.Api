import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { performAuthenticatedIdentityRequest, applyRefreshedTokens, clearAuthCookies } from "@/lib/server-auth";

type RouteContext = {
  params: Promise<{ bookRef: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { bookRef } = await context.params;
    const body = await request.text();
    
    // Auth token ile backend'e (RateBook endpoint) proxy yap
    const result = await performAuthenticatedIdentityRequest<any>(
      `/books/${bookRef}/rate`,
      {
        method: "POST",
        body,
      },
      request.headers,
    );

    const response = NextResponse.json({ 
        isSuccess: true, 
        message: "Puaniniz kaydedildi.", 
        data: result.data 
    });
    
    applyRefreshedTokens(response, result.refreshedTokens);
    return response;
  } catch (error) {
    if (isApiErrorLike(error)) {
      const response = NextResponse.json({ 
          isSuccess: false, 
          message: error.message, 
          errors: error.errors 
      }, { status: error.status });
      
      if (error.status === 401) {
        clearAuthCookies(response);
      }
      return response;
    }

    return NextResponse.json({ 
        isSuccess: false, 
        message: "Puan kaydedilirken bir hata olustu." 
    }, { status: 500 });
  }
}
