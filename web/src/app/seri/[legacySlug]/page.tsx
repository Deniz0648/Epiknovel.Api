import { backendApiRequest } from "@/lib/backend-api";
import { notFound, permanentRedirect } from "next/navigation";

type BookDetailData = {
  slug: string;
};

type BookListItem = {
  slug: string;
};

type BookListResponse = {
  items: BookListItem[];
};

type Props = {
  params: Promise<{ legacySlug: string }>;
};

async function resolveCurrentBookSlug(legacySlug: string) {
  try {
    const exactMatch = await backendApiRequest<BookDetailData>(`/books/${legacySlug}`, {
      next: { revalidate: 3600 },
    });

    if (exactMatch.slug) {
      return exactMatch.slug;
    }
  } catch {
    // Legacy slug may no longer be the current slug; fall back to prefix search.
  }

  try {
    const searchResult = await backendApiRequest<BookListResponse>(
      `/books?pageNumber=1&pageSize=10&search=${encodeURIComponent(legacySlug)}`,
      { next: { revalidate: 3600 } },
    );

    const normalizedLegacySlug = legacySlug.trim().toLowerCase();
    const matchedBook = searchResult.items.find((item) => {
      const currentSlug = item.slug.trim().toLowerCase();
      return currentSlug === normalizedLegacySlug || currentSlug.startsWith(`${normalizedLegacySlug}-`);
    });

    return matchedBook?.slug ?? null;
  } catch {
    return null;
  }
}

export default async function LegacySeriesRedirectPage({ params }: Props) {
  const { legacySlug } = await params;
  const currentSlug = await resolveCurrentBookSlug(legacySlug);

  if (!currentSlug) {
    notFound();
  }

  permanentRedirect(`https://test.epiknovel.com/Books/${currentSlug}`);
}
