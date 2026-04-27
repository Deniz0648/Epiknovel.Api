"use client";

import {
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageSquareQuote,
  Star,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  type CSSProperties,
  type TouchEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toBookSlug } from "@/lib/books";

const AUTO_SLIDE_MS = 8000;
const SWIPE_THRESHOLD = 48;
type SlideDirection = "next" | "prev";

type ReaderExperience = {
  id: string;
  editorName: string;
  avatarUrl?: string;
  likes: number;
  bookTitle: string;
  rating: number;
  review: string;
};

// EXPERIENCES statik dizisi props'a tasindi.

export function ReaderExperiencesRow({ experiences }: { experiences: ReaderExperience[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<SlideDirection>("next");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const totalSlides = experiences.length;

  const activeExperience = useMemo(
    () => experiences[activeIndex] ?? experiences[0],
    [activeIndex, experiences],
  );

  const clearAutoTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const restartAutoTimer = useCallback(() => {
    clearAutoTimer();
    timerRef.current = setInterval(() => {
      setDirection("next");
      setActiveIndex((currentIndex) =>
        currentIndex === totalSlides - 1 ? 0 : currentIndex + 1,
      );
    }, AUTO_SLIDE_MS);
  }, [clearAutoTimer, totalSlides]);

  const goToSlide = useCallback(
    (index: number) => {
      if (index === activeIndex) {
        return;
      }

      setDirection(index > activeIndex ? "next" : "prev");
      setActiveIndex(index);
      restartAutoTimer();
    },
    [activeIndex, restartAutoTimer],
  );

  const showNext = useCallback(() => {
    setDirection("next");
    setActiveIndex((currentIndex) =>
      currentIndex === totalSlides - 1 ? 0 : currentIndex + 1,
    );
    restartAutoTimer();
  }, [restartAutoTimer, totalSlides]);

  const showPrevious = useCallback(() => {
    setDirection("prev");
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? totalSlides - 1 : currentIndex - 1,
    );
    restartAutoTimer();
  }, [restartAutoTimer, totalSlides]);

  useEffect(() => {
    restartAutoTimer();
    return clearAutoTimer;
  }, [clearAutoTimer, restartAutoTimer]);

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    const touch = event.changedTouches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
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

  const slideAnimationStyle = {
    "--slide-offset": direction === "next" ? "24px" : "-24px",
  } as CSSProperties;

  return (
    <section className="space-y-3">
      <div className="space-y-2 px-1">
        <div className="flex items-center gap-2">
          <MessageSquareQuote className="h-4 w-4 text-primary" />
          <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
            Okuyucu Deneyimleri
          </h2>
        </div>
        <p className="max-w-3xl text-sm leading-relaxed text-base-content/70 sm:text-base">
          EpikNovel dunyasinda kaybolan binlerce okuyucunun en cok begendigi
          degerlendirmeler.
        </p>
      </div>

      <article
        className="glass-frame relative overflow-hidden p-5 sm:p-6"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="pointer-events-none absolute -right-16 top-5 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-44 w-44 rounded-full bg-accent/15 blur-3xl" />

        <div
          key={activeExperience.id}
          className="hero-slide-enter relative z-10 flex flex-col gap-6"
          style={slideAnimationStyle}
        >
          {/* Header: User Info & Book Info */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Reviewer */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-sm font-black text-primary shadow-inner">
                  {activeExperience.avatarUrl ? (
                    <Image
                      src={activeExperience.avatarUrl}
                      alt={activeExperience.editorName}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    activeExperience.editorName?.charAt(0).toUpperCase() || "U"
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-lg bg-base-100 p-0.5 shadow-sm">
                  <MessageSquareQuote className="h-3 w-3 text-primary" />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-base-content/90">
                  {activeExperience.editorName}
                </h4>
              </div>
            </div>

            {/* Book Source */}
            <div className="flex items-center gap-3 rounded-2xl border border-base-content/5 bg-base-content/3 p-2 pr-4 transition-colors hover:bg-base-content/6">
              <div className="flex h-10 w-8 items-center justify-center rounded-md bg-base-content/10 text-[8px] font-black uppercase text-base-content/40">
                KİTAP
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-base-content/30">Hakkında Yazdı</span>
                <Link
                  href={`/Books/${toBookSlug(activeExperience.bookTitle)}`}
                  className="text-xs font-black uppercase tracking-tight text-primary transition-colors hover:text-primary-focus"
                >
                  {activeExperience.bookTitle}
                </Link>
              </div>
            </div>
          </div>

          {/* Content: Review & Rating */}
          <div className="relative">
            <div className="absolute -left-2 -top-4 text-6xl font-serif text-primary/10 select-none">“</div>
            <div
              className="prose prose-sm prose-invert max-w-none relative z-10 pl-2 text-base font-medium leading-relaxed text-base-content/80 prose-p:my-1 prose-strong:text-primary"
              dangerouslySetInnerHTML={{
                __html: activeExperience.review
                  ?.replace(/&lt;/g, '<')
                  ?.replace(/&gt;/g, '>')
                  ?.replace(/&quot;/g, '"')
                  ?.replace(/&#39;/g, "'")
                  ?.replace(/&amp;/g, '&') || ""
              }}
            />
          </div>

          {/* Footer: Rating */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-base-content/5 pt-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${i < Math.floor(activeExperience.rating) ? 'fill-warning text-warning' : 'text-base-content/20'}`}
                    />
                  ))}
                  <span className="ml-1 text-lg font-black text-warning">
                    {activeExperience.rating.toFixed(1)}
                  </span>
                  <span className="text-xs font-bold text-base-content/30 uppercase tracking-widest mt-0.5">/ 5.0</span>
                </div>
              </div>
              
              <button 
                onClick={async (e) => {
                  e.preventDefault();
                  try {
                    const res = await fetch(`/api/social/comments/${activeExperience.id}/like`, { method: 'POST' });
                    if (res.ok) {
                      const heart = e.currentTarget.querySelector('svg');
                      if (heart) {
                        heart.classList.toggle('fill-secondary');
                        heart.classList.toggle('text-secondary');
                      }
                    }
                  } catch (err) {
                    console.error("Like error:", err);
                  }
                }}
                className="group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-secondary/10 px-6 py-3.5 text-sm font-black uppercase tracking-widest text-secondary transition-all hover:bg-secondary/20 hover:shadow-xl hover:shadow-secondary/10 active:scale-95 active:shadow-inner shadow-lg shadow-secondary/5"
              >
                <div className="absolute inset-0 bg-linear-to-tr from-secondary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <Heart className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                <span className="relative z-10">{activeExperience.likes} Etkileşim</span>
              </button>
            </div>
        </div>
      </article>

      <div className="flex items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={showPrevious}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-base-content/20 bg-base-100/25 text-base-content/75 transition-colors hover:text-primary"
          aria-label="Onceki deneyim"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {experiences.map((item, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => goToSlide(index)}
              className={`h-2.5 rounded-full transition-all ${isActive ? "w-8 bg-primary" : "w-2.5 bg-base-content/30"
                }`}
              aria-label={`${index + 1}. deneyim: ${item.bookTitle}`}
              aria-current={isActive ? "true" : "false"}
            />
          );
        })}

        <button
          type="button"
          onClick={showNext}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-base-content/20 bg-base-100/25 text-base-content/75 transition-colors hover:text-primary"
          aria-label="Sonraki deneyim"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
