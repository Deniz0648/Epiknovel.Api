import { BellRing, BookText, Megaphone } from "lucide-react";
import Link from "next/link";
import { toBookSlug } from "@/lib/books";

const CHAPTER_UPDATES = [
  {
    book: "Kutsal Arsivlerin Son Koruyucusu",
    chapter: "Bolum 149 yayinda",
    time: "12 dk once",
  },
  {
    book: "Against the Gods",
    chapter: "Bolum 813 yayinda",
    time: "34 dk once",
  },
  {
    book: "Rebirth of the Thief Who Roamed the World",
    chapter: "Bolum 308 yayinda",
    time: "1 saat once",
  },
  {
    book: "Golge Loncasinin Kayip Haritasi",
    chapter: "Bolum 90 yayinda",
    time: "2 saat once",
  },
  {
    book: "Sonsuz Muhurun Ucuncu Anahtari",
    chapter: "Bolum 204 yayinda",
    time: "3 saat once",
  },
  {
    book: "Kuzey Kapisindaki Buyucu",
    chapter: "Bolum 57 yayinda",
    time: "5 saat once",
  },
] as const;

const ANNOUNCEMENTS = [
  {
    title: "Sunucu Bakimi",
    description: "Cumartesi 02:00 - 03:00 arasinda kisa sureli bakim olacak.",
    date: "31 Mart",
  },
  {
    title: "Yeni Etiket Sistemi",
    description: "Romanlarda filtreleme deneyimini iyilestiren yeni etiketler acildi.",
    date: "30 Mart",
  },
  {
    title: "Yazar Etkinligi",
    description: "Bu hafta sonu canli soru-cevap etkinligi duzenleniyor.",
    date: "29 Mart",
  },
  {
    title: "Mobil Iyilestirmeler",
    description: "Kaydirma performansi ve bolum gecisleri guncellendi.",
    date: "28 Mart",
  },
] as const;

export function UpdatesFeed() {
  const chapterUpdates = CHAPTER_UPDATES.slice(0, 6);
  const announcements = ANNOUNCEMENTS.slice(0, 4);

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <article className="glass-frame flex h-full flex-col p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <BookText className="h-4 w-4 text-primary" />
          <h3 className="text-lg font-bold sm:text-xl">Guncellemeler</h3>
        </div>

        <div className="space-y-2.5 xl:flex-1 xl:grid xl:grid-rows-6 xl:gap-2.5 xl:space-y-0">
          {chapterUpdates.map((item) => (
            <Link
              href={`/Books/${toBookSlug(item.book)}`}
              key={`${item.book}-${item.chapter}`}
              className="rounded-xl border border-base-content/10 bg-base-100/20 px-3 py-3 transition-colors hover:border-primary/30 xl:flex xl:h-full xl:flex-col xl:justify-center"
            >
              <p className="line-clamp-1 text-sm font-semibold">{item.book}</p>
              <p className="text-sm text-base-content/75">{item.chapter}</p>
              <p className="mt-1 text-xs text-base-content/55">{item.time}</p>
            </Link>
          ))}
        </div>

        <div className="mt-4 xl:mt-auto xl:pt-3">
          <button className="btn btn-outline btn-sm w-full rounded-full">
            Hepsini Gor
          </button>
        </div>
      </article>

      <article className="glass-frame flex h-full flex-col p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-secondary" />
          <h3 className="text-lg font-bold sm:text-xl">Son Duyurular</h3>
        </div>

        <div className="space-y-2.5 xl:flex-1 xl:grid xl:grid-rows-4 xl:gap-2.5 xl:space-y-0">
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

        <div className="mt-4 xl:mt-auto xl:pt-3">
          <button className="btn btn-outline btn-sm w-full rounded-full">
            Hepsini Gor
          </button>
        </div>
      </article>
    </section>
  );
}
