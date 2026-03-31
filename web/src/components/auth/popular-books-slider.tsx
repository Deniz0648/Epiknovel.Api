"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toBookSlug } from "@/lib/books";

const AUTO_MS = 7000;

type PopularBook = {
  id: string;
  title: string;
  category: string;
  description: string;
  image: string;
  rating: string;
  reads: string;
};

const BOOKS: PopularBook[] = [
  {
    id: "1",
    title: "Kutsal Arsivlerin Son Koruyucusu",
    category: "Fantastik",
    description: "Kadim buyulerin uyandigi dunyada, son arsivci dengeyi korumak zorunda.",
    image: "/hero-cover.svg",
    rating: "4.9",
    reads: "1.2M",
  },
  {
    id: "2",
    title: "Against the Gods",
    category: "Aksiyon",
    description: "Yikilan bir kaderin ardindan guc ve intikamla dolu uzun bir yukselis.",
    image: "/hero-cover.svg",
    rating: "4.8",
    reads: "2.8M",
  },
  {
    id: "3",
    title: "Rebirth of the Thief Who Roamed the World",
    category: "Macera",
    description: "Gizli loncalar, tehlikeli antlasmalar ve tek bir hirsizin geri donusu.",
    image: "/hero-cover.svg",
    rating: "4.7",
    reads: "980K",
  },
];

export function PopularBooksSlider({ className = "" }: { className?: string }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % BOOKS.length);
    }, AUTO_MS);

    return () => clearInterval(timer);
  }, []);

  const activeBook = useMemo(() => BOOKS[activeIndex] ?? BOOKS[0], [activeIndex]);
  const href = `/Books/${toBookSlug(activeBook.title)}`;

  return (
    <section className={`glass-frame flex h-full flex-col p-6 sm:p-7 ${className}`}>
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Populer Kitaplar</p>
        <h2 className="text-2xl font-black leading-tight">EpikNovel Seckisi</h2>
      </div>

      <div className="mt-4 flex flex-1 flex-col items-center gap-4">
        <Link href={href} className="glass-frame relative block aspect-[2/3] w-full max-w-[12.5rem] overflow-hidden p-1.5">
          <div className="relative h-full w-full overflow-hidden rounded-[1rem]">
            <Image src={activeBook.image} alt={activeBook.title} fill className="object-cover" sizes="25vw" />
          </div>
        </Link>

        <div className="flex w-full max-w-[22rem] flex-col items-center text-center">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-base-content/60">
              {activeBook.category}
            </p>
            <h3 className="text-3xl font-black leading-[1.08]">{activeBook.title}</h3>
            <p className="text-base leading-relaxed text-base-content/75">{activeBook.description}</p>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-center gap-4 text-sm font-semibold text-base-content/75">
              <span className="inline-flex items-center gap-1 text-warning">
                <Star className="h-4 w-4 fill-current" />
                {activeBook.rating}
              </span>
              <span>{activeBook.reads} okunma</span>
            </div>

            <Link href={href} className="btn btn-primary btn-sm rounded-full px-5">
              Incelemeye Git
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-base-content/12 pt-4">
        <div className="flex items-center gap-2">
          {BOOKS.map((book, index) => (
            <button
              key={book.id}
              type="button"
              aria-label={`${index + 1}. kitap`}
              onClick={() => setActiveIndex(index)}
              className={`h-2.5 rounded-full transition-all ${
                index === activeIndex ? "w-7 bg-primary" : "w-2.5 bg-base-content/30"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-xs rounded-full border border-base-content/20 bg-base-100/30"
            onClick={() => setActiveIndex((prev) => (prev - 1 + BOOKS.length) % BOOKS.length)}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="btn btn-xs rounded-full border border-base-content/20 bg-base-100/30"
            onClick={() => setActiveIndex((prev) => (prev + 1) % BOOKS.length)}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
