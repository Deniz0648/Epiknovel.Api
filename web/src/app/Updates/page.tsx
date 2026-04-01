"use client";

import Link from "next/link";
import { ArrowDown, BookText, Clock, History, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

const PAGE_SIZE = 9;

const UPDATES = [
  {
    id: 1,
    book: "Against the Gods",
    chapter: "Bolum 813 yuklendi",
    time: "4 dk once",
    category: "Aksiyon",
    isHot: true
  },
  {
    id: 2,
    book: "Kutsal Arsivlerin Son Koruyucusu",
    chapter: "Bolum 149 yuklendi",
    time: "12 dk once",
    category: "Epic",
    isHot: false
  },
  {
    id: 3,
    book: "Abyss Academy Reborn",
    chapter: "Bolum 267 yuklendi",
    time: "28 dk once",
    category: "Karanlik",
    isHot: true
  },
  {
    id: 4,
    book: "Rebirth of the Thief Who Roamed the World",
    chapter: "Bolum 308 yuklendi",
    time: "1 saat once",
    category: "Fantasy",
    isHot: false
  },
  {
    id: 5,
    book: "The Dragon Mark Oath",
    chapter: "Bolum 192 yuklendi",
    time: "2 saat once",
    category: "Macera",
    isHot: false
  },
  {
    id: 6,
    book: "Crown of Silent Tempest",
    chapter: "Bolum 154 yuklendi",
    time: "3 saat once",
    category: "Mystery",
    isHot: false
  },
  {
    id: 7,
    book: "Blade of Forgotten Code",
    chapter: "Bolum 230 yuklendi",
    time: "5 saat once",
    category: "Bilim Kurgu",
    isHot: false
  },
  {
    id: 8,
    book: "Tower of Last Ember",
    chapter: "Bolum 119 yuklendi",
    time: "6 saat once",
    category: "Fantasy",
    isHot: false
  },
  {
    id: 10,
    book: "Legends of Crystal Gate",
    chapter: "Bolum 201 yuklendi",
    time: "7 saat once",
    category: "Isekai",
    isHot: true
  },
  {
    id: 11,
    book: "Ember Queen Oath",
    chapter: "Bolum 142 yuklendi",
    time: "9 saat once",
    category: "Romantasy",
    isHot: false
  },
  {
    id: 12,
    book: "Silk Horizon Circuit",
    chapter: "Bolum 133 yuklendi",
    time: "12 saat once",
    category: "Bilim Kurgu",
    isHot: false
  },
  {
    id: 13,
    book: "Vault of Hollow Saints",
    chapter: "Bolum 312 yuklendi",
    time: "15 saat once",
    category: "Karanlik",
    isHot: true
  }
];

export default function UpdatesPage() {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filteredUpdates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return UPDATES.filter(
      (update) =>
        update.book.toLowerCase().includes(normalized) ||
        update.category.toLowerCase().includes(normalized)
    );
  }, [query]);

  const pagedUpdates = useMemo(() => {
    return filteredUpdates.slice(0, visibleCount);
  }, [filteredUpdates, visibleCount]);

  const hasMore = visibleCount < filteredUpdates.length;

  function loadMore() {
    setVisibleCount(prev => prev + PAGE_SIZE);
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="site-shell mx-auto flex flex-col gap-6 px-4 pb-12 pt-28 sm:px-8 sm:pt-32">
        <section className="glass-frame space-y-7 p-6 sm:p-8">
          {/* Breadcrumb & Search Row */}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <nav className="flex items-center gap-2 text-xs font-semibold text-base-content/60">
              <Link href="/" className="transition-colors hover:text-primary">
                Anasayfa
              </Link>
              <span className="opacity-40">-</span>
              <span className="text-base-content/90">Guncellemeler</span>
            </nav>

            <label className="input input-bordered flex h-10 w-full items-center gap-2 rounded-xl border-base-content/15 bg-base-100/32 sm:max-w-xs">
              <Search className="h-4 w-4 text-base-content/60" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                placeholder="Eser veya tur ara..."
                className="w-full bg-transparent text-sm"
              />
            </label>
          </div>

          {/* Header Section */}
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <History className="h-5 w-5" strokeWidth={2.5} />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">Son Hareketler</span>
              </div>
              <h1 className="hero-title-gradient text-4xl font-black tracking-tight sm:text-5xl">
                Guncellemeler
              </h1>
            </div>
          </div>

          {/* Result Count */}
          <p className="text-xs font-bold uppercase tracking-widest text-base-content/40">
            Toplam {filteredUpdates.length} guncelleme bulundu
          </p>

          {/* Content Grid */}
          {pagedUpdates.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pagedUpdates.map((update) => (
                <div
                  key={update.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-base-content/10 bg-base-100/32 p-4 transition-all duration-300 hover:border-primary/30 hover:bg-base-100/45 hover:translate-y-[-2px]"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="rounded-lg bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                        {update.category}
                      </span>
                      {update.isHot && (
                        <div className="flex items-center gap-1 text-secondary">
                          <Sparkles className="h-3 w-3 fill-current" />
                          <span className="text-[10px] font-black uppercase">Yeni</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h3 className="line-clamp-1 text-sm font-bold transition-colors group-hover:text-primary">
                        {update.book}
                      </h3>
                      <div className="flex items-center gap-2 text-base-content/65">
                        <BookText className="h-3.5 w-3.5" />
                        <p className="text-sm font-medium">{update.chapter}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-2 border-t border-base-content/5 pt-3 text-[11px] font-semibold text-base-content/45">
                    <Clock className="h-3 w-3" />
                    <span>{update.time}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-base-content/15 bg-base-100/10 py-20 text-center">
               <History className="h-10 w-10 opacity-20" />
               <p className="text-sm font-semibold text-base-content/50">Aradiginiz kriterlere uygun guncelleme bulunamadi.</p>
               <button onClick={() => { setQuery(""); setVisibleCount(PAGE_SIZE); }} className="btn btn-ghost btn-xs underline underline-offset-4">Filtreyi Temizle</button>
            </div>
          )}

          {/* Load More Action */}
          {hasMore && (
            <div className="flex items-center justify-center border-t border-base-content/5 pt-8">
               <button 
                 onClick={loadMore}
                 className="group btn btn-ghost btn-sm h-11 rounded-full border border-base-content/10 bg-base-100/20 px-10 text-xs font-bold transition-all hover:bg-primary hover:text-primary-content hover:border-primary active:scale-95"
               >
                 <ArrowDown className="mr-2 h-4 w-4 transition-transform group-hover:translate-y-0.5" />
                 + Daha Fazla Getir
               </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
