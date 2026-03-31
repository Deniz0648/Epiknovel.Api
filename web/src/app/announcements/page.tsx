"use client";

import Link from "next/link";
import { BellRing, CalendarClock, Megaphone, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { HeaderIsland } from "@/components/layout/header-island";

const ANNOUNCEMENTS = [
  {
    id: 1,
    title: "Sunucu Bakimi",
    subject: "Planli Bakim",
    body: "31 Mart 2026 02:00 - 03:00 araliginda planli bakim yapilacaktir.",
    tag: "Sistem",
    date: "31 Mart 2026",
  },
  {
    id: 2,
    title: "Yorum Politikasi Guncellendi",
    subject: "Topluluk Kurallari",
    body: "Kitap incelemeleri icin topluluk kurallari yeniden duzenlendi.",
    tag: "Topluluk",
    date: "30 Mart 2026",
  },
  {
    id: 3,
    title: "Kesfet Sayfasi Performans Iyilestirmesi",
    subject: "Performans",
    body: "Filtreleme ve sayfalama islemleri daha hizli calisacak sekilde optimize edildi.",
    tag: "Urun",
    date: "29 Mart 2026",
  },
  {
    id: 4,
    title: "Mobil Arayuz Duzeltmeleri",
    subject: "Mobil Deneyim",
    body: "Header, tema secici ve kart gorunumlerinde mobil uyumluluk duzeltildi.",
    tag: "Arayuz",
    date: "28 Mart 2026",
  },
  {
    id: 5,
    title: "Yeni Editor Secimi Rozeti",
    subject: "Icerik Etiketleme",
    body: "Editor tarafindan secilen kitaplar icin yeni rozet sistemi eklendi.",
    tag: "Icerik",
    date: "27 Mart 2026",
  },
  {
    id: 6,
    title: "Okuyucu Deneyimleri Alanina Sayfalama",
    subject: "Yorum Akisi",
    body: "Uzun yorum listelerinde gezinmeyi kolaylastiran sayfalama eklendi.",
    tag: "Topluluk",
    date: "26 Mart 2026",
  },
];

export default function AnnouncementsPage() {
  const [query, setQuery] = useState("");
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<number | null>(null);

  const filteredAnnouncements = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("tr-TR");
    return ANNOUNCEMENTS.filter((announcement) => {
      if (!normalized) {
        return true;
      }
      return (
        announcement.title.toLocaleLowerCase("tr-TR").includes(normalized) ||
        announcement.body.toLocaleLowerCase("tr-TR").includes(normalized) ||
        announcement.tag.toLocaleLowerCase("tr-TR").includes(normalized)
      );
    });
  }, [query]);

  const selectedAnnouncement =
    selectedAnnouncementId === null
      ? null
      : filteredAnnouncements.find((announcement) => announcement.id === selectedAnnouncementId) ??
        ANNOUNCEMENTS.find((announcement) => announcement.id === selectedAnnouncementId) ??
        null;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto w-full max-w-7xl px-4 pt-3 sm:px-8 sm:pt-4">
          <HeaderIsland />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-12 pt-28 sm:px-8 sm:pt-32">
        <section className="glass-frame space-y-6 p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <nav className="flex items-center gap-2 text-xs font-semibold text-base-content/60">
              <Link href="/" className="transition-colors hover:text-primary">
                Anasayfa
              </Link>
              <span className="opacity-40">-</span>
              <span className="text-base-content/90">Duyurular</span>
            </nav>

            <label className="input input-bordered flex h-10 w-full items-center gap-2 rounded-xl border-base-content/15 bg-base-100/32 sm:max-w-xs">
              <Search className="h-4 w-4 text-base-content/60" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Duyuru ara..."
                className="w-full bg-transparent text-sm"
              />
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <BellRing className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-[0.2em]">Resmi Duyurular</span>
            </div>
            <h1 className="hero-title-gradient text-4xl font-black tracking-tight sm:text-5xl">
              Announcements
            </h1>
          </div>

          <p className="text-xs font-bold uppercase tracking-widest text-base-content/40">
            Toplam {filteredAnnouncements.length} duyuru
          </p>

          {filteredAnnouncements.length > 0 ? (
            <div className="space-y-3">
              {filteredAnnouncements.map((announcement) => (
                <button
                  key={announcement.id}
                  type="button"
                  onClick={() => setSelectedAnnouncementId(announcement.id)}
                  className="w-full rounded-2xl border border-base-content/12 bg-base-100/24 p-4 text-left transition hover:border-primary/35 hover:bg-base-100/32 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-primary">
                        <Megaphone className="h-3 w-3" />
                        {announcement.tag}
                      </p>
                      <h2 className="text-lg font-black leading-tight">{announcement.title}</h2>
                      <p className="text-xs font-semibold text-base-content/68">{announcement.subject}</p>
                    </div>
                    <p className="inline-flex items-center gap-1 text-xs font-semibold text-base-content/60">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {announcement.date}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-base-content/78">{announcement.body}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-base-content/15 bg-base-100/10 py-16 text-center">
              <p className="text-sm font-semibold text-base-content/55">
                Arama kriterine uygun duyuru bulunamadi.
              </p>
            </div>
          )}
        </section>
      </div>

      {selectedAnnouncement ? (
        <dialog className="modal modal-open">
          <div className="glass-frame modal-box max-w-xl space-y-3 border border-base-content/18 bg-base-100/92 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-primary">
                <Megaphone className="h-3 w-3" />
                {selectedAnnouncement.tag}
              </p>
              <p className="inline-flex items-center gap-1 text-xs font-semibold text-base-content/60">
                <CalendarClock className="h-3.5 w-3.5" />
                {selectedAnnouncement.date}
              </p>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black leading-tight">{selectedAnnouncement.title}</h2>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-base-content/82">{selectedAnnouncement.subject}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm leading-relaxed text-base-content/80">{selectedAnnouncement.body}</p>
            </div>

            <div className="modal-action mt-4">
              <button
                type="button"
                className="btn rounded-full border border-base-content/20 bg-base-100/35"
                onClick={() => setSelectedAnnouncementId(null)}
              >
                Kapat
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button type="button" onClick={() => setSelectedAnnouncementId(null)}>
              close
            </button>
          </form>
        </dialog>
      ) : null}
    </main>
  );
}
