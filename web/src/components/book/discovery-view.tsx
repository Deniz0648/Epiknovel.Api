"use client";

import { BookCover } from "@/components/ui/book-cover";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, Home, Search, Sparkles, Star } from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { apiRequest, resolveMediaUrl } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { PROTECTED_STATUSES, WORK_TYPES, AGE_RANGES } from "@/constants/books";

type QuickFilterKey =
  | "newest"
  | "popular"
  | "trending"
  | "topRated"
  | "recentlyUpdated";

type BookStatusLabel = "Devam Ediyor" | "Tamamlandi" | "Ara Verildi" | "Iptal Edildi" | "Taslak";
type WorkTypeLabel = "Ceviri" | "Orijinal";
type AgeRangeLabel = "G" | "PG13" | "R";

type Book = {
  id: string;
  slug: string;
  title: string;
  category: string;
  editorChoice: boolean;
  status: BookStatusLabel;
  workType: WorkTypeLabel;
  ageRange: AgeRangeLabel;
  rating: number;
  reads: number;
  chapters: number;
  trendScore: number;
  priceLabel: string;
  author: string;
  cover: string;
  description: string;
};

type FilterOption = {
  value: string | number;
  label: string;
};

type ApiCategory = {
  id: string;
  name: string;
  slug: string;
};

type BooksApiItem = {
  title: string;
  slug: string;
  description: string;
  coverImageUrl?: string | null;
  authorName?: string | null;
  type: number;
  status: number;
  contentRating: number;
  isEditorChoice: boolean;
  viewCount: number;
  averageRating: number;
  voteCount: number;
  chapterCount: number;
  categoryNames: string[];
  isFree?: boolean | null;
  coinPrice?: number | null;
  chapterPrice?: number | null;
  minChapterPrice?: number | null;
  minimumChapterPrice?: number | null;
  createdAt?: string;
  updatedAt?: string | null;
};

type BooksApiResponse = {
  items: BooksApiItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
};

const COVER_ASSETS = {
  blurDataURL: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 12'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%2381ddd0'/%3E%3Cstop offset='1' stop-color='%231a2436'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='8' height='12' fill='url(%23g)'/%3E%3C/svg%3E",
  default: "/covers/cover-golge.svg"
};

const QUICK_FILTERS: ReadonlyArray<{ key: QuickFilterKey; label: string; sortBy: string; sortDescending: boolean }> = [
  { key: "newest", label: "En Yeniler", sortBy: "CreatedAt", sortDescending: true },
  { key: "popular", label: "Popüler", sortBy: "ViewCount", sortDescending: true },
  { key: "topRated", label: "En Yuksek Puan", sortBy: "AverageRating", sortDescending: true },
  { key: "trending", label: "Trend", sortBy: "ViewCount", sortDescending: true },
  { key: "recentlyUpdated", label: "Guncellenenler", sortBy: "UpdatedAt", sortDescending: true },
];

