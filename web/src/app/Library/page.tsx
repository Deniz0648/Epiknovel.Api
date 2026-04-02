"use client";

import Link from "next/link";
import { useState } from "react";
import { BookMarked, History, Search, Sparkles, Library as LibraryIcon, Bookmark, CheckCircle2, PauseCircle, Archive, XCircle, PlayCircle } from "lucide-react";

const LIBRARY_TABS = [
  { id: "reading", label: "Okuduklarim", icon: PlayCircle },
  { id: "to-read", label: "Okuyacaklarim", icon: Bookmark },
  { id: "completed", label: "Tamamlananlar", icon: CheckCircle2 },
  { id: "on-hold", label: "Beklemede", icon: PauseCircle },
  { id: "archived", label: "Arsiv", icon: Archive },
  { id: "dropped", label: "Birakilanlar", icon: XCircle },
];

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState("reading");

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="site-shell mx-auto flex flex-col gap-6 px-4 pb-12 pt-28 sm:px-8 sm:pt-32">
        <section className="glass-frame space-y-7 p-6 sm:p-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs font-semibold text-base-content/60">
            <Link href="/" className="transition-colors hover:text-primary">Anasayfa</Link>
            <span className="opacity-40">-</span>
            <span className="text-base-content/90">Kutuphanem</span>
          </nav>

          {/* Header Section */}
          <div className="flex flex-col gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <LibraryIcon className="h-5 w-5" strokeWidth={2.5} />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">Kisisel Arsiv</span>
              </div>
              <h1 className="hero-title-gradient text-4xl font-black tracking-tight sm:text-5xl">Kutuphanem</h1>
            </div>

            {/* Status Tabs Navigation */}
            <div className="flex flex-wrap gap-2 rounded-3xl border border-base-content/10 bg-base-100/20 p-1.5">
              {LIBRARY_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all duration-300 ${
                      isActive 
                        ? "bg-primary text-primary-content shadow-lg shadow-primary/25" 
                        : "text-base-content/60 hover:bg-base-100/40 hover:text-base-content"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "animate-pulse" : ""}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Content Area (Empty for now) */}
          <div className="flex flex-col items-center justify-center gap-6 rounded-[2.5rem] border border-dashed border-base-content/15 bg-base-100/10 py-32 text-center">
             <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-primary/10 blur-2xl transition-all group-hover:bg-primary/20" />
                <LibraryIcon className="relative h-16 w-16 text-base-content/20" strokeWidth={1} />
             </div>
             
             <div className="max-w-sm space-y-2">
                <h2 className="text-xl font-bold text-base-content/80">
                  {LIBRARY_TABS.find(t => t.id === activeTab)?.label} listesi bos
                </h2>
                <p className="text-sm font-medium text-base-content/50 leading-relaxed">
                  Bu listeye henüz herhangi bir kitap eklemediniz. Okuma listenizi düzenlemek için keşfe başlayın.
                </p>
             </div>

             <Link href="/Books" className="btn btn-primary btn-md rounded-full px-8 font-bold shadow-lg shadow-primary/25">
                Kitap Kesfet
                <Sparkles className="ml-2 h-4 w-4" />
             </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
