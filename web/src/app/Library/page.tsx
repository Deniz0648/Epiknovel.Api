"use client";

import Link from "next/link";
import { apiRequest } from "@/lib/api";
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
  Search
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
  lastReadChapterSlug?: string | null;
  lastReadParagraphId?: string | null;
};

export default function LibraryPage() {
  const { profile, isLoading: isAuthLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("reading");
  const [items, setItems] = useState<LibraryPageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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
      loadLibrary();
    }
  }, [activeTab, isAuthLoading, profile]);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item =>
      item.bookTitle?.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="site-shell mx-auto flex flex-col gap-6 px-4 pb-12 pt-28 sm:px-8 sm:pt-32">
        <section className="glass-frame space-y-7 p-5 sm:p-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-base-content/40">
            <Link href="/" className="transition-colors hover:text-primary">Anasayfa</Link>
            <span className="opacity-20">/</span>
            <span className="text-base-content/80">Kütüphanem</span>
          </nav>

          {/* Header Section */}
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                  <LibraryIcon className="h-6 w-6" strokeWidth={2.5} />
                </div>
                <h1 className="hero-title-gradient text-3xl font-black tracking-tight sm:text-5xl">Kütüphanem</h1>
              </div>

              <div className="relative w-full max-w-sm sm:w-64">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/30" />
                <input
                  type="text"
                  placeholder="Listende ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-base-content/10 bg-base-100/30 pl-11 pr-4 text-xs font-bold transition-all focus:border-primary/30 focus:bg-base-100/50 focus:outline-none focus:ring-4 focus:ring-primary/5"
                />
              </div>
            </div>

            {/* Status Tabs Navigation */}
            <div className="flex flex-wrap gap-1.5 rounded-3xl border border-base-content/10 bg-base-100/20 p-1.5 backdrop-blur-sm">
              {LIBRARY_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${isActive
                        ? "bg-primary text-primary-content shadow-xl shadow-primary/25 scale-[1.02]"
                        : "text-base-content/40 hover:bg-base-100/50 hover:text-base-content"
                      }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isActive ? "animate-pulse" : ""}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Library Content */}
          {isAuthLoading || isLoading ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            </div>
          ) : !profile ? (
            <div className="flex flex-col items-center justify-center gap-6 rounded-[2.5rem] border border-dashed border-base-content/15 bg-base-100/10 py-24 text-center">
              <LibraryIcon className="h-16 w-16 text-base-content/20" strokeWidth={1} />
              <div className="max-w-sm space-y-2">
                <h2 className="text-xl font-black uppercase italic text-base-content/80">Kütüphanen için giriş yap</h2>
                <p className="text-xs font-bold uppercase tracking-widest text-base-content/40">
                  Okuma ilerlemeni, listelerini ve kaldığın bölümleri hesabınla eşleştiriyoruz.
                </p>
              </div>
              <Link href="/login" className="btn btn-primary btn-md rounded-full px-8 font-black uppercase tracking-wider shadow-lg shadow-primary/25">
                Giriş Yap
              </Link>
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 xl:gap-6">
              {filteredItems.map((item) => (
                <div key={item.id} className="group relative flex flex-col gap-3 transition-all duration-300">
                  <Link
                    href={`/Books/${item.bookSlug}`}
                    className="relative flex flex-col gap-3 transition-transform duration-300 group-hover:-translate-y-2"
                  >
                    <div className="glass-frame relative aspect-2/3 overflow-hidden p-1">
                      <div className="relative h-full w-full overflow-hidden rounded-2xl">
                        <BookCover
                          src={item.bookCoverImageUrl}
                          alt={item.bookTitle}
                          sizes="(max-width: 640px) 150px, (max-width: 1024px) 180px, 200px"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                        {/* Progress Badge Overlay */}
                        {item.progressPercentage > 0 && (
                          <div className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-[10px] font-black text-white shadow-lg backdrop-blur-md">
                            %{Math.round(item.progressPercentage)}
                          </div>
                        )}
                      </div>
                    </div>
                    <h3 className="line-clamp-2 px-1 text-sm font-black leading-tight text-base-content/90 transition-colors group-hover:text-primary">
                      {item.bookTitle}
                    </h3>
                  </Link>

                  {/* Progress Indicator & Continue Button */}
                  <div className="mt-auto space-y-3 px-1 pb-2">
                    {item.progressPercentage > 0 ? (
                      <div className="space-y-2">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-content/5">
                          <div
                            className="h-full bg-primary transition-all duration-700"
                            style={{ width: `${item.progressPercentage}%` }}
                          />
                        </div>
                        <Link
                          href={item.lastReadChapterSlug
                            ? `/read/${item.bookSlug}/${item.lastReadChapterSlug}${item.lastReadParagraphId ? `?p=${item.lastReadParagraphId}` : ''}`
                            : `/Books/${item.bookSlug}`
                          }
                          className="btn btn-primary btn-xs h-9 w-full rounded-xl font-black text-[10px] uppercase tracking-wider shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95"
                        >
                          Devam Et
                        </Link>
                      </div>
                    ) : (
                      <Link
                        href={`/Books/${item.bookSlug}`}
                        className="btn btn-ghost btn-xs h-9 w-full rounded-xl border border-base-content/10 bg-base-100/50 font-black text-[10px] uppercase tracking-wider text-base-content/40 hover:bg-primary/10 hover:text-primary"
                      >
                        Oku
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-6 rounded-[2.5rem] border border-dashed border-base-content/15 bg-base-100/10 py-32 text-center">
              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-primary/10 blur-2xl" />
                <LibraryIcon className="relative h-16 w-16 text-base-content/20" strokeWidth={1} />
              </div>

              <div className="max-w-sm space-y-2">
                <h2 className="text-xl font-black text-base-content/80 uppercase italic">
                  {searchQuery ? "Sonuç Bulunamadı" : `${LIBRARY_TABS.find(t => t.id === activeTab)?.label} listesi boş`}
                </h2>
                <p className="text-xs font-bold text-base-content/40 leading-relaxed uppercase tracking-widest">
                  {searchQuery
                    ? `"${searchQuery}" aramasına uygun kitap bulunamadı.`
                    : "Bu listeye henüz herhangi bir kitap eklemediniz."
                  }
                </p>
              </div>

              {!searchQuery && (
                <Link href="/Books" className="btn btn-primary btn-md rounded-full px-8 font-black uppercase tracking-wider shadow-lg shadow-primary/25">
                  Kitap Keşfet
                  <Sparkles className="ml-2 h-4 w-4" />
                </Link>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
