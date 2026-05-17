"use client";

import Link from "next/link";
import { Sparkles, BookOpen, PenTool, ChevronRight } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export function SimpleHero() {
  return (
    <section className="glass-frame relative overflow-hidden px-6 py-12 sm:px-12 sm:py-20 lg:px-20 lg:py-24">
      {/* Background Decorations */}
      <div className="pointer-events-none absolute -left-28 top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-28 h-60 w-60 rounded-full bg-accent/15 blur-3xl" />
      
      <div className="relative z-10 flex flex-col items-center text-center lg:items-start lg:text-left">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-primary border border-primary/10">
          <Sparkles className="h-3.5 w-3.5" />
          Yeni Nesil Yayıncılık
        </div>
        
        <h1 className="hero-title-gradient mb-6 max-w-4xl text-balance text-4xl font-black leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
          Her gün güncellenen <br className="hidden sm:block" />
          <span className="text-primary">epik hikayeler</span> burada
        </h1>
        
        <p className="mb-10 max-w-2xl text-pretty text-lg font-medium leading-relaxed text-base-content/70 sm:text-xl">
          Okumaya saniyeler içinde başla, favorilerini kütüphanene ekle ve yeni bölümleri kaçırmadan takip et.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link
            href="/Books"
            className="btn btn-primary h-14 w-full sm:w-auto rounded-full px-10 text-base font-bold shadow-xl shadow-primary/30"
            onClick={() => trackEvent("hero_cta_click", { section: "simple_hero", target: "/Books" })}
          >
            <BookOpen className="h-5 w-5" />
            Hemen Oku
          </Link>
          
          <Link
            href="/author/apply"
            className="btn btn-ghost h-14 w-full sm:w-auto rounded-full px-10 text-base font-bold border border-base-content/10 hover:bg-base-content/5"
            onClick={() => trackEvent("hero_cta_click", { section: "simple_hero", target: "/author/apply" })}
          >
            <PenTool className="h-5 w-5" />
            Yazar Ol
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 gap-8 pt-8 border-t border-base-content/5 w-full">
          <div>
            <p className="text-3xl font-black text-primary">Her Gün</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Yeni Bölümler</p>
          </div>
          <div>
            <p className="text-3xl font-black text-primary">Anında</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Kütüphane</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-3xl font-black text-primary">Tek Hesap</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Çoklu Cihaz</p>
          </div>
        </div>
      </div>
    </section>
  );
}
