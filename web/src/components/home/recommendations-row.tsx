"use client";

import Image from "next/image";
import Link from "next/link";
import { Sparkles, Star } from "lucide-react";
import { type TouchEvent, useMemo, useRef, useState } from "react";
import { toBookSlug } from "@/lib/books";

const SWIPE_THRESHOLD = 44;

type RecommendationBook = {
  id: string;
  title: string;
  category: string;
  rating: number;
  image: string;
  imageAlt: string;
  blurDataURL: string;
};

const RECOMMENDATIONS: ReadonlyArray<RecommendationBook> = [
  {
    id: "r-1",
    title: "Chronicles of the Lost Star",
    category: "Fantasy",
    rating: 4.8,
    image: "/covers/cover-arsiv.svg",
    imageAlt: "Chronicles of the Lost Star kapagi",
    blurDataURL:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 12'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%23f6c886'/%3E%3Cstop offset='1' stop-color='%233d3968'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='8' height='12' fill='url(%23g)'/%3E%3C/svg%3E",
  },
  {
    id: "r-2",
    title: "The Dragon Mark Oath",
    category: "Action",
    rating: 4.5,
    image: "/covers/cover-golge.svg",
    imageAlt: "The Dragon Mark Oath kapagi",
    blurDataURL:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 12'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%2381ddd0'/%3E%3Cstop offset='1' stop-color='%231a2436'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='8' height='12' fill='url(%23g)'/%3E%3C/svg%3E",
  },
  {
    id: "r-3",
    title: "Abyss Academy Reborn",
    category: "Dark Fantasy",
    rating: 4.9,
    image: "/covers/cover-muhur.svg",
    imageAlt: "Abyss Academy Reborn kapagi",
    blurDataURL:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 12'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%23f4b286'/%3E%3Cstop offset='1' stop-color='%23271f3d'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='8' height='12' fill='url(%23g)'/%3E%3C/svg%3E",
  },
  {
    id: "r-4",
    title: "Crown of Silent Tempest",
    category: "Epic",
    rating: 4.4,
    image: "/covers/cover-arsiv.svg",
    imageAlt: "Crown of Silent Tempest kapagi",
    blurDataURL:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 12'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%23f6c886'/%3E%3Cstop offset='1' stop-color='%233d3968'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='8' height='12' fill='url(%23g)'/%3E%3C/svg%3E",
  },
  {
    id: "r-5",
    title: "Blade of Forgotten Code",
    category: "Adventure",
    rating: 4.7,
    image: "/covers/cover-golge.svg",
    imageAlt: "Blade of Forgotten Code kapagi",
    blurDataURL:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 12'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%2381ddd0'/%3E%3Cstop offset='1' stop-color='%231a2436'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='8' height='12' fill='url(%23g)'/%3E%3C/svg%3E",
  },
  {
    id: "r-6",
    title: "Tower of Last Ember",
    category: "Mystery",
    rating: 4.3,
    image: "/covers/cover-muhur.svg",
    imageAlt: "Tower of Last Ember kapagi",
    blurDataURL:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 12'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%23f4b286'/%3E%3Cstop offset='1' stop-color='%23271f3d'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='8' height='12' fill='url(%23g)'/%3E%3C/svg%3E",
  },
];

