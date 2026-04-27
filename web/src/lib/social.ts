import { apiRequest } from "@/lib/api";

export type ReadingStatus = "Reading" | "Completed" | "Dropped" | "OnHold" | "PlanToRead";

export type LibraryItemResponse = {
  id: string;
  bookId: string;
  bookTitle: string;
  bookSlug: string;
  bookCoverImageUrl?: string | null;
  status: ReadingStatus;
  addedAt: string;
  lastReadAt?: string | null;
  lastReadChapterId?: string | null;
  lastReadChapterSlug?: string | null;
  lastReadParagraphId?: string | null;
  progressPercentage: number;
};

export async function getLibraryList(request?: {
  status?: ReadingStatus;
  page?: number;
  size?: number;
}) {
  const searchParams = new URLSearchParams();
  if (request?.status) searchParams.set("status", request.status);
  if (request?.page) searchParams.set("page", String(request.page));
  if (request?.size) searchParams.set("size", String(request.size));

  return apiRequest<LibraryItemResponse[]>(`/social/library?${searchParams.toString()}`, {
    method: "GET",
    credentials: "include",
  });
}
