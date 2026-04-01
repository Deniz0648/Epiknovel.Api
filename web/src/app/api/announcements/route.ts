import { NextResponse } from "next/server";
import { isApiErrorLike } from "@/lib/api";
import { backendApiRequest } from "@/lib/backend-api";
import { toMediaProxyUrl } from "@/lib/media";

type AnnouncementDto = {
  id: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  isPinned: boolean;
  createdAt: string;
};

type AnnouncementsResponse = {
  items: AnnouncementDto[];
};

export async function GET() {
  try {
    const data = await backendApiRequest<AnnouncementsResponse>("/infrastructure/announcements", {
      method: "GET",
    });

    return NextResponse.json({
      isSuccess: true,
      message: "Duyurular getirildi.",
      data: {
        items: data.items.map((item) => ({
          ...item,
          imageUrl: toMediaProxyUrl(item.imageUrl),
        })),
      },
    });
  } catch (error) {
    if (isApiErrorLike(error)) {
      return NextResponse.json({ isSuccess: false, message: error.message, errors: error.errors }, { status: error.status });
    }

    return NextResponse.json({ isSuccess: false, message: "Duyurular getirilemedi." }, { status: 500 });
  }
}