function RecommendationCard({ book }: { book: RecommendationBook }) {
  const bookHref = `/Books/${toBookSlug(book.title)}`;

  return (
    <Link href={bookHref} className="glass-frame group block h-full p-3 sm:p-3.5">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-base-content/12">
        <Image
          src={book.image}
          alt={book.imageAlt}
          fill
          placeholder="blur"
          blurDataURL={book.blurDataURL}
          className="object-cover transition duration-300 group-hover:scale-[1.03]"
          sizes="(max-width: 768px) 40vw, (max-width: 1280px) 18vw, 14vw"
        />
      </div>

      <div className="mt-3 space-y-1.5">
        <h3 className="line-clamp-2 text-sm font-bold leading-tight">{book.title}</h3>
        <div className="grid grid-cols-2 items-center gap-2 pt-1">
          <div className="flex items-center gap-1.5 text-warning">
            <Star className="h-4 w-4 fill-current" strokeWidth={1.9} />
            <span className="text-sm font-semibold text-base-content">
              {book.rating.toFixed(1)}
            </span>
          </div>

          <p className="line-clamp-1 text-right text-sm font-semibold text-primary/95">
            {book.category}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function RecommendationsRow() {
  const books = RECOMMENDATIONS;
  const [activeMobilePage, setActiveMobilePage] = useState(0);
  const [activeTabletPage, setActiveTabletPage] = useState(0);
  const mobileTouchStartXRef = useRef<number | null>(null);
  const mobileTouchStartYRef = useRef<number | null>(null);
  const tabletTouchStartXRef = useRef<number | null>(null);
  const tabletTouchStartYRef = useRef<number | null>(null);

  const mobileSlides = useMemo<RecommendationBook[][]>(() => {
    const chunks: RecommendationBook[][] = [];
    for (let index = 0; index < books.length; index += 2) {
      chunks.push(books.slice(index, index + 2));
    }
    return chunks;
  }, [books]);

  const tabletSlides = useMemo<RecommendationBook[][]>(() => {
    const chunks: RecommendationBook[][] = [];
    for (let index = 0; index < books.length; index += 3) {
      chunks.push(books.slice(index, index + 3));
    }
    return chunks;
  }, [books]);

  function showNextMobilePage() {
    setActiveMobilePage((current) =>
      current === mobileSlides.length - 1 ? 0 : current + 1,
    );
  }

  function showPreviousMobilePage() {
    setActiveMobilePage((current) =>
      current === 0 ? mobileSlides.length - 1 : current - 1,
    );
  }

  function showNextTabletPage() {
    setActiveTabletPage((current) =>
      current === tabletSlides.length - 1 ? 0 : current + 1,
    );
  }

  function showPreviousTabletPage() {
    setActiveTabletPage((current) =>
      current === 0 ? tabletSlides.length - 1 : current - 1,
    );
  }

  function handleMobileTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.changedTouches[0];
    mobileTouchStartXRef.current = touch.clientX;
    mobileTouchStartYRef.current = touch.clientY;
  }

  function handleMobileTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (
      mobileTouchStartXRef.current === null ||
      mobileTouchStartYRef.current === null
    ) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - mobileTouchStartXRef.current;
    const deltaY = touch.clientY - mobileTouchStartYRef.current;

    mobileTouchStartXRef.current = null;
    mobileTouchStartYRef.current = null;

    if (
      Math.abs(deltaX) < SWIPE_THRESHOLD ||
      Math.abs(deltaX) < Math.abs(deltaY)
    ) {
      return;
    }

    if (deltaX > 0) {
      showPreviousMobilePage();
      return;
    }

    showNextMobilePage();
  }

  function handleTabletTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.changedTouches[0];
    tabletTouchStartXRef.current = touch.clientX;
    tabletTouchStartYRef.current = touch.clientY;
  }

  function handleTabletTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (
      tabletTouchStartXRef.current === null ||
      tabletTouchStartYRef.current === null
    ) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - tabletTouchStartXRef.current;
    const deltaY = touch.clientY - tabletTouchStartYRef.current;

    tabletTouchStartXRef.current = null;
    tabletTouchStartYRef.current = null;

    if (
      Math.abs(deltaX) < SWIPE_THRESHOLD ||
      Math.abs(deltaX) < Math.abs(deltaY)
    ) {
      return;
    }

    if (deltaX > 0) {
      showPreviousTabletPage();
      return;
    }

    showNextTabletPage();
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="h-4 w-4 text-secondary" />
        <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
          Senin Icin Oneriler
        </h2>
      </div>

      <div className="space-y-3 md:hidden">
        <div
          className="touch-pan-y overflow-hidden"
          onTouchStart={handleMobileTouchStart}
          onTouchEnd={handleMobileTouchEnd}
        >
          <div
            className="flex transition-transform delay-75 duration-500 ease-out"
            style={{ transform: `translateX(-${activeMobilePage * 100}%)` }}
          >
            {mobileSlides.map((slide, index) => (
              <div key={index} className="min-w-full">
                <div className="grid grid-cols-2 gap-3">
                  {slide.map((book) => (
                    <RecommendationCard key={book.id} book={book} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          {mobileSlides.map((_, index) => {
            const isActive = index === activeMobilePage;
            return (
              <button
                key={index}
                type="button"
                onClick={() => setActiveMobilePage(index)}
                className={`h-2.5 rounded-full transition-all ${
                  isActive ? "w-8 bg-primary" : "w-2.5 bg-base-content/30"
                }`}
                aria-label={`${index + 1}. oneriler sayfasi`}
                aria-current={isActive ? "true" : "false"}
              />
            );
          })}
        </div>
      </div>

      <div className="hidden space-y-3 md:block xl:hidden">
        <div
          className="touch-pan-y overflow-hidden"
          onTouchStart={handleTabletTouchStart}
          onTouchEnd={handleTabletTouchEnd}
        >
          <div
            className="flex transition-transform delay-75 duration-500 ease-out"
            style={{ transform: `translateX(-${activeTabletPage * 100}%)` }}
          >
            {tabletSlides.map((slide, index) => (
              <div key={index} className="min-w-full">
                <div className="grid grid-cols-3 gap-3">
                  {slide.map((book) => (
                    <RecommendationCard key={book.id} book={book} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          {tabletSlides.map((_, index) => {
            const isActive = index === activeTabletPage;
            return (
              <button
                key={index}
                type="button"
                onClick={() => setActiveTabletPage(index)}
                className={`h-2.5 rounded-full transition-all ${
                  isActive ? "w-8 bg-primary" : "w-2.5 bg-base-content/30"
                }`}
                aria-label={`${index + 1}. tablet oneriler sayfasi`}
                aria-current={isActive ? "true" : "false"}
              />
            );
          })}
        </div>
      </div>

      <div className="hidden gap-3 xl:grid xl:grid-cols-6">
        {books.slice(0, 6).map((book) => (
          <RecommendationCard key={book.id} book={book} />
        ))}
      </div>
    </section>
  );
}
