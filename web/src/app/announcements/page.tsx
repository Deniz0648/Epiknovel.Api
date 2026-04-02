"use client";

import Link from "next/link";
import { Bell, CalendarClock, Home, Megaphone, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api";
import { getAnnouncements, type AnnouncementItem } from "@/lib/auth";

const dateFormatter = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" });

export default function AnnouncementsPage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAnnouncements() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getAnnouncements();
        if (!cancelled) {
          setItems(data.items);
        }
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        if (loadError instanceof ApiError) {
          setError(loadError.message);
        } else {
          setError("Duyurular yuklenemedi.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadAnnouncements();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredAnnouncements = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("tr-TR");
    return items.filter((announcement) => {
      if (!normalized) {
        return true;
      }
      return (
        announcement.title.toLocaleLowerCase("tr-TR").includes(normalized) ||
        announcement.content.toLocaleLowerCase("tr-TR").includes(normalized)
      );
    });
  }, [items, query]);

  const selectedAnnouncement =
    selectedAnnouncementId === null
      ? null
      : filteredAnnouncements.find((announcement) => announcement.id === selectedAnnouncementId) ??
        items.find((announcement) => announcement.id === selectedAnnouncementId) ??
        null;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="site-shell mx-auto flex flex-col gap-6 px-4 pb-12 pt-28 sm:px-8 sm:pt-32">
        <section className="glass-frame space-y-7 p-4 sm:p-6">
          {/* Breadcrumb & Header Row */}
          <div className="flex flex-col gap-6">
            <div className="space-y-4">
              <div className="breadcrumbs text-xs font-semibold text-base-content/50 mb-1">
                <ul>
                  <li><Link href="/" className="hover:text-primary transition-colors flex items-center"><Home className="w-3.5 h-3.5 mr-1.5" /> Ana Sayfa</Link></li>
                  <li className="text-base-content/40">Duyurular</li>
                </ul>
              </div>
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 text-primary">
                  <Bell className="h-7 w-7" strokeWidth={2.5} />
                  <h1 className="hero-title-gradient text-3xl font-black tracking-tight sm:text-4xl uppercase italic">Duyurular</h1>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pt-4 border-t border-base-content/5">
            <p className="text-xs font-black uppercase tracking-widest text-base-content/30 italic">Resmi bilgilendirmeleri ve platform haberlerini buradan takip edin.</p>
            <label className="input input-bordered flex h-11 w-full items-center gap-2 rounded-xl border-base-content/15 bg-base-100/32 md:max-w-md">
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

          <div className="flex items-center justify-between border-b border-base-content/5 pb-2">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/40 italic">Toplam {filteredAnnouncements.length} duyuru bulundu</p>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-base-content/12 bg-base-100/18 py-16 text-center">
              <p className="text-sm font-semibold text-base-content/60">Duyurular yukleniyor...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-error/35 bg-error/10 py-12 text-center">
              <p className="text-sm font-semibold text-error">{error}</p>
            </div>
          ) : filteredAnnouncements.length > 0 ? (
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
                        {announcement.isPinned ? "One Cikan" : "Duyuru"}
                      </p>
                      <h2 className="text-lg font-black leading-tight">{announcement.title}</h2>
                    </div>
                    <p className="inline-flex items-center gap-1 text-xs font-semibold text-base-content/60">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {dateFormatter.format(new Date(announcement.createdAt))}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-base-content/78">{announcement.content}</p>
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
                {selectedAnnouncement.isPinned ? "One Cikan" : "Duyuru"}
              </p>
              <p className="inline-flex items-center gap-1 text-xs font-semibold text-base-content/60">
                <CalendarClock className="h-3.5 w-3.5" />
                {dateFormatter.format(new Date(selectedAnnouncement.createdAt))}
              </p>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black leading-tight">{selectedAnnouncement.title}</h2>
            </div>
            <div className="space-y-1">
              <p className="text-sm leading-relaxed text-base-content/80">{selectedAnnouncement.content}</p>
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
