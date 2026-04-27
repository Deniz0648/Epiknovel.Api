import { BellRing, BookText, Megaphone } from "lucide-react";
import Link from "next/link";
import { toBookSlug } from "@/lib/books";

// CHAPTER_UPDATES ve ANNOUNCEMENTS statik dizileri props'a tasindi.

export type UpdateItem = {
  book: string;
  chapter: string;
  time: string;
};

export type AnnouncementItem = {
  title: string;
  description: string;
  date: string;
};

export function UpdatesFeed({ 
  updates, 
  announcements 
}: { 
  updates: UpdateItem[], 
  announcements: AnnouncementItem[] 
}) {

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <article className="glass-frame flex h-full flex-col p-4 sm:p-6">
        <div className="mb-3 flex items-center gap-2 sm:mb-4">
          <BookText className="h-4 w-4 text-primary" />
          <h3 className="text-base font-bold sm:text-xl">Guncellemeler</h3>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:flex-1 xl:grid-cols-1 xl:grid-rows-6 xl:gap-2.5">
          {updates.map((item) => (
            <Link
              href={`/Books/${toBookSlug(item.book)}`}
              key={`${item.book}-${item.chapter}`}
              className="rounded-xl border border-base-content/10 bg-base-100/20 px-3 py-3 transition-colors hover:border-primary/30 xl:flex xl:h-full xl:flex-col xl:justify-center"
            >
              <p className="line-clamp-2 text-sm font-semibold leading-snug">{item.book}</p>
              <p className="mt-1 text-sm text-base-content/75">{item.chapter}</p>
              <p className="mt-1 text-xs text-base-content/55">{item.time}</p>
            </Link>
          ))}
        </div>

        <div className="mt-3 xl:mt-auto xl:pt-3">
          <Link href="/Updates" className="btn btn-outline btn-sm w-full rounded-full">
            Hepsini Gor
          </Link>
        </div>
      </article>

      <article className="glass-frame flex h-full flex-col p-4 sm:p-6">
        <div className="mb-3 flex items-center gap-2 sm:mb-4">
          <Megaphone className="h-4 w-4 text-secondary" />
          <h3 className="text-base font-bold sm:text-xl">Son Duyurular</h3>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:flex-1 xl:grid-cols-1 xl:grid-rows-4 xl:gap-2.5">
          {announcements.map((item) => (
            <div
              key={`${item.title}-${item.date}`}
              className="rounded-xl border border-base-content/10 bg-base-100/20 px-3 py-3 xl:flex xl:h-full xl:flex-col xl:justify-center"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold">{item.title}</p>
                <span className="inline-flex items-center gap-1 text-xs text-base-content/55">
                  <BellRing className="h-3 w-3" />
                  {item.date}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-base-content/75">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3 xl:mt-auto xl:pt-3">
          <Link href="/announcements" className="btn btn-outline btn-sm w-full rounded-full">
            Hepsini Gor
          </Link>
        </div>
      </article>
    </section>
  );
}
