"use client";

import { BookCover } from "@/components/ui/book-cover";
import Link from "next/link";
import { BookOpen, Eye, Home, Play, Star, Tag } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { type BookChapterItem } from "@/components/book/book-detail-panels";
import { AddToLibraryButton } from "@/components/book/add-to-library-button";
import { apiRequest } from "@/lib/api";
import { RatingStars } from "@/components/book/rating-stars";
import dynamic from "next/dynamic";

const BookDetailPanels = dynamic(() => import("@/components/book/book-detail-panels").then(mod => mod.BookDetailPanels), {
  loading: () => (
    <div className="glass-frame flex min-h-168 items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3">
        <div className="loading loading-spinner loading-lg text-primary"></div>
        <p className="text-sm font-bold text-base-content/40 uppercase tracking-widest">Icerik Yukleniyor...</p>
      </div>
    </div>
  ),
  ssr: false
});

type BookDetailViewModel = {
  id: string;
  title: string;
  author: string;
  status: string;
  workType: string;
  ageRange: string;
  categories: string[];
  tags: string[];
  rating: number;
  voteCount: number;
  reads: number;
  chapters: number;
  cover: { image: string; blurDataURL: string };
  synopsis: string;
  userRating: number | null;
};

type ChapterSort = "newest" | "oldest";
type PageSize = 20 | 50 | 100 | 200;

type ChapterFilters = {
  query: string;
  sort: ChapterSort;
  pageSize: PageSize;
  page: number;
};

type ChapterApiItem = {
  id: string;
  slug: string;
  order?: number | null;
  title: string;
  publishedAt?: string | null;
  viewCount?: number | null;
  isFree?: boolean | null;
  authorName?: string;
};

type ChaptersResponse = {
  chapters: ChapterApiItem[];
  totalCount: number;
};

function mapChaptersFromApi(items: ChapterApiItem[]): BookChapterItem[] {
  return items.map((item, index) => ({
    id: item.id,
    slug: item.slug,
    number: item.order ?? index + 1,
    title: item.title,
    publishLabel: item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("tr-TR") : "Taslak",
    dateLabel: item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("tr-TR") : "-",
    readCount: item.viewCount ?? 0,
    isPremium: !item.isFree,
    authorName: item.authorName,
  }));
}

