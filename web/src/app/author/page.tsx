"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { Eye, BookOpen, Clock, ExternalLink, ChevronLeft, ChevronRight, Feather, Loader2, Plus, Search, SlidersHorizontal, Home, Star, MessageSquare, LayoutGrid, Wallet, Trash2, BarChart3, Type } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { canAccessAuthorPanel as hasAuthorPanelAccess, getMyBooks, restoreBook, type MyBookListItem } from "@/lib/auth";
import { resolveMediaUrl } from "@/lib/api";

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

  const [activeTab, setActiveTab] = useState("works");
  const [selectedDiscussionBook, setSelectedDiscussionBook] = useState<any>(null);
  const [selectedDiscussionChapter, setSelectedDiscussionChapter] = useState<any>(null);
  const [discussionSubView, setDiscussionSubView] = useState<"overview" | "all_reviews" | "full_comments" | "full_line_comments">("overview");
  const [discussionSearch, setDiscussionSearch] = useState("");
  const [reportingItemId, setReportingItemId] = useState<string | number | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [discussionPage, setDiscussionPage] = useState(1);
  const [discussionPageSize, setDiscussionPageSize] = useState(10);

  // Sayfa yüklendiğinde (mount) en son seçili sekmeyi ve tartisma odagini getir
  useEffect(() => {
    const savedTab = localStorage.getItem("author_panel_active_tab");
    if (savedTab) setActiveTab(savedTab);

    const savedBook = localStorage.getItem("discussion_selected_book");
    if (savedBook) setSelectedDiscussionBook(JSON.parse(savedBook));

    const savedChapter = localStorage.getItem("discussion_selected_chapter");
    if (savedChapter) setSelectedDiscussionChapter(JSON.parse(savedChapter));
  }, []);

  // Sekme veya odak değiştiğinde seçimini hafızaya kaydet
  useEffect(() => {
    localStorage.setItem("author_panel_active_tab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (selectedDiscussionBook) {
      localStorage.setItem("discussion_selected_book", JSON.stringify(selectedDiscussionBook));
    } else {
      localStorage.removeItem("discussion_selected_book");
    }
  }, [selectedDiscussionBook]);

  useEffect(() => {
    if (selectedDiscussionChapter) {
      localStorage.setItem("discussion_selected_chapter", JSON.stringify(selectedDiscussionChapter));
    } else {
      localStorage.removeItem("discussion_selected_chapter");
    }
  }, [selectedDiscussionChapter]);

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

  const [deletedBooks, setDeletedBooks] = useState<MyBookListItem[]>([]);
  const [isTrashLoading, setIsTrashLoading] = useState(false);

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
    const loadBooks = async (isDeleted: boolean = false) => {
      try {
        if (isDeleted) setIsTrashLoading(true);
        setIsLoading(true);
        const response = await getMyBooks({
          pageNumber: page,
          pageSize: pageSize,
          search: query || undefined,
          status: status || undefined,
          type: bookType || undefined,
          isDeleted: isDeleted
        });

        if (isMountedLocal) {
          if (isDeleted) {
            setDeletedBooks(response.items);
          } else {
            setBooks(response.items);
            setTotalCount(response.totalCount);
            setTotalPages(response.totalPages);
          }
          setError(null);
        }
      } catch (err) {
        if (isMountedLocal) setError("Eserler yüklenirken bir hata oluştu.");
      } finally {
        if (isMountedLocal) {
          setIsLoading(false);
          setIsTrashLoading(false);
        }
      }
    };
    if (hasAuthorPanelAccess(profile)) {
      setBooks([]);
      setDeletedBooks([]);
      if (activeTab === "trash") loadBooks(true);
      else loadBooks(false);
    }
    return () => { isMountedLocal = false; };
  }, [profile, query, status, bookType, page, pageSize, activeTab]);

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



  const handleRestoreBook = async (id: string) => {
    try {
      if (!confirm("Bu eseri geri yüklemek istediğinize emin misiniz?")) return;
      
      await restoreBook(id);
      
      // Çöp kutusunu yenile
      const response = await getMyBooks({ pageNumber: 1, pageSize: 50, isDeleted: true });
      setDeletedBooks(response.items);
      
      alert("Eser başarıyla geri yüklendi.");
    } catch (err) {
      alert("Geri yükleme sırasında bir hata oluştu: " + (err instanceof Error ? err.message : "Bilinmeyen hata"));
    }
  };

  // Ortak Glassmorphism Sınıfı
  const glassStyle = "bg-base-100/40 backdrop-blur-xl border border-base-content/10 shadow-xl";

  return (
    <main className="relative min-h-screen bg-base-200/30 pb-12 pt-28 sm:pt-32">
      {/* Dekoratif bulanık daireler */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-40 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="site-shell mx-auto px-4 sm:px-8 space-y-8 relative z-10">

        {/* Üst Kısım: Başlık ve İstatistikler Birleşik */}
        <section className={`p-4 sm:p-6 rounded-[2rem] ${glassStyle} space-y-8`}>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-4">
                <div className="breadcrumbs text-xs font-semibold text-base-content/50 mb-1">
                  <ul>
                    <li><Link href="/" className="hover:text-primary transition-colors flex items-center"><Home className="w-3.5 h-3.5 mr-1.5" /> Ana Sayfa</Link></li>
                    <li className="text-base-content/40">Yazarlık Paneli</li>
                  </ul>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 text-primary">
                    <Feather className="h-7 w-7" strokeWidth={2.5} />
                    <h1 className="hero-title-gradient text-3xl font-black tracking-tight sm:text-4xl uppercase italic leading-none">Yazarlık Paneli</h1>
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-base-content/30 italic">Eserlerini yönet ve performans verilerini anlık takip et.</p>
                </div>
              </div>

              {hasAuthorPanelAccess(profile) && (
                <Link href="/author/new" className="btn btn-primary h-11 rounded-xl px-6 font-black uppercase tracking-widest shadow-lg shadow-primary/20 shrink-0 hover:-translate-y-0.5 transition-transform">
                  <Plus className="w-4 h-4 ml-[-4px]" strokeWidth={3} /> Yeni Eser
                </Link>
              )}
            </div>
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

        {/* Sekme Seçici (Tabs) */}
        <div className={`flex flex-wrap items-center gap-1.5 p-1.5 rounded-[1.8rem] ${glassStyle} w-fit mx-auto lg:mx-0`}>
          <button
            onClick={() => setActiveTab("works")}
            className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === "works" ? "bg-primary text-primary-content shadow-lg shadow-primary/20" : "hover:bg-base-100/40 text-base-content/50"
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> Eserlerim
          </button>
          <button
            onClick={() => setActiveTab("discussions")}
            className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === "discussions" ? "bg-primary text-primary-content shadow-lg shadow-primary/20" : "hover:bg-base-100/40 text-base-content/50"
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Tartismalar
          </button>
          <button
            onClick={() => setActiveTab("earnings")}
            className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === "earnings" ? "bg-primary text-primary-content shadow-lg shadow-primary/20" : "hover:bg-base-100/40 text-base-content/50"
            }`}
          >
            <Wallet className="w-4 h-4" /> Gelirlerim
          </button>
          <button
            onClick={() => setActiveTab("trash")}
            className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === "trash" ? "bg-primary text-primary-content shadow-lg shadow-primary/20" : "hover:bg-base-100/40 text-base-content/50"
            }`}
          >
            <Trash2 className="w-4 h-4" /> Cop Kutusu
          </button>
        </div>

        {activeTab === "works" && (
          <>
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
                      <option key={opt.value} value={opt.value} className="bg-base-100 font-sans">{opt.label}</option>
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
                    <option value="" className="bg-base-100 font-sans">Tüm Türler</option>
                    <option value="0" className="bg-base-100 font-sans">Orijinal</option>
                    <option value="1" className="bg-base-100 font-sans">Çeviri</option>
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
                      <option key={sz} value={sz} className="bg-base-100 font-sans">{sz} Kayıt</option>
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
                        <figure className="sm:w-52 shrink-0 relative m-3 rounded-[1.5rem] overflow-hidden bg-base-100/40 aspect-[4/5] sm:aspect-auto">
                          {book.coverImageUrl ? (
                            <img
                              src={resolveMediaUrl(book.coverImageUrl)}
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

                        <div className="card-body p-5 sm:p-6 sm:pl-3">
                          <div className="flex-1 space-y-4">
                            <div>
                              <Link href={`/author/${book.slug}`} className="text-xl sm:text-2xl font-black tracking-tight leading-tight group-hover:text-primary transition-colors line-clamp-2 mb-2">
                                {book.title}
                              </Link>
                              
                              <div className="flex flex-wrap gap-2.5 items-center">
                                <span className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest border text-center min-w-[80px] ${statusInfo.color}`}>
                                  {statusInfo.label}
                                </span>
                                
                                <div className="flex flex-wrap gap-1.5 items-center">
                                  {book.categories?.slice(0, 3).map((cat) => (
                                    <span key={cat.id} className="px-3 py-1.5 rounded-md bg-base-content/5 text-[9px] font-bold text-base-content/40 uppercase tracking-widest border border-base-content/10">
                                      {cat.name}
                                    </span>
                                  ))}
                                  {book.categories?.length > 3 && (
                                    <span className="text-[9px] font-black text-base-content/20 ml-1">+{book.categories.length - 3}</span>
                                  )}

                                  <span className="px-3 py-1.5 rounded-md bg-base-100/50 text-[9px] font-black uppercase tracking-widest border border-base-content/10 text-base-content/60">
                                    {book.type === "Original" || book.type === 0 ? "Orijinal" : "Çeviri"}
                                  </span>
                                  <span className={`px-2 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest border min-w-[32px] text-center ${ratingInfo.color}`}>
                                    {ratingInfo.label}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <p className="text-[11px] font-medium leading-relaxed text-base-content/40 italic line-clamp-2">
                              {book.description || "Henüz bir açıklama eklenmemiş."}
                            </p>

                            {book.isHidden && (
                              <div className="flex gap-3 items-center p-3 rounded-xl bg-error/12 border border-error/20 animate-pulse">
                                <div className="p-2 rounded-lg bg-error/20 text-error">
                                   <SlidersHorizontal className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5">
                                   <p className="text-[10px] font-black uppercase tracking-widest text-error">YONETICI MUDAHALESI</p>
                                   <p className="text-[11px] font-bold text-error/80 leading-tight">
                                     Kitabınız yönetici tarafından gizlenmiştir. Problem olduğunu düşünüyorsanız lütfen destek talebi oluşturun.
                                   </p>
                                </div>
                              </div>
                            )}

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
          </>
        )}

        {/* Tartismalar Sekmesi (High-Capacity Drill-down UI) */}
        {activeTab === "discussions" && (
          <div className="space-y-6">
            {!selectedDiscussionBook ? (
              /* SEVIYE 1: Tum Kitaplar Listesi */
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { id: 1, title: "Karanligin Yukselisi", total: 124, unread: 12 },
                  { id: 2, title: "Zamanin Otesinde", total: 67, unread: 0 },
                  { id: 3, title: "Kadim Harita", total: 89, unread: 5 },
                  { id: 4, title: "Sonsuz Labirent", total: 32, unread: 1 },
                ].map((book) => (
                  <button
                    key={book.id}
                    onClick={() => setSelectedDiscussionBook(book)}
                    className={`group relative flex flex-col items-start p-5 rounded-[1.8rem] transition-all hover:border-primary/40 text-left ${glassStyle} hover:shadow-2xl hover:shadow-primary/5`}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-14 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                         <BookOpen className="w-5 h-5 text-primary/40" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-black tracking-tight line-clamp-1">{book.title}</h3>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-base-content/30 italic">Etkilesim Merkezi</p>
                      </div>
                    </div>
                    
                    <div className="mt-auto flex items-center justify-between w-full pt-4 border-t border-base-content/5">
                       <span className="text-[10px] font-black text-base-content/40 uppercase tracking-widest italic">{book.total} Yorum</span>
                       {book.unread > 0 && <span className="badge badge-primary badge-sm font-bold">{book.unread} Yeni</span>}
                    </div>
                    <ChevronRight className="absolute right-5 top-5 w-4 h-4 text-base-content/10 group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            ) : !selectedDiscussionChapter ? (
              /* SEVIYE 2: Kitap Detayi - Genel Yorumlar ve Bolum Listesi */
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col gap-5 md:flex-row md:items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        if (discussionSubView === "all_reviews") {
                          setDiscussionSubView("overview");
                        } else {
                          setSelectedDiscussionBook(null);
                        }
                      }} 
                      className="btn btn-circle btn-sm btn-ghost hover:bg-primary/10 text-primary"
                    >
                       <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h3 className="text-xl font-black italic uppercase tracking-tighter hero-title-gradient">
                        {discussionSubView === "all_reviews" ? "Tüm Genel İncelemeler" : selectedDiscussionBook.title}
                      </h3>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-base-content/30 italic">
                        {discussionSubView === "all_reviews" ? selectedDiscussionBook.title : "Icerik Yonetimi ve Yorumlar"}
                      </p>
                    </div>
                  </div>

                  {/* Arama Cubugu (Kullanici veya Bolum) */}
                  <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-4 top-1/2 w-4 h-4 -translate-y-1/2 text-base-content/30" />
                    <input
                      type="text"
                      placeholder="Kullanıcı veya bölüm ara..."
                      value={discussionSearch}
                      onChange={(e) => setDiscussionSearch(e.target.value)}
                      className="input h-11 w-full rounded-xl bg-base-100/30 pl-11 text-xs font-bold border-transparent focus:border-primary/30 focus:bg-base-100/50 transition-all"
                    />
                  </div>
                </div>

                {discussionSubView === "overview" ? (
                  <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
                    {/* Sol: Genel Yorumlar Ozeti */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                          <Star className="w-4 h-4 text-warning" />
                          <h4 className="text-xs font-black uppercase tracking-[0.16em] italic text-base-content/40">Inceleme Ozeti</h4>
                        </div>
                        <button 
                          onClick={() => setDiscussionSubView("all_reviews")} 
                          className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline italic"
                        >
                          Tümünü Gör
                        </button>
                      </div>
                      <div className="grid gap-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className={`p-4 rounded-2xl border border-base-content/5 bg-base-100/20 space-y-3`}>
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-primary/10" />
                                  <span className="text-[11px] font-black uppercase tracking-tighter">@okur_{i}</span>
                               </div>
                               <button 
                                 onClick={() => setReportingItemId(reportingItemId === `ov_review_${i}` ? null : `ov_review_${i}`)}
                                 className={`btn btn-xs btn-ghost font-black uppercase tracking-widest italic ${reportingItemId === `ov_review_${i}` ? "text-error" : "text-base-content/30 hover:text-error"}`}
                               >
                                 Bildir
                               </button>
                            </div>
                            <p className="text-sm text-base-content/70 italic leading-relaxed">"Hikayenin atmosferi cok basarili, genel kurgu merak uyandiriyor."</p>

                            {/* Bildiri Alani */}
                            {reportingItemId === `ov_review_${i}` && (
                              <div className="flex gap-2 items-center pt-3 border-t border-error/20 animate-in slide-in-from-top-2 duration-300">
                                 <input 
                                   type="text" 
                                   placeholder="Bildiri nedeni..." 
                                   value={reportReason}
                                   onChange={(e) => setReportReason(e.target.value)}
                                   className="input input-xs h-8 bg-error/5 border border-error/10 text-[10px] flex-1 rounded-lg focus:border-error/30" 
                                 />
                                 <button 
                                   onClick={() => {
                                     setReportingItemId(null);
                                     setReportReason("");
                                   }}
                                   className="btn btn-xs btn-error rounded-lg px-3 text-[9px] font-black uppercase"
                                 >
                                   Gönder
                                 </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sag: Bolumler Listesi (Big Data Scale Optimization) */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                           <LayoutGrid className="w-4 h-4 text-secondary" />
                           <h4 className="text-xs font-black uppercase tracking-[0.16em] italic text-base-content/40">Bolum Gezgini</h4>
                        </div>
                        <span className="text-[10px] font-black italic opacity-30 tracking-widest">3000+ Bölüm</span>
                      </div>

                      <div className={`flex flex-col rounded-3xl overflow-hidden border border-base-content/5 ${glassStyle} h-[600px]`}>
                        {/* Hızlı Aralık Seçici (Batch Navigation) */}
                        <div className="p-3 border-b border-base-content/5 bg-base-content/5 grid grid-cols-4 gap-2">
                           {["1-100", "101-200", "201-300", "Son"].map(range => (
                             <button key={range} className="btn btn-xs rounded-lg bg-base-100/50 border-transparent text-[9px] font-black hover:bg-primary/20 hover:text-primary transition-all lowercase">
                               {range}
                             </button>
                           ))}
                        </div>

                        {/* Hizli Bolum Ara / Git */}
                        <div className="p-2 border-b border-base-content/5">
                           <div className="relative">
                              <input 
                                type="number" 
                                placeholder="Bölüm No..." 
                                className="input input-xs w-full h-8 bg-transparent pl-3 text-[10px] font-bold border-none focus:outline-none" 
                              />
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black opacity-20 uppercase tracking-widest">Git</div>
                           </div>
                        </div>

                        {/* Dinamik Liste (Scrollable) */}
                        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-base-content/10">
                          {[2954, 2953, 2952, 12, 11, 10, 9, 8].map((chap) => (
                            <button
                              key={chap}
                              onClick={() => setSelectedDiscussionChapter({ id: chap, title: `Bolum ${chap}: Modern Epigin Sonu` })}
                              className="w-full p-4 flex items-center justify-between border-b border-base-content/5 last:border-0 hover:bg-base-content/5 transition-colors text-left group"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-secondary tabular-nums">#{chap}</span>
                                  <p className="text-xs font-black italic truncate group-hover:text-primary transition-colors">Bölüm Adı Buraya Gelir</p>
                                </div>
                                <p className="text-[9px] font-bold text-base-content/30 uppercase tracking-widest mt-1">4 Yorum • 12 Satir</p>
                              </div>
                              {chap > 2950 && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Tum Incelemeler Gorunumu */
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="grid gap-3">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
                        .filter(i => discussionSearch === "" || `okur_profil_${i}`.includes(discussionSearch.toLowerCase()) || "orijinal".includes(discussionSearch.toLowerCase()))
                        .slice((discussionPage - 1) * discussionPageSize, discussionPage * discussionPageSize)
                        .map(i => (
                        <div key={i} className={`p-5 rounded-2xl border border-base-content/5 bg-base-100/20 space-y-4 group`}>
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20" />
                                <div>
                                   <p className="text-xs font-black uppercase tracking-tighter">@okur_profil_{i}</p>
                                   <div className="flex gap-0.5 mt-0.5">
                                      {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-2.5 h-2.5 text-warning fill-warning" />)}
                                   </div>
                                </div>
                             </div>
                             <div className="flex items-center gap-2">
                                <button className="btn btn-xs btn-ghost text-base-content/30 hover:text-primary font-black uppercase tracking-widest italic">Yanıtla</button>
                                <button 
                                  onClick={() => setReportingItemId(reportingItemId === `review_full_${i}` ? null : `review_full_${i}`)}
                                  className={`btn btn-xs btn-ghost font-black uppercase tracking-widest italic ${reportingItemId === `review_full_${i}` ? "text-error" : "text-base-content/30 hover:text-error"}`}
                                >
                                  Bildir
                                </button>
                             </div>
                          </div>
                          <p className="text-sm text-base-content/80 italic leading-relaxed">"Orijinal bir fikir, karakter gelisimi çok tatmin edici. Yeni bolümleri bekliyorum."</p>
                          
                          {/* Bildiri Alani */}
                          {reportingItemId === `review_full_${i}` && (
                            <div className="flex gap-2 items-center pt-3 border-t border-error/20 animate-in slide-in-from-top-2 duration-300">
                               <input 
                                 type="text" 
                                 placeholder="Bildiri nedeni..." 
                                 value={reportReason}
                                 onChange={(e) => setReportReason(e.target.value)}
                                 className="input input-xs h-9 bg-error/5 border border-error/10 text-[10px] flex-1 rounded-lg focus:border-error/30" 
                               />
                               <button 
                                 onClick={() => {
                                   setReportingItemId(null);
                                   setReportReason("");
                                 }}
                                 className="btn btn-xs btn-error rounded-lg px-4 h-9 text-[10px] font-black uppercase"
                               >
                                 Gönder
                               </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    <div className="flex justify-center pt-2">
                      <div className={`join rounded-2xl ${glassStyle} p-1`}>
                        <button
                          onClick={() => setDiscussionPage(p => Math.max(1, p - 1))}
                          disabled={discussionPage === 1}
                          className="join-item btn btn-ghost h-10 w-12 rounded-xl hover:bg-base-100/40 disabled:opacity-30 disabled:bg-transparent"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="join-item flex items-center justify-center px-4 text-[10px] font-black uppercase tracking-[0.2em] text-base-content/60 italic bg-transparent">
                          {discussionPage} / 2
                        </div>
                        <button
                          onClick={() => setDiscussionPage(p => Math.min(2, p + 1))}
                          disabled={discussionPage === 2}
                          className="join-item btn btn-ghost h-10 w-12 rounded-xl hover:bg-base-100/40 disabled:opacity-30 disabled:bg-transparent"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* SEVIYE 3: Bolum Detayi - Bolum Yorumlari ve Satir Yorumlari */
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                 <div className="flex flex-col gap-5 md:flex-row md:items-center justify-between">
                   <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          if (discussionSubView === "full_comments") {
                            setDiscussionSubView("overview");
                          } else {
                            setSelectedDiscussionChapter(null);
                            setDiscussionSubView("overview");
                          }
                        }} 
                        className="btn btn-circle btn-sm btn-ghost hover:bg-primary/10 text-primary"
                      >
                         <ChevronLeft className="w-5 h-5" />
                      </button>
                      <div>
                        <h3 className="text-sm font-black text-base-content/40 uppercase tracking-widest">{selectedDiscussionBook.title}</h3>
                        <h4 className="text-xl font-black italic uppercase tracking-tighter text-secondary">
                          {discussionSubView === "full_comments" ? "Tüm Bölüm Yorumları" : selectedDiscussionChapter.title}
                        </h4>
                      </div>
                   </div>

                   {/* Bolum Ici Arama (Sadece bu bolumdekiler) */}
                   <div className="relative w-full md:w-64 group">
                      <Search className="absolute left-4 top-1/2 w-4 h-4 -translate-y-1/2 text-base-content/20" />
                      <input 
                        type="text" 
                        placeholder="Bölümde ara..." 
                        value={discussionSearch}
                        onChange={(e) => { setDiscussionSearch(e.target.value); setDiscussionPage(1); }}
                        className="input input-sm h-10 w-full rounded-xl bg-base-100/30 pl-10 text-[11px] font-bold border-transparent focus:border-secondary/30 transition-all" 
                      />
                   </div>
                 </div>

                 {discussionSubView === "overview" ? (
                   <div className="grid gap-6">
                      {/* Bolum Yorumları Ozeti */}
                      <article className={`p-6 rounded-[2rem] border border-secondary/10 bg-gradient-to-br from-base-100/40 to-secondary/5 space-y-6`}>
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                               <MessageSquare className="w-4 h-4 text-secondary" />
                               <h5 className="text-[11px] font-black uppercase tracking-widest italic">Bolum Tartismasi (Ozet)</h5>
                            </div>
                            <button 
                              onClick={() => { setDiscussionSubView("full_comments"); setDiscussionSearch(""); setDiscussionPage(1); }}
                              className="text-[10px] font-black uppercase tracking-widest text-secondary hover:underline italic"
                            >
                               Tümünü Gör (128)
                            </button>
                         </div>
                         <div className="grid gap-4">
                            {[1, 2].map(i => (
                              <div key={i} className="p-4 rounded-2xl bg-base-100/30 space-y-4 border border-base-content/5 group/reply">
                                 <p className="text-sm text-base-content/80 italic leading-relaxed">"Bu bolumdeki diyaloglar cok derinlikliydi, yazarın eline saglik."</p>
                                 <div className="flex items-center justify-between pt-2 border-t border-base-content/5">
                                    <div className="flex items-center gap-2">
                                       <span className="text-[9px] font-black text-base-content/30 uppercase">@gezgin_okur</span>
                                    </div>
                                    <div className="flex gap-2">
                                       <button className="btn btn-ghost btn-xs text-base-content/20 hover:text-primary h-6"><ExternalLink className="w-3 h-3" /></button>
                                    </div>
                                 </div>
                              </div>
                            ))}
                         </div>
                      </article>

                      {/* Satir Yorumları Ozeti (Level 3 Summary) */}
                      <div className="space-y-4">
                         <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-3">
                               <Type className="w-4 h-4 text-success" />
                               <h5 className="text-[11px] font-black uppercase tracking-widest italic text-base-content/40">Satir Yorumlari</h5>
                            </div>
                            <button 
                              onClick={() => { setDiscussionSubView("full_line_comments"); setDiscussionSearch(""); setDiscussionPage(1); }}
                              className="text-[10px] font-black uppercase tracking-widest text-success hover:underline italic font-black"
                            >
                               Yönet / Tümünü Gör (42)
                            </button>
                         </div>
                         <div className="grid gap-4">
                            {[1].map(i => (
                              <div key={i} className={`p-5 rounded-[1.8rem] border border-success/10 bg-success/5 space-y-4 shadow-sm group/item`}>
                                 <div className="p-3 rounded-xl bg-success/10 border border-success/10 flex justify-between items-start gap-4">
                                    <p className="text-xs text-success/60 italic font-medium leading-relaxed truncate">"... gokyuzu birden karardı ve simsekler uzerimizdeki agacların arasından suzulerek yere indi."</p>
                                 </div>
                                 <div className="flex gap-4 items-center pl-2">
                                    <div className="w-6 h-6 rounded-lg bg-success/10 border border-success/10" />
                                    <p className="text-[11px] text-base-content/60 italic flex-1">"Betimleme cok iyi, o anı yasadım resmen!"</p>
                                    <span className="text-[9px] font-black uppercase opacity-20 italic">#paragraf 12</span>
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>
                 ) : discussionSubView === "full_comments" ? (
                   /* Seviye 3 Alt-Görünüm: Tüm Bölüm Yorumları */
                   <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                      <div className="grid gap-4">
                         {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                            .filter(i => discussionSearch === "" || `okur_adi_${i}`.includes(discussionSearch.toLowerCase()) || "etkileyici".includes(discussionSearch.toLowerCase()))
                            .slice((discussionPage - 1) * discussionPageSize, discussionPage * discussionPageSize)
                            .map(i => (
                            <div key={i} className="p-5 rounded-[2rem] bg-base-100/20 border border-base-content/5 space-y-4 group/item">
                               <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/10 flex items-center justify-center">
                                        <MessageSquare className="w-5 h-5 text-secondary/40" />
                                     </div>
                                     <div>
                                        <p className="text-xs font-black uppercase tracking-tighter">@okur_adi_{i}</p>
                                        <p className="text-[10px] text-base-content/30 italic">12 Dakika Önce</p>
                                     </div>
                                  </div>
                                  <div className="flex gap-2">
                                     <button 
                                       onClick={() => setReportingItemId(reportingItemId === `comment_full_${i}` ? null : `comment_full_${i}`)}
                                       className={`btn btn-xs btn-ghost font-black uppercase tracking-widest italic ${reportingItemId === `comment_full_${i}` ? "text-error" : "text-base-content/30 hover:text-error"}`}
                                     >
                                       Bildir
                                     </button>
                                  </div>
                               </div>
                               <p className="text-sm text-base-content/80 italic leading-relaxed pl-1">"Gerçekten etkileyici bir son. Bir sonraki bölümü iple çekiyorum!"</p>
                               
                               {/* Bildiri Alani */}
                               {reportingItemId === `comment_full_${i}` && (
                                <div className="flex gap-2 items-center pt-3 border-t border-error/20 animate-in slide-in-from-top-2 duration-300">
                                   <input 
                                     type="text" 
                                     placeholder="Bildiri nedeni..." 
                                     value={reportReason}
                                     onChange={(e) => setReportReason(e.target.value)}
                                     className="input input-xs h-8 bg-error/5 border border-error/10 text-[10px] flex-1 rounded-lg focus:border-error/30" 
                                   />
                                   <button 
                                     onClick={() => {
                                       setReportingItemId(null);
                                       setReportReason("");
                                     }}
                                     className="btn btn-xs btn-error rounded-lg px-3 text-[9px] font-black uppercase"
                                   >
                                     Gönder
                                   </button>
                                </div>
                               )}

                               <div className="flex gap-2 pt-2">
                                  <input type="text" placeholder="Hızlıca yanıtla..." className="input input-sm h-10 bg-base-100/40 border-transparent text-[11px] flex-1 rounded-xl" />
                                  <button className="btn btn-sm btn-secondary rounded-xl px-4 text-[10px] font-black uppercase tracking-widest">Yanıtla</button>
                               </div>
                            </div>
                         ))}
                      </div>

                      {/* Pagination */}
                      <div className="flex justify-center">
                        <div className={`join rounded-2xl ${glassStyle} p-1`}>
                          <button
                            onClick={() => setDiscussionPage(p => Math.max(1, p - 1))}
                            disabled={discussionPage === 1}
                            className="join-item btn btn-ghost h-10 w-12 rounded-xl hover:bg-base-100/40 disabled:opacity-30 disabled:bg-transparent"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <div className="join-item flex items-center justify-center px-4 text-[10px] font-black uppercase tracking-[0.2em] text-base-content/60 italic bg-transparent">
                            {discussionPage} / 2
                          </div>
                          <button
                            onClick={() => setDiscussionPage(p => Math.min(2, p + 1))}
                            disabled={discussionPage === 2}
                            className="join-item btn btn-ghost h-10 w-12 rounded-xl hover:bg-base-100/40 disabled:opacity-30 disabled:bg-transparent"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                   </div>
                 ) : (
                   /* Seviye 4: Tum Satir Yorumlarini Yonet */
                   <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                      <div className="grid gap-6">
                         {[1, 2, 3].map(p => (
                            <div key={p} className="space-y-3">
                               <div className="flex items-center gap-3 px-2">
                                  <span className="text-[10px] font-black text-success tabular-nums uppercase border border-success/20 px-2 py-0.5 rounded-md">Paragraf {p * 4}</span>
                                  <div className="h-px flex-1 bg-success/5" />
                               </div>
                               <div className="p-4 rounded-3xl bg-success/5 border border-success/10 space-y-4">
                                  <blockquote className="text-xs text-success/60 italic font-medium border-l-2 border-success/20 pl-4 py-2 bg-success/5 rounded-r-xl">
                                     "... gecenin karanlıgında uzaklardan gelen o fısıltı, her gecen saniye daha da yaklasıyor ve zihnimin derinliklerinde yankılanıyordu."
                                  </blockquote>
                                  <div className="grid gap-3 pl-4">
                                     {[1, 2].map(c => (
                                        <div key={c} className="p-4 rounded-2xl bg-base-100/40 border border-base-content/5 space-y-3 group/line">
                                           <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                 <span className="text-[11px] font-black italic">@sadik_okur_{c}</span>
                                                 <span className="text-[9px] text-base-content/30 italic">Az Önce</span>
                                              </div>
                                              <div className="flex gap-2 items-center mt-3 pt-3 border-t border-base-content/5">
                                                 <input type="text" placeholder="Neden bildiriyorsunuz?" className="input input-xs h-8 bg-error/5 border-transparent text-[10px] flex-1 rounded-lg" />
                                                 <button className="btn btn-xs btn-error rounded-lg px-3 text-[9px] font-black uppercase tracking-widest">Bildir</button>
                                              </div>
                                           </div>
                                           <p className="text-sm text-base-content/80 italic leading-relaxed">"Bu fısıltı metaforu harika, atmosferi çok iyi tamamlıyor."</p>
                                           <div className="flex gap-2">
                                              <input type="text" placeholder="Okura cevap ver..." className="input input-sm h-9 bg-base-100/20 border-transparent text-[11px] flex-1 rounded-lg" />
                                              <button className="btn btn-sm btn-success rounded-lg px-4 text-[10px] font-black uppercase tracking-widest">OK</button>
                                           </div>
                                        </div>
                                     ))}
                                  </div>
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>
                 )}
              </div>
            )}
          </div>
        )}

        {/* Gelirlerim Sekmesi */}
        {activeTab === "earnings" && (
          <section className={`py-40 flex flex-col items-center justify-center gap-6 rounded-[2rem] border-dashed ${glassStyle} opacity-60`}>
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet className="w-12 h-12 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-black uppercase italic tracking-tighter">Henuz Veri Bulunamadi</h2>
              <p className="text-xs font-bold uppercase tracking-widest text-base-content/40 italic">Bu bolum henuz yapilandirilma asamasindadir.</p>
            </div>
          </section>
        )}

        {/* Çöp Kutusu Sekmesi */}
        {activeTab === "trash" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between px-2">
              <div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter hero-title-gradient">Çöp Kutusu</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-base-content/30 italic">Silinen Eserleriniz</p>
              </div>
            </div>

            {isTrashLoading ? (
              <div className={`py-32 flex flex-col items-center justify-center gap-5 rounded-[2rem] ${glassStyle} opacity-60`}>
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-[11px] font-black uppercase tracking-[0.3em] italic">Yükleniyor...</p>
              </div>
            ) : deletedBooks.length === 0 ? (
              <div className={`py-40 flex flex-col items-center justify-center gap-6 rounded-[2rem] border-dashed ${glassStyle} opacity-60`}>
                 <div className="w-24 h-24 rounded-full bg-base-content/5 flex items-center justify-center">
                    <Trash2 className="w-12 h-12 text-base-content/20" />
                 </div>
                 <div className="text-center space-y-2">
                    <h2 className="text-xl font-black uppercase italic tracking-tighter">Çöp Kutusu Boş</h2>
                    <p className="text-xs font-bold uppercase tracking-widest text-base-content/40 italic">Burada henüz silinmiş bir eseriniz bulunmuyor.</p>
                 </div>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {deletedBooks.map((book) => {
                  const statusInfo = getStatusProps(book.status);
                  return (
                    <article key={book.id} className={`group relative overflow-hidden rounded-[2rem] border border-base-content/10 transition-all hover:border-primary/30 ${glassStyle} hover:shadow-2xl hover:shadow-primary/5`}>
                       <div className="flex gap-5 p-6">
                          <div className="relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-xl border border-base-content/10 bg-base-100/40">
                               {book.coverImageUrl ? (
                                 <img src={resolveMediaUrl(book.coverImageUrl)} alt={book.title} className="h-full w-full object-cover opacity-50 grayscale" />
                               ) : (
                                 <div className="flex h-full items-center justify-center text-[8px] font-bold text-base-content/20">NO IMAGE</div>
                               )}
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                             <div>
                                <h3 className="text-sm font-black tracking-tight line-clamp-1 opacity-70 italic group-hover:text-primary transition-colors">{book.title}</h3>
                                <div className="flex items-center gap-2 mt-2">
                                   <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border ${statusInfo.color} opacity-60`}>
                                      {statusInfo.label}
                                   </span>
                                </div>
                             </div>
                             <button 
                               onClick={() => handleRestoreBook(book.id)}
                               className="btn btn-primary btn-sm h-10 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all"
                             >
                                Geri Getir
                             </button>
                          </div>
                       </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}