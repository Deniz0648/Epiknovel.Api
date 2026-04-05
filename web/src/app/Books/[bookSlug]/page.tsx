"use client";

import Image from "next/image";
import Link from "next/link";
import { BookOpen, Check, Eye, Home, Loader2, Minus, Play, Plus, Star, Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  BookDetailPanels,
  type BookChapterItem,
  type BookCommentItem,
} from "@/components/book/book-detail-panels";
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
  }));
}

function buildComments(title: string): BookCommentItem[] {
  return [
    {
      id: "comment-1",
      author: "Epik Admin",
      handle: "@epikadmin",
      timeLabel: "12 dk",
      likes: 61,
      rating: 4.9,
      body: `${title} temposu her bolumde biraz daha yukseliyor, final sahnesi oldukca iyi yazilmisti.`,
      replies: [
        {
          id: "reply-1-1",
          author: "MaviYel",
          handle: "@maviyel",
          timeLabel: "8 dk",
          likes: 12,
          body: "Finaldeki gecis gercekten temizdi, sonraki bolume hemen gectim.",
          replies: [
            {
              id: "reply-1-1-1",
              author: "ArcLight",
              handle: "@arclight",
              timeLabel: "6 dk",
              likes: 7,
              body: "Aynen, ozellikle son sahnedeki gerilim duzeyi cok iyiydi.",
              replies: [
                {
                  id: "reply-1-1-1-1",
                  author: "SiyahDefter",
                  handle: "@siyahdefter",
                  timeLabel: "4 dk",
                  likes: 4,
                  body: "Bu tempo korunursa sonraki kisimlar daha da iyi olacak gibi.",
                  replies: [
                    {
                      id: "reply-1-1-1-1-1",
                      author: "KutupYolcusu",
                      handle: "@kutupyolcusu",
                      timeLabel: "2 dk",
                      likes: 2,
                      body: "4. katmanda bile okunuyor mu diye ben de test etmek istedim.",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: "reply-1-2",
          author: "RavenInk",
          handle: "@ravenink",
          timeLabel: "7 dk",
          likes: 9,
          body: "Ben finaldeki karakter secimini biraz riskli buldum ama cesur hamleydi.",
          replies: [
            {
              id: "reply-1-2-1",
              author: "AtlasReader",
              handle: "@atlasreader",
              timeLabel: "6 dk",
              likes: 5,
              body: "Ayni fikirdeyim, ama risk olmasi hikayeyi daha canli tuttu.",
              replies: [
                {
                  id: "reply-1-2-1-1",
                  author: "SiyahDefter",
                  handle: "@siyahdefter",
                  timeLabel: "4 dk",
                  likes: 3,
                  body: "Ozellikle son iki bolumde bunun etkisi daha net goruluyor.",
                  replies: [
                    {
                      id: "reply-1-2-1-1-1",
                      author: "KutupYolcusu",
                      handle: "@kutupyolcusu",
                      timeLabel: "2 dk",
                      likes: 2,
                      body: "Bu dal tek basina mini tartisma gibi oldu, bence iyi ornek.",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "comment-2",
      author: "AtlasReader",
      handle: "@atlasreader",
      timeLabel: "35 dk",
      likes: 43,
      rating: 4.8,
      body: "Yan karakterlerin etkisi hikayeyi guclendiriyor. Ozellikle son iki bolumdeki gecisler cok temiz.",
      replies: [
        {
          id: "reply-2-1",
          author: "RavenInk",
          handle: "@ravenink",
          timeLabel: "20 dk",
          likes: 6,
          body: "Yan karakter arklari bu serinin en guclu tarafi olabilir.",
        },
        {
          id: "reply-2-2",
          author: "MaviYel",
          handle: "@maviyel",
          timeLabel: "16 dk",
          likes: 8,
          body: "Bazi yan karakterler ana karakter kadar agirlik aliyor, bu guzel bir denge.",
          replies: [
            {
              id: "reply-2-2-1",
              author: "ArcLight",
              handle: "@arclight",
              timeLabel: "11 dk",
              likes: 5,
              body: "Evet ama bazen ana hikayeyi yavaslatabiliyor, ritim dikkat istiyor.",
              replies: [
                {
                  id: "reply-2-2-1-1",
                  author: "Epik Admin",
                  handle: "@epikadmin",
                  timeLabel: "8 dk",
                  likes: 4,
                  body: "Sonraki kisimlarda bu dengeyi toparlayan bolumler var, takipte kalin.",
                  replies: [
                    {
                      id: "reply-2-2-1-1-1",
                      author: "RavenInk",
                      handle: "@ravenink",
                      timeLabel: "5 dk",
                      likes: 3,
                      body: "Spoilersiz yorum icin tesekkurler, merakim artti.",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "comment-3",
      author: "MaviYel",
      handle: "@maviyel",
      timeLabel: "1 sa",
      likes: 35,
      rating: 4.7,
      body: "Dunya kurulumunu sevdim, aksiyon yogun ama karakter motivasyonu da dengeli kalmis.",
    },
    {
      id: "comment-4",
      author: "RavenInk",
      handle: "@ravenink",
      timeLabel: "2 sa",
      likes: 27,
      rating: 4.6,
      body: "Diyaloglar akici, ceviri dili de tutarli. Sonraki bolumler icin merak yuksek.",
    },
    {
      id: "comment-5",
      author: "KutupYolcusu",
      handle: "@kutupyolcusu",
      timeLabel: "3 sa",
      likes: 22,
      rating: 4.5,
      body: "Bu bolumdeki dunya detayi cok iyiydi, ritim biraz yavas ama anlatimi guzel.",
      replies: [
        {
          id: "reply-5-1",
          author: "AtlasReader",
          handle: "@atlasreader",
          timeLabel: "2 sa",
          likes: 4,
          body: "Ritim yavas ama detayli anlatim bu evrende ise yariyor.",
          replies: [
            {
              id: "reply-5-1-1",
              author: "MaviYel",
              handle: "@maviyel",
              timeLabel: "1 sa",
              likes: 3,
              body: "Ozellikle mekan tasvirlerinde bunu hissettim.",
              replies: [
                {
                  id: "reply-5-1-1-1",
                  author: "SiyahDefter",
                  handle: "@siyahdefter",
                  timeLabel: "52 dk",
                  likes: 2,
                  body: "Ben de ayni nedenle daha yavas kisimlari tolere edebiliyorum.",
                  replies: [
                    {
                      id: "reply-5-1-1-1-1",
                      author: "ArcLight",
                      handle: "@arclight",
                      timeLabel: "31 dk",
                      likes: 1,
                      body: "Bu dal da 4 katman testine iyi bir ornek oldu.",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "comment-6",
      author: "SiyahDefter",
      handle: "@siyahdefter",
      timeLabel: "5 sa",
      likes: 18,
      rating: 4.4,
      body: "Karakter kararlarinin sonuca baglanma sekli tutarli, okumasi keyifli gidiyor.",
    },
    {
      id: "comment-7",
      author: "ArcLight",
      handle: "@arclight",
      timeLabel: "7 sa",
      likes: 14,
      rating: 4.3,
      body: "Aksiyon bolumleri guclu ama politik kisimlar daha da derinlesirse daha iyi olur.",
    },
  ];
}

export default function BookDetailPage() {
  const params = useParams<{ bookSlug: string }>();
  const bookSlug = params?.bookSlug ?? "";
  const title = useMemo(() => fromBookSlug(bookSlug), [bookSlug]);
  const [detail, setDetail] = useState<BookDetailViewModel | null>(null);
  const [chapters, setChapters] = useState<BookChapterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [libraryEntryId, setLibraryEntryId] = useState<string | null>(null);
  const [libraryStatus, setLibraryStatus] = useState<string | null>(null);
  const [isLibraryActionLoading, setIsLibraryActionLoading] = useState(false);
  const [isLibraryStatusLoading, setIsLibraryStatusLoading] = useState(true);
  const [isLibraryHover, setIsLibraryHover] = useState(false);
  const comments = useMemo(() => buildComments(title), [title]);

  const getStatusText = (status: any) => {
    if (status === 0 || status === "Reading") return "Okuyorum";
    if (status === 1 || status === "Completed") return "Tamamlandı";
    if (status === 2 || status === "Dropped") return "Bırakıldı";
    if (status === 3 || status === "PlanToRead") return "Okuyacağım";
    if (status === 4 || status === "OnHold") return "Beklemede";
    if (status === 5 || status === "Archived") return "Arşiv";
    return status?.toString() || "Kütüphanede";
  };

  const checkLibraryStatus = async (bookId: string) => {
    try {
      setIsLibraryStatusLoading(true);
      const libStatus = await apiRequest<{ id?: string; Id?: string; status?: any; Status?: any } | null>(`/social/library/check/${bookId}`);
      if (libStatus) {
        setLibraryEntryId(libStatus.id || libStatus.Id || null);
        const statusVal = libStatus.status !== undefined ? libStatus.status : libStatus.Status;
        setLibraryStatus(getStatusText(statusVal));
      } else {
        setLibraryEntryId(null);
        setLibraryStatus(null);
      }
    } catch (err) {
      console.error("Kutuphane durumu alinamadı:", err);
    } finally {
      setIsLibraryStatusLoading(false);
    }
  };

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

        // 2. Kitap ID'sini kullanarak bölümleri çek (En Eski İlk: sortDescending=false)
        const chapterData = await apiRequest<ChaptersApiResponse>(
           `/books/${bookSlug}/chapters?pageNumber=1&pageSize=500&sortBy=Order&sortDescending=false`
        );

        // Backend bazen 'Id' bazen 'id' gönderebiliyor (Serializer farkı)
        const bookId = (bookData as any).id || (bookData as any).Id;

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
        
        // 3. Kütüphane durumunu kontrol et
        if (bookId) {
          await checkLibraryStatus(bookId);
        }
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

  const handleToggleLibrary = async () => {
    if (!detail) return;

    try {
      setIsLibraryActionLoading(true);
      if (libraryEntryId) {
        // Kütüphaneden çıkar
        await apiRequest(`/social/library/${libraryEntryId}`, { method: "DELETE" });
        setLibraryEntryId(null);
        setLibraryStatus(null);
        showToast({
          title: "Kütüphaneden Çıkarıldı",
          description: "Kitap okuma listenizden kaldırıldı.",
          tone: "success",
        });
      } else {
        // Kütüphaneye ekle
        const response = await apiRequest<{ id?: string; Id?: string; status?: any; Status?: any }>("/social/library", {
          method: "POST",
          body: JSON.stringify({ bookId: detail.id }),
        });
        const newId = response.id || response.Id;
        const statusVal = response.status !== undefined ? response.status : response.Status;
        setLibraryEntryId(newId || null);
        setLibraryStatus(getStatusText(statusVal));
        showToast({
          title: "Kütüphaneye Eklendi",
          description: `Kitap "${getStatusText(statusVal)}" listesine eklendi.`,
          tone: "success",
        });
      }
    } catch (err: any) {
      if (err.message?.includes("zaten kütüphanenizde")) {
        console.warn("[SYNC] Kitap zaten ekli görünüyor, durum tazeleniyor...");
        await checkLibraryStatus(detail.id);
      } else {
        showToast({
          title: "Hata",
          description: err.message || "İşlem gerçekleştirilemedi.",
          tone: "error",
        });
      }
    } finally {
      setIsLibraryActionLoading(false);
    }
  };

  const handleUpdateLibraryStatus = async (newStatus: number) => {
    if (!libraryEntryId || !detail) return;

    // Akıllı Kontrol: Devam eden eser tamamlandı işaretlenemez.
    const isBookOngoing = detail.status === "Ongoing" || detail.status === "Devam Ediyor";
    if (newStatus === 1 && isBookOngoing) {
      showToast({
        title: "Geçersiz İşlem",
        description: "Devam eden bir eseri 'Tamamlandı' olarak işaretleyemezsiniz.",
        tone: "error",
      });
      return;
    }

    try {
      setIsLibraryActionLoading(true);
      await apiRequest(`/social/library/${libraryEntryId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setLibraryStatus(getStatusText(newStatus));
      showToast({
        title: "Durum Güncellendi",
        description: `Okuma durumunuz "${getStatusText(newStatus)}" olarak güncellendi.`,
        tone: "success",
      });
    } catch (err: any) {
      console.error("Durum guncelleme hatasi:", err);
      showToast({
        title: "Hata",
        description: err.message || "Durum güncellenirken bir hata oluştu.",
        tone: "error",
      });
    } finally {
      setIsLibraryActionLoading(false);
    }
  };

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
            <div className="mx-auto w-full max-w-[17.5rem]">
              <div className="glass-frame relative aspect-[2/3] overflow-hidden p-1.5">
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

              <div className="flex flex-wrap gap-3 pt-1">
                {chapters.length > 0 ? (
                  <Link 
                    href={`/read/${bookSlug}/${chapters[0].slug}`} 
                    className="btn btn-primary rounded-full px-7"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    Oku
                  </Link>
                ) : (
                  <button disabled className="btn btn-primary rounded-full px-7 opacity-50">
                    <Play className="h-4 w-4 fill-current" />
                    Oku
                  </button>
                )}
                <button 
                  onClick={handleToggleLibrary}
                  onMouseEnter={() => setIsLibraryHover(true)}
                  onMouseLeave={() => setIsLibraryHover(false)}
                  disabled={isLibraryActionLoading || isLibraryStatusLoading}
                  className={`btn flex-1 rounded-full border px-7 transition-all duration-300 ${
                    libraryEntryId 
                      ? "border-primary/30 bg-primary/10 text-primary hover:border-error/30 hover:bg-error/10 hover:text-error" 
                      : "border-base-content/20 bg-base-100/28 hover:bg-base-100/40"
                  } disabled:opacity-50`}
                >
                  {isLibraryActionLoading || isLibraryStatusLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : libraryEntryId ? (
                    isLibraryHover ? <Minus className="h-4 w-4" /> : <Check className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {libraryEntryId 
                    ? (isLibraryHover ? "Kütüphaneden Çıkar" : libraryStatus) 
                    : "Kütüphaneye Ekle"}
                </button>

                {libraryEntryId && (
                  <div className="group relative">
                    <button
                      className="btn h-full aspect-square rounded-full border border-primary/30 bg-primary/10 px-0 text-primary hover:bg-primary/20 transition-colors"
                      title="Okuma Durumunu Değiştir"
                    >
                      <Star className="h-4 w-4 fill-current" />
                    </button>
                    
                    <div className="absolute right-0 top-full z-50 mt-2 hidden w-56 flex-col overflow-hidden rounded-2xl border border-base-content/10 bg-base-100/95 backdrop-blur-md shadow-2xl group-hover:flex">
                      <div className="bg-base-200/50 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-base-content/40">
                        OKUMA DURUMU
                      </div>
                      {[
                        { id: 0, label: "Okuyorum", icon: BookOpen },
                        { id: 3, label: "Okuyacağım", icon: Eye },
                        { id: 1, label: "Tamamlandı", icon: Check, disabled: detail.status === "Ongoing" || detail.status === "Devam Ediyor" },
                        { id: 4, label: "Beklemede", icon: Loader2 },
                        { id: 5, label: "Arşiv", icon: Tag },
                        { id: 2, label: "Bırakıldı", icon: Minus },
                      ].map((item) => (
                        <button
                          key={item.id}
                          disabled={item.disabled}
                          onClick={() => handleUpdateLibraryStatus(item.id)}
                          className={`flex items-center gap-3 px-4 py-3 text-sm transition-all hover:bg-primary/10 hover:text-primary ${
                            item.disabled ? "opacity-40 grayscale cursor-not-allowed" : ""
                          } ${libraryStatus === item.label ? "bg-primary/5 text-primary font-bold" : "text-base-content/70"}`}
                        >
                          <item.icon className={`h-4 w-4 ${libraryStatus === item.label ? "fill-primary/20" : ""}`} />
                          {item.label}
                          {item.disabled && <span className="ml-auto text-[9px] font-bold opacity-60">YAYINDA</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <BookDetailPanels chapters={chapters} comments={comments} />

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
