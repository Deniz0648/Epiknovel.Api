import { NextRequest, NextResponse } from "next/server";
import { backendFetch, buildProxyHeaders } from "@/lib/backend-api";
import { getValidSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getValidSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  
  const backendPath = status !== null 
    ? `/management/author-applications?status=${status}`
    : "/management/author-applications";

  const response = await backendFetch(backendPath, {
    method: "GET",
    token: session.token,
    headers: buildProxyHeaders(request.headers),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
