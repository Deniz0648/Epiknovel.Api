import { Metadata } from "next";
import { backendApiRequest } from "@/lib/backend-api";
import { resolveMediaUrl } from "@/lib/api";
import BookDetailView from "@/components/book/book-detail-view";
import { getSessionTokens } from "@/lib/server-auth";
import Script from "next/script";
import type { BookCategoryItem } from "@/lib/auth";
import { notFound } from "next/navigation";

type BookDetailData = {
  id: string;
  title: string;
  authorName: string;
  description?: string | null;
  coverImageUrl?: string | null;
  status?: string | number | null;
  type?: string | number | null;
  contentRating?: string | number | null;
  categories?: BookCategoryItem[];
  tags?: string[];
  averageRating: number;
  voteCount: number;
  viewCount: number;
  userRating?: number | null;
  createdAt?: string | null;
};

type Props = {
  params: Promise<{ bookSlug: string }>;
};

function toDisplayValue(value: string | number | null | undefined) {
  return value == null ? "Bilinmiyor" : String(value);
}

async function getBookData(bookSlug: string, token?: string | null) {
  try {
    const bookData = await backendApiRequest<BookDetailData>(`/books/${bookSlug}`, {
      token,
      cache: token ? "no-store" : "default",
      next: token ? undefined : { revalidate: 3600 }
    });
    return bookData;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { bookSlug } = await params;
  const book = await getBookData(bookSlug);

  if (!book) {
    notFound();
  }

  const title = `${book.title} - ${book.authorName}`;
  const description = book.description?.substring(0, 160) || "Modern Okuma Platformu";
  const image = resolveMediaUrl(book.coverImageUrl) || "https://epiknovel.com/favicon.svg";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [image],
      type: "book",
      authors: [book.authorName],
      tags: book.tags || [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    alternates: {
      canonical: `https://epiknovel.com/Books/${bookSlug}`,
    }
  };
}

export default async function Page({ params }: Props) {
  const { bookSlug } = await params;
  const { accessToken } = await getSessionTokens();
  const bookData = await getBookData(bookSlug, accessToken);

  if (!bookData) {
    notFound();
  }

  const mappedData = {
    id: bookData.id,
    title: bookData.title,
    author: bookData.authorName || "Yazar",
    status: toDisplayValue(bookData.status),
    workType: toDisplayValue(bookData.type),
    ageRange: toDisplayValue(bookData.contentRating),
    categories: (bookData.categories ?? []).map((category) => category.name),
    tags: bookData.tags ?? [],
    rating: bookData.averageRating > 0 ? Number(bookData.averageRating.toFixed(1)) : 0,
    voteCount: bookData.voteCount || 0,
    reads: bookData.viewCount || 0,
    chapters: 0, // Will be loaded by client
    synopsis: bookData.description || "Açıklama bulunamadı.",
    cover: {
      image: resolveMediaUrl(bookData.coverImageUrl) || "/covers/cover-golge.svg",
      blurDataURL: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 12'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%2381ddd0'/%3E%3Cstop offset='1' stop-color='%231a2436'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='8' height='12' fill='url(%23g)'/%3E%3C/svg%3E",
    },
    userRating: bookData.userRating ?? null,
  };

  // 📝 JSON-LD Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    "name": bookData.title,
    "description": bookData.description,
    "image": resolveMediaUrl(bookData.coverImageUrl),
    "author": {
      "@type": "Person",
      "name": bookData.authorName
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": bookData.averageRating || 0,
      "ratingCount": bookData.voteCount || 1,
      "bestRating": 5,
      "worstRating": 1
    },
    "genre": (bookData.categories ?? []).map((category) => category.name).join(", "),
    "datePublished": bookData.createdAt
  };

  return (
    <>
      <Script
        id="book-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BookDetailView initialData={mappedData} bookSlug={bookSlug} />
    </>
  );
}
