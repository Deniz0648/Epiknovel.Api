"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronDown, Filter, Home, Search, Sparkles, Star } from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { apiRequest, resolveMediaUrl } from "@/lib/api";
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
  author: string;
  cover: string;
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
};

type BooksApiResponse = {
  items: BooksApiItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

const COVER_ASSETS = {
  blurDataURL: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 12'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%2381ddd0'/%3E%3Cstop offset='1' stop-color='%231a2436'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='8' height='12' fill='url(%23g)'/%3E%3C/svg%3E",
  default: "/covers/cover-golge.svg"
};

const QUICK_FILTERS: ReadonlyArray<{ key: QuickFilterKey; label: string; sortBy: string; sortDescending: boolean }> = [
  { key: "newest", label: "En Yeniler", sortBy: "CreatedAt", sortDescending: true },
  { key: "popular", label: "Populer", sortBy: "ViewCount", sortDescending: true },
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
    trendScore: 0,
    author: item.authorName || "Bilinmiyor",
    cover: resolveMediaUrl(item.coverImageUrl) || COVER_ASSETS.default,
  };
}

function BookCard({ book }: { book: Book }) {
  return (
    <Link href={`/Books/${book.slug}`} className="glass-frame group block h-full p-3 transition-all duration-300 hover:translate-y-[-4px]">
      <div className="relative aspect-2/3 w-full overflow-hidden rounded-xl border border-base-content/12">
        <Image src={book.cover} alt={book.title} fill unoptimized className="object-cover transition duration-300 group-hover:scale-[1.05]" />
        <div className="absolute inset-x-2 top-2 flex flex-col gap-1 pointer-events-none">
          <span className="w-fit rounded-lg bg-base-100/78 px-1.5 py-0.5 text-[9px] font-black uppercase">{book.workType}</span>
          {book.editorChoice && <span className="w-fit rounded-lg bg-secondary/85 px-1.5 py-0.5 text-[9px] font-black uppercase text-secondary-content">Editor Secimi</span>}
        </div>
        <span className="absolute right-2 top-2 rounded-lg bg-base-100/78 px-1.5 py-0.5 text-[9px] font-black uppercase">{book.ageRange}</span>
      </div>
      <div className="mt-3 space-y-1.5">
        <h3 className="line-clamp-2 text-sm font-bold group-hover:text-primary transition-colors">{book.title}</h3>
        <p className="text-[11px] font-semibold text-base-content/60">{book.author}</p>
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-1 text-warning"><Star className="h-3.5 w-3.5 fill-current" /><span className="text-xs font-bold text-base-content">{book.rating.toFixed(1)}</span></div>
           <span className="text-[10px] font-bold text-primary uppercase">{book.category}</span>
        </div>
        <div className="flex items-center justify-between pt-1 opacity-60 text-[10px] font-semibold">
           <span>{book.chapters} Bolum</span>
           <span>{formatCompactRead(book.reads)} Okunma</span>
        </div>
      </div>
    </Link>
  );
}

