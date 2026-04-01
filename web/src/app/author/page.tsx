"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { Eye, BookOpen, Clock, ExternalLink, ChevronLeft, ChevronRight, Loader2, Plus, Search, SlidersHorizontal, Home, Star, MessageSquare } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { canAccessAuthorPanel as hasAuthorPanelAccess, getMyBooks, type MyBookListItem } from "@/lib/auth";

const STATUS_OPTIONS = [
  { label: "Tüm Durumlar", value: "" },
  { label: "Taslak", value: "Draft" },
  { label: "Devam Ediyor", value: "Ongoing" },
  { label: "Tamamlandı", value: "Completed" },
  { label: "Ara Verildi", value: "Hiatus" },
  { label: "İptal Edildi", value: "Cancelled" },
] as const;



function getStatusProps(status: MyBookListItem["status"] | string | number) {
  // Hem string hem integer değerleri karşıla
  const statusStr = typeof status === "number" ? 
    (["Draft", "Ongoing", "Completed", "Hiatus", "Cancelled"][status] || String(status)) : status;

  switch (statusStr) {
    case "Draft": return { label: "Taslak", color: "bg-base-content/10 text-base-content" };
    case "Ongoing": return { label: "Devam Ediyor", color: "bg-info/20 text-info border-info/20" };
    case "Completed": return { label: "Tamamlandı", color: "bg-success/20 text-success border-success/20" };
    case "Hiatus": return { label: "Ara Verildi", color: "bg-warning/20 text-warning border-warning/20" };
    case "Cancelled": return { label: "İptal Edildi", color: "bg-error/20 text-error border-error/20" };
    default: return { label: statusStr, color: "bg-base-content/10 text-base-content" };
  }
}

function getContentRatingProps(rating: MyBookListItem["contentRating"] | string | number) {
  // Hem string hem integer değerleri karşıla
  const ratingStr = typeof rating === "number" ? 
    (["General", "Teen", "Mature"][rating] || String(rating)) : rating;

  switch (ratingStr) {
    case "General": return { label: "G", color: "bg-success/80 text-success-content" };
    case "Teen": return { label: "PG-13", color: "bg-warning/80 text-warning-content" };
    case "Mature": return { label: "R", color: "bg-error/80 text-error-content" };
    default: return { label: ratingStr, color: "bg-base-content/80 text-base-content-content" };
  }
}

