import { ContinueReadingSection } from "@/components/home/continue-reading";
import { HeroFrame } from "@/components/home/hero-frame";
import { MostReadRow } from "@/components/home/most-read-row";
import { PopularAuthorsRow } from "@/components/home/popular-authors-row";
import { FollowedAuthorsSection } from "@/components/home/followed-authors-section";
import { ReaderExperiencesRow } from "@/components/home/reader-experiences-row";
import { RecommendationsRow } from "@/components/home/recommendations-row";
import { UpdatesFeed } from "@/components/home/updates-feed";
import { backendApiRequest } from "@/lib/backend-api";
import { resolveMediaUrl } from "@/lib/api";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

// API Response Tipleri (Sadece gerekli alanlar)
type PagedResult<T> = { items: T[]; totalCount: number };
type BookItem = { 
  id: string; title: string; slug: string; coverImageUrl?: string; 
  averageRating: number; voteCount: number; categoryNames: string[]; viewCount: number;
  description: string;
  chapterCount: number;
  status: string;
};
type UpdateItem = { bookTitle: string; chapterTitle: string; publishedAt: string; bookCoverImageUrl?: string };
type AuthorItem = { userId: string; displayName: string; slug: string; avatarUrl?: string; followersCount: number; booksCount: number; initials?: string };
type ReviewItem = { id: string; userName: string; userAvatar?: string; content: string; rating: number; likeCount: number; bookTitle: string; bookSlug: string };

async function getHomepageData() {
  const [editorChoiceRes, updatesRes, popularAuthorsRes, mostReadRes, recommendationsRes, reviewsRes] = await Promise.allSettled([
    backendApiRequest<PagedResult<BookItem>>("/books?isEditorChoice=true&pageSize=5"),
    backendApiRequest<{ updates: UpdateItem[] }>("/books/updates?pageSize=6"),
    backendApiRequest<{ items: AuthorItem[] }>("/users?isAuthor=true&sortBy=followers&sortDirection=desc&pageSize=6"),
    backendApiRequest<PagedResult<BookItem>>("/books?sortBy=ViewCount&sortDescending=true&pageSize=6"),
    backendApiRequest<PagedResult<BookItem>>("/books?sortBy=AverageRating&sortDescending=true&pageSize=6"),
    backendApiRequest<ReviewItem[]>("/social/reviews?isEditorChoice=true&pageSize=6"),
  ]);

  const data = {
    editorChoice: (editorChoiceRes.status === 'fulfilled' && editorChoiceRes.value?.items) ? editorChoiceRes.value.items : [],
    updates: (updatesRes.status === 'fulfilled' && updatesRes.value?.updates) ? updatesRes.value.updates : [],
    popularAuthors: (popularAuthorsRes.status === 'fulfilled' && popularAuthorsRes.value?.items) ? popularAuthorsRes.value.items : [],
    mostRead: (mostReadRes.status === 'fulfilled' && mostReadRes.value?.items) ? mostReadRes.value.items : [],
    recommendations: (recommendationsRes.status === 'fulfilled' && recommendationsRes.value?.items) ? recommendationsRes.value.items : [],
    reviews: reviewsRes.status === 'fulfilled' ? (reviewsRes.value || []) : [],
  };

  return data;
}

export default async function Home() {
  const data = await getHomepageData();

  // Veri Donusumleri (Bilesenlerin bekledigi formata map'leme)
  const heroSlides = data.editorChoice.map(b => ({
    id: b.id,
    badge: "EDITORUN SECIMI",
    title: b.title || "Adsiz Kitap",
    description: b.description || "",
    image: resolveMediaUrl(b.coverImageUrl) || "/covers/cover-placeholder.svg",
    imageAlt: `${b.title} kapagi`,
    blurDataURL: "",
    stats: [
      { value: (b.viewCount || 0) > 1000 ? `${((b.viewCount || 0) / 1000).toFixed(1)}K` : String(b.viewCount || 0), label: "Okunma" },
      { value: String(b.chapterCount || 0), label: "Bolum" },
      { value: (b.averageRating || 0).toFixed(1), label: "Puan" },
    ],
    status: b.status
  }));

  const updateItems = data.updates.map(u => ({
    book: u.bookTitle || "Bilinmeyen Kitap",
    chapter: u.chapterTitle || "Yeni Bolum",
    time: u.publishedAt ? timeAgo(u.publishedAt) : "Bilinmiyor",
    cover: resolveMediaUrl(u.bookCoverImageUrl)
  }));

  const popularAuthorItems = data.popularAuthors.map(a => ({
    id: a.userId,
    name: a.displayName || "Anonim Yazar",
    initials: (a.displayName || "A Y").split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
    specialty: "Yazar",
    followers: (a.followersCount || 0) > 1000 ? `${((a.followersCount || 0) / 1000).toFixed(1)}K` : String(a.followersCount || 0),
    seriesCount: a.booksCount || 0,
    avatarUrl: resolveMediaUrl(a.avatarUrl, "profiles")
  }));

  const mostReadItems = data.mostRead.map(b => ({
    id: b.id,
    title: b.title || "Adsiz Kitap",
    category: b.categoryNames?.[0] || "Genel",
    rating: b.averageRating || 0,
    image: resolveMediaUrl(b.coverImageUrl) || "/covers/cover-placeholder.svg",
    imageAlt: `${b.title} kapagi`,
    blurDataURL: ""
  }));

  const recommendationItems = data.recommendations.map(b => ({
    id: b.id,
    title: b.title || "Adsiz Kitap",
    category: b.categoryNames?.[0] || "Genel",
    rating: b.averageRating || 0,
    image: resolveMediaUrl(b.coverImageUrl) || "/covers/cover-placeholder.svg",
    imageAlt: `${b.title} kapagi`,
    blurDataURL: ""
  }));

  const experienceItems = data.reviews.map(r => ({
    id: r.id,
    editorName: r.userName || "Okur",
    avatarUrl: resolveMediaUrl(r.userAvatar, "profiles"),
    likes: r.likeCount || 0,
    bookTitle: r.bookTitle || "Bilinmeyen Kitap",
    rating: r.rating || 0,
    review: r.content || ""
  }));

  return (
    <main className="relative overflow-hidden">
      <div className="site-shell mx-auto flex min-h-screen flex-col gap-6 px-4 pb-6 pt-28 sm:px-8 sm:pb-10 sm:pt-32">
        {heroSlides.length > 0 && <HeroFrame slides={heroSlides} />}
        <ContinueReadingSection />
        {updateItems.length > 0 && <UpdatesFeed updates={updateItems} announcements={[]} />}
        {recommendationItems.length > 0 && <RecommendationsRow books={recommendationItems} />}
        <FollowedAuthorsSection />
        {popularAuthorItems.length > 0 && <PopularAuthorsRow authors={popularAuthorItems} />}
        {mostReadItems.length > 0 && <MostReadRow books={mostReadItems} />}
        {experienceItems.length > 0 && <ReaderExperiencesRow experiences={experienceItems} />}
      </div>
    </main>
  );
}
