import { NextRequest, NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { applyRefreshedTokens, clearAuthCookies, performAuthenticatedIdentityRequest } from "@/lib/server-auth";

type NotificationDto = {
  id: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  type: string | number;
  isRead: boolean;
  createdAt: string;
};

type NotificationsResponse = {
  notifications: NotificationDto[];
};

export async function GET(request: NextRequest) {
  try {
    const result = await performAuthenticatedIdentityRequest<NotificationsResponse>(
      "/infrastructure/notifications",
      { method: "GET" },
      request.headers,
    );

    const response = NextResponse.json({
      isSuccess: true,
      message: "Bildirimler getirildi.",
      data: result.data,
    });
    applyRefreshedTokens(response, result.refreshedTokens);
    return response;
  } catch (error) {
    if (isApiErrorLike(error)) {
      const response = NextResponse.json(
        { isSuccess: false, message: error.message, errors: error.errors },
        { status: error.status },
      );
      if (error.status === 401) {
        clearAuthCookies(response);
      }
      return response;
    }

    return NextResponse.json({ isSuccess: false, message: "Bildirimler getirilemedi." }, { status: 500 });
  }
}