export default function BookDetailView({ initialData, bookSlug }: { initialData: BookDetailViewModel | null, bookSlug: string }) {
  const [detail, setDetail] = useState<BookDetailViewModel | null>(initialData);
  const [chapters, setChapters] = useState<BookChapterItem[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);

  const [filters, setFilters] = useState<ChapterFilters>({
    query: "",
    sort: "oldest",
    pageSize: 20,
    page: 1
  });
  const [totalChaptersCount, setTotalChaptersCount] = useState(0);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(filters.query);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.query]);

  const loadChapters = useCallback(async (isManualUpdate = false) => {
    if (!bookSlug || !detail?.id) return;

    try {
      if (isManualUpdate) setIsLoadingChapters(true);

      const sortBy = filters.sort === "newest" || filters.sort === "oldest" ? "Order" : filters.sort;
      const sortDescending = filters.sort === "newest";

      const chapterData = await apiRequest<ChaptersResponse>(
        `/books/${bookSlug}/chapters?pageNumber=${filters.page}&pageSize=${filters.pageSize}&sortBy=${sortBy}&sortDescending=${sortDescending}&searchTerm=${encodeURIComponent(debouncedQuery)}`
      );

      setChapters(mapChaptersFromApi(chapterData.chapters));
      setTotalChaptersCount(chapterData.totalCount);
    } catch (err) {
      console.error("Bolumler yuklenirken hata:", err);
    } finally {
      setIsLoadingChapters(false);
    }
  }, [bookSlug, debouncedQuery, detail?.id, filters.page, filters.pageSize, filters.sort]);

  useEffect(() => {
    void loadChapters(true);
  }, [loadChapters]);

  if (!detail) return null;

  return (
    <main className="relative overflow-hidden">
      <div className="site-shell mx-auto flex min-h-screen flex-col gap-6 px-4 pb-8 pt-28 sm:px-8 sm:pb-12 sm:pt-32">
        <section className="glass-frame relative w-full overflow-hidden px-4 py-6 sm:p-7">
          <div className="breadcrumbs text-xs font-semibold text-base-content/50 mb-1">
            <ul>
              <li><Link href="/" className="hover:text-primary transition-colors flex items-center"><Home className="w-3.5 h-3.5 mr-1.5" /> Ana Sayfa</Link></li>
              <li><Link href="/Books" className="hover:text-primary transition-colors">Kesfet</Link></li>
              <li className="text-base-content/40">{detail.title}</li>
            </ul>
          </div>

          <div className="grid items-stretch justify-items-center gap-6 lg:grid-cols-[minmax(0,0.3fr)_minmax(0,0.7fr)] lg:gap-7 lg:justify-items-stretch">
            <div className="mx-auto w-full max-w-70 lg:mx-0 lg:max-w-none">
              <div className="glass-frame relative aspect-2/3 overflow-hidden p-1.5">
                <div className="relative h-full w-full overflow-hidden rounded-[1.1rem]">
                  <BookCover
                    src={detail.cover.image}
                    alt={`${detail.title} kapagi`}
                    blurDataUrl={detail.cover.blurDataURL}
                    className="h-full w-full"
                    sizes="(max-width: 1024px) 54vw, 21vw"
                    priority
                  />
                </div>
              </div>
            </div>

            <div className="flex min-h-full w-full flex-col items-center space-y-4 text-center lg:items-start lg:text-left">
              <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
                <span className="rounded-full border border-base-content/14 bg-base-100/34 px-2.5 py-1 text-[11px] font-semibold">
                  {detail.workType}
                </span>
                {detail.categories.slice(0, 4).map((category) => (
                  <span
                    key={category}
                    className="rounded-full border border-base-content/14 bg-base-100/34 px-2.5 py-1 text-[11px] font-semibold"
                  >
                    {category}
                  </span>
                ))}
                <span className="rounded-full border border-base-content/14 bg-base-100/34 px-2.5 py-1 text-[11px] font-semibold">
                  {detail.status}
                </span>
                <span className="rounded-full border border-base-content/14 bg-base-100/34 px-2.5 py-1 text-[11px] font-semibold">
                  {detail.ageRange}
                </span>
              </div>

              <div className="space-y-1">
                <h1 className="text-balance text-[clamp(1.85rem,4.2vw,3rem)] font-black leading-[1.08] tracking-tight">
                  {detail.title}
                </h1>
                <p className="text-sm font-semibold text-base-content/65">
                  Yazar: {detail.author}
                </p>
              </div>

              <div className="grid w-full grid-cols-2 gap-3 rounded-2xl border border-base-content/12 bg-base-100/20 p-3.5 lg:grid-cols-4">
                <div className="space-y-1.5 text-center lg:text-left">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-base-content/55">
                    Mevcut Puan
                  </p>
                  <p className="inline-flex items-center gap-1 text-xl font-black text-warning">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="text-base-content">{detail.rating.toFixed(1)}</span>
                  </p>
                </div>
                <div className="space-y-1.5 text-center lg:text-left">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-base-content/55">
                    Puanlama
                  </p>
                  <div className="flex justify-center lg:justify-start">
                    <RatingStars
                      bookId={detail.id}
                      initialRating={detail.rating}
                      myRating={detail.userRating}
                      onRatingUpdated={(newAvg, newVoteCount, newMyRating) => {
                        setDetail(prev => prev ? ({
                          ...prev,
                          rating: newAvg,
                          voteCount: newVoteCount,
                          userRating: newMyRating
                        }) : null);
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-1.5 text-center lg:text-left">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-base-content/55">
                    Okunma
                  </p>
                  <p className="inline-flex items-center gap-2 text-base font-bold text-base-content/80">
                    <Eye className="h-4 w-4 text-primary" />
                    {detail.reads.toLocaleString("tr-TR")}
                  </p>
                </div>
                <div className="space-y-1.5 text-center lg:text-left">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-base-content/55">
                    Bolum Sayisi
                  </p>
                  <p className="inline-flex items-center gap-2 text-base font-bold text-base-content/80">
                    <BookOpen className="h-4 w-4 text-primary" />
                    {detail.chapters}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-base-content/55">
                  Konu
                </p>
                <p className="whitespace-pre-wrap wrap-break-word text-base leading-relaxed text-base-content/78 [word-break:break-word] lg:[word-break:normal]">
                  {detail.synopsis}
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 pt-4 sm:flex-row lg:justify-start">
                {chapters.length > 0 ? (
                  <Link
                    href={`/read/${bookSlug}/${chapters[0].slug}`}
                    className="btn btn-primary h-12 w-full rounded-2xl px-6 shadow-lg shadow-primary/20 transition-all sm:w-[30%] hover:scale-[1.02] active:scale-95"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span className="font-bold">Oku</span>
                  </Link>
                ) : (
                  <button disabled className="btn btn-primary h-12 w-full rounded-2xl px-6 opacity-50 shadow-none sm:w-[30%]">
                    <Play className="h-4 w-4 fill-current" />
                    <span className="font-bold">Oku</span>
                  </button>
                )}

                <AddToLibraryButton
                  bookId={detail.id}
                  bookStatus={detail.status}
                  className="w-full sm:flex-1"
                  direction="up"
                />
              </div>
            </div>
          </div>
        </section>

        <BookDetailPanels
          bookId={detail.id}
          authorName={detail.author}
          chapters={chapters}
          totalChaptersCount={totalChaptersCount}
          activeFilters={filters}
          onFiltersChange={(newFilters) => setFilters(newFilters)}
          isLoadingChapters={isLoadingChapters}
        />

        <section className="glass-frame p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-center gap-2 lg:justify-start">
            <Tag className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-black uppercase tracking-[0.08em] text-base-content/82">
              Etiketler
            </h2>
          </div>
          <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
            {detail.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full border border-base-content/15 bg-base-100/28 px-3 py-1.5 text-xs font-semibold text-base-content/82"
              >
                #{tag}
              </span>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
