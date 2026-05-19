"use client";

import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/api";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { BookCover } from "@/components/ui/book-cover";
import {
  Library as LibraryIcon,
  PlayCircle,
  Bookmark,
  CheckCircle2,
  PauseCircle,
  Archive,
  XCircle,
  Sparkles,
  Search,
  ArrowRight,
  BookOpen
} from "lucide-react";

const LIBRARY_TABS = [
  { id: "reading", status: 0, label: "Okuduklarım", icon: PlayCircle },
  { id: "to-read", status: 3, label: "Okuyacaklarım", icon: Bookmark },
  { id: "completed", status: 1, label: "Tamamlananlar", icon: CheckCircle2 },
  { id: "on-hold", status: 4, label: "Beklemede", icon: PauseCircle },
  { id: "archived", status: 5, label: "Arşiv", icon: Archive },
  { id: "dropped", status: 2, label: "Bırakılanlar", icon: XCircle },
];

type LibraryPageItem = {
  id: string;
  bookTitle: string;
  bookSlug: string;
  bookCoverImageUrl?: string | null;
  progressPercentage: number;
  status?: number | string;
  lastReadChapterSlug?: string | null;
  lastReadChapterTitle?: string | null;
  lastReadParagraphId?: string | null;
  addedAt?: string | null;
  lastReadAt?: string | null;
};

type BookUpdateItem = { bookSlug: string; publishedAt?: string | null };
type TimeFilter = "all" | "today" | "7d" | "30d";
type SortMode = "lastRead" | "progress" | "addedAt" | "alphabetic";
const REFERENCE_NOW_MS = new Date().getTime();

function resolveField<T>(item: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const key of keys) {
    const value = item[key];
    if (value !== undefined && value !== null) return value as T;
  }
  return undefined;
}

