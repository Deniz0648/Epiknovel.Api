import { ContinueReadingSection } from "@/components/home/continue-reading";
import { HeroFrame } from "@/components/home/hero-frame";
import { SimpleHero } from "@/components/home/simple-hero";
import { MostReadRow } from "@/components/home/most-read-row";
import { RecommendationsRow } from "@/components/home/recommendations-row";
import { HomeAnalyticsBeacon } from "@/components/home/home-analytics-beacon";

const BUILD_TIME_NOW_MS = Date.now();
import { backendApiRequest } from "@/lib/backend-api";
import { resolveMediaUrl } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { getSessionTokens } from "@/lib/server-auth";
import type { Metadata } from "next";
import Link from "next/link";
import { Flame, Sparkles, Users } from "lucide-react";
import dynamicImport from "next/dynamic";

const PopularAuthorsRow = dynamicImport(
  () => import("@/components/home/popular-authors-row").then((m) => m.PopularAuthorsRow),
  { loading: () => <div className="glass-frame h-40 animate-pulse bg-base-content/5" /> }
);
const ReaderExperiencesRow = dynamicImport(
  () => import("@/components/home/reader-experiences-row").then((m) => m.ReaderExperiencesRow),
  { loading: () => <div className="glass-frame h-64 animate-pulse bg-base-content/5" /> }
);
const UpdatesFeed = dynamicImport(
  () => import("@/components/home/updates-feed").then((m) => m.UpdatesFeed),
  { loading: () => <div className="glass-frame h-52 animate-pulse bg-base-content/5" /> }
);

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "EpikNovel - Roman, Webnovel ve Hikaye Platformu",
  description:
    "EpikNovel'de özgün ve çeviri hikayeleri keşfet, popüler kitapları incele, yazarlara ulaş ve yeni bölümleri takip et.",
  openGraph: {
    title: "EpikNovel - Roman, Webnovel ve Hikaye Platformu",
    description:
      "Özgün ve çeviri hikayeleri keşfet, popüler kitapları incele ve yeni bölümleri EpikNovel'de takip et.",
    type: "website",
    url: "https://epiknovel.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "EpikNovel - Roman, Webnovel ve Hikaye Platformu",
    description:
      "Özgün ve çeviri hikayeleri keşfet, popüler kitapları incele ve yeni bölümleri EpikNovel'de takip et.",
  },
  alternates: {
    canonical: "https://epiknovel.com",
  },
};

// API Response Tipleri (Sadece gerekli alanlar)
type PagedResult<T> = { items: T[]; totalCount: number };
type BookItem = { 
  id: string; title: string; slug: string; coverImageUrl?: string; 
  averageRating: number; voteCount: number; categoryNames: string[]; viewCount: number;
  description: string;
  chapterCount: number;
  status: string;
  isFree?: boolean;
  price?: number;
  coinPrice?: number;
  chapterPrice?: number;
  minChapterPrice?: number;
  minimumChapterPrice?: number;
};
type UpdateItem = {
  bookTitle: string;
  bookSlug: string;
  chapterTitle: string;
  chapterSlug: string;
  publishedAt: string;
  bookCoverImageUrl?: string;
};
type AuthorItem = { userId: string; displayName: string; slug: string; avatarUrl?: string; followersCount: number; booksCount: number; initials?: string };
type ReviewItem = { id: string; userName: string; userAvatar?: string; content: string; rating: number; likeCount: number; isLikedByMe: boolean; type: string; bookTitle: string; bookSlug: string };
type AnnouncementItem = { id: string; title: string; content: string; publishedAt?: string; createdAt: string };

function getBookCoinPrice(book: BookItem): number {
  const candidates = [
    book.coinPrice,
    book.chapterPrice,
    book.minChapterPrice,
    book.minimumChapterPrice,
    book.price
  ];
  const firstNumeric = candidates.find((value) => typeof value === "number" && Number.isFinite(value));
  return firstNumeric ?? 0;
}

