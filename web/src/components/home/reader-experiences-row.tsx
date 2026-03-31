"use client";

import {
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageSquareQuote,
  Star,
} from "lucide-react";
import Link from "next/link";
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
  likes: number;
  bookTitle: string;
  rating: number;
  review: string;
};

const EXPERIENCES: ReadonlyArray<ReaderExperience> = [
  {
    id: "exp-1",
    editorName: "Epik Admin",
    likes: 6,
    bookTitle: "Against The Gods",
    rating: 5.0,
    review:
      "\"Eger ana karakterin 'ezik' kalmasindan sikildiysaniz, Yun Che ile tanisma vaktiniz gelmis demektir! ATG, her bolumuyle ters kose yapan, dovus sahneleriyle nefes kesen bir saheser. Jasmine ile olan o usta-cirak iliskisinden dogan devasa guc ve Yun Che'nin dusmanlarina karsi acimasizligi tek kelimeyle efsane. Kan, gozyasi ve bitmek bilmeyen bir hirs... Bu romani okurken kendinizi 'Gokyuzu Zehir Sedefini' kontrol ediyormus gibi hissedeceksiniz. Kemerlerinizi baglayin, bu yolculuk cok sarsintili olacak!\"",
  },
  {
    id: "exp-2",
    editorName: "Epik Admin",
    likes: 9,
    bookTitle: "Rebirth of the Thief Who Roamed the World",
    rating: 4.9,
    review:
      "\"Hiz, strateji ve intikam hissi cok guclu. Nie Yan'in her hamlesi bir satranc oyunu gibi, ustune bir de lonca savaslari eklenince roman birakilmaz hale geliyor. Ozellikle guc dengesinin adim adim kurulmasi cok tatmin edici.\"",
  },
  {
    id: "exp-3",
    editorName: "Epik Admin",
    likes: 7,
    bookTitle: "Kutsal Arsivlerin Son Koruyucusu",
    rating: 4.8,
    review:
      "\"Dunya kurulumundaki katmanlar ve buyu sistemi cok olgun bir sekilde ilerliyor. Karakter gelisimi aceleye getirilmeden veriliyor, bu da bolumler ilerledikce bag kurmayi kolaylastiriyor. Finaldeki ritim ise tam dozunda.\"",
  },
];

export function ReaderExperiencesRow() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<SlideDirection>("next");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const totalSlides = EXPERIENCES.length;

  const activeExperience = useMemo(
    () => EXPERIENCES[activeIndex] ?? EXPERIENCES[0],
    [activeIndex],
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
          className="hero-slide-enter relative z-10 space-y-5"
          style={slideAnimationStyle}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-base-content/12 bg-base-100/35 text-sm font-black tracking-wide">
                EA
              </div>
              <div>
                <p className="text-sm font-semibold text-base-content/70">
                  {activeExperience.editorName}
                </p>
                <p className="text-base font-bold">{activeExperience.editorName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-base-content/12 bg-base-100/30 px-3 py-1.5 text-sm">
              <Heart className="h-4 w-4 text-secondary" />
              <span className="font-semibold">{activeExperience.likes} Begeni</span>
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="badge badge-soft border-none px-3 py-3 text-xs font-semibold tracking-wide">
              <Link href={`/Books/${toBookSlug(activeExperience.bookTitle)}`}>
                {activeExperience.bookTitle}
              </Link>
            </p>
            <div className="flex items-end gap-2">
              <div className="flex items-center gap-1 text-warning">
                <Star className="h-4 w-4 fill-current" />
                <span className="text-xl font-black leading-none">
                  {activeExperience.rating.toFixed(1)}
                </span>
              </div>
              <p className="pb-0.5 text-xs font-semibold uppercase tracking-[0.15em] text-base-content/60">
                / 5.0 Puan
              </p>
            </div>
          </div>

          <blockquote className="rounded-2xl border border-base-content/12 bg-base-100/22 px-4 py-4 text-sm leading-relaxed text-base-content/82 sm:px-5 sm:text-base">
            {activeExperience.review}
          </blockquote>
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

        {EXPERIENCES.map((item, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => goToSlide(index)}
              className={`h-2.5 rounded-full transition-all ${
                isActive ? "w-8 bg-primary" : "w-2.5 bg-base-content/30"
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