export default function LibraryPage() {
  const { profile, isLoading: isAuthLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("reading");
  const [items, setItems] = useState<LibraryPageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("lastRead");
  const [onlyInProgress, setOnlyInProgress] = useState(false);
  const [latestUpdatesByBook, setLatestUpdatesByBook] = useState<Record<string, string>>({});

  const statusToNumber = (value: number | string | undefined): number => {
    if (typeof value === "number") return value;
    if (value === "Reading") return 0;
    if (value === "Completed") return 1;
    if (value === "Dropped") return 2;
    if (value === "PlanToRead") return 3;
    if (value === "OnHold") return 4;
    if (value === "Archived") return 5;
    return 0;
  };

  const isWithinFilter = (isoLike: string | null | undefined, filter: TimeFilter, nowMs: number): boolean => {
    if (filter === "all") return true;
    if (!isoLike) return false;
    const ts = new Date(isoLike).getTime();
    if (!Number.isFinite(ts)) return false;
    const diff = nowMs - ts;
    if (filter === "today") return diff <= 24 * 60 * 60 * 1000;
    if (filter === "7d") return diff <= 7 * 24 * 60 * 60 * 1000;
    return diff <= 30 * 24 * 60 * 60 * 1000;
  };

  async function updateLibraryStatus(itemId: string, status: number) {
    try {
      await apiRequest(`/social/library/${itemId}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      setItems((prev) => prev.map((it) => it.id === itemId ? { ...it, status } : it));
    } catch (err) {
      console.error("Kütüphane durum güncelleme hatası:", err);
    }
  }

  useEffect(() => {
    async function loadLibrary() {
      if (!profile) {
        setItems([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const tab = LIBRARY_TABS.find(t => t.id === activeTab);
        const status = tab ? tab.status : 0;
        const response = await apiRequest<LibraryPageItem[]>(`/social/library?status=${status}`);
        setItems(response || []);
      } catch (err) {
        console.error("Kütüphane yükleme hatası:", err);
      } finally {
        setIsLoading(false);
      }
    }
    if (!isAuthLoading) {
      void loadLibrary();
    }
  }, [activeTab, isAuthLoading, profile]);

  useEffect(() => {
    async function loadRecentUpdates() {
      if (!profile) {
        setLatestUpdatesByBook({});
        return;
      }
      try {
        const data = await apiRequest<{ updates?: BookUpdateItem[]; Updates?: BookUpdateItem[] }>(`/books/updates?pageSize=100`);
        const updates = data?.updates ?? data?.Updates ?? [];
        const map: Record<string, string> = {};
        for (const item of updates) {
          if (!item?.bookSlug) continue;
          const ts = item.publishedAt ?? null;
          if (!ts) continue;
          if (!map[item.bookSlug] || new Date(ts).getTime() > new Date(map[item.bookSlug]).getTime()) {
            map[item.bookSlug] = ts;
          }
        }
        setLatestUpdatesByBook(map);
      } catch (err) {
        console.error("Son guncellemeler yuklenemedi:", err);
      }
    }
    if (!isAuthLoading) {
      void loadRecentUpdates();
    }
  }, [isAuthLoading, profile]);

  const filteredItems = useMemo(() => {
    const nowMs = REFERENCE_NOW_MS;
    const query = searchQuery.trim().toLowerCase();
    let next = items.filter((item) => {
      if (query && !item.bookTitle?.toLowerCase().includes(query)) return false;
      const raw = item as unknown as Record<string, unknown>;
      const progress = resolveField<number>(raw, "progressPercentage", "ProgressPercentage") ?? 0;
      const lastReadAt = resolveField<string>(raw, "lastReadAt", "LastReadAt") ?? null;
      if (!isWithinFilter(lastReadAt, timeFilter, nowMs)) return false;
      if (onlyInProgress && (progress < 5 || progress > 95)) return false;
      return true;
    });

    next = [...next].sort((a, b) => {
      const ra = a as unknown as Record<string, unknown>;
      const rb = b as unknown as Record<string, unknown>;
      if (sortMode === "alphabetic") return (a.bookTitle || "").localeCompare(b.bookTitle || "", "tr");
      if (sortMode === "progress") {
        const pa = resolveField<number>(ra, "progressPercentage", "ProgressPercentage") ?? 0;
        const pb = resolveField<number>(rb, "progressPercentage", "ProgressPercentage") ?? 0;
        return pb - pa;
      }
      if (sortMode === "addedAt") {
        const aa = new Date(resolveField<string>(ra, "addedAt", "AddedAt") ?? 0).getTime();
        const ab = new Date(resolveField<string>(rb, "addedAt", "AddedAt") ?? 0).getTime();
        return ab - aa;
      }
      const la = new Date(resolveField<string>(ra, "lastReadAt", "LastReadAt") ?? 0).getTime();
      const lb = new Date(resolveField<string>(rb, "lastReadAt", "LastReadAt") ?? 0).getTime();
      return lb - la;
    });

    return next;
  }, [items, searchQuery, timeFilter, onlyInProgress, sortMode]);

  const continueItem = useMemo(() => {
    if (!profile) return null;
    if (activeTab !== "reading") return null;
    return filteredItems
      .filter((item) => {
        const raw = item as unknown as Record<string, unknown>;
        const chapterSlug = resolveField<string>(raw, "lastReadChapterSlug", "LastReadChapterSlug");
        const chapterTitle = resolveField<string>(raw, "lastReadChapterTitle", "LastReadChapterTitle");
        const progress = resolveField<number>(raw, "progressPercentage", "ProgressPercentage") ?? 0;
        return progress > 0 || Boolean(chapterSlug) || Boolean(chapterTitle);
      })
      .sort((a, b) => (b.progressPercentage ?? 0) - (a.progressPercentage ?? 0))[0] ?? null;
  }, [filteredItems, activeTab, profile]);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="site-shell mx-auto flex flex-col gap-6 px-3 pb-10 pt-24 sm:px-6 sm:pt-28 lg:px-8 lg:pt-32">
        <section className="glass-frame space-y-5 p-4 sm:space-y-7 sm:p-6 lg:p-8">
          <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-base-content/40">
            <Link href="/" className="transition-colors hover:text-primary">Anasayfa</Link>
            <span className="opacity-20">/</span>
            <span className="text-base-content/80">Kütüphanem</span>
          </nav>

          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner sm:h-12 sm:w-12">
                  <LibraryIcon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
                </div>
                <h1 className="hero-title-gradient text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Kütüphanem</h1>
              </div>
              <div className="relative w-full lg:w-72">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/30" />
                <input type="text" placeholder="Listende ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-11 w-full rounded-2xl border border-base-content/10 bg-base-100/30 pl-11 pr-4 text-xs font-bold transition-all focus:border-primary/30 focus:bg-base-100/50 focus:outline-none focus:ring-4 focus:ring-primary/5" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value as TimeFilter)} className="h-11 w-full rounded-2xl border border-base-content/15 bg-base-100/60 px-3 text-[11px] font-black uppercase tracking-wider">
                <option value="all">Son Okuma: Tum Zamanlar</option>
                <option value="today">Son Okuma: Bugun</option>
                <option value="7d">Son Okuma: 7 Gun</option>
                <option value="30d">Son Okuma: 30 Gun</option>
              </select>
              <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} className="h-11 w-full rounded-2xl border border-base-content/15 bg-base-100/60 px-3 text-[11px] font-black uppercase tracking-wider">
                <option value="lastRead">Sirala: Son Okuma</option>
                <option value="progress">Sirala: Ilerleme</option>
                <option value="addedAt">Sirala: Eklenme Tarihi</option>
                <option value="alphabetic">Sirala: Alfabetik</option>
              </select>
              <button onClick={() => setOnlyInProgress((v) => !v)} className={`h-11 rounded-2xl border px-3 text-[11px] font-black uppercase tracking-wider transition-colors ${onlyInProgress ? "border-primary/50 bg-primary/15 text-primary" : "border-base-content/15 bg-base-100/60 text-base-content/70"}`}>
                Yarım Kalanlar %5-%95
              </button>
              <div className="flex h-11 items-center rounded-2xl border border-base-content/15 bg-base-100/30 px-3 text-[10px] font-black uppercase tracking-wider text-base-content/45">{filteredItems.length} Kayit</div>
            </div>

            <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-3xl border border-base-content/10 bg-base-100/20 p-1.5 backdrop-blur-sm">
              {LIBRARY_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`shrink-0 snap-start flex items-center gap-2 rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${isActive ? "bg-primary text-primary-content shadow-xl shadow-primary/25" : "text-base-content/40 hover:bg-base-100/50 hover:text-base-content"}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {isAuthLoading || isLoading ? (
            <div className="flex min-h-[320px] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" /></div>
          ) : !profile ? (
            <div className="flex flex-col items-center justify-center gap-6 rounded-[2.5rem] border border-dashed border-base-content/15 bg-base-100/10 py-24 text-center">
              <LibraryIcon className="h-16 w-16 text-base-content/20" strokeWidth={1} />
              <div className="max-w-sm space-y-2"><h2 className="text-xl font-black uppercase italic text-base-content/80">Kütüphanen için giriş yap</h2><p className="text-xs font-bold uppercase tracking-widest text-base-content/40">Okuma ilerlemeni, listelerini ve kaldığın bölümleri hesabınla eşleştiriyoruz.</p></div>
              <Link href="/login" className="btn btn-primary btn-md rounded-full px-8 font-black uppercase tracking-wider shadow-lg shadow-primary/25">Giriş Yap</Link>
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="space-y-6">
              {continueItem && (
                <div className="rounded-3xl border border-primary/20 bg-primary/5 p-4 sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1"><p className="text-[10px] font-black uppercase tracking-widest text-primary">Kaldığın Yerden Devam Et</p><h2 className="text-lg font-black text-base-content sm:text-2xl">{continueItem.bookTitle}</h2><p className="text-xs font-bold text-base-content/55">{continueItem.lastReadChapterSlug ? "Bölüm bağlantısı hazır" : "Detaya gidip bölüm seçebilirsin"}</p></div>
                    <Link href={continueItem.lastReadChapterSlug ? `/read/${continueItem.bookSlug}/${continueItem.lastReadChapterSlug}${continueItem.lastReadParagraphId ? `?p=${continueItem.lastReadParagraphId}` : ''}` : `/Books/${continueItem.bookSlug}`} className="btn btn-primary rounded-xl px-5 font-black text-[10px] uppercase tracking-wider">Devam Et <ArrowRight className="h-3.5 w-3.5" /></Link>
                  </div>
                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-base-content/10"><div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${continueItem.progressPercentage}%` }} /></div>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-base-content/45">%{Math.round(continueItem.progressPercentage)} ilerleme</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 xl:gap-6">
                {filteredItems.map((item) => {
                  const raw = item as unknown as Record<string, unknown>;
                  const chapterTitle = resolveField<string>(raw, "lastReadChapterTitle", "LastReadChapterTitle") ?? null;
                  const chapterSlug = resolveField<string>(raw, "lastReadChapterSlug", "LastReadChapterSlug") ?? null;
                  const paragraphId = resolveField<string>(raw, "lastReadParagraphId", "LastReadParagraphId") ?? null;
                  const progress = resolveField<number>(raw, "progressPercentage", "ProgressPercentage") ?? 0;
                  const hasReadingPosition = progress > 0 || Boolean(chapterTitle) || Boolean(chapterSlug) || Boolean(paragraphId);
                  const currentStatus = statusToNumber(resolveField<number | string>(raw, "status", "Status"));
                  const lastReadAt = resolveField<string>(raw, "lastReadAt", "LastReadAt") ?? null;
                  const latestUpdateAt = latestUpdatesByBook[item.bookSlug];
                  const hasNewChapter = Boolean(latestUpdateAt && (!lastReadAt || new Date(latestUpdateAt).getTime() > new Date(lastReadAt).getTime()));

                  return (
                    <div key={item.id} className="group relative flex flex-col gap-2 sm:gap-3">
                      <Link href={`/Books/${item.bookSlug}`} className="relative flex flex-col gap-2 sm:gap-3 transition-transform duration-300 group-hover:-translate-y-1">
                        <div className="glass-frame relative aspect-2/3 overflow-hidden p-1">
                          <div className="relative h-full w-full overflow-hidden rounded-2xl">
                            <BookCover src={resolveMediaUrl(item.bookCoverImageUrl) || "/covers/cover-placeholder.svg"} alt={item.bookTitle} sizes="(max-width: 640px) 48vw, (max-width: 1024px) 44vw, (max-width: 1280px) 24vw, 18vw" />
                            {progress > 0 && (<div className="absolute left-2 top-2 rounded-full bg-primary px-2 py-1 text-[9px] font-black text-white">%{Math.round(progress)}</div>)}
                            {hasNewChapter && (<div className="absolute right-2 top-2 rounded-full bg-emerald-500 px-2 py-1 text-[9px] font-black text-white">Yeni</div>)}
                          </div>
                        </div>
                        <h3 className="line-clamp-2 px-1 text-xs font-black leading-tight text-base-content/90 sm:text-sm">{item.bookTitle}</h3>
                      </Link>

                      <div className="mt-auto space-y-2 px-1 pb-1 sm:space-y-3 sm:pb-2">
                        {hasReadingPosition ? (
                          <div className="space-y-2">
                            <p className="line-clamp-1 text-[9px] font-bold uppercase tracking-widest text-base-content/40 sm:text-[10px]">{chapterTitle || chapterSlug || "Bölüm Seçilmedi"}</p>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-content/5"><div className="h-full bg-primary transition-all duration-700" style={{ width: `${progress}%` }} /></div>
                            <Link href={chapterSlug ? `/read/${item.bookSlug}/${chapterSlug}${paragraphId ? `?p=${paragraphId}` : ''}` : `/Books/${item.bookSlug}`} className="btn btn-primary btn-xs h-8 w-full rounded-xl font-black text-[9px] uppercase tracking-wider sm:h-9 sm:text-[10px]">Devam Et <BookOpen className="h-3 w-3" /></Link>
                          </div>
                        ) : (
                          <Link href={`/Books/${item.bookSlug}`} className="btn btn-ghost btn-xs h-8 w-full rounded-xl border border-base-content/10 bg-base-100/50 font-black text-[9px] uppercase tracking-wider text-base-content/40 sm:h-9 sm:text-[10px]">Oku</Link>
                        )}
                        <select value={currentStatus} onChange={(e) => void updateLibraryStatus(item.id, Number.parseInt(e.target.value, 10))} className="h-8 w-full rounded-xl border border-base-content/15 bg-base-100/60 px-2 text-[9px] font-black uppercase tracking-widest text-base-content/60 sm:h-9 sm:text-[10px]">
                          {LIBRARY_TABS.map((tab) => (<option key={`status-${item.id}-${tab.id}`} value={tab.status}>{tab.label}</option>))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-6 rounded-[2.5rem] border border-dashed border-base-content/15 bg-base-100/10 py-24 text-center">
              <div className="relative"><div className="absolute -inset-4 rounded-full bg-primary/10 blur-2xl" /><LibraryIcon className="relative h-16 w-16 text-base-content/20" strokeWidth={1} /></div>
              <div className="max-w-sm space-y-2"><h2 className="text-xl font-black text-base-content/80 uppercase italic">{searchQuery ? "Sonuç Bulunamadı" : `${LIBRARY_TABS.find(t => t.id === activeTab)?.label} listesi boş`}</h2><p className="text-xs font-bold text-base-content/40 leading-relaxed uppercase tracking-widest">{searchQuery ? `"${searchQuery}" aramasına uygun kitap bulunamadı.` : "Bu listeye henüz herhangi bir kitap eklemediniz."}</p></div>
              {!searchQuery && (<Link href="/Books" className="btn btn-primary btn-md rounded-full px-8 font-black uppercase tracking-wider shadow-lg shadow-primary/25">Kitap Keşfet <Sparkles className="ml-2 h-4 w-4" /></Link>)}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
