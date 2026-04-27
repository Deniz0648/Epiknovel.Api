"use client";

import Image from "next/image";
import Link from "next/link";
import { Flame, Star } from "lucide-react";
import { type TouchEvent, useMemo, useRef, useState } from "react";
import { toBookSlug } from "@/lib/books";

const SWIPE_THRESHOLD = 44;

type MostReadBook = {
  id: string;
  title: string;
  category: string;
  rating: number;
  image: string;
  imageAlt: string;
  blurDataURL: string;
};

// MOST_READ_BOOKS statik dizisi props'a tasindi.

function getRankBadgeClasses(rank: number) {
  if (rank === 1) {
    return "bg-warning text-warning-content";
  }

  if (rank === 2) {
    return "bg-info text-info-content";
  }

  if (rank === 3) {
    return "bg-secondary text-secondary-content";
  }

  return "bg-base-content/20 text-base-content";
}

function MostReadCard({ book, rank }: { book: MostReadBook; rank: number }) {
  const rankBadgeClasses = getRankBadgeClasses(rank);
  const bookHref = `/Books/${toBookSlug(book.title)}`;

  return (
    <Link
      href={bookHref}
      className="glass-frame group relative block h-full p-3 sm:p-3.5"
    >
      <div className="absolute right-3 top-3 z-10 sm:right-3.5 sm:top-3.5">
        <span
          className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-bold ${rankBadgeClasses}`}
        >
          {rank}
        </span>
      </div>

      <div className="relative aspect-2/3 w-full overflow-hidden rounded-xl border border-base-content/12">
        <Image
          src={book.image}
          alt={book.imageAlt}
          fill
          unoptimized
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

export function MostReadRow({ books }: { books: MostReadBook[] }) {
  const [activeMobilePage, setActiveMobilePage] = useState(0);
  const [activeTabletPage, setActiveTabletPage] = useState(0);
  const mobileTouchStartXRef = useRef<number | null>(null);
  const mobileTouchStartYRef = useRef<number | null>(null);
  const tabletTouchStartXRef = useRef<number | null>(null);
  const tabletTouchStartYRef = useRef<number | null>(null);

  const mobileSlides = useMemo<MostReadBook[][]>(() => {
    const chunks: MostReadBook[][] = [];
    for (let index = 0; index < books.length; index += 2) {
      chunks.push(books.slice(index, index + 2));
    }
    return chunks;
  }, [books]);

  const tabletSlides = useMemo<MostReadBook[][]>(() => {
    const chunks: MostReadBook[][] = [];
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
        <Flame className="h-4 w-4 text-accent" />
        <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
          En Cok Okunanlar
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
                  {slide.map((book) => {
                    const rank = books.findIndex((item) => item.id === book.id) + 1;
                    return <MostReadCard key={book.id} book={book} rank={rank} />;
                  })}
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
                className={`h-2.5 rounded-full transition-all ${isActive ? "w-8 bg-primary" : "w-2.5 bg-base-content/30"
                  }`}
                aria-label={`${index + 1}. en cok okunanlar sayfasi`}
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
                  {slide.map((book) => {
                    const rank = books.findIndex((item) => item.id === book.id) + 1;
                    return <MostReadCard key={book.id} book={book} rank={rank} />;
                  })}
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
                className={`h-2.5 rounded-full transition-all ${isActive ? "w-8 bg-primary" : "w-2.5 bg-base-content/30"
                  }`}
                aria-label={`${index + 1}. tablet en cok okunanlar sayfasi`}
                aria-current={isActive ? "true" : "false"}
              />
            );
          })}
        </div>
      </div>

      <div className="hidden gap-3 xl:grid xl:grid-cols-6">
        {books.slice(0, 6).map((book, index) => (
          <MostReadCard key={book.id} book={book} rank={index + 1} />
        ))}
      </div>
    </section>
  );
}
