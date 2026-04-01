"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronDown, Filter, Search, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";
import { toBookSlug } from "@/lib/books";

const PAGE_SIZE = 12;

type QuickFilterKey =
  | "newest"
  | "popular"
  | "trending"
  | "topRated"
  | "recentlyUpdated";

type BookStatus = "Devam Ediyor" | "Tamamlandi" | "Ara Verildi" | "Iptal Edildi" | "Taslak";
type WorkType = "Ceviri" | "Orijinal";
type AgeRange = "G" | "PG13" | "R";
type CoverKey = "arsiv" | "golge" | "muhur";

type Book = {
  id: string;
  slug?: string;
  title: string;
  category: string;
  editorChoice: boolean;
  status: BookStatus;
  workType: WorkType;
  ageRange: AgeRange;
  rating: number;
  reads: number;
  chapters: number;
  trendScore: number;
  createdAt: string;
  updatedAt: string;
  cover: CoverKey;
  author: string;
};

type BooksApiItem = {
  title: string;
  slug: string;
  description: string;
  coverImageUrl?: string | null;
  authorName?: string | null;
  type: number;
  status: number;
};

type BooksApiResponse = {
  items: BooksApiItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
};

type CoverAsset = {
  image: string;
  imageAltSuffix: string;
  blurDataURL: string;
};

const COVER_ASSETS: Readonly<Record<CoverKey, CoverAsset>> = {
  arsiv: {
    image: "/covers/cover-arsiv.svg",
    imageAltSuffix: "arsiv",
    blurDataURL:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 12'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%23f6c886'/%3E%3Cstop offset='1' stop-color='%233d3968'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='8' height='12' fill='url(%23g)'/%3E%3C/svg%3E",
  },
  golge: {
    image: "/covers/cover-golge.svg",
    imageAltSuffix: "golge",
    blurDataURL:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 12'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%2381ddd0'/%3E%3Cstop offset='1' stop-color='%231a2436'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='8' height='12' fill='url(%23g)'/%3E%3C/svg%3E",
  },
  muhur: {
    image: "/covers/cover-muhur.svg",
    imageAltSuffix: "muhur",
    blurDataURL:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 12'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%23f4b286'/%3E%3Cstop offset='1' stop-color='%23271f3d'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='8' height='12' fill='url(%23g)'/%3E%3C/svg%3E",
  },
};

const QUICK_FILTERS: ReadonlyArray<{ key: QuickFilterKey; label: string }> = [
  { key: "newest", label: "En Yeniler" },
  { key: "popular", label: "Populer" },
  { key: "trending", label: "Trend Olanlar" },
  { key: "topRated", label: "En Cok Puan Alan" },
  { key: "recentlyUpdated", label: "Son Guncellenen" },
];

const AGE_LABELS: Record<AgeRange, string> = {
  G: "Genel Izleyici (G)",
  PG13: "13+ (PG-13)",
  R: "18+ (R)",
};

