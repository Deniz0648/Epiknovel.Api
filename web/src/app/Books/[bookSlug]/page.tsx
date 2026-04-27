"use client";

import Image from "next/image";
import Link from "next/link";
import { BookOpen, Eye, Home, Play, Star, Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  BookDetailPanels,
  type BookChapterItem,
} from "@/components/book/book-detail-panels";
import { AddToLibraryButton } from "@/components/book/add-to-library-button";
import { apiRequest, resolveMediaUrl } from "@/lib/api";
import { fromBookSlug } from "@/lib/books";
import { RatingStars } from "@/components/book/rating-stars";
import { showToast } from "@/lib/toast";

const DEFAULT_COVER = {
  image: "/covers/cover-golge.svg",
  blurDataURL:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 12'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%2381ddd0'/%3E%3Cstop offset='1' stop-color='%231a2436'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='8' height='12' fill='url(%23g)'/%3E%3C/svg%3E",
};

type BookDetailApiResponse = {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImageUrl?: string | null;
  authorName: string;
  status: string;
  contentRating: string;
  type: string;
  categories: { id: string; name: string; slug: string }[];
  tags: string[];
  averageRating: number;
  voteCount: number;
  viewCount: number;
  userRating?: number | null;
};

type ChaptersApiResponse = {
  chapters: {
    id: string;
    title: string;
    slug: string;
    order: number;
    wordCount: number;
    isFree: boolean;
    status: string;
    publishedAt?: string | null;
    viewCount: number;
    authorName: string;
  }[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
};



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

function mapChaptersFromApi(items: ChaptersApiResponse["chapters"]): (BookChapterItem & { slug: string })[] {
  return items.map((item, index) => ({
    id: item.id,
    slug: item.slug,
    number: item.order || index + 1,
    title: item.title,
    publishLabel: item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("tr-TR") : "Taslak",
    dateLabel: item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("tr-TR") : "-",
    readCount: item.viewCount || 0,
    isPremium: !item.isFree,
    authorName: item.authorName,
  }));
}


export default function BookDetailPage() {
  const params = useParams<{ bookSlug: string }>();
  const bookSlug = params?.bookSlug ?? "";
  const title = useMemo(() => fromBookSlug(bookSlug), [bookSlug]);
  const [detail, setDetail] = useState<BookDetailViewModel | null>(null);
  const [chapters, setChapters] = useState<BookChapterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // 🚄 Chapter Pagination & Filtering States
  const [filters, setFilters] = useState({
    query: "",
    sort: "oldest" as any,
    pageSize: 20 as any,
    page: 1
  });
  const [totalChaptersCount, setTotalChaptersCount] = useState(0);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");


  // ⏳ Debounce Search Query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(filters.query);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.query]);

  const loadChapters = async (isManualUpdate = false) => {
    if (!bookSlug || !detail?.id) return;

    try {
      if (isManualUpdate) setIsLoadingChapters(true);

      const sortBy = filters.sort === "newest" || filters.sort === "oldest" ? "Order" : filters.sort;
      const sortDescending = filters.sort === "newest";

      const chapterData = await apiRequest<ChaptersApiResponse>(
        `/books/${bookSlug}/chapters?pageNumber=${filters.page}&pageSize=${filters.pageSize}&sortBy=${sortBy}&sortDescending=${sortDescending}&searchTerm=${encodeURIComponent(debouncedQuery)}`
      );

      setChapters(mapChaptersFromApi(chapterData.chapters));
      setTotalChaptersCount(chapterData.totalCount);
    } catch (err) {
      console.error("Bolumler yuklenirken hata:", err);
    } finally {
      setIsLoadingChapters(false);
    }
  };

  // 🔄 Trigger Chapter Load on Filter Change
  useEffect(() => {
    if (detail?.id) {
       void loadChapters(true);
    }
  }, [debouncedQuery, filters.sort, filters.pageSize, filters.page, detail?.id]);

  useEffect(() => {
    if (!bookSlug) return;

    let isMounted = true;

    async function loadBook() {
      try {
        setIsLoading(true);
        setApiError(null);
        
        // 1. Önce kitap detaylarını çek
        const bookData = await apiRequest<BookDetailApiResponse>(`/books/${bookSlug}`);
        
        if (!isMounted) return;

        const bookId = (bookData as any).id || (bookData as any).Id;

        // 2. Kitap ID'sini kullanarak bölümleri çek (Sayfalı ve Filtreli)
        const chapterData = await apiRequest<ChaptersApiResponse>(
           `/books/${bookSlug}/chapters?pageNumber=1&pageSize=${filters.pageSize}&sortBy=Order&sortDescending=${filters.sort === "newest"}`
        );

        setDetail({
          id: bookId,
          title: bookData.title,
          author: bookData.authorName || "Yazar",
          status: bookData.status || "Bilinmiyor",
          workType: bookData.type || "Bilinmiyor",
          ageRange: bookData.contentRating || "Bilinmiyor",
          categories: (bookData.categories ?? []).map((x) => x.name),
          tags: bookData.tags ?? [],
          rating: bookData.averageRating > 0 ? Number(bookData.averageRating.toFixed(1)) : 0,
          voteCount: 0, 
          reads: bookData.viewCount > 0 ? bookData.viewCount : 0,
          chapters: chapterData.totalCount > 0 ? chapterData.totalCount : 0,
          synopsis: bookData.description || "Aciklama bulunamadi.",
          cover: {
            image: resolveMediaUrl(bookData.coverImageUrl) || DEFAULT_COVER.image,
            blurDataURL: DEFAULT_COVER.blurDataURL,
          },
          userRating: bookData.userRating ?? null,
        });

        setChapters(chapterData.chapters.length > 0 ? mapChaptersFromApi(chapterData.chapters) : []);
        setTotalChaptersCount(chapterData.totalCount);
      } catch (err) {
        if (!isMounted) return;
        setDetail(null);
        setChapters([]);
        setApiError("Kitap detayi yuklenemedi.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadBook();
    return () => {
      isMounted = false;
    };
  }, [bookSlug]);

  if (isLoading) {
    return (
      <main className="relative overflow-hidden">
        <div className="site-shell mx-auto flex min-h-screen items-center justify-center px-4 sm:px-8">
          <p className="text-sm font-semibold text-base-content/70">Kitap yukleniyor...</p>
        </div>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="relative overflow-hidden">
        <div className="site-shell mx-auto flex min-h-screen items-center justify-center px-4 sm:px-8">
          <p className="text-sm font-semibold text-error">{apiError ?? "Kitap bulunamadi."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative overflow-hidden">
      <div className="site-shell mx-auto flex min-h-screen flex-col gap-6 px-4 pb-8 pt-28 sm:px-8 sm:pb-12 sm:pt-32">
        <section className="glass-frame space-y-5 p-5 sm:p-7">
          <div className="breadcrumbs text-xs font-semibold text-base-content/50 mb-1">
            <ul>
              <li><Link href="/" className="hover:text-primary transition-colors flex items-center"><Home className="w-3.5 h-3.5 mr-1.5" /> Ana Sayfa</Link></li>
              <li><Link href="/Books" className="hover:text-primary transition-colors">Kesfet</Link></li>
              <li className="text-base-content/40">{detail.title}</li>
            </ul>
          </div>

          <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)] lg:gap-7">
            <div className="mx-auto w-full max-w-70">
              <div className="glass-frame relative aspect-2/3 overflow-hidden p-1.5">
                <div className="relative h-full w-full overflow-hidden rounded-[1.1rem]">
                  <Image
                    src={detail.cover.image}
                    alt={`${detail.title} kapagi`}
                    fill
                    placeholder="blur"
                    blurDataURL={detail.cover.blurDataURL}
                    className="object-cover"
                    sizes="(max-width: 1024px) 54vw, 21vw"
                  />
                </div>
              </div>
            </div>

            <div className="flex min-h-full flex-col space-y-3.5">
              <div className="flex flex-wrap gap-2">
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

              <div className="grid gap-3 rounded-2xl border border-base-content/12 bg-base-100/20 p-3.5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-base-content/55">
                    Mevcut Puan
                  </p>
                  <p className="inline-flex items-center gap-1 text-xl font-black text-warning">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="text-base-content">{detail.rating.toFixed(1)}</span>
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-base-content/55">
                    Puanlama
                  </p>
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
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-base-content/55">
                    Okunma
                  </p>
                  <p className="inline-flex items-center gap-2 text-base font-bold text-base-content/80">
                    <Eye className="h-4 w-4 text-primary" />
                    {detail.reads.toLocaleString("tr-TR")}
                  </p>
                </div>
                <div className="space-y-1.5">
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
                <p className="text-base leading-relaxed text-base-content/78">
                  {detail.synopsis}
                </p>
              </div>

              <div className="flex w-full items-center gap-3 pt-4">
                {chapters.length > 0 ? (
                  <Link 
                    href={`/read/${bookSlug}/${chapters[0].slug}`} 
                    className="btn btn-primary h-12 w-[30%] rounded-2xl px-6 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span className="font-bold">Oku</span>
                  </Link>
                ) : (
                  <button disabled className="btn btn-primary h-12 w-[30%] rounded-2xl px-6 opacity-50 shadow-none">
                    <Play className="h-4 w-4 fill-current" />
                    <span className="font-bold">Oku</span>
                  </button>
                )}

                {/* 📚 PREMIUM DROPDOWN KÜTÜPHANE YÖNETİMİ */}
                <AddToLibraryButton 
                  bookId={detail.id} 
                  bookStatus={detail.status} 
                  className="flex-1"
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

        <section className="glass-frame p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-black uppercase tracking-[0.08em] text-base-content/82">
              Etiketler
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
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
