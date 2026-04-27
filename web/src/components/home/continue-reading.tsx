"use client";

import { type TouchEvent, useRef, useState } from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toBookSlug } from "@/lib/books";
import { getLibraryList, type LibraryItemResponse } from "@/lib/social";
import { useEffect } from "react";

type ContinueReadingBook = {
  title: string;
  chapter: string;
  percent: number;
  image: string;
  imageAlt: string;
  blurDataURL: string;
};

// CONTINUE_READING_BOOKS statik dizisi API'den cekiliyor.
const SWIPE_THRESHOLD = 48;

function ContinueReadingCard({ book }: { book: ContinueReadingBook }) {
  const bSlug = toBookSlug(book.title);
  const cSlug = book.chapter;
  
  // KESIN URL: /read/[kitap-slug]/[bolum-slug]
  const bookHref = (cSlug && cSlug !== "Bolum Secilmedi")
    ? `/read/${bSlug}/${cSlug}`
    : `/Books/${bSlug}`;

  return (
    <Link
      href={bookHref}
      className="glass-frame group block h-full cursor-pointer p-5 transition duration-200 active:scale-[0.995] sm:p-6"
    >
      <div className="flex items-start gap-4">
        <div className="relative aspect-2/3 w-[4.6rem] shrink-0 overflow-hidden rounded-xl border border-base-content/12 sm:w-20">
          <Image
            src={book.image}
            alt={book.imageAlt}
            fill
            unoptimized
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
  const [books, setBooks] = useState<LibraryItemResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    getLibraryList({ status: "Reading", size: 6 })
      .then((data) => {
        setBooks(data);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  if (!isLoading && books.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <section className="space-y-3 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-base-content/10" />
        <div className="h-40 w-full rounded-2xl bg-base-content/5" />
      </section>
    );
  }

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
            {books.map((item) => (
              <div key={item.id} className="min-w-full">
                <ContinueReadingCard
                  book={{
                    title: item.bookTitle,
                    chapter: item.lastReadChapterSlug || "Bolum Secilmedi",
                    percent: Math.round(item.progressPercentage),
                    image: item.bookCoverImageUrl || "/covers/cover-placeholder.svg",
                    imageAlt: `${item.bookTitle} kapagi`,
                    blurDataURL: ""
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          {books.map((book, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={book.bookTitle}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 rounded-full transition-all ${isActive ? "w-8 bg-primary" : "w-2.5 bg-base-content/30"
                  }`}
                aria-label={`${index + 1}. kitap: ${book.bookTitle}`}
                aria-current={isActive ? "true" : "false"}
              />
            );
          })}
        </div>
      </div>

      <div className="hidden gap-4 lg:grid lg:grid-cols-2 xl:grid-cols-3">
        {books.slice(0, 6).map((item) => (
          <ContinueReadingCard
            key={item.id}
            book={{
              title: item.bookTitle,
              chapter: item.lastReadChapterSlug || "Bolum Secilmedi",
              percent: Math.round(item.progressPercentage),
              image: item.bookCoverImageUrl || "/covers/cover-placeholder.svg",
              imageAlt: `${item.bookTitle} kapagi`,
              blurDataURL: ""
            }}
          />
        ))}
      </div>
    </section>
  );
}
