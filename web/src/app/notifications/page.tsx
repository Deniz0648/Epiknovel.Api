"use client";

import Link from "next/link";
import { Bell, BellDot, CheckCheck, Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNotifications } from "@/components/providers/notifications-provider";

const dateTimeFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function NotificationsPage() {
  const { items, unreadCount, isLoading, error, refreshNotifications, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    void refreshNotifications();
  }, []);

  const filteredItems = useMemo(() => {
    if (filter === "unread") {
      return items.filter((item) => !item.isRead);
    }

    return items;
  }, [filter, items]);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="site-shell mx-auto flex flex-col gap-6 px-4 pb-12 pt-28 sm:px-8 sm:pt-32">
        <section className="glass-frame space-y-6 p-6 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <nav className="flex items-center gap-2 text-xs font-semibold text-base-content/60">
                <Link href="/" className="transition-colors hover:text-primary">
                  Anasayfa
                </Link>
                <span className="opacity-40">-</span>
                <span className="text-base-content/90">Bildirimler</span>
              </nav>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <Bell className="h-5 w-5" />
                  <span className="text-xs font-bold uppercase tracking-[0.2em]">Merkez</span>
                </div>
                <h1 className="hero-title-gradient text-4xl font-black tracking-tight sm:text-5xl">
                  Bildirimler
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-base-content/68">
                  Hesabinizla ilgili sistem olaylari, author paneli durumlari ve operasyonel bilgilendirmeler burada toplanir.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  filter === "all"
                    ? "bg-primary text-primary-content shadow-lg shadow-primary/20"
                    : "border border-base-content/12 bg-base-100/24 text-base-content/72"
                }`}
              >
                Tumu
              </button>
              <button
                type="button"
                onClick={() => setFilter("unread")}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  filter === "unread"
                    ? "bg-primary text-primary-content shadow-lg shadow-primary/20"
                    : "border border-base-content/12 bg-base-100/24 text-base-content/72"
                }`}
              >
                Okunmamis
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="glass-frame rounded-[1.8rem] border border-base-content/12 bg-base-100/24 p-5">
              <div className="space-y-4">
                <div className="rounded-2xl border border-primary/18 bg-primary/8 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Durum</p>
                  <p className="mt-2 text-3xl font-black text-base-content/88">{unreadCount}</p>
                  <p className="mt-1 text-sm text-base-content/66">okunmamis bildirim</p>
                </div>

                <div className="space-y-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => void markAllAsRead()}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-content shadow-lg shadow-primary/18 transition hover:opacity-92"
                    >
                      <CheckCheck className="h-4 w-4" />
                      Tumunu okundu yap
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => void refreshNotifications()}
                    className="w-full rounded-2xl border border-base-content/12 bg-base-100/34 px-4 py-3 text-sm font-bold text-base-content/76 transition hover:border-primary/25 hover:text-primary"
                  >
                    Listeyi yenile
                  </button>
                </div>
              </div>
            </aside>

            <div className="space-y-3">
              {isLoading ? (
                <div className="rounded-2xl border border-base-content/12 bg-base-100/18 py-16 text-center">
                  <p className="text-sm font-semibold text-base-content/60">Bildirimler yukleniyor...</p>
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-error/35 bg-error/10 py-12 text-center">
                  <p className="text-sm font-semibold text-error">{error}</p>
                </div>
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <article
                    key={item.id}
                    className={`rounded-[1.7rem] border p-5 transition ${
                      item.isRead
                        ? "border-base-content/12 bg-base-100/24"
                        : "border-primary/18 bg-gradient-to-r from-primary/10 via-base-100/28 to-base-100/18"
                    }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <span className={`mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${item.isRead ? "bg-base-100/48 text-base-content/52" : "bg-primary/12 text-primary"}`}>
                          {item.isRead ? <Bell className="h-4.5 w-4.5" /> : <BellDot className="h-4.5 w-4.5" />}
                        </span>
                        <div className="min-w-0">
                          <h2 className="text-lg font-black leading-tight text-base-content/88">{item.title}</h2>
                          <p className="mt-1 text-sm leading-relaxed text-base-content/70">{item.message}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-base-content/52">
                            <span className="inline-flex items-center gap-1">
                              <Clock3 className="h-3.5 w-3.5" />
                              {dateTimeFormatter.format(new Date(item.createdAt))}
                            </span>
                            <span className="opacity-35">•</span>
                            <span>{item.isRead ? "Okundu" : "Yeni"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {item.actionUrl ? (
                          <Link
                            href={item.actionUrl}
                            onClick={() => {
                              if (!item.isRead) {
                                void markAsRead(item.id);
                              }
                            }}
                            className="rounded-full border border-base-content/12 bg-base-100/48 px-4 py-2 text-sm font-bold text-base-content/78 no-underline transition hover:border-primary/25 hover:text-primary"
                          >
                            Detaya Git
                          </Link>
                        ) : null}
                        {!item.isRead ? (
                          <button
                            type="button"
                            onClick={() => void markAsRead(item.id)}
                            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-content shadow-lg shadow-primary/20 transition hover:opacity-92"
                          >
                            <CheckCheck className="h-4 w-4" />
                            Okundu
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-base-content/15 bg-base-100/10 py-16 text-center">
                  <p className="text-sm font-semibold text-base-content/55">Gosterilecek bildirim bulunamadi.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