export default function AuthorPage() {
  const { profile, isLoading: isSessionLoading } = useAuth();
  const router = useRouter();

  const [books, setBooks] = useState<MyBookListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [bookType, setBookType] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (isSessionLoading) return;
    if (!profile) { router.replace("/login"); return; }
    if (!hasAuthorPanelAccess(profile)) router.replace("/");
  }, [isSessionLoading, profile, router]);

  useEffect(() => {
    const timer = setTimeout(() => { setQuery(searchInput); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let isMountedLocal = true;
    const loadBooks = async () => {
      try {
        setIsLoading(true);
        const response = await getMyBooks({
          pageNumber: page,
          pageSize: pageSize,
          search: query || undefined,
          status: status || undefined,
          type: bookType || undefined
        });

        if (isMountedLocal) {
          setBooks(response.items);
          setTotalCount(response.totalCount);
          setTotalPages(response.totalPages);
          setError(null);
        }
      } catch (err) {
        if (isMountedLocal) setError("Eserler yüklenirken bir hata oluştu.");
      } finally {
        if (isMountedLocal) setIsLoading(false);
      }
    };
    if (hasAuthorPanelAccess(profile)) {
      loadBooks();
    }
    return () => { isMountedLocal = false; };
  }, [profile, query, status, bookType, page, pageSize]);

  // Gerçek Veri Hesaplamaları (Dashboard Genişletme)
  const stats = useMemo(() => {
    if (!books.length) return { totalViews: 0, avgRating: 0, totalVotes: 0 };
    
    const views = books.reduce((acc, b) => acc + (b.viewCount || 0), 0);
    const votes = books.reduce((acc, b) => acc + (b.voteCount || 0), 0);
    const avg = books.filter(b => b.voteCount > 0).reduce((acc, b) => acc + b.averageRating, 0) / (books.filter(b => b.voteCount > 0).length || 1);
    
    return { totalViews: views, avgRating: avg.toFixed(1), totalVotes: votes };
  }, [books]);

  if (isSessionLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-base-100">
      <span className="loading loading-spinner loading-lg text-primary"></span>
    </div>
  );



  // Ortak Glassmorphism Sınıfı
  const glassStyle = "bg-base-100/40 backdrop-blur-xl border border-base-content/10 shadow-xl";

  return (
    <main className="relative min-h-screen bg-base-200/30 pb-12 pt-28 sm:pt-32">
      {/* Dekoratif bulanık daireler */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-40 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="site-shell mx-auto px-4 sm:px-8 space-y-8 relative z-10">

        {/* Üst Kısım: Başlık ve İstatistikler Birleşik */}
        <section className={`p-6 rounded-[2rem] ${glassStyle} space-y-8`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="breadcrumbs text-xs font-semibold text-base-content/50 mb-1">
                <ul>
                  <li><Link href="/" className="hover:text-primary transition-colors"><Home className="w-3.5 h-3.5 mr-1.5" /> Ana Sayfa</Link></li>
                  <li className="text-base-content/40">Yazarlık Paneli</li>
                </ul>
              </div>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-base-content italic leading-none">
                YAZARLIK PANELİ
              </h1>
              <p className="text-xs font-bold uppercase tracking-widest text-base-content/40 italic mt-2">
                Eserlerini yönet ve performans verilerini anlık takip et.
              </p>
            </div>

            {hasAuthorPanelAccess(profile) && (
              <Link href="/author/new" className="btn btn-primary h-12 rounded-2xl px-6 font-black uppercase tracking-widest shadow-lg shadow-primary/20 shrink-0 hover:-translate-y-0.5 transition-transform">
                <Plus className="w-4 h-4" /> Yeni Eser
              </Link>
            )}
          </div>

          <div className="h-px w-full bg-gradient-to-r from-base-content/10 via-base-content/5 to-transparent" />

          {/* İstatistikler (Premium Dashboard Stili) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 divide-y md:divide-y-0 md:divide-x divide-base-content/5">
            <div className="flex flex-col gap-1.5 md:pr-8">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-base-content/40 italic">
                <Eye className="w-3 h-3 text-primary" /> Toplam Okunma
              </div>
              <div className="text-4xl md:text-5xl font-black tracking-tighter text-primary">
                {isMounted ? stats.totalViews.toLocaleString("tr-TR") : "0"}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 pt-6 md:pt-0 md:px-8">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-base-content/40 italic">
                <Star className="w-3 h-3 text-warning" /> Ortalama Puan
              </div>
              <div className="text-4xl md:text-5xl font-black tracking-tighter text-base-content/80">
                {isMounted ? stats.avgRating : "0.0"}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 pt-6 md:pt-0 md:pl-8">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-base-content/40 italic">
                <MessageSquare className="w-3 h-3 text-secondary" /> Toplam Oy
              </div>
              <div className="text-4xl md:text-5xl font-black tracking-tighter text-base-content/80">
                {isMounted ? stats.totalVotes.toLocaleString("tr-TR") : "0"}
              </div>
            </div>
          </div>
        </section>

        {/* Filtreleme ve Arama (Glass Forms) */}
        <div className={`flex flex-col xl:flex-row gap-4 p-4 rounded-[2rem] ${glassStyle}`}>
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 w-5 h-5 -translate-y-1/2 text-base-content/40" />
            <input
              type="text"
              placeholder="Eserlerin arasında ara..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input h-14 w-full rounded-xl bg-base-100/30 pl-12 text-sm font-bold tracking-tight border-transparent focus:border-primary/30 focus:bg-base-100/50 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full xl:w-auto">
            {/* Durum Filtresi */}
            <div className="relative group">
              <SlidersHorizontal className="absolute left-4 top-1/2 w-4 h-4 -translate-y-1/2 text-base-content/40 pointer-events-none" />
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                className="select h-14 w-full rounded-xl bg-base-100/30 pl-11 text-xs font-bold uppercase tracking-widest text-base-content/80 border-transparent focus:border-primary/30 focus:bg-base-100/50 cursor-pointer appearance-none"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-base-100">{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Tür Filtresi */}
            <div className="relative group">
              <BookOpen className="absolute left-4 top-1/2 w-4 h-4 -translate-y-1/2 text-base-content/40 pointer-events-none" />
              <select
                value={bookType}
                onChange={(e) => { setBookType(e.target.value); setPage(1); }}
                className="select h-14 w-full rounded-xl bg-base-100/30 pl-11 text-xs font-bold uppercase tracking-widest text-base-content/80 border-transparent focus:border-primary/30 focus:bg-base-100/50 cursor-pointer appearance-none"
              >
                <option value="" className="bg-base-100">Tüm Türler</option>
                <option value="0" className="bg-base-100">Orijinal</option>
                <option value="1" className="bg-base-100">Çeviri</option>
              </select>
            </div>

            {/* Sayfa Boyutu */}
            <div className="relative group">
              <div className="absolute left-4 top-1/2 w-4 h-4 -translate-y-1/2 text-base-content/40 pointer-events-none text-[10px] font-black uppercase">P.</div>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="select h-14 w-full rounded-xl bg-base-100/30 pl-11 text-xs font-bold uppercase tracking-widest text-base-content/80 border-transparent focus:border-primary/30 focus:bg-base-100/50 cursor-pointer appearance-none"
              >
                {[10, 20, 50, 100].map(sz => (
                  <option key={sz} value={sz} className="bg-base-100">{sz} Kayıt</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => { setSearchInput(""); setStatus(""); setBookType(""); setPage(1); setPageSize(10); }}
              className="btn h-14 w-full lg:w-14 rounded-xl border-none bg-base-100/30 hover:bg-base-100/50 text-base-content/60 hover:text-base-content"
              title="Temizle"
            >
              {isLoading ? <span className="loading loading-spinner loading-sm opacity-50"></span> : <Loader2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Başlık Ayırıcı */}
        <div className="flex items-center gap-6 px-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-base-content/40 italic whitespace-nowrap">
            Kayıtlı Eserler ({totalCount})
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-base-content/10 to-transparent" />
        </div>

        {/* Eserler Listesi */}
        <div>
          {isLoading ? (
            <div className={`py-32 flex flex-col items-center justify-center gap-5 rounded-[2rem] ${glassStyle} opacity-60`}>
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-[11px] font-black uppercase tracking-[0.3em] italic">Yükleniyor...</p>
            </div>
          ) : error ? (
            <div className="alert alert-error shadow-sm rounded-[2rem] bg-error/10 text-error border border-error/20 backdrop-blur-md">
              <span>{error}</span>
            </div>
          ) : books.length === 0 ? (
            <div className={`py-32 flex flex-col items-center justify-center gap-6 rounded-[2rem] border-dashed ${glassStyle} opacity-50`}>
              <div className="w-20 h-20 rounded-full bg-base-content/5 flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-base-content/30" />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] italic">Henüz bir hikaye bulunamadı</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {books.map((book) => {
                const statusInfo = getStatusProps(book.status);
                const ratingInfo = getContentRatingProps(book.contentRating);

                return (
                  <article key={book.id} className={`card sm:card-side rounded-[2rem] !bg-transparent group hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/30 transition-all duration-500 overflow-hidden ${glassStyle}`}>

                    {/* İç Çerçeveli Kapak Görseli */}
                    <figure className="sm:w-52 shrink-0 relative m-3 rounded-[1.5rem] overflow-hidden bg-base-100/40 aspect-[4/5] sm:aspect-auto">
                      {book.coverImageUrl ? (
                        <img
                          src={book.coverImageUrl}
                          alt={book.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center w-full h-full text-base-content/20">
                          <BookOpen className="w-8 h-8 mb-2" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-center">Kapak Yok</span>
                        </div>
                      )}
                    </figure>

                    {/* Kart İçeriği */}
                    <div className="card-body p-5 sm:p-6 sm:pl-3">
                      <div className="flex-1 space-y-4">
                        <div>
                          <Link href={`/author/${book.slug}`} className="text-xl sm:text-2xl font-black tracking-tight leading-tight group-hover:text-primary transition-colors line-clamp-2 mb-2">
                            {book.title}
                          </Link>
                          
                          <div className="flex flex-wrap gap-2.5 items-center">
                            {/* Durum Rozeti */}
                            <span className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest border text-center min-w-[80px] ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                            
                            {/* Kategoriler */}
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {book.categories?.slice(0, 3).map((cat) => (
                                <span key={cat.id} className="px-3 py-1.5 rounded-md bg-base-content/5 text-[9px] font-bold text-base-content/40 uppercase tracking-widest border border-base-content/10">
                                  {cat.name}
                                </span>
                              ))}
                              {book.categories?.length > 3 && (
                                <span className="text-[9px] font-black text-base-content/20 ml-1">+{book.categories.length - 3}</span>
                              )}

                              {/* Tip ve Yaş Sınırı (Kategorilerden Sonra) */}
                              <span className="px-3 py-1.5 rounded-md bg-base-100/50 text-[9px] font-black uppercase tracking-widest border border-base-content/10 text-base-content/60">
                                {book.type === "Original" || book.type === 0 ? "Orijinal" : "Çeviri"}
                              </span>
                              <span className={`px-2 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest border min-w-[32px] text-center ${ratingInfo.color}`}>
                                {ratingInfo.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Açıklama (Description) */}
                        <p className="text-[11px] font-medium leading-relaxed text-base-content/40 italic line-clamp-2">
                          {book.description || "Henüz bir açıklama eklenmemiş."}
                        </p>

                        {/* Alt İstatistikler */}
                        <div className="flex flex-wrap gap-5 border-t border-base-content/5 pt-4">
                          <div className="flex items-center gap-2 text-xs font-black text-base-content/60">
                            <Eye className="w-4 h-4 text-primary" />
                            {isMounted ? book.viewCount?.toLocaleString("tr-TR") : "0"}
                          </div>
                          <div className="flex items-center gap-2 text-xs font-black text-base-content/60">
                            <BookOpen className="w-4 h-4 text-secondary" />
                            {book.chapterCount} <span className="text-[9px] opacity-40 font-bold tracking-widest">BÖLÜM</span>
                          </div>
                          <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-base-content/30 uppercase tracking-widest italic ml-auto mr-1">
                            <Clock className="w-3.5 h-3.5" />
                            {isMounted ? new Date(book.updatedAt).toLocaleDateString("tr-TR") : "-"}
                          </div>
                        </div>
                      </div>

                      {/* Aksiyon Butonları */}
                      <div className="card-actions justify-end mt-4 pt-4 border-t border-base-content/5">
                        <Link href={`/author/${book.slug}`} className="btn btn-primary h-12 flex-1 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40">
                          Yönet
                        </Link>
                        <Link href={`/Books/${book.slug}`} target="_blank" className="btn h-12 w-12 p-0 rounded-xl border border-base-content/10 bg-base-100/10 text-base-content/40 hover:text-primary hover:bg-base-100/20 hover:border-primary/20 transition-all">
                          <ExternalLink className="w-5 h-5" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Sayfalama (Glass Join) */}
          {totalPages > 1 && !isLoading && (
            <div className="flex justify-center mt-12">
              <div className={`join rounded-2xl ${glassStyle} p-1`}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="join-item btn btn-ghost h-12 w-14 rounded-xl hover:bg-base-100/40 disabled:opacity-30 disabled:bg-transparent"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="join-item flex items-center justify-center px-6 text-[11px] font-black uppercase tracking-[0.2em] text-base-content/60 italic bg-transparent">
                  Sayfa {page} / {totalPages}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="join-item btn btn-ghost h-12 w-14 rounded-xl hover:bg-base-100/40 disabled:opacity-30 disabled:bg-transparent"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}