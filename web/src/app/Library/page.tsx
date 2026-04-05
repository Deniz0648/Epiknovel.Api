"use client";

import Link from "next/link";
import { apiRequest, resolveMediaUrl } from "@/lib/api";
import { useEffect, useState } from "react";
import Image from "next/image";
import { 
  Library as LibraryIcon, 
  PlayCircle, 
  Bookmark, 
  CheckCircle2, 
  PauseCircle, 
  Archive, 
  XCircle, 
  Sparkles 
} from "lucide-react";

const LIBRARY_TABS = [
  { id: "reading", status: 0, label: "Okuduklarım", icon: PlayCircle },
  { id: "to-read", status: 3, label: "Okuyacaklarım", icon: Bookmark },
  { id: "completed", status: 1, label: "Tamamlananlar", icon: CheckCircle2 },
  { id: "on-hold", status: 4, label: "Beklemede", icon: PauseCircle },
  { id: "archived", status: 5, label: "Arşiv", icon: Archive },
  { id: "dropped", status: 2, label: "Bırakılanlar", icon: XCircle },
];

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState("reading");
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadLibrary() {
      try {
        setIsLoading(true);
        const tab = LIBRARY_TABS.find(t => t.id === activeTab);
        const status = tab ? tab.status : 0;
        const response = await apiRequest<any[]>(`/social/library?status=${status}`);
        setItems(response || []);
      } catch (err) {
        console.error("Kutuphane yukleme hatasi:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadLibrary();
  }, [activeTab]);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="site-shell mx-auto flex flex-col gap-6 px-4 pb-12 pt-28 sm:px-8 sm:pt-32">
        <section className="glass-frame space-y-7 p-6 sm:p-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs font-semibold text-base-content/60">
            <Link href="/" className="transition-colors hover:text-primary">Anasayfa</Link>
            <span className="opacity-40">-</span>
            <span className="text-base-content/90">Kütüphanem</span>
          </nav>
 
          {/* Header Section */}
          <div className="flex flex-col gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                  <LibraryIcon className="h-7 w-7" strokeWidth={2.5} />
                </div>
                <h1 className="hero-title-gradient text-4xl font-black tracking-tight sm:text-5xl">Kütüphanem</h1>
              </div>
            </div>

            {/* Status Tabs Navigation */}
            <div className="flex flex-wrap gap-2 rounded-3xl border border-base-content/10 bg-base-100/20 p-1.5 backdrop-blur-sm">
              {LIBRARY_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black transition-all duration-300 ${
                      isActive 
                        ? "bg-primary text-primary-content shadow-xl shadow-primary/25 scale-[1.02]" 
                        : "text-base-content/50 hover:bg-base-100/50 hover:text-base-content"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "animate-pulse" : ""}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Library Content */}
          {isLoading ? (
             <div className="flex min-h-[400px] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
             </div>
          ) : items.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 xl:gap-6">
              {items.map((item) => (
                <div className="group relative flex flex-col gap-3 transition-all duration-300">
                  <Link 
                    href={`/Books/${item.bookSlug}`}
                    className="relative flex flex-col gap-3 group-hover:-translate-y-2 transition-transform duration-300"
                  >
                    <div className="glass-frame aspect-[2/3] overflow-hidden p-1">
                      <div className="relative h-full w-full overflow-hidden rounded-2xl">
                        <Image
                          src={resolveMediaUrl(item.bookCoverImageUrl) || "/covers/cover-golge.svg"}
                          alt={item.bookTitle}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        
                        {/* Progress Badge Overlay */}
                        {item.progressPercentage > 0 && (
                          <div className="absolute left-3 top-3 rounded-full bg-primary/90 px-3 py-1 text-[10px] font-black text-white shadow-lg backdrop-blur-md">
                            %{item.progressPercentage}
                          </div>
                        )}
                      </div>
                    </div>
                    <h3 className="line-clamp-2 px-1 text-sm font-bold leading-tight text-base-content/90 transition-colors group-hover:text-primary">
                      {item.bookTitle}
                    </h3>
                  </Link>

                  {/* Progress Indicator & Continue Button */}
                  <div className="mt-auto space-y-3 px-1 pb-2">
                    {item.progressPercentage > 0 ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-base-content/30">
                          <span>İLERLEME</span>
                          <span className="text-primary">%{item.progressPercentage}</span>
                        </div>
                        <progress 
                          className="progress progress-primary h-1.5 w-full bg-base-content/5" 
                          value={item.progressPercentage} 
                          max="100" 
                        />
                        <Link 
                          href={item.lastReadChapterSlug 
                            ? `/read/${item.bookSlug}/${item.lastReadChapterSlug}${item.lastReadParagraphId ? `?p=${item.lastReadParagraphId}` : ''}`
                            : `/Books/${item.bookSlug}`
                          }
                          className="btn btn-primary btn-xs h-8 w-full rounded-lg font-black text-[10px] uppercase shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95"
                        >
                          Devam Et
                        </Link>
                      </div>
                    ) : (
                      <Link 
                        href={`/Books/${item.bookSlug}`}
                        className="btn btn-ghost btn-xs h-8 w-full rounded-lg border border-base-content/10 bg-base-100/50 font-black text-[10px] uppercase text-base-content/40 hover:bg-primary/10 hover:text-primary"
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
                  <h2 className="text-xl font-black text-base-content/80">
                    {LIBRARY_TABS.find(t => t.id === activeTab)?.label} listesi boş
                  </h2>
                  <p className="text-sm font-medium text-base-content/40 leading-relaxed">
                    Bu listeye henüz herhangi bir kitap eklemediniz. Okuma listenizi düzenlemek için keşfe başlayın.
                  </p>
               </div>

               <Link href="/Books" className="btn btn-primary btn-md rounded-full px-8 font-bold shadow-lg shadow-primary/25">
                  Kitap Keşfet
                  <Sparkles className="ml-2 h-4 w-4" />
               </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
