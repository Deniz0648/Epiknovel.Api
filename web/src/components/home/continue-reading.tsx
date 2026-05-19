"use client";

import { type TouchEvent, useRef, useState, useEffect } from "react";
import { ArrowRight, BookOpen, Bookmark, PlayCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { BookCover } from "@/components/ui/book-cover";
import { getLibraryList, type LibraryItemResponse, type ReadingStatus } from "@/lib/social";
import { useAuth } from "@/components/providers/auth-provider";
import { resolveMediaUrl } from "@/lib/api";

type ContinueReadingBook = {
  title: string;
  slug: string;
  chapter: string;
  chapterSlug: string;
  percent: number;
  image: string;
  imageAlt: string;
  blurDataURL: string;
  status: ReadingStatus;
  lastReadParagraphId?: string | null;
};

function normalizeLibraryItem(item: LibraryItemResponse) {
  const raw = item as LibraryItemResponse & Record<string, unknown>;
  const chapterTitle =
    (raw.lastReadChapterTitle as string | undefined) ||
    (raw.LastReadChapterTitle as string | undefined) ||
    (raw.lastReadChapterSlug as string | undefined) ||
    (raw.LastReadChapterSlug as string | undefined) ||
    "Bölüm Seçilmedi";
  const chapterSlug =
    (raw.lastReadChapterSlug as string | undefined) ||
    (raw.LastReadChapterSlug as string | undefined) ||
    "";
  const progressRaw =
    (raw.progressPercentage as number | undefined) ??
    (raw.ProgressPercentage as number | undefined) ??
    0;
  const safePercent = Number.isFinite(progressRaw) ? Math.max(0, Math.min(100, Math.round(progressRaw))) : 0;
  const paragraphId =
    (raw.lastReadParagraphId as string | undefined) ??
    (raw.LastReadParagraphId as string | undefined) ??
    null;

  return { chapterTitle, chapterSlug, safePercent, paragraphId };
}

const SWIPE_THRESHOLD = 48;

function ContinueReadingCard({ book }: { book: ContinueReadingBook }) {
  const bSlug = book.slug;
  const cSlug = book.chapterSlug;
  
  const bookHref = (cSlug && cSlug !== "")
    ? `/read/${bSlug}/${cSlug}${book.lastReadParagraphId ? `?p=${book.lastReadParagraphId}` : ""}`
    : `/Books/${bSlug}`;

  const isToRead = book.status === "PlanToRead";

  return (
    <Link
      href={bookHref}
      className="glass-frame group relative block h-full cursor-pointer p-4 transition-all duration-300 hover:border-primary/30 hover:bg-base-100/40 active:scale-[0.995] sm:p-5"
    >
      <div className="flex items-center gap-4">
        <div className="relative aspect-2/3 w-20 shrink-0 overflow-hidden rounded-2xl border border-base-content/10 shadow-sm transition-transform duration-500 group-hover:scale-[1.02] sm:w-24">
          <BookCover
            src={book.image}
            alt={book.imageAlt}
            blurDataUrl={book.blurDataURL}
            sizes="(max-width: 640px) 100px, 150px"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-primary/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
             <div className="rounded-full bg-primary p-2 text-primary-content shadow-xl scale-90 group-hover:scale-100 transition-transform duration-300">
                <PlayCircle className="h-6 w-6 fill-current" />
             </div>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-base-content/40">
              {isToRead ? <Bookmark className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
              {isToRead ? "KÜTÜPHANENDE" : "KALDIĞIN YER"}
            </p>
            {!isToRead && book.percent > 0 && (
              <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
                %{book.percent}
              </span>
            )}
          </div>

          <div>
            <h3 className="line-clamp-1 text-base font-black leading-tight sm:text-lg">
              {book.title}
            </h3>
            <p className="line-clamp-1 text-xs font-bold text-base-content/50 mt-1">
              {isToRead ? "Okumaya Başla" : book.chapter}
            </p>
          </div>

          {!isToRead && (
            <div className="space-y-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-content/5">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                  style={{ width: `${book.percent}%` }}
                  aria-hidden="true"
                />
              </div>
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-base-content/30">
                 <span>İLERLEME</span>
                 <span className="flex items-center gap-1 text-primary group-hover:gap-1.5 transition-all">
                    DEVAM ET <ArrowRight className="h-2.5 w-2.5" />
                 </span>
              </div>
            </div>
          )}

          {isToRead && (
            <div className="pt-2">
               <span className="btn btn-primary btn-xs h-8 w-full rounded-xl font-black text-[10px] uppercase tracking-wider">
                  Şimdi Başla
               </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

type TabType = "Reading" | "PlanToRead";

export function ContinueReadingSection() {
  const { profile, isLoading: isAuthLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("Reading");
  const [books, setBooks] = useState<LibraryItemResponse[]>([]);
  const [isFetchingBooks, setIsFetchingBooks] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isLoading = isAuthLoading || (Boolean(profile) && isFetchingBooks);
  const visibleBooks = profile ? books : [];

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!profile) {
      return;
    }

    let isCancelled = false;

    async function loadLibrary() {
      setIsFetchingBooks(true);
      try {
        const data = await getLibraryList({ status: activeTab, size: 6 });
        if (!isCancelled) {
          setBooks(data);
          setActiveIndex(0);
        }
      } catch (err) {
        console.error("Library fetch error:", err);
      } finally {
        if (!isCancelled) {
          setIsFetchingBooks(false);
        }
      }
    }

    void loadLibrary();

    return () => {
      isCancelled = true;
    };
  }, [activeTab, profile, isAuthLoading]);

  if (isAuthLoading) {
    return (
      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-frame h-32 w-full animate-pulse bg-base-content/5" />
        ))}
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="glass-frame flex flex-col items-center justify-center gap-4 px-5 py-10 text-center sm:flex-row sm:justify-between sm:px-7 sm:text-left">
        <div className="space-y-1">
          <p className="text-xs font-black uppercase tracking-widest text-primary">Kütüphanem</p>
          <h2 className="text-xl font-black tracking-tight sm:text-2xl">Kaldığın yeri her cihazda sakla</h2>
          <p className="max-w-xl text-sm font-medium text-base-content/60">
            Okuma ilerlemeni, okuyacaklarını ve favori kitaplarını görmek için giriş yap.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link href="/Books" className="btn btn-ghost rounded-full px-7 font-black">
            Popüler Kitaplar
          </Link>
          <Link href="/login" className="btn btn-primary rounded-full px-7 font-black">
            Giriş Yap
          </Link>
        </div>
      </section>
    );
  }

  if (!isLoading && visibleBooks.length === 0 && activeTab === "Reading") {
    return null;
  }

  const showNext = () => {
    setActiveIndex((currentIndex) =>
      currentIndex === visibleBooks.length - 1 ? 0 : currentIndex + 1,
    );
  };

  const showPrevious = () => {
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? visibleBooks.length - 1 : currentIndex - 1,
    );
  };

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.changedTouches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (touchStartXRef.current === null || touchStartYRef.current === null) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (
      Math.abs(deltaX) < SWIPE_THRESHOLD ||
      Math.abs(deltaX) < Math.abs(deltaY)
    ) {
      return;
    }

    if (deltaX > 0) {
      showPrevious();
      return;
    }

    showNext();
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between px-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
             <Sparkles className="h-5 w-5" />
             <h2 className="text-xl font-black tracking-tight sm:text-2xl uppercase italic">
               Kütüphanem
             </h2>
          </div>
          <p className="text-xs font-bold text-base-content/40 uppercase tracking-widest">
            {activeTab === "Reading" ? "Okumaya devam ettiğin eserler" : "Okuma listene eklediğin eserler"}
          </p>
        </div>

        <div className="flex gap-1 rounded-2xl border border-base-content/10 bg-base-100/20 p-1 backdrop-blur-sm sm:w-auto">
          {(["Reading", "PlanToRead"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all sm:flex-none ${
                activeTab === tab
                  ? "bg-primary text-primary-content shadow-lg shadow-primary/20"
                  : "text-base-content/40 hover:bg-base-100/50 hover:text-base-content"
              }`}
            >
              {tab === "Reading" ? "Okuyorum" : "Okuyacağım"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-frame h-32 w-full animate-pulse bg-base-content/5" />
          ))}
        </div>
      ) : visibleBooks.length > 0 ? (
        <>
          <div className="space-y-4 lg:hidden">
            <div
              className="touch-pan-y overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${activeIndex * 100}%)` }}
              >
                {visibleBooks.map((item) => (
                  (() => {
                    const normalized = normalizeLibraryItem(item);
                    return (
                  <div key={item.id} className="min-w-full px-1">
                    <ContinueReadingCard
                      book={{
                        title: item.bookTitle,
                        slug: item.bookSlug,
                        chapter: normalized.chapterTitle,
                        chapterSlug: normalized.chapterSlug,
                        percent: normalized.safePercent,
                        image: resolveMediaUrl(item.bookCoverImageUrl) || "/covers/cover-placeholder.svg",
                        imageAlt: `${item.bookTitle} kapağı`,
                        blurDataURL: "",
                        status: item.status,
                        lastReadParagraphId: normalized.paragraphId
                      }}
                    />
                  </div>
                    );
                  })()
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5">
              {visibleBooks.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    index === activeIndex ? "w-6 bg-primary" : "w-1.5 bg-base-content/20"
                  }`}
                  aria-label={`Slayt ${index + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="hidden gap-4 lg:grid lg:grid-cols-2 xl:grid-cols-3">
            {visibleBooks.slice(0, 6).map((item) => (
              (() => {
                const normalized = normalizeLibraryItem(item);
                return (
              <ContinueReadingCard
                key={item.id}
                book={{
                  title: item.bookTitle,
                  slug: item.bookSlug,
                  chapter: normalized.chapterTitle,
                  chapterSlug: normalized.chapterSlug,
                  percent: normalized.safePercent,
                  image: resolveMediaUrl(item.bookCoverImageUrl) || "/covers/cover-placeholder.svg",
                  imageAlt: `${item.bookTitle} kapağı`,
                  blurDataURL: "",
                  status: item.status,
                  lastReadParagraphId: normalized.paragraphId
                }}
              />
                );
              })()
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-base-content/15 bg-base-100/10 py-16 text-center">
           <Bookmark className="h-10 w-10 text-base-content/10" />
           <div className="space-y-1">
              <p className="text-sm font-bold text-base-content/40 italic">Henüz bir kitap eklemedin.</p>
              <Link href="/Books" className="text-xs font-black text-primary uppercase hover:underline">Kesfe Git</Link>
           </div>
        </div>
      )}
    </section>
  );
}
