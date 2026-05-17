"use client";

import { BookCover } from "@/components/ui/book-cover";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { AddToLibraryButton } from "@/components/book/add-to-library-button";
import {
  type CSSProperties,
  type TouchEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { trackEvent } from "@/lib/analytics";

const AUTO_SLIDE_MS = 8000;
const SWIPE_THRESHOLD = 48;
type SlideDirection = "next" | "prev";

type BookSlide = {
  id: string;
  slug: string;
  badge: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  blurDataURL: string;
  stats: ReadonlyArray<{ value: string; label: string }>;
  status: string;
};

function getHeadlineScaleStyle(text: string): CSSProperties {
  const length = text.trim().length;

  if (length >= 40) {
    return { fontSize: "clamp(1.25rem, 4.2vw, 2rem)" };
  }

  if (length >= 26) {
    return { fontSize: "clamp(1.5rem, 4.8vw, 2.5rem)" };
  }

  return { fontSize: "clamp(1.75rem, 5.5vw, 3.5rem)" };
}

// EDITOR_CHOICE_SLIDES statik dizisi props'a tasindi.

function CoverPanel({
  slide,
  className,
}: {
  slide: BookSlide;
  className?: string;
}) {
  const bookHref = `/Books/${slide.slug}`;

  return (
    <Link href={bookHref} className={className}>
      <div className="glass-frame relative mx-auto aspect-2/3 w-full overflow-hidden p-1.5">
        <div className="relative h-full w-full overflow-hidden rounded-[1.2rem]">
          <BookCover
            src={slide.image}
            alt={slide.imageAlt}
            priority={true}
            blurDataUrl={slide.blurDataURL}
            className="h-full w-full"
            sizes="(max-width: 640px) 170px, (max-width: 1024px) 240px, 310px"
          />
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-base-100/35 via-transparent to-transparent" />
        </div>
      </div>
    </Link>
  );
}

export function HeroFrame({ slides }: { slides: BookSlide[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<SlideDirection>("next");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const totalSlides = slides.length;

  const activeSlide = useMemo(
    () => slides[activeIndex] ?? slides[0],
    [activeIndex, slides],
  );
  const activeBookHref = activeSlide ? `/Books/${activeSlide.slug}` : "/Books";
  const titleScaleStyle = getHeadlineScaleStyle(activeSlide?.title ?? "");

  const clearAutoTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const restartAutoTimer = useCallback(() => {
    clearAutoTimer();
    if (totalSlides === 0) {
      return;
    }
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

  if (!activeSlide) {
    return null;
  }

  return (
    <section className="glass-frame relative overflow-hidden px-4 py-5 sm:px-7 sm:py-7 lg:px-10 lg:py-10">
      <div className="pointer-events-none absolute -left-28 top-20 h-64 w-64 rounded-full bg-primary/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-28 h-60 w-60 rounded-full bg-accent/20 blur-3xl" />

      <div
        key={activeSlide.id}
        className="hero-slide-enter relative z-10 grid touch-pan-y items-center gap-6 lg:grid-cols-[minmax(0,1.22fr)_minmax(0,0.78fr)] lg:gap-8"
        style={slideAnimationStyle}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="space-y-5 lg:space-y-7">
          <div className="flex flex-col gap-5 lg:block">
            {/* Mobile Cover (Top Row) */}
            <CoverPanel
              slide={activeSlide}
              className="mx-auto w-full max-w-64 lg:hidden"
            />

            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex justify-center lg:justify-start">
                <p className="badge badge-sm badge-info gap-2 border-none px-3 py-3 font-bold tracking-wide text-info-content shadow-sm">
                  <span className="inline-block h-2 w-2 rounded-full bg-info-content/90" />
                  {activeSlide.badge}
                </p>
              </div>

              <div className="flex h-auto min-h-22 items-center py-0.5 text-center sm:h-32 lg:h-[8.8rem] lg:text-left">
                <h1
                  className="hero-title-gradient line-clamp-3 w-full text-balance pb-[0.06em] font-black leading-[1.05] tracking-tight"
                  style={titleScaleStyle}
                >
                  <Link href={activeBookHref}>{activeSlide.title}</Link>
                </h1>
              </div>

              <p className="line-clamp-3 max-w-xl text-pretty text-center text-sm leading-relaxed text-base-content/75 sm:text-[1.05rem] lg:text-left">
                {activeSlide.description}
              </p>
            </div>
          </div>

          <div className="relative z-50 flex items-center gap-2 sm:gap-3">
            <Link
              href={activeBookHref}
              className="btn btn-primary h-12 flex-1 rounded-2xl px-0 shadow-lg shadow-primary/30"
              onClick={() => trackEvent("hero_cta_click", { section: "hero_frame", book_slug: activeSlide.slug })}
            >
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              <span className="truncate">Hemen Oku</span>
            </Link>
            <AddToLibraryButton
              bookId={activeSlide.id}
              bookStatus={activeSlide.status}
              className="h-12 flex-2"
              direction="up"
            />
          </div>

          <div className="grid w-full grid-cols-3 gap-2 pt-1 text-center sm:gap-3">
            {activeSlide.stats.map((stat) => (
              <div key={stat.label} className="px-1 py-1 sm:px-3">
                <p className="text-xl font-extrabold tracking-tight sm:text-3xl">
                  {stat.value}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-base-content/55 sm:text-xs sm:tracking-[0.2em]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <CoverPanel
          slide={activeSlide}
          className="mx-auto hidden w-full max-w-82 lg:justify-self-end lg:block"
        />
      </div>

      <div className="relative z-10 mt-5 flex items-center justify-center gap-2.5 sm:mt-6">
        <button
          type="button"
          onClick={showPrevious}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-base-content/20 bg-base-100/25 text-base-content/75 transition-colors hover:text-primary"
          aria-label="Onceki kitap"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {slides.map((slide, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => goToSlide(index)}
              className="flex h-11 w-11 items-center justify-center transition-all active:scale-90"
              aria-label={`${index + 1}. kitap: ${slide.title}`}
              aria-current={isActive ? "true" : "false"}
            >
              <span className={`h-2.5 rounded-full transition-all ${isActive ? "w-8 bg-primary" : "w-2.5 bg-base-content/30"}`} />
            </button>
          );
        })}

        <button
          type="button"
          onClick={showNext}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-base-content/20 bg-base-100/25 text-base-content/75 transition-colors hover:text-primary"
          aria-label="Sonraki kitap"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
