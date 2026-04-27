"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Settings,
  PlusCircle,
  Eye,
  FileText,
  Search,
  Trash2,
  ChevronRight
} from "lucide-react";
import { getMyBookBySlug, getMyChapters } from "@/lib/auth";
import { toMediaProxyUrl } from "@/lib/media";
import { ChapterReorderList } from "@/components/author/ChapterReorderList";
import Image from "next/image";
import { COVER_DEFAULT } from "@/lib/api";

export default function BookManagementPage() {
  const { bookSlug } = useParams() as { bookSlug: string };
  const [book, setBook] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [deletedChapters, setDeletedChapters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTrashLoading, setIsTrashLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        setIsLoading(true);
        // 1. Kitap Detaylarını Çek
        const bookData = await getMyBookBySlug(bookSlug);
        if (isMounted) {
          setBook(bookData);
        }

        // 2. Bölümleri Çek
        await loadChapters(1, searchQuery);

        // 3. Silinen Bölümleri Çek
        const deletedChaptersData = await getMyChapters(bookSlug, { pageSize: 100, OnlyDeleted: true });
        if (isMounted) {
          setDeletedChapters(deletedChaptersData.items || []);
        }
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchData();
    return () => { isMounted = false; };
  }, [bookSlug]);

  async function loadChapters(page: number, search: string) {
    try {
      const chaptersData = await getMyChapters(bookSlug, {
        pageNumber: page,
        pageSize: pageSize,
        search: search || undefined,
        OnlyDeleted: false
      });
      setChapters(chaptersData.items || []);
      setTotalPages(chaptersData.totalPages || 1);
      setCurrentPage(page);
    } catch (error) {
      console.error("Load chapters error:", error);
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    loadChapters(1, val);
  };

  if (isLoading || !book) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-100">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden text-base-content">
      <div className="site-shell mx-auto flex flex-col gap-6 px-4 pb-12 pt-28 sm:px-8 sm:pt-32">
        {/* Breadcrumb Area */}
        <section className="glass-frame relative space-y-4 p-6 sm:p-8">
          <nav className="flex items-center gap-2 text-xs font-semibold text-base-content/60">
            <Link href="/" className="transition-colors hover:text-primary">Anasayfa</Link>
            <span className="opacity-40">-</span>
            <Link href="/author" className="transition-colors hover:text-primary">Yazar Paneli</Link>
            <span className="opacity-40">-</span>
            <span className="text-base-content/90 truncate">{book.title}</span>
          </nav>

          <Link href="/author" className="inline-flex items-center gap-1 text-sm font-semibold text-base-content/65 hover:text-primary">
            <ChevronLeft className="h-4 w-4" />
            Panele Don
          </Link>

          {/* Floating Edit Button */}
          <div className="absolute right-4 top-4 sm:right-6 sm:top-6 flex gap-2">
            <Link href={`/author/${book.slug}/edit`} className="btn btn-ghost btn-md h-12 w-12 rounded-2xl border border-base-content/10 bg-base-100/30 p-0 shadow-sm transition-all hover:bg-base-100/50 hover:text-primary active:scale-95">
              <Settings className="h-5 w-5" />
            </Link>
          </div>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {/* 2:3 Kapak Gorseli */}
            <div className="relative aspect-2/3 w-28 shrink-0 overflow-hidden rounded-xl border border-base-content/10 bg-base-100/40 sm:w-32 md:w-36">
                <Image 
                  src={toMediaProxyUrl(book.coverImageUrl) || COVER_DEFAULT} 
                  alt={book.title} 
                  fill 
                  unoptimized
                  className="h-full w-full object-cover" 
                />
            </div>

            <div className="flex flex-1 flex-col justify-center gap-4">
              <h1 className="hero-title-gradient text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl uppercase truncate pr-16" title={book.title}>
                {book.title}
              </h1>

              <p className="line-clamp-2 text-sm text-base-content/60 max-w-3xl">
                {book.description || "Bu kitabin ozeti henüz eklenmemis."}
              </p>

              {/* Tur, Durum ve Yas Badge Grubu */}
              <div className="flex flex-wrap items-center gap-2 pt-1 font-sans">
                <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary shadow-sm">
                  {book.type === "Original" || Number(book.type) === 0 ? "Orijinal" : "Ceviri"}
                </span>
                <span className="rounded-full border border-success/20 bg-success/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-success shadow-sm">
                  {book.status === "Ongoing" || Number(book.status) === 1 ? "Devam Ediyor" : book.status === "Completed" || Number(book.status) === 2 ? "Tamamlandi" : "Taslak"}
                </span>
                <span className="rounded-full border border-base-content/10 bg-base-100/30 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-base-content/60 shadow-sm">
                  {book.contentRating === "Mature" || Number(book.contentRating) === 2 ? "18+" : "Genel"}
                </span>
              </div>

              {/* Istatistikler */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Bolumler</span>
                  <span className="text-sm font-bold text-base-content/85">{book.chapterCount}</span>
                </div>
                <div className="h-3 w-px bg-base-content/10 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Goruntulenme</span>
                  <span className="text-sm font-bold text-base-content/85">{(book.viewCount ?? 0).toLocaleString("tr-TR")}</span>
                </div>
                <div className="h-3 w-px bg-base-content/10 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Puan</span>
                  <span className="text-sm font-bold text-base-content/85">{(book.averageRating ?? 0).toFixed(1)} <span className="text-[10px] text-base-content/40 ml-1">({book.voteCount ?? 0})</span></span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-4">
                <Link href={`/author/${book.slug}/chapters/new`} className="btn btn-primary rounded-2xl px-8 shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 active:scale-95">
                  <PlusCircle className="h-4 w-4" /> Yeni Bolum Yaz
                </Link>
                <Link href={`/Books/${book.slug}`} className="btn rounded-2xl border border-base-content/12 bg-base-100/30 px-8 hover:bg-base-100/60 transition-all active:scale-95">
                  <Eye className="h-4 w-4" /> Goruntule
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Chapters Section */}
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
            <h3 className="flex items-center gap-2 text-xl font-black">
              <FileText className="h-5 w-5 text-primary" /> Bolumler
            </h3>

            {/* Search Input */}
            <div className="relative group min-w-[300px]">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-base-content/30 group-focus-within:text-primary transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Bölüm ara..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full h-12 pl-12 pr-4 rounded-2xl bg-base-100/50 border border-base-content/10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold"
              />
            </div>
          </div>

          <div className="space-y-4">
            {chapters.length > 0 ? (
              <>
                <ChapterReorderList
                  bookId={book.id}
                  bookSlug={book.slug}
                  initialChapters={chapters}
                  onOrderSaved={() => loadChapters(currentPage, searchQuery)}
                />

                {/* Simple Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-6">
                    <button
                      onClick={() => loadChapters(currentPage - 1, searchQuery)}
                      disabled={currentPage === 1}
                      className="btn btn-ghost btn-sm rounded-xl disabled:opacity-30"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button
                          key={p}
                          onClick={() => loadChapters(p, searchQuery)}
                          className={`h-8 w-8 rounded-xl text-[10px] font-black transition-all ${p === currentPage ? "bg-primary text-primary-content shadow-lg shadow-primary/20 scale-110" : "bg-base-100/50 hover:bg-base-100"
                            }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => loadChapters(currentPage + 1, searchQuery)}
                      disabled={currentPage === totalPages}
                      className="btn btn-ghost btn-sm rounded-xl disabled:opacity-30"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="glass-frame flex flex-col items-center justify-center gap-4 border-dashed py-24 text-center opacity-60 font-sans">
                <FileText className="h-8 w-8 opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest">
                  {searchQuery ? "Arama sonucu bulunamadi." : "Henuz hic bolum eklenmemis."}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(""); loadChapters(1, ""); }}
                    className="text-[10px] font-black text-primary uppercase underline underline-offset-4"
                  >
                    Aramayi Temizle
                  </button>
                )}
              </div>
            )}

            {/* Silinen Bölümler (Çöp Kutusu) */}
            {deletedChapters.length > 0 && !searchQuery && (
              <div className="mt-12 space-y-4 pt-12 border-t border-base-content/5">
                <div className="flex items-center gap-6 px-2">
                  <h3 className="flex items-center gap-2 text-xl font-black text-error">
                    <Trash2 className="h-5 w-5" /> Silinen Bölümler
                  </h3>
                  <div className="h-px flex-1 bg-linear-to-r from-error/20 to-transparent" />
                </div>

                <div className="grid gap-3">
                  {deletedChapters.map((chapter) => (
                    <div key={chapter.id} className="glass-frame flex items-center justify-between p-4 bg-error/5 border-error/10">
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate opacity-60 italic">{chapter.title}</p>
                        {chapter.authorName && (
                          <p className="text-[10px] font-bold text-primary/40 mt-0.5">{chapter.authorName}</p>
                        )}
                        <p className="text-[10px] font-bold uppercase tracking-widest text-base-content/30 mt-1">Silindi</p>
                      </div>
                      <button
                        onClick={async () => {
                          if (!confirm("Bölümü geri yüklemek istediğinize emin misiniz?")) return;
                          try {
                            setIsTrashLoading(true);
                            const { restoreChapter } = await import("@/lib/auth");
                            await restoreChapter(chapter.id);

                            // Verileri yenile
                            loadChapters(currentPage, searchQuery);
                            const deletedChaptersData = await getMyChapters(bookSlug, { pageSize: 100, OnlyDeleted: true });
                            setDeletedChapters(deletedChaptersData.items || []);

                            alert("Bölüm başarıyla geri yüklendi.");
                          } catch (e) {
                            alert("Geri yükleme sırasında bir hata oluştu.");
                          } finally {
                            setIsTrashLoading(false);
                          }
                        }}
                        className="btn btn-ghost btn-sm text-error hover:bg-error/10 rounded-xl text-[10px] font-black uppercase tracking-widest"
                        disabled={isTrashLoading}
                      >
                        Geri Getir
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
