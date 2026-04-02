"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowDown, BookText, Clock, History, Home, Search, Sparkles } from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { apiRequest, resolveMediaUrl } from "@/lib/api";

type UpdateItem = {
  chapterId: string;
  chapterTitle: string;
  chapterSlug: string;
  order: number;
  publishedAt: string;
  bookTitle: string;
  bookSlug: string;
  bookCoverImageUrl?: string;
  bookCategories: string[];
};

type ApiResponse = {
  updates: UpdateItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  hasNextPage: boolean;
};

const PAGE_SIZE = 12;

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Saniyeler once";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dk once`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} saat once`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} gun once`;
  return date.toLocaleDateString("tr-TR");
}

export default function UpdatesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [updates, setUpdates] = useState<UpdateItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verileri yukle
  const fetchUpdates = useCallback(async (page: number, search: string, isLoadMore: boolean) => {
    setIsLoading(true);
    try {
      let url = `/books/updates?pageNumber=${page}&pageSize=${PAGE_SIZE}`;
      if (search) url += `&Search=${encodeURIComponent(search)}`;

      const data = await apiRequest<ApiResponse>(url);
      
      if (isLoadMore) {
        setUpdates(prev => [...prev, ...data.updates]);
      } else {
        setUpdates(data.updates);
      }
      
      setTotalCount(data.totalCount);
      setHasNextPage(data.hasNextPage);
      setError(null);
    } catch {
      setError("Guncellemeler yuklenirken bir sorun yasandi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Ilk yukleme ve Arama degisimi
  useEffect(() => {
    setCurrentPage(1);
    const timer = setTimeout(() => {
      void fetchUpdates(1, searchQuery, false);
    }, 400); // Debounce search
    return () => clearTimeout(timer);
  }, [searchQuery, fetchUpdates]);

  // Daha fazla yukle butonu
  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    void fetchUpdates(nextPage, searchQuery, true);
  };

  const COVER_DEFAULT = "/covers/cover-golge.svg";

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="site-shell mx-auto flex flex-col gap-6 px-4 pb-12 pt-28 sm:px-8 sm:pt-32">
        <section className="glass-frame space-y-7 p-4 sm:p-6">
          {/* Breadcrumb & Header Row */}
          <div className="flex flex-col gap-6">
            <div className="space-y-4">
              <div className="breadcrumbs text-xs font-semibold text-base-content/50 mb-1">
                <ul>
                  <li><Link href="/" className="hover:text-primary transition-colors flex items-center"><Home className="w-3.5 h-3.5 mr-1.5" /> Ana Sayfa</Link></li>
                  <li className="text-base-content/40">Guncellemeler</li>
                </ul>
              </div>
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 text-primary">
                  <History className="h-7 w-7" strokeWidth={2.5} />
                  <h1 className="hero-title-gradient text-3xl font-black tracking-tight sm:text-4xl uppercase italic">Guncellemeler</h1>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pt-4 border-t border-base-content/5">
            <p className="text-xs font-black uppercase tracking-widest text-base-content/30 italic">Sitedeki tüm son hareketleri ve bölümleri buradan takip edebilirsiniz.</p>
            <label className="input input-bordered flex h-11 w-full items-center gap-2 rounded-xl border-base-content/15 bg-base-100/32 md:max-w-md">
              <Search className="h-4 w-4 text-base-content/60" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Eser veya bolum ara..." className="w-full bg-transparent text-sm" />
            </label>
          </div>

          <div className="flex items-center justify-between border-b border-base-content/5 pb-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/40 italic">
               Toplam {totalCount} guncelleme bulundu
            </p>
          </div>

          {/* Error State */}
          {error && <div className="rounded-xl bg-error/10 p-4 font-bold text-error border border-error/20">{error}</div>}

          {/* Content Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             {updates.map((update, idx) => (
               <div key={`${update.chapterId}-${idx}`} 
                    className="group relative flex gap-4 overflow-hidden rounded-2xl border border-base-content/10 bg-base-100/32 p-3 transition-all duration-300 hover:border-primary/30 hover:bg-base-100/45 hover:translate-y-[-2px]">
                 
                 {/* Mini Cover */}
                 <div className="relative aspect-[3/4] h-24 shrink-0 overflow-hidden rounded-xl border border-base-content/10">
                    <Image src={resolveMediaUrl(update.bookCoverImageUrl) || COVER_DEFAULT} alt={update.bookTitle} fill className="object-cover transition duration-300 group-hover:scale-[1.05]" />
                 </div>

                 <div className="flex flex-col justify-between py-1 flex-1 min-w-0">
                    <div className="space-y-1.5">
                       <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[9px] font-bold uppercase tracking-wider text-primary">{update.bookCategories[0] || "Genel"}</span>
                          <span className="whitespace-nowrap rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-primary">YENI</span>
                       </div>
                       <Link href={`/Books/${update.bookSlug}`} className="line-clamp-1 block text-sm font-bold hover:text-primary transition-colors">{update.bookTitle}</Link>
                       <Link href={`/Books/${update.bookSlug}/${update.chapterSlug}`} className="flex items-center gap-1.5 text-base-content/70 hover:text-primary transition-colors">
                          <BookText className="h-3.5 w-3.5 shrink-0" />
                          <p className="truncate text-xs font-semibold">Bolum {update.order}: {update.chapterTitle}</p>
                       </Link>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-base-content/40 uppercase">
                       <Clock className="h-3 w-3" />
                       <time>{getRelativeTime(update.publishedAt)}</time>
                    </div>
                 </div>
               </div>
             ))}
          </div>

          {/* Empty State */}
          {!isLoading && updates.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-base-content/15 bg-base-100/10 py-24 text-center">
               <History className="h-10 w-10 opacity-20" />
               <p className="text-sm font-semibold text-base-content/50 italic">Aradiginiz kriterlere uygun guncelleme bulunamadi.</p>
            </div>
          )}

          {/* Loading Animation (Bottom) */}
          {isLoading && (
            <div className="flex justify-center py-10">
               <span className="loading loading-spinner loading-md text-primary"></span>
            </div>
          )}

          {/* Load More Action */}
          {!isLoading && hasNextPage && (
            <div className="flex items-center justify-center border-t border-base-content/5 pt-8">
               <button onClick={handleLoadMore} className="group btn btn-ghost btn-sm h-11 rounded-full border border-base-content/10 bg-base-100/20 px-10 text-xs font-bold transition-all hover:bg-primary hover:text-primary-content hover:border-primary active:scale-95">
                 <ArrowDown className="mr-2 h-4 w-4 transition-transform group-hover:translate-y-0.5" />
                 + Daha Fazla Getir
               </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