function formatCompactRead(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

function hydrateBookFromApi(item: BooksApiItem): Book {
  const statusLabels: BookStatusLabel[] = ["Taslak", "Devam Ediyor", "Tamamlandi", "Ara Verildi", "Iptal Edildi"];
  const ageLabels: AgeRangeLabel[] = ["G", "PG13", "R"];

  const chapterPriceCandidates = [
    item.coinPrice,
    item.chapterPrice,
    item.minChapterPrice,
    item.minimumChapterPrice
  ];
  const firstPrice = chapterPriceCandidates.find((value) => typeof value === "number" && Number.isFinite(value)) ?? 0;
  const isPaid = firstPrice > 0 || item.isFree === false;
  const priceLabel = isPaid
    ? (firstPrice > 0 ? `Bölümler ${firstPrice}+ coin` : "Bölümler coin ile ücretli")
    : "Ücretsiz";
  const updatedAtTs = item.updatedAt ? Date.parse(item.updatedAt) : Number.NaN;
  const createdAtTs = item.createdAt ? Date.parse(item.createdAt) : Number.NaN;
  const now = Date.now();
  const recencyDays = Number.isFinite(updatedAtTs)
    ? Math.max(0, (now - updatedAtTs) / 86400000)
    : Number.isFinite(createdAtTs)
      ? Math.max(0, (now - createdAtTs) / 86400000)
      : 365;
  const recencyWeight = Math.max(0, 1 - recencyDays / 30);
  const trendScore = (item.viewCount * 0.55) + (item.averageRating * 220) + (item.voteCount * 8) + (recencyWeight * 1500);

  return {
    id: item.slug,
    slug: item.slug,
    title: item.title,
    category: item.categoryNames?.[0] || "Genel",
    editorChoice: item.isEditorChoice,
    status: statusLabels[item.status] || "Taslak",
    workType: item.type === 1 ? "Ceviri" : "Orijinal",
    ageRange: ageLabels[item.contentRating] || "G",
    rating: item.averageRating,
    reads: item.viewCount,
    chapters: item.chapterCount,
    trendScore,
    priceLabel,
    author: item.authorName || "Bilinmiyor",
    cover: resolveMediaUrl(item.coverImageUrl) || COVER_ASSETS.default,
    description: item.description || "",
  };
}

function BookCard({ book, onPreview }: { book: Book; onPreview?: (book: Book) => void }) {
  return (
    <Link
      href={`/Books/${book.slug}`}
      className="glass-frame group block h-full p-3 transition-all duration-300 hover:translate-y-[-4px]"
      onMouseEnter={() => onPreview?.(book)}
      onFocus={() => onPreview?.(book)}
    >
      <div className="relative aspect-2/3 w-full overflow-hidden rounded-xl border border-base-content/12">
        <BookCover src={book.cover} alt={book.title} className="h-full w-full transition duration-300 group-hover:scale-[1.05]" sizes="(max-width: 640px) 115px, (max-width: 768px) 210px, (max-width: 1024px) 240px, 310px" />
        <div className="absolute inset-x-2 top-2 flex flex-col gap-1 pointer-events-none">
          <span className="w-fit rounded-lg bg-base-100/78 px-1.5 py-0.5 text-[9px] font-black uppercase">{book.workType}</span>
          {book.editorChoice && <span className="w-fit rounded-lg bg-secondary/85 px-1.5 py-0.5 text-[9px] font-black uppercase text-secondary-content">Editor Secimi</span>}
        </div>
        <span className="absolute right-2 top-2 rounded-lg bg-base-100/78 px-1.5 py-0.5 text-[9px] font-black uppercase">{book.ageRange}</span>
      </div>
      <div className="mt-3 space-y-1.5">
        <h2 className="line-clamp-2 text-sm font-bold group-hover:text-primary transition-colors">{book.title}</h2>
        <p className="text-[11px] font-semibold text-base-content/60">{book.author}</p>
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-1 text-warning"><Star className="h-3.5 w-3.5 fill-current" /><span className="text-xs font-bold text-base-content">{book.rating.toFixed(1)}</span></div>
           <span className="text-[10px] font-bold text-primary uppercase">{book.category}</span>
        </div>
        <div className="flex items-center justify-between pt-1 opacity-60 text-[10px] font-semibold">
           <span>{book.chapters} Bolum</span>
           <span>{formatCompactRead(book.reads)} Okunma</span>
        </div>
        <div className="pt-1">
          <span className={`rounded-md px-2 py-0.5 text-[10px] font-black ${book.priceLabel === "Ücretsiz" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
            {book.priceLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}

function PaginationControls({
  currentPage,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  onPageChange: (page: number) => void;
}) {
  if (!totalPages || totalPages <= 0) return null;
  const compactMode = totalPages > 7;
  return (
    <>
      {/* First Page */}
      <button
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="btn btn-sm h-10 w-10 rounded-xl border-base-content/10 bg-base-100/32 p-0 transition-all hover:bg-primary hover:text-primary-content disabled:opacity-20"
        title="İlk Sayfa"
      >
        <ChevronsLeft className="h-4 w-4" />
      </button>

      {/* Previous Page */}
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={!hasPreviousPage}
        className="btn btn-sm h-10 w-10 rounded-xl border-base-content/10 bg-base-100/32 p-0 transition-all hover:bg-primary hover:text-primary-content disabled:opacity-20"
        title="Önceki Sayfa"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-1 md:gap-1.5">
        {(() => {
          const range: (number | string)[] = [];

          if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) range.push(i);
          } else {
            range.push(1);
            if (currentPage > 3) range.push("...");

            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
              if (!range.includes(i)) range.push(i);
            }

            if (currentPage < totalPages - 2) range.push("...");
            if (!range.includes(totalPages)) range.push(totalPages);
          }

          return range.map((p, idx) =>
            typeof p === "number" ? (
              <button
                key={idx}
                onClick={() => onPageChange(p)}
                className={`btn btn-sm h-9 w-9 rounded-xl border-none p-0 text-xs transition-all md:h-10 md:w-10 md:text-sm ${
                  currentPage === p
                    ? "bg-primary font-black text-primary-content shadow-lg shadow-primary/25"
                    : "bg-base-100/32 font-bold hover:bg-base-100/50"
                }`}
              >
                {p}
              </button>
            ) : (
              <span
                key={idx}
                className="hidden h-9 w-5 items-center justify-center text-xs font-black opacity-30 md:flex md:h-10 md:w-8 md:text-sm"
              >
                {p}
              </span>
            ),
          );
        })()}
      </div>

      {/* Next Page */}
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={!hasNextPage}
        className={`btn btn-sm rounded-xl border-base-content/10 bg-base-100/32 p-0 transition-all hover:bg-primary hover:text-primary-content disabled:opacity-20 ${compactMode ? "h-9 w-9 md:h-10 md:w-10" : "h-10 w-10"}`}
        title="Sonraki Sayfa"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Last Page */}
      <button
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className={`btn btn-sm rounded-xl border-base-content/10 bg-base-100/32 p-0 transition-all hover:bg-primary hover:text-primary-content disabled:opacity-20 ${compactMode ? "h-9 w-9 md:h-10 md:w-10" : "h-10 w-10"}`}
        title="Son Sayfa"
      >
        <ChevronsRight className="h-4 w-4" />
      </button>
    </>
  );
}

function FilterSection({
  title,
  name,
  options,
  selectedValue,
  onToggle,
  ariaLabelPrefix,
  maxHeightClass = ""
}: {
  title: string;
  name: string;
  options: FilterOption[];
  selectedValue: string | number | null;
  onToggle: (value: string | number) => void;
  ariaLabelPrefix: string;
  maxHeightClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-base-content/12 bg-base-100/24 p-4">
      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-base-content/40">{title}</p>
      <div className={`space-y-2 ${maxHeightClass}`}>
        {options.map((option) => (
          <label key={String(option.value)} className="flex cursor-pointer items-center gap-2.5 text-sm transition-colors hover:text-primary">
            <input
              type="radio"
              name={name}
              aria-label={`${ariaLabelPrefix} ${option.label}`}
              className="radio radio-xs"
              checked={selectedValue === option.value}
              onChange={() => onToggle(option.value)}
            />
            <span className={selectedValue === option.value ? "font-bold text-primary" : "font-medium"}>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function DiscoveryView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilterKey>("newest");
  const [pageSize, setPageSize] = useState(16);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<number | null>(null);
  const [selectedWorkType, setSelectedWorkType] = useState<number | null>(null);
  const [selectedAgeRange, setSelectedAgeRange] = useState<number | null>(null);
  const [editorOnly, setEditorOnly] = useState(false);
  
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [apiResponse, setApiResponse] = useState<BooksApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHydratedFromUrl, setIsHydratedFromUrl] = useState(false);
  const [previewBook, setPreviewBook] = useState<Book | null>(null);
  const [libraryBookSlugs, setLibraryBookSlugs] = useState<string[]>([]);
  const [libraryTitleTokens, setLibraryTitleTokens] = useState<string[]>([]);

  const quickFilterSet = useMemo(() => new Set(QUICK_FILTERS.map((item) => item.key)), []);

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    const quick = searchParams.get("quick");
    const nextQuick = quick && quickFilterSet.has(quick as QuickFilterKey) ? (quick as QuickFilterKey) : "newest";
    const nextPageSize = Number.parseInt(searchParams.get("pageSize") ?? "16", 10);
    const allowedPageSizes = new Set([8, 16, 24, 32, 48, 100]);
    const nextCurrentPage = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const nextCategoryId = searchParams.get("categoryId");
    const nextStatus = searchParams.get("status");
    const nextWorkType = searchParams.get("workType");
    const nextAgeRange = searchParams.get("ageRange");
    const nextEditorOnly = searchParams.get("editorOnly") === "1";

    const timer = window.setTimeout(() => {
      setSearchQuery(q);
      setDebouncedSearchQuery(q);
      setActiveQuickFilter(nextQuick);
      setPageSize(allowedPageSizes.has(nextPageSize) ? nextPageSize : 16);
      setCurrentPage(nextCurrentPage);
      setSelectedCategoryId(nextCategoryId || null);
      setSelectedStatus(nextStatus !== null ? Number.parseInt(nextStatus, 10) : null);
      setSelectedWorkType(nextWorkType !== null ? Number.parseInt(nextWorkType, 10) : null);
      setSelectedAgeRange(nextAgeRange !== null ? Number.parseInt(nextAgeRange, 10) : null);
      setEditorOnly(nextEditorOnly);
      setIsHydratedFromUrl(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [searchParams, quickFilterSet]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!isHydratedFromUrl) return;

    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (activeQuickFilter !== "newest") params.set("quick", activeQuickFilter);
    if (pageSize !== 16) params.set("pageSize", String(pageSize));
    if (currentPage > 1) params.set("page", String(currentPage));
    if (selectedCategoryId) params.set("categoryId", selectedCategoryId);
    if (selectedStatus !== null) params.set("status", String(selectedStatus));
    if (selectedWorkType !== null) params.set("workType", String(selectedWorkType));
    if (selectedAgeRange !== null) params.set("ageRange", String(selectedAgeRange));
    if (editorOnly) params.set("editorOnly", "1");

    const nextUrl = params.toString() ? `${pathname}?${params}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [
    activeQuickFilter,
    currentPage,
    editorOnly,
    isHydratedFromUrl,
    pageSize,
    pathname,
    router,
    searchQuery,
    selectedAgeRange,
    selectedCategoryId,
    selectedStatus,
    selectedWorkType
  ]);

  useEffect(() => {
    apiRequest<{ categories: ApiCategory[] }>("/books/categories")
      .then(res => setCategories(res.categories))
      .catch(() => console.error("Kategoriler yuklenemedi."));
  }, []);

  useEffect(() => {
    apiRequest<Array<{ bookSlug: string; bookTitle: string }>>("/social/library?pageSize=50")
      .then((items) => {
        const slugs = items.map((x) => x.bookSlug).filter(Boolean);
        const tokens = items
          .flatMap((x) => (x.bookTitle || "").toLowerCase().split(/\s+/))
          .map((t) => t.trim())
          .filter((t) => t.length >= 4)
          .slice(0, 80);
        setLibraryBookSlugs(slugs);
        setLibraryTitleTokens(tokens);
      })
      .catch(() => {
        setLibraryBookSlugs([]);
        setLibraryTitleTokens([]);
      });
  }, []);

  const fetchBooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const qf = QUICK_FILTERS.find(f => f.key === activeQuickFilter);
      let url = `/books?pageNumber=${currentPage}&pageSize=${pageSize}&sortBy=${qf?.sortBy}&sortDescending=${qf?.sortDescending}`;
      
      if (debouncedSearchQuery) url += `&search=${encodeURIComponent(debouncedSearchQuery)}`;
      if (selectedCategoryId) url += `&CategoryId=${selectedCategoryId}`;
      if (selectedStatus !== null) url += `&Status=${selectedStatus}`;
      if (selectedWorkType !== null) url += `&Type=${selectedWorkType}`;
      if (selectedAgeRange !== null) url += `&ContentRating=${selectedAgeRange}`;
      if (editorOnly) url += `&IsEditorChoice=true`;

      const rawData = await apiRequest<BooksApiResponse>(url);
      
      const normalizedPageNumber = rawData.pageNumber || currentPage;
      const normalizedPageSize = rawData.pageSize || pageSize;
      const normalizedTotalCount = rawData.totalCount || 0;
      const normalizedTotalPages = rawData.totalPages ?? (
        normalizedPageSize > 0 ? Math.ceil(normalizedTotalCount / normalizedPageSize) : 0
      );

      // Merge with default values/calculations
      const data: BooksApiResponse = {
        ...rawData,
        pageNumber: normalizedPageNumber,
        pageSize: normalizedPageSize,
        totalCount: normalizedTotalCount,
        totalPages: normalizedTotalPages,
        hasNextPage: rawData.hasNextPage ?? (normalizedPageNumber < normalizedTotalPages),
        hasPreviousPage: rawData.hasPreviousPage ?? (normalizedPageNumber > 1)
      };

      setApiResponse(data);
      setError(null);
    } catch {
      setError("Eserler yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, activeQuickFilter, debouncedSearchQuery, selectedCategoryId, selectedStatus, selectedWorkType, selectedAgeRange, editorOnly]);

  useEffect(() => {
    if (!isHydratedFromUrl) return;
    const run = async () => {
      await fetchBooks();
    };
    void run();
  }, [fetchBooks, isHydratedFromUrl]);

  const books = useMemo(() => {
    const mapped = apiResponse?.items.map(hydrateBookFromApi) || [];
    if (activeQuickFilter === "trending") {
      return [...mapped].sort((a, b) => b.trendScore - a.trendScore);
    }
    if (libraryBookSlugs.length > 0 || libraryTitleTokens.length > 0) {
      return [...mapped].sort((a, b) => {
        const aInLibrary = libraryBookSlugs.includes(a.slug) ? -1000 : 0;
        const bInLibrary = libraryBookSlugs.includes(b.slug) ? -1000 : 0;
        const aTokenBoost = libraryTitleTokens.some((t) => a.title.toLowerCase().includes(t)) ? 100 : 0;
        const bTokenBoost = libraryTitleTokens.some((t) => b.title.toLowerCase().includes(t)) ? 100 : 0;
        return (b.trendScore + bTokenBoost + bInLibrary) - (a.trendScore + aTokenBoost + aInLibrary);
      });
    }
    return mapped;
  }, [apiResponse, activeQuickFilter, libraryBookSlugs, libraryTitleTokens]);
  const selectedCategoryName = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId)?.name ?? null,
    [categories, selectedCategoryId]
  );

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];
    if (searchQuery.trim()) chips.push({ key: "q", label: `Arama: ${searchQuery.trim()}`, onRemove: () => setSearchQuery("") });
    if (selectedCategoryId) chips.push({ key: "category", label: `Kategori: ${selectedCategoryName ?? "Secili"}`, onRemove: () => setSelectedCategoryId(null) });
    if (selectedStatus !== null) {
      const statusLabel = PROTECTED_STATUSES.find((s) => s.value === selectedStatus)?.label ?? String(selectedStatus);
      chips.push({ key: "status", label: `Durum: ${statusLabel}`, onRemove: () => setSelectedStatus(null) });
    }
    if (selectedWorkType !== null) {
      const workTypeLabel = WORK_TYPES.find((s) => s.value === selectedWorkType)?.label ?? String(selectedWorkType);
      chips.push({ key: "workType", label: `Tip: ${workTypeLabel}`, onRemove: () => setSelectedWorkType(null) });
    }
    if (selectedAgeRange !== null) {
      const ageRangeLabel = AGE_RANGES.find((s) => s.value === selectedAgeRange)?.label ?? String(selectedAgeRange);
      chips.push({ key: "ageRange", label: `Yas: ${ageRangeLabel}`, onRemove: () => setSelectedAgeRange(null) });
    }
    if (editorOnly) chips.push({ key: "editor", label: "Editor Secimi", onRemove: () => setEditorOnly(false) });
    return chips;
  }, [editorOnly, searchQuery, selectedAgeRange, selectedCategoryId, selectedCategoryName, selectedStatus, selectedWorkType]);

  useEffect(() => {
    if (!isHydratedFromUrl) return;
    trackEvent("discovery_filters_changed", {
      q: searchQuery || "",
      quick: activeQuickFilter,
      categoryId: selectedCategoryId,
      status: selectedStatus,
      workType: selectedWorkType,
      ageRange: selectedAgeRange,
      editorOnly,
      page: currentPage,
      pageSize
    });
  }, [isHydratedFromUrl, searchQuery, activeQuickFilter, selectedCategoryId, selectedStatus, selectedWorkType, selectedAgeRange, editorOnly, currentPage, pageSize]);

  useEffect(() => {
    if (!isHydratedFromUrl || isLoading) return;
    if (books.length === 0) {
      trackEvent("discovery_no_results", {
        q: searchQuery || "",
        quick: activeQuickFilter,
        categoryId: selectedCategoryId,
        status: selectedStatus,
        workType: selectedWorkType,
        ageRange: selectedAgeRange,
        editorOnly
      });
    }
  }, [isHydratedFromUrl, isLoading, books.length, searchQuery, activeQuickFilter, selectedCategoryId, selectedStatus, selectedWorkType, selectedAgeRange, editorOnly]);

  return (
    <main className="relative overflow-hidden">
      <div className="site-shell mx-auto flex min-h-screen flex-col gap-6 px-4 pb-8 pt-28 sm:px-8 sm:pb-12 sm:pt-32">
        <section className="glass-frame space-y-7 p-4 sm:p-6">
          <div className="flex flex-col gap-6">
            <div className="space-y-4">
              <div className="breadcrumbs text-xs font-semibold text-base-content/50 mb-1">
                <ul>
                  <li><Link href="/" className="hover:text-primary transition-colors flex items-center"><Home className="w-3.5 h-3.5 mr-1.5" /> Ana Sayfa</Link></li>
                  <li className="text-base-content/40">Kesfet</li>
                </ul>
              </div>
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 text-primary">
                  <Sparkles className="h-7 w-7" strokeWidth={2.5} />
                  <h1 className="hero-title-gradient text-3xl font-black tracking-tight sm:text-4xl uppercase italic">Kesfet</h1>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pt-4 border-t border-base-content/5">
            <p className="text-xs font-black uppercase tracking-widest text-base-content/30 italic">Sitedeki eserleri kriterlerinize göre süzebilirsiniz.</p>
            <label className="input input-bordered flex h-11 w-full items-center gap-2 rounded-xl border-base-content/15 bg-base-100/32 md:max-w-md">
              <Search className="h-4 w-4 text-base-content/60" />
              <input type="text" value={searchQuery} placeholder="Eser ara..." className="w-full bg-transparent text-sm" 
                     onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
            </label>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {QUICK_FILTERS.map((f) => (
                <button key={f.key} onClick={() => { setActiveQuickFilter(f.key); setCurrentPage(1); trackEvent("discovery_quick_filter_change", { quick_filter: f.key }); }}
                        aria-pressed={activeQuickFilter === f.key}
                        aria-label={`Hızlı filtre: ${f.label}`}
                        className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${activeQuickFilter === f.key ? "bg-primary text-primary-content" : "bg-base-100/28 text-base-content/75 border border-base-content/15 hover:border-primary/30"}`}>
                  {f.label}
                </button>
              ))}
            </div>
            
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-base-content/5 pt-4 sm:justify-end sm:gap-6 sm:border-0 sm:pt-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-base-content/30 italic sm:hidden">Gosterim</p>
                <select aria-label="Sayfa başına eser sayısı" className="select select-bordered select-sm sm:select-xs rounded-lg font-bold bg-base-100/32 min-h-0 h-9 sm:h-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}>
                  {[8, 16, 24, 32, 48, 100].map(v => <option key={v} value={v}>{v} Adet</option>)}
                </select>
              </div>
              
              <div className="ml-auto hidden flex-col items-end leading-none sm:ml-0 sm:flex sm:items-start">
                <span className="text-lg font-black italic text-primary">{apiResponse?.totalCount || 0}</span>
                <span className="text-[9px] font-black uppercase tracking-tighter text-base-content/40">Toplam Eser</span>
              </div>
            </div>
          </div>

          {activeFilterChips.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-base-content/12 bg-base-100/24 p-3">
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  aria-label={`Filtreyi kaldır: ${chip.label}`}
                  onClick={() => {
                    chip.onRemove();
                    setCurrentPage(1);
                  }}
                  className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold text-primary hover:bg-primary/20"
                >
                  {chip.label} ×
                </button>
              ))}
            </div>
          ) : null}

          <div className="grid gap-4 sm:gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <button type="button" onClick={() => setIsFiltersOpen(!isFiltersOpen)} className="glass-frame flex w-full items-center justify-between p-3.5 lg:hidden">
                <div className="flex items-center gap-2.5"><Filter className="h-4.5 w-4.5 text-primary" /><span className="text-sm font-bold">Filtreler</span></div>
                <ChevronDown className={`h-4.5 w-4.5 transition-transform duration-300 ${isFiltersOpen ? "rotate-180" : ""}`} />
              </button>

              <div className={`${isFiltersOpen ? "flex" : "hidden"} flex-col gap-4 lg:flex`}>
                <FilterSection
                  title="Kategori"
                  name="category-filter"
                  ariaLabelPrefix="Kategori"
                  selectedValue={selectedCategoryId}
                  onToggle={(value) => {
                    const nextValue = String(value);
                    setSelectedCategoryId(selectedCategoryId === nextValue ? null : nextValue);
                    setCurrentPage(1);
                  }}
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  maxHeightClass="max-h-[196px] overflow-y-auto pr-2 custom-scrollbar"
                />

                <FilterSection
                  title="Durum"
                  name="status-filter"
                  ariaLabelPrefix="Durum"
                  selectedValue={selectedStatus}
                  onToggle={(value) => {
                    const nextValue = Number(value);
                    setSelectedStatus(selectedStatus === nextValue ? null : nextValue);
                    setCurrentPage(1);
                  }}
                  options={PROTECTED_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
                />

                <FilterSection
                  title="Eser Tipi"
                  name="worktype-filter"
                  ariaLabelPrefix="Eser tipi"
                  selectedValue={selectedWorkType}
                  onToggle={(value) => {
                    const nextValue = Number(value);
                    setSelectedWorkType(selectedWorkType === nextValue ? null : nextValue);
                    setCurrentPage(1);
                  }}
                  options={WORK_TYPES.map((s) => ({ value: s.value, label: s.label }))}
                />

                <FilterSection
                  title="Yas Araligi"
                  name="agerange-filter"
                  ariaLabelPrefix="Yaş aralığı"
                  selectedValue={selectedAgeRange}
                  onToggle={(value) => {
                    const nextValue = Number(value);
                    setSelectedAgeRange(selectedAgeRange === nextValue ? null : nextValue);
                    setCurrentPage(1);
                  }}
                  options={AGE_RANGES.map((s) => ({ value: s.value, label: s.label }))}
                />

                <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-base-content/12 bg-base-100/24 p-4 hover:bg-base-100/32 transition-colors">
                  <input type="checkbox" className="checkbox checkbox-xs" checked={editorOnly} onChange={(e) => { setEditorOnly(e.target.checked); setCurrentPage(1); }} />
                  <span className="text-[11px] font-black uppercase tracking-wider">Editor Secimi</span>
                </label>

                <button onClick={() => { setSearchQuery(""); setSelectedCategoryId(null); setSelectedStatus(null); setSelectedWorkType(null); setSelectedAgeRange(null); setEditorOnly(false); setCurrentPage(1); }}
                        className="btn btn-outline btn-sm w-full rounded-xl border-base-content/15 font-bold">Sıfırla</button>
              </div>
            </aside>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-1.5 rounded-2xl border border-base-content/12 bg-base-100/24 px-3 py-2.5 text-xs font-semibold text-base-content/70 sm:grid-cols-3 sm:gap-2">
                <span>
                  {apiResponse?.totalCount ?? 0} sonuç
                </span>
                <span className="sm:text-center">
                  Sayfa {apiResponse?.pageNumber ?? currentPage} / {apiResponse?.totalPages ?? 1}
                </span>
                <span className="sm:text-right">
                  Sayfa başına {apiResponse?.pageSize ?? pageSize}
                </span>
              </div>

              {error && (
                <div className="rounded-xl border border-error/20 bg-error/10 p-4">
                  <p className="font-bold text-error">{error}</p>
                  <button
                    type="button"
                    onClick={() => void fetchBooks()}
                    className="btn btn-error btn-sm mt-3 rounded-lg text-error-content"
                  >
                    Tekrar Dene
                  </button>
                </div>
              )}
              
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                  <p className="font-bold text-base-content/60">Eserler Yukleniyor...</p>
                </div>
              ) : books.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                    {books.map((b) => <BookCard key={b.id} book={b} onPreview={setPreviewBook} />)}
                  </div>
                  <aside className="hidden xl:block">
                    <div className="sticky top-28 rounded-2xl border border-base-content/12 bg-base-100/40 p-4">
                      {previewBook ? (
                        <>
                          <p className="text-[10px] font-black uppercase tracking-widest text-primary/70">Hizli Onizleme</p>
                          <h3 className="mt-2 line-clamp-2 text-base font-black">{previewBook.title}</h3>
                          <p className="mt-1 text-xs font-semibold text-base-content/65">{previewBook.author} • {previewBook.category}</p>
                          <p className="mt-3 line-clamp-6 text-sm text-base-content/75">{previewBook.description || "Bu eser icin aciklama bulunmuyor."}</p>
                          <div className="mt-3 flex items-center justify-between text-xs font-bold text-base-content/70">
                            <span>{previewBook.chapters} bolum</span>
                            <span>{formatCompactRead(previewBook.reads)} okunma</span>
                          </div>
                          <Link href={`/Books/${previewBook.slug}`} className="btn btn-primary btn-sm mt-4 w-full rounded-xl">Detaya Git</Link>
                        </>
                      ) : (
                        <p className="text-sm font-semibold text-base-content/60">Kart uzerine gelince onizleme burada gorunur.</p>
                      )}
                    </div>
                  </aside>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-base-content/20 p-24 text-center font-bold text-base-content/40 italic">Aranan kriterlerde eser bulunamadi.</div>
              )}

              {/* Bottom Pagination */}
              <div className={`flex min-h-[60px] flex-wrap items-center justify-center gap-1.5 border-t border-base-content/5 pt-8 transition-opacity sm:pt-10 ${isLoading ? "pointer-events-none opacity-40" : "opacity-100"}`}>
                {apiResponse && (
                  <PaginationControls 
                    currentPage={currentPage} 
                    totalPages={apiResponse.totalPages ?? 0} 
                    hasNextPage={apiResponse.hasNextPage ?? false}
                    hasPreviousPage={apiResponse.hasPreviousPage ?? false}
                    onPageChange={(p) => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  />
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
