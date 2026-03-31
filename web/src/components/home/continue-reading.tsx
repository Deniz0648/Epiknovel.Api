"use client";

import { type TouchEvent, useRef, useState } from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toBookSlug } from "@/lib/books";

type ContinueReadingBook = {
  title: string;
  chapter: string;
  percent: number;
  image: string;
  imageAlt: string;
  blurDataURL: string;
};

const CONTINUE_READING_BOOKS: ReadonlyArray<ContinueReadingBook> = [
  {
    title: "Kutsal Arsivlerin Son Koruyucusu",
    chapter: "Bolum 148",
    percent: 72,
    image: "/covers/cover-arsiv.svg",
    imageAlt: "Kutsal Arsivlerin Son Koruyucusu kapagi",
    blurDataURL:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 12'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%23f6c886'/%3E%3Cstop offset='1' stop-color='%233d3968'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='8' height='12' fill='url(%23g)'/%3E%3C/svg%3E",
  },
  {
    title: "Golge Loncasinin Kayip Haritasi",
    chapter: "Bolum 89",
    percent: 41,
    image: "/covers/cover-golge.svg",
    imageAlt: "Golge Loncasinin Kayip Haritasi kapagi",
    blurDataURL:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 12'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%2381ddd0'/%3E%3Cstop offset='1' stop-color='%231a2436'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='8' height='12' fill='url(%23g)'/%3E%3C/svg%3E",
  },
  {
    title: "Sonsuz Muhurun Ucuncu Anahtari",
    chapter: "Bolum 203",
    percent: 93,
    image: "/covers/cover-muhur.svg",
    imageAlt: "Sonsuz Muhurun Ucuncu Anahtari kapagi",
    blurDataURL:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 12'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%23f4b286'/%3E%3Cstop offset='1' stop-color='%23271f3d'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='8' height='12' fill='url(%23g)'/%3E%3C/svg%3E",
  },
];
const SWIPE_THRESHOLD = 48;

function ContinueReadingCard({ book }: { book: ContinueReadingBook }) {
  const bookHref = `/Books/${toBookSlug(book.title)}`;

  return (
    <Link
      href={bookHref}
      className="glass-frame group block h-full cursor-pointer p-5 transition duration-200 active:scale-[0.995] sm:p-6"
    >
      <div className="flex items-start gap-4">
        <div className="relative aspect-[2/3] w-[4.6rem] shrink-0 overflow-hidden rounded-xl border border-base-content/12 sm:w-[5rem]">
          <Image
            src={book.image}
            alt={book.imageAlt}
            fill
            placeholder="blur"
            blurDataURL={book.blurDataURL}
            className="object-cover"
            sizes="96px"
          />
          <div className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-base-100/45 opacity-0 backdrop-blur-md transition-opacity duration-300 md:flex md:group-hover:opacity-100 md:group-focus-within:opacity-100">
            <span className="rounded-full border border-base-content/18 bg-base-100/65 px-3 py-1 text-xs font-semibold text-base-content">
              Devam Et
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.17em] text-base-content/60">
              <BookOpen className="h-3.5 w-3.5" />
              Kaldigin Yer
            </p>
            <span className="badge badge-primary badge-outline">%{book.percent}</span>
          </div>

          <h3 className="line-clamp-2 text-lg font-bold leading-tight">
            {book.title}
          </h3>
          <p className="text-sm text-base-content/70">{book.chapter}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-base-content/10">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${book.percent}%` }}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs font-medium text-base-content/65">
          %{book.percent} tamamlandi
        </p>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary md:hidden">
          Devam Et
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

export function ContinueReadingSection() {
  const books = CONTINUE_READING_BOOKS.slice(0, 3);
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  function showNext() {
    setActiveIndex((currentIndex) =>
      currentIndex === books.length - 1 ? 0 : currentIndex + 1,
    );
  }

  function showPrevious() {
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? books.length - 1 : currentIndex - 1,
    );
  }

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
    <section className="space-y-3">
      <div className="px-1">
        <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
          Kaldigin Yerden Devam Et
        </h2>
        <p className="text-sm text-base-content/65">
          En son okudugun kitaplar ve ilerleme yuzdeleri
        </p>
      </div>

      <div className="space-y-3 lg:hidden">
        <div
          className="touch-pan-y overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex transition-transform delay-75 duration-500 ease-out"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {books.map((book) => (
              <div key={book.title} className="min-w-full">
                <ContinueReadingCard book={book} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          {books.map((book, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={book.title}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 rounded-full transition-all ${
                  isActive ? "w-8 bg-primary" : "w-2.5 bg-base-content/30"
                }`}
                aria-label={`${index + 1}. kitap: ${book.title}`}
                aria-current={isActive ? "true" : "false"}
              />
            );
          })}
        </div>
      </div>

      <div className="hidden gap-4 lg:grid lg:grid-cols-3">
        {books.map((book) => (
          <ContinueReadingCard key={book.title} book={book} />
        ))}
      </div>
    </section>
  );
}
