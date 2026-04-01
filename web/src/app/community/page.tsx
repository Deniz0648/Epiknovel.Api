"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpenText, ChevronRight, Filter, Globe2, Loader2, Search, Sparkles, UserRound } from "lucide-react";
import { ApiError } from "@/lib/api";
import { getPublicUserProfiles, type PublicUserListItem } from "@/lib/auth";
import { useAuth } from "@/components/providers/auth-provider";

const joinedAtFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
});

export default function CommunityPage() {
  const { profile, isLoading: isSessionLoading } = useAuth();

  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [isAuthorFilter, setIsAuthorFilter] = useState<"all" | "author" | "reader">("all");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalCount, setTotalCount] = useState(0);
  const [items, setItems] = useState<PublicUserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / pageSize)), [pageSize, totalCount]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(queryInput.trim());
      setPageNumber(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [queryInput]);

  useEffect(() => {
    if (!profile) {
      setItems([]);
      setTotalCount(0);
      return;
    }

    let cancelled = false;

    async function loadUsers() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getPublicUserProfiles({
          pageNumber,
          pageSize,
          query,
          isAuthor: isAuthorFilter === "all" ? undefined : isAuthorFilter === "author",
          sortBy: "joinedAt",
          sortDirection,
        });

        if (cancelled) {
          return;
        }

        setItems(data.items);
        setTotalCount(data.totalCount);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        if (loadError instanceof ApiError) {
          setError(loadError.message);
        } else {
          setError("Topluluk listesi getirilemedi.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [isAuthorFilter, pageNumber, pageSize, profile, query, sortDirection]);

  return (
    <main className="relative overflow-hidden">
      <div className="site-shell mx-auto flex min-h-screen flex-col gap-6 px-4 pb-8 pt-28 sm:px-8 sm:pb-10 sm:pt-32">
        <section className="glass-frame relative overflow-hidden border border-primary/20 bg-gradient-to-br from-base-100/90 via-base-100/84 to-primary/8 p-6 sm:p-8">
          <div className="pointer-events-none absolute -left-20 top-0 h-44 w-44 rounded-full bg-primary/14 blur-3xl" />
          <div className="pointer-events-none absolute -right-12 bottom-0 h-36 w-36 rounded-full bg-secondary/12 blur-3xl" />

          <div className="relative z-10">
            <nav className="mb-3 flex items-center gap-1 text-xs font-semibold text-base-content/55">
              <Link href="/" className="transition hover:text-base-content">
                Anasayfa
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-base-content/35" />
              <span className="text-base-content/78">Topluluk</span>
            </nav>
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-base-content/45">
              <Globe2 className="h-3.5 w-3.5 text-primary" />
              Topluluk Profili
            </p>
            <h1 className="mt-2 text-[clamp(1.9rem,4vw,3rem)] font-black leading-[0.95]">Public Profil Vitrini</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-base-content/70">
              Topluluktaki profilleri keşfet, arama yap, yazarları filtrele ve sıralamayı dilediğin gibi değiştir.
            </p>
            {profile ? (
              <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center">
                <label className="input input-bordered flex h-12 items-center gap-2 rounded-2xl border-base-content/14 bg-base-100/30">
                  <Search className="h-4 w-4 text-base-content/55" />
                  <input
                    type="text"
                    value={queryInput}
                    onChange={(event) => setQueryInput(event.target.value)}
                    placeholder="Kullanici ara (ad veya slug)"
                    className="w-full bg-transparent"
                  />
                </label>

                <label className="select select-bordered h-12 min-w-44 rounded-2xl border-base-content/14 bg-base-100/30">
                  <span className="sr-only">Yazarlik Filtresi</span>
                  <Filter className="pointer-events-none absolute ml-3 h-4 w-4 text-base-content/55" />
                  <select
                    value={isAuthorFilter}
                    onChange={(event) => {
                      setIsAuthorFilter(event.target.value as "all" | "author" | "reader");
                      setPageNumber(1);
                    }}
                    className="pl-8"
                  >
                    <option value="all">Tum Profiller</option>
                    <option value="author">Sadece Yazarlar</option>
                    <option value="reader">Sadece Okurlar</option>
                  </select>
                </label>

                <label className="select select-bordered h-12 min-w-44 rounded-2xl border-base-content/14 bg-base-100/30">
                  <span className="sr-only">Katilim Tarihi Sirasi</span>
                  <select
                    value={sortDirection}
                    onChange={(event) => {
                      setSortDirection(event.target.value as "asc" | "desc");
                      setPageNumber(1);
                    }}
                  >
                    <option value="desc">Katilim (Yeni -&gt; Eski)</option>
                    <option value="asc">Katilim (Eski -&gt; Yeni)</option>
                  </select>
                </label>

                <label className="select select-bordered h-12 min-w-36 rounded-2xl border-base-content/14 bg-base-100/30">
                  <span className="sr-only">Sayfa Boyutu</span>
                  <select
                    value={String(pageSize)}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPageNumber(1);
                    }}
                  >
                    <option value="12">12 / Sayfa</option>
                    <option value="24">24 / Sayfa</option>
                    <option value="36">36 / Sayfa</option>
                  </select>
                </label>
              </div>
            ) : null}
          </div>
        </section>

        {isSessionLoading ? (
          <section className="glass-frame p-6">Yukleniyor...</section>
        ) : !profile ? (
          <section className="glass-frame border border-base-content/12 bg-base-100/22 p-6 sm:p-8">
            <h2 className="text-2xl font-black">Toplulugu gormek icin giris gerekli</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-base-content/70">
              Bu endpoint BOLA korumali oldugu icin profil listesini gormek icin oturum acman gerekiyor.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/login" className="btn btn-primary rounded-full px-6">
                Giris Yap
              </Link>
              <Link href="/register" className="btn rounded-full border border-base-content/12 bg-base-100/22 px-6 hover:bg-base-100/34">
                Kayit Ol
              </Link>
            </div>
          </section>
        ) : (
          <>
            {error ? <section className="glass-frame border border-error/30 bg-error/10 p-4 text-error">{error}</section> : null}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {isLoading ? (
                <article className="glass-frame col-span-full flex items-center gap-3 p-6">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  Profiller yukleniyor...
                </article>
              ) : items.length === 0 ? (
                <article className="glass-frame col-span-full border border-dashed border-base-content/18 bg-base-100/18 p-6 text-sm text-base-content/68">
                  Filtreye uygun profil bulunamadi.
                </article>
              ) : (
                items.map((item) => (
                  <article
                    key={item.slug}
                    className="glass-frame group relative overflow-hidden border border-base-content/12 bg-gradient-to-br from-base-100/28 via-base-100/20 to-primary/8 p-5 transition hover:border-primary/35 hover:shadow-xl hover:shadow-primary/10"
                  >
                    <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/20" />
                    <div className="flex items-start gap-3">
                      {item.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.avatarUrl}
                          alt={item.displayName}
                          className="h-14 w-14 rounded-2xl border border-base-content/14 object-cover"
                        />
                      ) : (
                        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-base-content/14 bg-base-100/30 text-lg font-black text-primary">
                          {item.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-lg font-black">{item.displayName}</p>
                        <p className="truncate text-xs text-base-content/58">@{item.slug}</p>
                        {item.isAuthor ? (
                          <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/14 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-primary">
                            <Sparkles className="h-3 w-3" />
                            Yazar
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-relaxed text-base-content/72">
                      {item.bio?.trim() || "Bu kullanici henuz biyografi eklemedi."}
                    </p>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-base-content/12 bg-base-100/24 px-2.5 py-2 text-center">
                        <p className="text-[10px] uppercase tracking-[0.08em] text-base-content/58">Takipci</p>
                        <p className="mt-1 text-sm font-black">{item.followersCount}</p>
                      </div>
                      <div className="rounded-xl border border-base-content/12 bg-base-100/24 px-2.5 py-2 text-center">
                        <p className="text-[10px] uppercase tracking-[0.08em] text-base-content/58">Takip</p>
                        <p className="mt-1 text-sm font-black">{item.followingCount}</p>
                      </div>
                      <div className="rounded-xl border border-base-content/12 bg-base-100/24 px-2.5 py-2 text-center">
                        <p className="text-[10px] uppercase tracking-[0.08em] text-base-content/58">Eser</p>
                        <p className="mt-1 text-sm font-black">{item.booksCount}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs text-base-content/62">
                      <span className="inline-flex items-center gap-1.5">
                        <BookOpenText className="h-3.5 w-3.5 text-primary" />
                        Katilim: {joinedAtFormatter.format(new Date(item.joinedAt))}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          item.isFollowing ? "bg-success/16 text-success" : "bg-base-100/34 text-base-content/74"
                        }`}
                      >
                        {item.isFollowing ? "Takiptesin" : "Takip etmiyorsun"}
                      </span>
                      <Link href={`/community/${item.slug}`} className="btn btn-primary btn-sm rounded-full px-4">
                        <UserRound className="h-3.5 w-3.5" />
                        Profile Git
                      </Link>
                    </div>
                  </article>
                ))
              )}
            </section>

            <section className="glass-frame flex flex-wrap items-center justify-between gap-3 border border-base-content/12 bg-base-100/24 p-4">
              <p className="text-sm text-base-content/70">
                Toplam <span className="font-bold">{totalCount}</span> profil • Sayfa {pageNumber} / {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
                  disabled={pageNumber <= 1 || isLoading}
                  className="btn rounded-full border border-base-content/12 bg-base-100/24 px-5 disabled:opacity-45"
                >
                  Onceki
                </button>
                <button
                  type="button"
                  onClick={() => setPageNumber((prev) => Math.min(totalPages, prev + 1))}
                  disabled={pageNumber >= totalPages || isLoading}
                  className="btn rounded-full border border-base-content/12 bg-base-100/24 px-5 disabled:opacity-45"
                >
                  Sonraki
                </button>
              </div>
            </section>
          </>
        )}

        {profile ? (
          <section className="glass-frame grid gap-6 border border-base-content/12 bg-base-100/24 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
            <div className="flex items-start justify-center">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="h-28 w-28 rounded-[1.8rem] border border-base-content/14 object-cover shadow-xl shadow-primary/15 sm:h-32 sm:w-32"
                />
              ) : (
                <span className="inline-flex h-28 w-28 items-center justify-center rounded-[1.8rem] border border-base-content/14 bg-base-100/30 text-3xl font-black text-primary sm:h-32 sm:w-32">
                  {profile.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-base-content/48">Topluluk Kimligi</p>
                <h2 className="mt-1 text-4xl font-black leading-[0.95]">{profile.displayName}</h2>
              </div>

              <div className="rounded-2xl border border-primary/15 bg-gradient-to-r from-base-100/24 via-base-100/16 to-primary/8 p-4">
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-base-content/48">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Biyografi
                </p>
                <p className="mt-3 text-sm leading-relaxed text-base-content/78">
                  {profile.bio?.trim() || "Henüz biyografi paylaşilmadi."}
                </p>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