async function getHomepageData() {
  const { accessToken } = await getSessionTokens();
  const isAuthenticated = Boolean(accessToken);
  const [editorChoiceRes, updatesRes, popularAuthorsRes, mostReadRes, recommendationsRes, reviewsRes, announcementsRes] = await Promise.allSettled([
    backendApiRequest<PagedResult<BookItem>>("/books?isEditorChoice=true&pageSize=5", { token: accessToken }),
    backendApiRequest<{ updates: UpdateItem[] }>("/books/updates?pageSize=6", { token: accessToken }),
    backendApiRequest<{ items: AuthorItem[] }>("/users?isAuthor=true&sortBy=followers&sortDirection=desc&pageSize=6", { token: accessToken }),
    backendApiRequest<PagedResult<BookItem>>("/books?sortBy=ViewCount&sortDescending=true&pageSize=6", { token: accessToken }),
    backendApiRequest<PagedResult<BookItem>>("/books?sortBy=AverageRating&sortDescending=true&pageSize=6", { token: accessToken }),
    backendApiRequest<ReviewItem[]>("/social/reviews?isEditorChoice=true&pageSize=6", { token: accessToken }),
    backendApiRequest<PagedResult<AnnouncementItem>>("/infrastructure/announcements?pageSize=6", { token: accessToken }),
  ]);

  const reportHomepageFailure = (section: string, result: PromiseSettledResult<unknown>) => {
    if (result.status === "rejected") {
      console.error(`[HOME] ${section} verisi yuklenemedi:`, result.reason);
    }
  };

  reportHomepageFailure("editorChoice", editorChoiceRes);
  reportHomepageFailure("updates", updatesRes);
  reportHomepageFailure("popularAuthors", popularAuthorsRes);
  reportHomepageFailure("mostRead", mostReadRes);
  reportHomepageFailure("recommendations", recommendationsRes);
  reportHomepageFailure("reviews", reviewsRes);
  reportHomepageFailure("announcements", announcementsRes);

  const data = {
    isAuthenticated,
    editorChoice: (editorChoiceRes.status === "fulfilled" && editorChoiceRes.value?.items) ? editorChoiceRes.value.items : [],
    updates: (updatesRes.status === "fulfilled" && updatesRes.value?.updates) ? updatesRes.value.updates : [],
    popularAuthors: (popularAuthorsRes.status === "fulfilled" && popularAuthorsRes.value?.items) ? popularAuthorsRes.value.items : [],
    mostRead: (mostReadRes.status === "fulfilled" && mostReadRes.value?.items) ? mostReadRes.value.items : [],
    recommendations: (recommendationsRes.status === "fulfilled" && recommendationsRes.value?.items) ? recommendationsRes.value.items : [],
    reviews: reviewsRes.status === "fulfilled" ? (reviewsRes.value || []) : [],
    announcements: (announcementsRes.status === "fulfilled" && announcementsRes.value?.items) ? announcementsRes.value.items : [],
  };

  return data;
}

