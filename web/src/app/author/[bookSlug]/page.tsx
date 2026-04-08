"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, LayoutDashboard, Settings, FileText, BarChart3, PlusCircle, Share2, Eye, Star, Clock, LoaderCircle, AlertCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getMyBookBySlug, getMyChapters, type MyBookListItem } from "@/lib/auth";
import { resolveMediaUrl } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { ChapterReorderList } from "@/components/author/ChapterReorderList";

export default function ManageBookPage() {
  const params = useParams<{ bookSlug: string }>();
  const router = useRouter();
  const bookSlug = params?.bookSlug ?? "";
  
  const { profile, isLoading: isAuthLoading } = useAuth();
  
  const [book, setBook] = useState<MyBookListItem | null>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [deletedChapters, setDeletedChapters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTrashLoading, setIsTrashLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Oturum yuklenmeden veya slug gelmeden asla istek atma!
    if (isAuthLoading || !bookSlug) return;
    
    let isMounted = true;
    
    const loadData = async () => {
      try {
        setIsLoading(true);
        // 1. Kitap Detaylarını Çek
        const bookData = await getMyBookBySlug(bookSlug);
        if (isMounted) {
          setBook(bookData);
          setError(null);
        }

        // 2. Bölümleri Çek
        try {
          const chaptersData = await getMyChapters(bookSlug, { pageSize: 100, isDeleted: false });
          if (isMounted) {
            setChapters(chaptersData.items || []);
          }
          
          // 3. Silinen Bölümleri Çek
          const deletedChaptersData = await getMyChapters(bookSlug, { pageSize: 100, isDeleted: true });
          if (isMounted) {
            setDeletedChapters(deletedChaptersData.items || []);
          }
        } catch (chapterErr) {
          console.error("Bolumler yuklenirken hata:", chapterErr);
        }

      } catch (err) {
        console.error("Kitap detay yukleme hatası:", err);
        if (isMounted) {
          if (err instanceof ApiError) {
            setError(`Hata: ${err.status} - ${err.message}`);
          } else {
            setError("Kitap yuklenirken beklenmedik bir hata olustu.");
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [bookSlug, isAuthLoading]);

  if (isAuthLoading || isLoading) {
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
          <div className="flex items-center justify-center gap-4 mt-6">
            <Link href="/author" className="btn btn-ghost btn-sm underline">Yazar Paneline Don</Link>
            <button onClick={() => window.location.reload()} className="btn btn-primary btn-sm rounded-xl">Tekrar Dene</button>
          </div>
        </div>
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
            <div className="relative aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-xl border border-base-content/10 bg-base-100/40 sm:w-32 md:w-36">
                {book.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resolveMediaUrl(book.coverImageUrl)} alt={book.title} className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full items-center justify-center p-2 text-center text-[8px] font-black uppercase tracking-widest text-base-content/25">Gorsel Yok</div>
                )}
            </div>

            <div className="flex flex-1 flex-col justify-center gap-4">
              <h1 className="hero-title-gradient text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl uppercase truncate pr-16" title={book.title}>
                {book.title}
              </h1>

              <p className="line-clamp-2 text-sm text-base-content/60 max-w-3xl">
                {book.description || "Bu kitabin ozeti henüz eklenmemis."}
              </p>

              {/* Tur, Durum ve Yas Badge Grubu (Robust String/Number Checks) */}
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

              {/* Aksiyon Butonlari */}
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
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="flex items-center gap-2 text-xl font-black px-2">
              <FileText className="h-5 w-5 text-primary" /> Bolumler
            </h3>
            {chapters.length > 0 ? (
              <ChapterReorderList bookId={book.id} bookSlug={book.slug} initialChapters={chapters} />
            ) : (
              <div className="glass-frame flex flex-col items-center justify-center gap-4 border-dashed py-24 text-center opacity-60">
                <FileText className="h-8 w-8 opacity-20" />
                <p className="text-sm font-bold">Henuz hic bolum eklenmemis.</p>
              </div>
            )}

            {/* Silinen Bölümler (Çöp Kutusu) */}
            {deletedChapters.length > 0 && (
              <div className="mt-12 space-y-4">
                <div className="flex items-center gap-6 px-2">
                   <h3 className="flex items-center gap-2 text-xl font-black text-error">
                     <Trash2 className="h-5 w-5" /> Silinen Bölümler
                   </h3>
                   <div className="h-px flex-1 bg-gradient-to-r from-error/20 to-transparent" />
                </div>
                
                <div className="grid gap-3">
                  {deletedChapters.map((chapter) => (
                    <div key={chapter.id} className="glass-frame flex items-center justify-between p-4 bg-error/5 border-error/10">
                       <div className="min-w-0">
                          <p className="font-bold text-sm truncate opacity-60 italic">{chapter.title}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-base-content/30 mt-1">Silindi</p>
                       </div>
                       <button 
                         onClick={async () => {
                            if (!confirm("Bölümü geri yüklemek istediğinize emin misiniz?")) return;
                            try {
                               setIsTrashLoading(true);
                               const { restoreChapter, getMyChapters } = await import("@/lib/auth");
                               await restoreChapter(chapter.id);
                               
                               // Verileri yenile
                               const [updChapters, updDeleted] = await Promise.all([
                                 getMyChapters(bookSlug, { pageSize: 100, isDeleted: false }),
                                 getMyChapters(bookSlug, { pageSize: 100, isDeleted: true })
                               ]);
                               
                               setChapters(updChapters.items || []);
                               setDeletedChapters(updDeleted.items || []);
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

          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-xl font-black px-2">
              <BarChart3 className="h-5 w-5 text-secondary" /> Performans
            </h3>
            <div className="glass-frame p-6 h-64 flex items-center justify-center border-dashed text-[10px] font-black uppercase tracking-widest text-base-content/30 italic">
               Analiz Verileri Yakinda
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