const BOOKS: ReadonlyArray<Book> = [
  {
    id: "b1",
    title: "Against the Gods",
    category: "Aksiyon",
    editorChoice: true,
    status: "Devam Ediyor",
    workType: "Ceviri",
    ageRange: "PG13",
    rating: 5.0,
    reads: 142000,
    chapters: 813,
    trendScore: 96,
    createdAt: "2025-02-06",
    updatedAt: "2026-03-29",
    cover: "golge",
    author: "Marsel",
  },
  {
    id: "b2",
    title: "Rebirth of the Thief Who Roamed the World",
    category: "Fantasy",
    editorChoice: true,
    status: "Tamamlandi",
    workType: "Ceviri",
    ageRange: "PG13",
    rating: 4.9,
    reads: 126000,
    chapters: 995,
    trendScore: 88,
    createdAt: "2024-11-18",
    updatedAt: "2026-02-20",
    cover: "muhur",
    author: "Kozmik Gezgin",
  },
  {
    id: "b3",
    title: "Kutsal Arsivlerin Son Koruyucusu",
    category: "Epic",
    editorChoice: true,
    status: "Devam Ediyor",
    workType: "Orijinal",
    ageRange: "PG13",
    rating: 4.8,
    reads: 98000,
    chapters: 149,
    trendScore: 91,
    createdAt: "2025-12-01",
    updatedAt: "2026-03-30",
    cover: "arsiv",
    author: "Lina Grey",
  },
  {
    id: "b4",
    title: "Abyss Academy Reborn",
    category: "Karanlik",
    editorChoice: false,
    status: "Devam Ediyor",
    workType: "Orijinal",
    ageRange: "PG13",
    rating: 4.7,
    reads: 83000,
    chapters: 267,
    trendScore: 84,
    createdAt: "2025-10-09",
    updatedAt: "2026-03-27",
    cover: "muhur",
    author: "Kaan Demir",
  },
  {
    id: "b5",
    title: "The Dragon Mark Oath",
    category: "Macera",
    editorChoice: false,
    status: "Devam Ediyor",
    workType: "Ceviri",
    ageRange: "PG13",
    rating: 4.5,
    reads: 71000,
    chapters: 192,
    trendScore: 76,
    createdAt: "2025-05-22",
    updatedAt: "2026-03-22",
    cover: "golge",
    author: "Aria Sterling",
  },
  {
    id: "b6",
    title: "Crown of Silent Tempest",
    category: "Mystery",
    editorChoice: false,
    status: "Ara Verildi",
    workType: "Orijinal",
    ageRange: "R",
    rating: 4.4,
    reads: 66000,
    chapters: 154,
    trendScore: 62,
    createdAt: "2024-08-14",
    updatedAt: "2026-01-11",
    cover: "arsiv",
    author: "Victor Thorne",
  },
  {
    id: "b7",
    title: "Blade of Forgotten Code",
    category: "Bilim Kurgu",
    editorChoice: true,
    status: "Devam Ediyor",
    workType: "Orijinal",
    ageRange: "G",
    rating: 4.6,
    reads: 77000,
    chapters: 230,
    trendScore: 80,
    createdAt: "2025-07-02",
    updatedAt: "2026-03-25",
    cover: "golge",
    author: "Siber Sair",
  },
  {
    id: "b8",
    title: "Tower of Last Ember",
    category: "Fantasy",
    editorChoice: false,
    status: "Devam Ediyor",
    workType: "Ceviri",
    ageRange: "G",
    rating: 4.3,
    reads: 54000,
    chapters: 119,
    trendScore: 68,
    createdAt: "2025-03-01",
    updatedAt: "2026-03-18",
    cover: "muhur",
    author: "Ethereal Voyager",
  },
  {
    id: "b9",
    title: "Legends of Crystal Gate",
    category: "Isekai",
    editorChoice: true,
    status: "Devam Ediyor",
    workType: "Orijinal",
    ageRange: "PG13",
    rating: 4.5,
    reads: 74000,
    chapters: 201,
    trendScore: 79,
    createdAt: "2025-06-07",
    updatedAt: "2026-03-20",
    cover: "arsiv",
    author: "Elena Night",
  },
  {
    id: "b10",
    title: "Moonlit Imperial Archive",
    category: "Karanlik",
    editorChoice: false,
    status: "Tamamlandi",
    workType: "Ceviri",
    ageRange: "R",
    rating: 4.6,
    reads: 69000,
    chapters: 175,
    trendScore: 72,
    createdAt: "2024-03-10",
    updatedAt: "2025-12-14",
    cover: "muhur",
    author: "Imperial Chronicler",
  },
  {
    id: "b11",
    title: "Silk Horizon Circuit",
    category: "Bilim Kurgu",
    editorChoice: false,
    status: "Devam Ediyor",
    workType: "Orijinal",
    ageRange: "PG13",
    rating: 4.4,
    reads: 58000,
    chapters: 133,
    trendScore: 66,
    createdAt: "2025-01-17",
    updatedAt: "2026-03-15",
    cover: "golge",
    author: "Neo Nomad",
  },
  {
    id: "b12",
    title: "Ember Queen Oath",
    category: "Romantasy",
    editorChoice: true,
    status: "Devam Ediyor",
    workType: "Orijinal",
    ageRange: "PG13",
    rating: 4.7,
    reads: 63000,
    chapters: 142,
    trendScore: 86,
    createdAt: "2025-11-03",
    updatedAt: "2026-03-30",
    cover: "arsiv",
    author: "Serafina Flame",
  },
  {
    id: "b13",
    title: "Winter Regent Chronicle",
    category: "Epic",
    editorChoice: false,
    status: "Devam Ediyor",
    workType: "Ceviri",
    ageRange: "G",
    rating: 4.2,
    reads: 41000,
    chapters: 88,
    trendScore: 57,
    createdAt: "2026-01-12",
    updatedAt: "2026-03-28",
    cover: "arsiv",
    author: "Arctic Scribe",
  },
  {
    id: "b14",
    title: "Ghost Harbor Manuscript",
    category: "Mystery",
    editorChoice: true,
    status: "Ara Verildi",
    workType: "Orijinal",
    ageRange: "R",
    rating: 4.6,
    reads: 52000,
    chapters: 109,
    trendScore: 74,
    createdAt: "2025-04-08",
    updatedAt: "2026-02-05",
    cover: "muhur",
    author: "Mist Walker",
  },
  {
    id: "b15",
    title: "Crimson Dock Uprising",
    category: "Aksiyon",
    editorChoice: false,
    status: "Devam Ediyor",
    workType: "Ceviri",
    ageRange: "PG13",
    rating: 4.5,
    reads: 61000,
    chapters: 166,
    trendScore: 78,
    createdAt: "2025-08-21",
    updatedAt: "2026-03-24",
    cover: "golge",
    author: "Red Sovereign",
  },
  {
    id: "b16",
    title: "Vault of Hollow Saints",
    category: "Karanlik",
    editorChoice: true,
    status: "Devam Ediyor",
    workType: "Orijinal",
    ageRange: "R",
    rating: 4.9,
    reads: 103000,
    chapters: 312,
    trendScore: 93,
    createdAt: "2025-12-19",
    updatedAt: "2026-03-31",
    cover: "arsiv",
    author: "Saintly Pen",
  },
];

