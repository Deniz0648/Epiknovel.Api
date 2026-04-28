"use client";

import Image from "next/image";
import { Crown, Trophy } from "lucide-react";
import { type TouchEvent, useMemo, useRef, useState } from "react";

const SWIPE_THRESHOLD = 44;

type PopularAuthor = {
  id: string;
  name: string;
  initials: string;
  specialty: string;
  followers: string;
  seriesCount: number;
  avatarUrl?: string;
};

// POPULAR_AUTHORS statik dizisi props'a tasindi.

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

function chunkAuthors(authors: ReadonlyArray<PopularAuthor>, size: number) {
  const chunks: PopularAuthor[][] = [];
  for (let index = 0; index < authors.length; index += size) {
    chunks.push(authors.slice(index, index + size));
  }
  return chunks;
}

function AuthorCard({ author, rank }: { author: PopularAuthor; rank: number }) {
  const rankBadgeClasses = getRankBadgeClasses(rank);
  const isTopThree = rank <= 3;

  return (
    <article className="glass-frame relative p-4 sm:p-5">
      <div className="absolute right-4 top-4">
        <span
          className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-bold ${rankBadgeClasses}`}
        >
          {rank}
        </span>
      </div>

      <div className="flex items-start gap-3">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-base-content/10 bg-base-100/25">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,color-mix(in_oklab,var(--color-primary)_55%,transparent),transparent_68%)]" />
          {author.avatarUrl ? (
             <Image 
               src={author.avatarUrl} 
               alt={author.name}
               fill
               className="object-cover relative z-10"
             />
          ) : (
            <span className="relative z-10 text-sm font-extrabold tracking-wide text-base-content">
              {author.initials}
            </span>
          )}
        </div>

        <div className="min-w-0 pt-1">
          <div className="flex items-center gap-1.5">
            {isTopThree ? <Crown className="h-3.5 w-3.5 text-warning" /> : null}
            <h3 className="line-clamp-1 text-base font-bold leading-tight">
              {author.name}
            </h3>
          </div>
          <p className="mt-1 text-xs font-medium text-base-content/65">
            {author.specialty}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-base-content/10 bg-base-100/20 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-base-content/55">
            Takipci
          </p>
          <p className="mt-1 text-base font-bold leading-none">{author.followers}</p>
        </div>

        <div className="rounded-xl border border-base-content/10 bg-base-100/20 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-base-content/55">
            Seri
          </p>
          <p className="mt-1 text-base font-bold leading-none">{author.seriesCount}</p>
        </div>
      </div>
    </article>
  );
}

export function PopularAuthorsRow({ 
  authors, 
  title = "Popüler Yazarlar", 
  icon: Icon = Trophy 
}: { 
  authors: PopularAuthor[], 
  title?: string, 
  icon?: any 
}) {
  const [activeMobilePage, setActiveMobilePage] = useState(0);
  const [activeTabletPage, setActiveTabletPage] = useState(0);
  const mobileTouchStartXRef = useRef<number | null>(null);
  const mobileTouchStartYRef = useRef<number | null>(null);
  const tabletTouchStartXRef = useRef<number | null>(null);
  const tabletTouchStartYRef = useRef<number | null>(null);

  const mobileSlides = useMemo(
    () => chunkAuthors(authors, 1),
    [authors],
  );
  const tabletSlides = useMemo(
    () => chunkAuthors(authors, 3),
    [authors],
  );

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
        <Icon className={`h-4 w-4 ${title === "Popüler Yazarlar" ? "text-warning" : "text-primary"}`} />
        <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
          {title}
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
                {slide.map((author) => {
                  const rank = authors.findIndex((item) => item.id === author.id) + 1;
                  return <AuthorCard key={author.id} author={author} rank={rank} />;
                })}
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
                aria-label={`${index + 1}. popüler yazarlar sayfasi`}
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
                  {slide.map((author) => {
                    const rank =
                      authors.findIndex((item) => item.id === author.id) + 1;
                    return <AuthorCard key={author.id} author={author} rank={rank} />;
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
                className={`h-2.5 rounded-full transition-all ${
                  isActive ? "w-8 bg-primary" : "w-2.5 bg-base-content/30"
                }`}
                aria-label={`${index + 1}. tablet popüler yazarlar sayfasi`}
                aria-current={isActive ? "true" : "false"}
              />
            );
          })}
        </div>
      </div>

      <div className="hidden gap-3 xl:grid xl:grid-cols-3">
        {authors.map((author, index) => (
          <AuthorCard key={author.id} author={author} rank={index + 1} />
        ))}
      </div>
    </section>
  );
}