export default async function Home() {
  const data = await getHomepageData();

  // Veri Donusumleri (Bilesenlerin bekledigi formata map'leme)
  const heroSlides = data.editorChoice.map(b => ({
    id: b.id,
    slug: b.slug,
    badge: "EDİTÖRÜN SEÇİMİ",
    title: b.title || "Adsiz Kitap",
    description: b.description || "",
    image: resolveMediaUrl(b.coverImageUrl) || "/covers/cover-golge.svg",
    imageAlt: `${b.title} kapagi`,
    blurDataURL: "",
    stats: [
      { value: (b.viewCount || 0) > 1000 ? `${((b.viewCount || 0) / 1000).toFixed(1)}K` : String(b.viewCount || 0), label: "Okunma" },
      { value: String(b.chapterCount || 0), label: "İçerik" },
      { value: (b.averageRating || 0).toFixed(1), label: "Puan" },
    ],
    status: b.status
  }));

  const updateItems = data.updates.map(u => ({
    book: u.bookTitle || "Bilinmeyen Başlık",
    bookSlug: u.bookSlug || "",
    chapter: u.chapterTitle || "Yeni İçerik",
    chapterSlug: u.chapterSlug || "",
    time: u.publishedAt ? timeAgo(u.publishedAt) : "Bilinmiyor",
    cover: resolveMediaUrl(u.bookCoverImageUrl) || "/covers/cover-golge.svg"
  }));

  const popularAuthorItems = data.popularAuthors.map(a => ({
    id: a.userId,
    name: a.displayName || "Anonim Yazar",
    initials: (a.displayName || "E E").split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
    specialty: "Destek",
    followers: (a.followersCount || 0) > 1000 ? `${((a.followersCount || 0) / 1000).toFixed(1)}K` : String(a.followersCount || 0),
    seriesCount: a.booksCount || 0,
    avatarUrl: resolveMediaUrl(a.avatarUrl, "avatars")
  }));

  const mostReadItems = data.mostRead.map(b => ({
    id: b.id,
    slug: b.slug,
    title: b.title || "Adsiz Kitap",
    category: b.categoryNames?.[0] || "Genel",
    rating: b.averageRating || 0,
    viewCount: b.viewCount || 0,
    chapterCount: b.chapterCount || 0,
    status: b.status || "Unknown",
    isFree: b.isFree,
    coinPrice: getBookCoinPrice(b),
    image: resolveMediaUrl(b.coverImageUrl) || "/covers/cover-golge.svg",
    imageAlt: `${b.title} kapagi`,
    blurDataURL: ""
  }));

  const recommendationItems = data.recommendations.map(b => ({
    id: b.id,
    slug: b.slug,
    title: b.title || "Adsiz Kitap",
    category: b.categoryNames?.[0] || "Genel",
    rating: b.averageRating || 0,
    viewCount: b.viewCount || 0,
    chapterCount: b.chapterCount || 0,
    status: b.status || "Unknown",
    isFree: b.isFree,
    coinPrice: getBookCoinPrice(b),
    image: resolveMediaUrl(b.coverImageUrl) || "/covers/cover-golge.svg",
    imageAlt: `${b.title} kapagi`,
    blurDataURL: ""
  }));

  const experienceItems = data.reviews.map(r => ({
    id: r.id,
    editorName: r.userName || "Kullanıcı",
    avatarUrl: resolveMediaUrl(r.userAvatar, "avatars"),
    likes: r.likeCount || 0,
    isLiked: r.isLikedByMe || false,
    type: r.type || "Duyuru",
    bookTitle: r.bookTitle || "Platform Tanıtımı",
    rating: r.rating || 0,
    review: r.content || ""
  }));

  const announcementItems = data.announcements.map((a) => ({
    title: a.title,
    description: a.content,
    date: timeAgo(a.publishedAt || a.createdAt)
  }));

  const sevenDaysAgo = BUILD_TIME_NOW_MS - 7 * 24 * 60 * 60 * 1000;
  const weeklyNewChapters = data.updates.filter((u) => {
    const ts = Date.parse(u.publishedAt);
    return Number.isFinite(ts) && ts >= sevenDaysAgo;
  }).length;
  const weeklyReadCount = [...mostReadItems, ...recommendationItems].reduce((sum, book) => sum + (book.viewCount || 0), 0);
  const activeAuthorCount = data.popularAuthors.length;

  const formatCompact = (value: number) =>
    value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toString();

  const showContinueReading = data.isAuthenticated;
  const showGuestRecommendations = !data.isAuthenticated;
  const showMemberRecommendations = data.isAuthenticated;
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "EpikNovel",
    url: "https://epiknovel.com",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://epiknovel.com/discovery?query={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "EpikNovel",
    url: "https://epiknovel.com",
    logo: "https://epiknovel.com/favicon.svg",
    sameAs: [
      "https://epiknovel.com"
    ]
  };

  return (
    <main className="relative overflow-hidden" role="main" aria-label="EpikNovel anasayfa içerikleri">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <div className="site-shell mx-auto flex min-h-screen flex-col gap-6 px-4 pb-6 pt-28 sm:px-8 sm:pb-10 sm:pt-32">
        <HomeAnalyticsBeacon
          userType={data.isAuthenticated ? "member" : "guest"}
          genre="all"
          status="all"
          length="all"
          pricing="all"
        />
        {heroSlides.length > 0 ? (
          <HeroFrame slides={heroSlides} />
        ) : (
          <SimpleHero />
        )}
        <section className="glass-frame grid gap-3 px-4 py-4 sm:grid-cols-3 sm:px-6" aria-label="Güven metrikleri">
          <article className="rounded-2xl border border-base-content/10 bg-base-100/20 px-4 py-3" aria-label={`Aktif yazar sayısı ${formatCompact(activeAuthorCount)}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-base-content/45">Aktif Yazar</p>
            <p className="mt-1 text-2xl font-black text-primary">{formatCompact(activeAuthorCount)}</p>
          </article>
          <article className="rounded-2xl border border-base-content/10 bg-base-100/20 px-4 py-3" aria-label={`Son yedi günde yeni bölüm ${formatCompact(weeklyNewChapters)}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-base-content/45">7 Günde Yeni Bölüm</p>
            <p className="mt-1 text-2xl font-black text-primary">{formatCompact(weeklyNewChapters)}</p>
          </article>
          <article className="rounded-2xl border border-base-content/10 bg-base-100/20 px-4 py-3" aria-label={`Toplam okunma ${formatCompact(weeklyReadCount)}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-base-content/45">Toplam Okunma</p>
            <p className="mt-1 text-2xl font-black text-primary">{formatCompact(weeklyReadCount)}</p>
          </article>
        </section>
        {showContinueReading ? <ContinueReadingSection /> : null}
        {mostReadItems.length > 0 && <MostReadRow books={mostReadItems} />}
        {showGuestRecommendations && recommendationItems.length > 0 && <RecommendationsRow books={recommendationItems} />}
        {showMemberRecommendations && recommendationItems.length > 0 && (
          <section className="space-y-3">
            <p className="px-1 text-xs font-black uppercase tracking-wider text-base-content/45">
              Kişiselleştirilmiş Keşif
            </p>
            <RecommendationsRow books={recommendationItems} />
          </section>
        )}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">Sosyal Kanıt</h2>
          </div>
          {mostReadItems[0] || heroSlides[0] || popularAuthorItems[0] ? (
            <div className="grid gap-3 md:grid-cols-3">
              <article className="glass-frame p-4 sm:p-5">
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-warning">
                  <Flame className="h-3.5 w-3.5" />
                  Haftanın Yükselenleri
                </p>
                <p className="mt-2 text-sm font-semibold text-base-content/75">
                  {mostReadItems[0]?.title ?? "Listeye girmek için ilk okumayı başlat"} en çok okunanlar listesinde öne çıktı.
                </p>
              </article>
              <article className="glass-frame p-4 sm:p-5">
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-info">
                  <Sparkles className="h-3.5 w-3.5" />
                  Editör Seçimi
                </p>
                <p className="mt-2 text-sm font-semibold text-base-content/75">
                  {heroSlides[0]?.title ?? "Editör seçimi yakında güncellenecek"} vitrinde önerilen içerik olarak gösteriliyor.
                </p>
              </article>
              <article className="glass-frame p-4 sm:p-5">
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-secondary">
                  <Users className="h-3.5 w-3.5" />
                  Toplulukta Popüler
                </p>
                <p className="mt-2 text-sm font-semibold text-base-content/75">
                  {popularAuthorItems[0]?.name ?? "Topluluk verisi güncelleniyor"} en çok takip edilen yazarlar arasında.
                </p>
              </article>
            </div>
          ) : (
            <div className="glass-frame rounded-3xl border border-dashed border-base-content/15 bg-base-100/10 py-10 text-center">
              <p className="text-sm font-bold text-base-content/55">Sosyal kanıt verisi şu an yüklenemedi.</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-base-content/40">
                Bağlantıyı yenileyip tekrar deneyebilirsin
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <Link href="/" className="btn btn-primary rounded-full px-6 text-xs font-black uppercase">
                  Yeniden Dene
                </Link>
                <Link href="/Books" className="btn btn-ghost rounded-full px-6 text-xs font-black uppercase">
                  Keşfe Git
                </Link>
              </div>
            </div>
          )}
        </section>
        {(updateItems.length > 0 || announcementItems.length > 0) && (
          <UpdatesFeed updates={updateItems} announcements={announcementItems} />
        )}
        {popularAuthorItems.length > 0 && <PopularAuthorsRow authors={popularAuthorItems} />}
        {experienceItems.length > 0 && <ReaderExperiencesRow experiences={experienceItems} />}
      </div>
    </main>
  );
}