export default function BooksPage() {
  const [searchQuery, setSearchQuery] = useState("");
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

  useEffect(() => {
    apiRequest<{ categories: ApiCategory[] }>("/books/categories")
      .then(res => setCategories(res.categories))
      .catch(() => console.error("Kategoriler yuklenemedi."));
  }, []);

  const fetchBooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const qf = QUICK_FILTERS.find(f => f.key === activeQuickFilter);
      let url = `/books?pageNumber=${currentPage}&pageSize=${pageSize}&sortBy=${qf?.sortBy}&sortDescending=${qf?.sortDescending}`;
      
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (selectedCategoryId) url += `&CategoryId=${selectedCategoryId}`;
      if (selectedStatus !== null) url += `&Status=${selectedStatus}`;
      if (selectedWorkType !== null) url += `&Type=${selectedWorkType}`;
      if (selectedAgeRange !== null) url += `&ContentRating=${selectedAgeRange}`;
      if (editorOnly) url += `&IsEditorChoice=true`;

      const data = await apiRequest<BooksApiResponse>(url);
      setApiResponse(data);
      setError(null);
    } catch {
      setError("Eserler yuklenirken bir sorun yuklendi.");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, activeQuickFilter, searchQuery, selectedCategoryId, selectedStatus, selectedWorkType, selectedAgeRange, editorOnly]);

  useEffect(() => {
    void fetchBooks();
  }, [fetchBooks]);

  const books = useMemo(() => apiResponse?.items.map(hydrateBookFromApi) || [], [apiResponse]);

  return (
    <main className="relative overflow-hidden">
      <div className="site-shell mx-auto flex min-h-screen flex-col gap-6 px-4 pb-8 pt-28 sm:px-8 sm:pb-12 sm:pt-32">
        <section className="glass-frame space-y-7 p-4 sm:p-6">
          {/* Breadcrumb & Header Row */}
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

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex flex-wrap gap-2">
              {QUICK_FILTERS.map((f) => (
                <button key={f.key} onClick={() => { setActiveQuickFilter(f.key); setCurrentPage(1); }}
                        className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${activeQuickFilter === f.key ? "bg-primary text-primary-content" : "bg-base-100/28 text-base-content/75 border border-base-content/15 hover:border-primary/30"}`}>
                  {f.label}
                </button>
              ))}
            </div>
            
            <div className="flex items-center justify-between sm:justify-end gap-6 pt-4 sm:pt-0 border-t border-base-content/5 sm:border-0">
              <div className="flex items-center gap-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-base-content/30 italic sm:hidden">Gosterim</p>
                <select className="select select-bordered select-sm sm:select-xs rounded-lg font-bold bg-base-100/32 min-h-0 h-9 sm:h-7" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}>
                  {[8, 16, 24, 32, 48, 100].map(v => <option key={v} value={v}>{v} Adet</option>)}
                </select>
              </div>
              
              <div className="flex flex-col items-end sm:items-start leading-none">
                 <span className="text-lg sm:text-sm font-black text-primary italic">{apiResponse?.totalCount || 0}</span>
                 <span className="text-[9px] font-black uppercase tracking-tighter text-base-content/40">Toplam Eser</span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <button type="button" onClick={() => setIsFiltersOpen(!isFiltersOpen)} className="glass-frame flex w-full items-center justify-between p-3.5 lg:hidden">
                <div className="flex items-center gap-2.5"><Filter className="h-4.5 w-4.5 text-primary" /><span className="text-sm font-bold">Filtreler</span></div>
                <ChevronDown className={`h-4.5 w-4.5 transition-transform duration-300 ${isFiltersOpen ? "rotate-180" : ""}`} />
              </button>

              <div className={`${isFiltersOpen ? "flex" : "hidden"} flex-col gap-4 lg:flex`}>
                {/* KATEGORI */}
                <div className="rounded-2xl border border-base-content/12 bg-base-100/24 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-base-content/40 mb-3">Kategori</p>
                  <div className="space-y-2 max-h-[196px] overflow-y-auto pr-2 custom-scrollbar">
                    {categories.map(c => (
                      <label key={c.id} className="flex cursor-pointer items-center gap-2.5 text-sm hover:text-primary transition-colors">
                        <input type="checkbox" className="checkbox checkbox-xs" checked={selectedCategoryId === c.id} 
                               onChange={() => { setSelectedCategoryId(selectedCategoryId === c.id ? null : c.id); setCurrentPage(1); }} />
                        <span className={selectedCategoryId === c.id ? "font-bold text-primary" : "font-medium"}>{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* DURUM */}
                <div className="rounded-2xl border border-base-content/12 bg-base-100/24 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-base-content/40 mb-3">Durum</p>
                  <div className="space-y-2">
                    {PROTECTED_STATUSES.map(s => (
                      <label key={s.value} className="flex cursor-pointer items-center gap-2.5 text-sm hover:text-primary transition-colors">
                        <input type="checkbox" className="checkbox checkbox-xs" checked={selectedStatus === s.value}
                               onChange={() => { setSelectedStatus(selectedStatus === s.value ? null : s.value); setCurrentPage(1); }} />
                        <span className={selectedStatus === s.value ? "font-bold text-primary" : "font-medium"}>{s.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* ESER TIPI */}
                <div className="rounded-2xl border border-base-content/12 bg-base-100/24 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-base-content/40 mb-3">Eser Tipi</p>
                  <div className="space-y-2">
                    {WORK_TYPES.map(s => (
                      <label key={s.value} className="flex cursor-pointer items-center gap-2.5 text-sm hover:text-primary transition-colors">
                        <input type="checkbox" className="checkbox checkbox-xs" checked={selectedWorkType === s.value}
                               onChange={() => { setSelectedWorkType(selectedWorkType === s.value ? null : s.value); setCurrentPage(1); }} />
                        <span className={selectedWorkType === s.value ? "font-bold text-primary" : "font-medium"}>{s.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* YAS ARALIGI */}
                <div className="rounded-2xl border border-base-content/12 bg-base-100/24 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-base-content/40 mb-3">Yas Araligi</p>
                  <div className="space-y-2">
                    {AGE_RANGES.map(s => (
                      <label key={s.value} className="flex cursor-pointer items-center gap-2.5 text-sm hover:text-primary transition-colors">
                        <input type="checkbox" className="checkbox checkbox-xs" checked={selectedAgeRange === s.value}
                               onChange={() => { setSelectedAgeRange(selectedAgeRange === s.value ? null : s.value); setCurrentPage(1); }} />
                        <span className={selectedAgeRange === s.value ? "font-bold text-primary" : "font-medium"}>{s.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-base-content/12 bg-base-100/24 p-4 hover:bg-base-100/32 transition-colors">
                  <input type="checkbox" className="checkbox checkbox-xs" checked={editorOnly} onChange={(e) => { setEditorOnly(e.target.checked); setCurrentPage(1); }} />
                  <span className="text-[11px] font-black uppercase tracking-wider">Editor Secimi</span>
                </label>

                <button onClick={() => { setSearchQuery(""); setSelectedCategoryId(null); setSelectedStatus(null); setSelectedWorkType(null); setSelectedAgeRange(null); setEditorOnly(false); setCurrentPage(1); }}
                        className="btn btn-outline btn-sm w-full rounded-xl border-base-content/15 font-bold">Sıfırla</button>
              </div>
            </aside>

            <div className="space-y-6">
              {error && <div className="rounded-xl bg-error/10 p-4 font-bold text-error border border-error/20">{error}</div>}
              
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                  <p className="font-bold text-base-content/60">Eserler Yukleniyor...</p>
                </div>
              ) : books.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                  {books.map(b => <BookCard key={b.id} book={b} />)}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-base-content/20 p-24 text-center font-bold text-base-content/40 italic">Aranan kriterlerde eser bulunamadi.</div>
              )}

              {apiResponse && apiResponse.totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-6">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={!apiResponse.hasPreviousPage} className="btn btn-sm btn-circle btn-ghost disabled:opacity-30"><ArrowLeft className="h-4 w-4" /></button>
                  {Array.from({ length: apiResponse.totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setCurrentPage(p)} className={`btn btn-sm btn-circle ${currentPage === p ? "btn-primary" : "btn-ghost"}`}>{p}</button>
                  ))}
                  <button onClick={() => setCurrentPage(p => Math.min(apiResponse.totalPages, p + 1))} disabled={!apiResponse.hasNextPage} className="btn btn-sm btn-circle btn-ghost disabled:opacity-30"><ArrowRight className="h-4 w-4" /></button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