function toggleValue<T extends string>(items: T[], value: T) {
  return items.includes(value)
    ? items.filter((item) => item !== value)
    : [...items, value];
}

function formatCompactRead(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 100000 ? 0 : 1)}K`;
  }
  return String(value);
}

function hydrateBookFromApi(item: BooksApiItem, index: number): Book {
  const keySeed = item.slug.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const covers: CoverKey[] = ["arsiv", "golge", "muhur"];
  const statuses: BookStatus[] = ["Devam Ediyor", "Tamamlandi", "Ara Verildi"];
  const workTypes: WorkType[] = ["Orijinal", "Ceviri"];
  const ageRanges: AgeRange[] = ["G", "PG13", "R"];
  const categories = ["Aksiyon", "Fantasy", "Epic", "Macera", "Karanlik", "Bilim Kurgu"];

  return {
    id: `${item.slug}-${index}`,
    slug: item.slug,
    title: item.title,
    category: categories[keySeed % categories.length],
    editorChoice: keySeed % 5 === 0,
    status: (["Taslak", "Devam Ediyor", "Tamamlandi", "Ara Verildi", "Iptal Edildi"][item.status] || "Taslak") as any,
    workType: (item.type === 0 ? "Orijinal" : "Ceviri") as any,
    ageRange: ageRanges[keySeed % ageRanges.length],
    rating: 4 + (keySeed % 10) / 10,
    reads: 10000 + (keySeed % 500) * 100,
    chapters: 20 + (keySeed % 400),
    trendScore: 50 + (keySeed % 50),
    createdAt: `2026-01-${String((keySeed % 27) + 1).padStart(2, "0")}`,
    updatedAt: `2026-03-${String((keySeed % 30) + 1).padStart(2, "0")}`,
    cover: covers[keySeed % covers.length],
    author: item.authorName?.trim() || "Yazar",
  };
}

function BookCard({ book }: { book: Book }) {
  const cover = COVER_ASSETS[book.cover];
  const bookHref = `/Books/${book.slug ?? toBookSlug(book.title)}`;

  return (
    <Link
      href={bookHref}
      className="glass-frame group block h-full p-3 transition-all duration-300 hover:translate-y-[-4px] sm:p-3.5"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-base-content/12">
        <Image
          src={cover.image}
          alt={`${book.title} ${cover.imageAltSuffix} kapagi`}
          fill
          placeholder="blur"
          blurDataURL={cover.blurDataURL}
          className="object-cover transition duration-300 group-hover:scale-[1.05]"
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 15vw"
        />
        
        {/* Floating Badges */}
        <div className="absolute inset-x-2 top-2 flex items-start justify-between pointer-events-none">
          <div className="flex flex-col gap-1">
            <span className="rounded-lg bg-base-100/78 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-base-content backdrop-blur-md shadow-sm border border-white/10">
              {book.workType}
            </span>
            {book.editorChoice && (
              <span className="rounded-lg bg-secondary/85 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tighter text-secondary-content backdrop-blur-md shadow-sm border border-secondary/20">
                Editor Secimi
              </span>
            )}
          </div>
          
            <span className={`rounded-lg px-1.5 py-0.5 text-[9px] font-black backdrop-blur-md shadow-sm border border-white/10 ${
            book.ageRange === "R" ? "bg-error/85 text-error-content" : "bg-base-100/78 text-base-content"
          }`}>
            {book.ageRange}
          </span>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <h3 className="line-clamp-2 text-sm font-bold leading-tight group-hover:text-primary transition-colors">
          {book.title}
        </h3>
        <p className="line-clamp-1 text-[11px] font-semibold text-base-content/60">
          {book.author}
        </p>
        <div className="grid grid-cols-2 items-center gap-2 pt-1">
          <div className="flex items-center gap-1.2 text-warning">
            <Star className="h-3.5 w-3.5 fill-current" strokeWidth={2} />
            <span className="text-xs font-bold text-base-content">
              {book.rating.toFixed(1)}
            </span>
          </div>

          <div className="flex flex-col items-end gap-1">
            <p className="line-clamp-1 text-right text-[11px] font-bold uppercase tracking-wider text-primary/90">
              {book.category}
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-1 opacity-60">
           <span className="text-[10px] font-semibold">{book.chapters} Bolum</span>
           <span className="text-[10px] font-semibold">{formatCompactRead(book.reads)} Okunma</span>
        </div>
      </div>
      </Link>
    );
  }

export default function BooksPage() {
  const [query, setQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilterKey>("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [editorChoiceOnly, setEditorChoiceOnly] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<BookStatus[]>([]);
  const [selectedWorkTypes, setSelectedWorkTypes] = useState<WorkType[]>([]);
  const [selectedAgeRanges, setSelectedAgeRanges] = useState<AgeRange[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [apiBooks, setApiBooks] = useState<Book[] | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadBooks() {
      try {
        const data = await apiRequest<BooksApiResponse>("/books?pageNumber=1&pageSize=200&sortBy=CreatedAt&sortDescending=true");
        if (!isMounted) return;
        setApiBooks(data.items.map(hydrateBookFromApi));
        setApiError(null);
      } catch {
        if (!isMounted) return;
        setApiBooks([]);
        setApiError("Kitaplar yuklenemedi.");
      }
    }

    void loadBooks();
    return () => {
      isMounted = false;
    };
  }, []);

  const allBooks = apiBooks ?? BOOKS;

  const categories = useMemo(
    () => Array.from(new Set(allBooks.map((book) => book.category))),
    [allBooks],
  );
  const statuses = useMemo(
    () => Array.from(new Set(allBooks.map((book) => book.status))),
    [allBooks],
  );
  const workTypes = useMemo(
    () => Array.from(new Set(allBooks.map((book) => book.workType))),
    [allBooks],
  );
  const ageRanges = useMemo(
    () => Array.from(new Set(allBooks.map((book) => book.ageRange))),
    [allBooks],
  );

  const normalizedQuery = query.trim().toLowerCase();

  const filteredAndSortedBooks = useMemo(() => {
    const base = allBooks.filter((book) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        book.title.toLowerCase().includes(normalizedQuery) ||
        book.category.toLowerCase().includes(normalizedQuery);
      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(book.category);
      const matchesEditor = !editorChoiceOnly || book.editorChoice;
      const matchesStatus =
        selectedStatuses.length === 0 || selectedStatuses.includes(book.status);
      const matchesWorkType =
        selectedWorkTypes.length === 0 ||
        selectedWorkTypes.includes(book.workType);
      const matchesAgeRange =
        selectedAgeRanges.length === 0 ||
        selectedAgeRanges.includes(book.ageRange);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesEditor &&
        matchesStatus &&
        matchesWorkType &&
        matchesAgeRange
      );
    });

    let scoped = [...base];

    if (quickFilter === "trending") {
      scoped = scoped.filter((book) => book.trendScore >= 75);
    } else if (quickFilter === "topRated") {
      scoped = scoped.filter((book) => book.rating >= 4.7);
    }

    switch (quickFilter) {
      case "newest":
        scoped.sort(
          (a, b) =>
            Date.parse(b.createdAt) - Date.parse(a.createdAt),
        );
        break;
      case "popular":
        scoped.sort((a, b) => b.reads - a.reads);
        break;
      case "trending":
        scoped.sort((a, b) => b.trendScore - a.trendScore);
        break;
      case "topRated":
        scoped.sort((a, b) => b.rating - a.rating);
        break;
      case "recentlyUpdated":
        scoped.sort(
          (a, b) =>
            Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
        );
        break;
      default:
        break;
    }

    return scoped;
  }, [
    allBooks,
    editorChoiceOnly,
    normalizedQuery,
    quickFilter,
    selectedAgeRanges,
    selectedCategories,
    selectedStatuses,
    selectedWorkTypes,
  ]);

  const totalFilteredBooks = filteredAndSortedBooks.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredBooks / PAGE_SIZE));
  const visiblePage = Math.min(currentPage, totalPages);

  const pagedBooks = useMemo(() => {
    const start = (visiblePage - 1) * PAGE_SIZE;
    return filteredAndSortedBooks.slice(start, start + PAGE_SIZE);
  }, [filteredAndSortedBooks, visiblePage]);

  const hasPreviousPage = visiblePage > 1;
  const hasNextPage = visiblePage < totalPages;

  function resetFilters() {
    setQuery("");
    setQuickFilter("newest");
    setCurrentPage(1);
    setSelectedCategories([]);
    setEditorChoiceOnly(false);
    setSelectedStatuses([]);
    setSelectedWorkTypes([]);
    setSelectedAgeRanges([]);
  }

  return (
    <main className="relative overflow-hidden">
      <div className="site-shell mx-auto flex min-h-screen flex-col gap-6 px-4 pb-8 pt-28 sm:px-8 sm:pb-12 sm:pt-32">
        <section className="glass-frame space-y-5 p-4 sm:p-6">
          <div className="text-xs font-semibold text-base-content/60">
            <Link href="/" className="transition-colors hover:text-primary">
              Anasayfa
            </Link>{" "}
            - <span>Kitaplar</span>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Kesfet</h1>

            <label className="input input-bordered flex h-11 w-full items-center gap-2 rounded-xl border-base-content/15 bg-base-100/32 md:max-w-md">
              <Search className="h-4 w-4 text-base-content/60" />
              <input
                type="text"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Kitap, tur veya etiket ara..."
                className="w-full bg-transparent text-sm"
                aria-label="Kitap ara"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {QUICK_FILTERS.map((item) => {
                const isActive = item.key === quickFilter;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setQuickFilter(item.key);
                      setCurrentPage(1);
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
                      isActive
                        ? "bg-primary text-primary-content"
                        : "border border-base-content/15 bg-base-100/28 text-base-content/75 hover:border-primary/30 hover:text-primary"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <p className="text-sm font-semibold text-base-content/65">
              {totalFilteredBooks} eser
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="space-y-3">
              <button
                type="button"
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className="glass-frame flex w-full items-center justify-between p-3.5 sm:p-4 lg:hidden"
              >
                <div className="flex items-center gap-2.5">
                  <Filter className="h-4.5 w-4.5 text-primary" />
                  <span className="text-sm font-bold">Filtreleri {isFiltersOpen ? "Gizle" : "Goster"}</span>
                </div>
                <ChevronDown className={`h-4.5 w-4.5 transition-transform duration-300 ${isFiltersOpen ? "rotate-180" : ""}`} />
              </button>

              <div className={`${isFiltersOpen ? "flex animate-in fade-in slide-in-from-top-2 duration-300" : "hidden"} flex-col gap-3 lg:flex`}>
                <div className="rounded-2xl border border-base-content/12 bg-base-100/24 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-base-content/60">
                    Kategori
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {categories.map((category) => (
                      <label key={category} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-xs"
                          checked={selectedCategories.includes(category)}
                          onChange={() => {
                            setSelectedCategories((current) =>
                              toggleValue(current, category),
                            );
                            setCurrentPage(1);
                          }}
                        />
                        <span>{category}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-base-content/12 bg-base-100/24 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-base-content/60">
                    Editorun Secimi
                  </p>
                  <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-xs"
                      checked={editorChoiceOnly}
                      onChange={(event) => {
                        setEditorChoiceOnly(event.target.checked);
                        setCurrentPage(1);
                      }}
                    />
                    <span>Sadece secilen eserler</span>
                  </label>
                </div>

                <div className="rounded-2xl border border-base-content/12 bg-base-100/24 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-base-content/60">
                    Durum
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {statuses.map((status) => (
                      <label key={status} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-xs"
                          checked={selectedStatuses.includes(status)}
                          onChange={() => {
                            setSelectedStatuses((current) =>
                              toggleValue(current, status),
                            );
                            setCurrentPage(1);
                          }}
                        />
                        <span>{status}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-base-content/12 bg-base-100/24 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-base-content/60">
                    Eser Tipi
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {workTypes.map((type) => (
                      <label key={type} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-xs"
                          checked={selectedWorkTypes.includes(type)}
                          onChange={() => {
                            setSelectedWorkTypes((current) =>
                              toggleValue(current, type),
                            );
                            setCurrentPage(1);
                          }}
                        />
                        <span>{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-base-content/12 bg-base-100/24 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-base-content/60">
                    Yas Araligi
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {ageRanges.map((ageRange) => (
                      <label key={ageRange} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-xs"
                          checked={selectedAgeRanges.includes(ageRange)}
                          onChange={() => {
                            setSelectedAgeRanges((current) =>
                              toggleValue(current, ageRange),
                            );
                            setCurrentPage(1);
                          }}
                        />
                      <span>{AGE_LABELS[ageRange]}</span>
                    </label>
                  ))}
                </div>
                </div>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="btn btn-outline btn-sm w-full rounded-full"
                >
                  Filtreleri Temizle
                </button>
              </div>
            </aside>

            <div className="space-y-4">
              {apiError ? (
                <div className="rounded-2xl border border-error/30 bg-error/10 p-4 text-sm font-semibold text-error">
                  {apiError}
                </div>
              ) : null}
              {pagedBooks.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {pagedBooks.map((book) => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-base-content/12 bg-base-100/24 p-5 text-center text-sm text-base-content/72">
                  Secili filtrelerde eser bulunamadi.
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.max(1, Math.min(totalPages, page - 1)),
                    )
                  }
                  disabled={!hasPreviousPage}
                  className="btn btn-sm rounded-full border border-base-content/16 bg-base-100/35 px-3 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Onceki
                </button>

                {Array.from({ length: totalPages }, (_, index) => {
                  const page = index + 1;
                  const isActive = page === visiblePage;
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`h-8 min-w-8 rounded-full px-3 text-xs font-bold transition-colors ${
                        isActive
                          ? "bg-primary text-primary-content"
                          : "border border-base-content/18 bg-base-100/30 text-base-content/78 hover:border-primary/36 hover:text-primary"
                      }`}
                      aria-label={`${page}. sayfa`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={!hasNextPage}
                  className="btn btn-sm rounded-full border border-base-content/16 bg-base-100/35 px-3 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Sonraki
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
