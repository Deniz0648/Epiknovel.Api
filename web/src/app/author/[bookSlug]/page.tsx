"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, LayoutDashboard, Settings, FileText, BarChart3, PlusCircle, Share2, Eye, Star, Clock, LoaderCircle, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { getMyBookBySlug, type MyBookListItem } from "@/lib/auth";
import { resolveMediaUrl } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";

export default function ManageBookPage() {
  const params = useParams<{ bookSlug: string }>();
  const router = useRouter();
  const bookSlug = params?.bookSlug ?? "";
  
  const [book, setBook] = useState<MyBookListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookSlug) return;
    
    let isMounted = true;
    
    const loadBook = async () => {
      try {
        setIsLoading(true);
        const data = await getMyBookBySlug(bookSlug);
        if (isMounted) {
          setBook(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError("Kitap yuklenirken bir hata olustu.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadBook();
    return () => { isMounted = false; };
  }, [bookSlug]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-bold animate-pulse text-base-content/40 uppercase tracking-widest">Kitap Bilgileri Yukleniyor...</p>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="site-shell mx-auto px-4 pt-32 sm:px-8">
        <div className="glass-frame border-error/20 bg-error/5 p-8 text-center text-error">
          <AlertCircle className="mx-auto h-12 w-12 opacity-50" />
          <p className="mt-4 font-bold">{error ?? "Bu kitaba erisim yetkiniz bulunmuyor."}</p>
          <Link href="/author" className="btn btn-ghost btn-sm mt-4 underline">Yazar Paneline Don</Link>
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="site-shell mx-auto flex flex-col gap-6 px-4 pb-12 pt-28 sm:px-8 sm:pt-32">
        {/* Breadcrumb Area / Hero Section */}
        <section className="glass-frame relative space-y-4 p-6 sm:p-8">
          <nav className="flex items-center gap-2 text-xs font-semibold text-base-content/60">
            <Link href="/" className="transition-colors hover:text-primary">
              Anasayfa
            </Link>
            <span className="opacity-40">-</span>
            <Link href="/author" className="transition-colors hover:text-primary">
              Yazar Paneli
            </Link>
            <span className="opacity-40">-</span>
            <span className="text-base-content/90 truncate">{book.title}</span>
          </nav>

          <Link href="/author" className="inline-flex items-center gap-1 text-sm font-semibold text-base-content/65 hover:text-primary">
            <ChevronLeft className="h-4 w-4" />
            Panele Don
          </Link>

          {/* Floating Edit Button (Top Right) */}
          <div className="absolute right-4 top-4 sm:right-6 sm:top-6 flex gap-2">
            <Link href={`/author/${book.slug}/edit`} className="btn btn-ghost btn-md h-12 w-12 rounded-2xl border border-base-content/12 bg-base-100/32 p-0 shadow-sm transition-all hover:bg-base-100/50 hover:text-primary active:scale-95">
              <Settings className="h-5 w-5" />
            </Link>
          </div>

          {/* Hero Section Simplified */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {/* 2:3 Kapak Gorseli */}
            <div className="relative aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-xl border border-base-content/10 bg-base-100/40 sm:w-32 md:w-36">
                {book.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resolveMediaUrl(book.coverImageUrl)} alt={book.title} className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full items-center justify-center p-2 text-center">
                        <span className="text-[8px] font-black uppercase tracking-widest text-base-content/25 leading-tight">Gorsel Yok</span>
                    </div>
                )}
            </div>

            {/* Baslik, Konu ve Istatistikler */}
            <div className="flex flex-1 flex-col justify-center gap-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <h1 className="hero-title-gradient text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl xl:text-6xl uppercase truncate pr-16" title={book.title}>
                  {book.title}
                </h1>
              </div>

              {/* Konu */}
              <p className="line-clamp-2 text-sm leading-relaxed text-base-content/60 max-w-3xl">
                {book.description || "Bu kitabin ozeti henüz eklenmemis."}
              </p>

              {/* Tur, Durum ve Yas Badge Grubu */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary shadow-sm">
                  {book.type === "Original" ? "Orijinal" : "Ceviri"}
                </span>
                <span className="rounded-full border border-success/20 bg-success/8 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-success shadow-sm">
                   {book.status === "Ongoing" ? "Devam Ediyor" : book.status === "Completed" ? "Tamamlandi" : book.status === "Hiatus" ? "Ara Verildi" : book.status === "Cancelled" ? "Iptal Edildi" : "Taslak"}
                </span>
                <span className="rounded-full border border-base-content/12 bg-base-100/32 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-base-content/60 shadow-sm">
                   {book.contentRating === "Mature" ? "18+" : book.contentRating === "Teen" ? "13+" : "Genel"}
                </span>
              </div>

              {/* Tek Satir Istatistikler */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Bolumler</span>
                    <span className="text-sm font-bold text-base-content/85">{book.chapterCount}</span>
                </div>
                <div className="h-3 w-[1px] bg-base-content/10 hidden sm:block" />
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Goruntulenme</span>
                    <span className="text-sm font-bold text-base-content/85">{book.viewCount.toLocaleString("tr-TR")}</span>
                </div>
                <div className="h-3 w-[1px] bg-base-content/10 hidden sm:block" />
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Puan</span>
                    <span className="text-sm font-bold text-base-content/85">{(book.averageRating ?? 0).toFixed(1)}</span>
                    <span className="text-[10px] text-base-content/40">({book.voteCount ?? 0})</span>
                </div>
              </div>

              {/* Ana Aksiyonlar */}
              <div className="flex flex-wrap items-center gap-3 pt-4">
                <button className="btn btn-primary rounded-2xl px-8 shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 active:scale-95">
                  <PlusCircle className="h-4 w-4" />
                  Yeni Bolum Yaz
                </button>
                <Link href={`/Books/${book.slug}`} className="btn rounded-2xl border border-base-content/12 bg-base-100/32 px-8 hover:bg-base-100/60 transition-all active:scale-95">
                  <Eye className="h-4 w-4" />
                  Goruntule
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content Area */}
        <section className="grid gap-6 lg:grid-cols-3">
          {/* Chapters Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="flex items-center gap-2 text-xl font-black">
                <FileText className="h-5 w-5 text-primary" />
                Bolumler
              </h3>
            </div>
            
            <div className="glass-frame flex flex-col items-center justify-center gap-4 border-dashed py-24 text-center opacity-60">
              <div className="h-16 w-16 rounded-full bg-base-content/5 flex items-center justify-center">
                <FileText className="h-8 w-8" />
              </div>
              <p className="text-sm font-bold">Henuz hic bolum eklenmemis.</p>
            </div>
          </div>

          {/* Sidebar / Analytics Side */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 px-2 text-xl font-black">
              <BarChart3 className="h-5 w-5 text-secondary" />
              Performans
            </h3>
            <div className="glass-frame p-6 h-64 flex items-center justify-center border-dashed">
              <p className="text-[10px] font-black uppercase tracking-widest text-base-content/30 italic">Analiz Verileri Yakinda</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
