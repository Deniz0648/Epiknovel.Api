"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BookOpenText, Check, ChevronRight, Globe2, Loader2, UserPlus, UserRound, UserX, Users } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { ApiError } from "@/lib/api";
import { followUser, getPublicBooks, getPublicUserProfile, unfollowUser, type PublicBookListItem, type PublicUserProfile } from "@/lib/auth";

export default function CommunityUserPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { profile: sessionProfile, isLoading: isSessionLoading } = useAuth();
  const [publicProfile, setPublicProfile] = useState<PublicUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowSubmitting, setIsFollowSubmitting] = useState(false);
  const [isBooksLoading, setIsBooksLoading] = useState(false);
  const [authorBooks, setAuthorBooks] = useState<PublicBookListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const slug = useMemo(() => {
    const raw = params?.slug;
    return Array.isArray(raw) ? raw[0] : raw ?? "";
  }, [params]);

  useEffect(() => {
    if (!slug) {
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getPublicUserProfile(slug);
        if (!cancelled) {
          setPublicProfile(data);
          if (data.slug && data.slug !== slug) {
            router.replace(`/community/${data.slug}`);
          }
        }
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        if (loadError instanceof ApiError) {
          setError(loadError.message);
        } else {
          setError("Public profil getirilemedi.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [router, slug]);

  useEffect(() => {
    if (!publicProfile?.isAuthor) {
      setAuthorBooks([]);
      setIsBooksLoading(false);
      return;
    }

    const authorSlug = publicProfile.slug;
    let cancelled = false;

    async function loadAuthorBooks() {
      setIsBooksLoading(true);

      try {
        const data = await getPublicBooks({
          pageNumber: 1,
          pageSize: 100,
          authorSlug,
          sortBy: "CreatedAt",
          sortDescending: true,
        });

        if (cancelled) {
          return;
        }

        setAuthorBooks(data.items);
      } catch {
        if (!cancelled) {
          setAuthorBooks([]);
        }
      } finally {
        if (!cancelled) {
          setIsBooksLoading(false);
        }
      }
    }

    void loadAuthorBooks();

    return () => {
      cancelled = true;
    };
  }, [publicProfile]);

  async function handleFollowToggle() {
    if (!publicProfile) {
      return;
    }

    setError(null);
    setMessage(null);
    setIsFollowSubmitting(true);

    try {
      const result = publicProfile.isFollowing
        ? await unfollowUser(publicProfile.slug)
        : await followUser(publicProfile.slug);

      setPublicProfile((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          isFollowing: !current.isFollowing,
          followersCount: Math.max(0, result.followersCount),
        };
      });
      setMessage(result.message);
    } catch (toggleError) {
      if (toggleError instanceof ApiError) {
        setError(toggleError.message);
      } else {
        setError("Takip islemi su anda tamamlanamadi.");
      }
    } finally {
      setIsFollowSubmitting(false);
    }
  }

  return (
    <main className="relative overflow-hidden">
      <div className="site-shell mx-auto flex min-h-screen flex-col gap-6 px-4 pb-8 pt-28 sm:px-8 sm:pb-10 sm:pt-32">
        <section className="glass-frame relative overflow-hidden border border-primary/20 bg-gradient-to-br from-base-100/92 via-base-100/85 to-primary/8 p-6 sm:p-8">
          <div className="pointer-events-none absolute -left-20 top-0 h-44 w-44 rounded-full bg-primary/14 blur-3xl" />
          <div className="pointer-events-none absolute -right-12 bottom-0 h-36 w-36 rounded-full bg-secondary/12 blur-3xl" />

          <div className="relative z-10">
            <nav className="mb-3 flex items-center gap-1 text-xs font-semibold text-base-content/55">
              <Link href="/" className="transition hover:text-base-content">
                Anasayfa
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-base-content/35" />
              <Link href="/community" className="transition hover:text-base-content">
                Topluluk
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-base-content/35" />
              <span className="max-w-[18rem] truncate text-base-content/78">{slug || "Profil"}</span>
            </nav>
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-base-content/45">
              <Globe2 className="h-3.5 w-3.5 text-primary" />
              Topluluk Public Profil
            </p>
            <h1 className="mt-2 text-[clamp(1.9rem,4vw,3rem)] font-black leading-[0.95]">{slug || "Kullanici"}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-base-content/70">
              Bu sayfada kullanıcının açık profil bilgilerini, takip durumunu ve varsa yayınladığı eserleri görebilirsin.
            </p>
          </div>
        </section>

        {isLoading || isSessionLoading ? (
          <section className="glass-frame flex items-center gap-3 p-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Yukleniyor...
          </section>
        ) : error ? (
          <section className="glass-frame border border-error/30 bg-error/10 p-6 text-error">{error}</section>
        ) : publicProfile ? (
          <>
            <section className="glass-frame grid gap-6 border border-base-content/12 bg-base-100/24 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
            <div className="flex items-start justify-center">
              {publicProfile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={publicProfile.avatarUrl}
                  alt={publicProfile.displayName}
                  className="h-28 w-28 rounded-[1.8rem] border border-base-content/14 object-cover shadow-xl shadow-primary/15 sm:h-32 sm:w-32"
                />
              ) : (
                <span className="inline-flex h-28 w-28 items-center justify-center rounded-[1.8rem] border border-base-content/14 bg-base-100/30 text-3xl font-black text-primary sm:h-32 sm:w-32">
                  {publicProfile.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-base-content/48">Topluluk Uyesi</p>
                <h2 className="mt-1 text-4xl font-black leading-[0.95]">{publicProfile.displayName}</h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-base-content/12 bg-base-100/18 p-4">
                  <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-base-content/48">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    Takipci
                  </p>
                  <p className="mt-2 text-2xl font-black">{publicProfile.followersCount}</p>
                </div>
                <div className="rounded-2xl border border-base-content/12 bg-base-100/18 p-4">
                  <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-base-content/48">
                    <UserRound className="h-3.5 w-3.5 text-primary" />
                    Takip
                  </p>
                  <p className="mt-2 text-2xl font-black">{publicProfile.followingCount}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-primary/15 bg-gradient-to-r from-base-100/24 via-base-100/16 to-primary/8 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-base-content/48">Biyografi</p>
                <p className="mt-3 text-sm leading-relaxed text-base-content/78">
                  {publicProfile.bio?.trim() || "Bu kullanici henuz biyografi eklemedi."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {sessionProfile ? (
                  publicProfile.isAuthor ? (
                    <button
                      type="button"
                      onClick={() => void handleFollowToggle()}
                      disabled={isFollowSubmitting}
                      className={`btn rounded-full px-6 ${publicProfile.isFollowing ? "btn-outline" : "btn-primary"}`}
                    >
                      {isFollowSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : publicProfile.isFollowing ? (
                        <UserX className="h-4 w-4" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                      {publicProfile.isFollowing ? "Takibi Birak" : "Takip Et"}
                    </button>
                  ) : (
                    <div className="tooltip tooltip-bottom" data-tip="Sadece yazarları takip edebilirsiniz.">
                      <button disabled className="btn btn-disabled rounded-full px-6 opacity-60">
                         <UserPlus className="h-4 w-4" /> Takip Edilemez
                      </button>
                    </div>
                  )
                ) : (
                  <Link href="/login" className="btn btn-primary rounded-full px-6">
                    Takip icin giris yap
                  </Link>
                )}

                <Link href="/community" className="btn rounded-full border border-base-content/12 bg-base-100/24 px-6 hover:bg-base-100/34">
                  Topluluga Don
                </Link>
              </div>

              {publicProfile.isFollowing ? (
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-success">
                  <Check className="h-4 w-4" />
                  Bu kullaniciyi takip ediyorsun.
                </p>
              ) : null}

              {message ? <p className="text-sm font-medium text-success">{message}</p> : null}
            </div>
            </section>

            {publicProfile.isAuthor ? (
              <section className="glass-frame border border-base-content/12 bg-base-100/24 p-6 sm:p-8">
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-base-content/48">
                <BookOpenText className="h-3.5 w-3.5 text-primary" />
                Yazarin Eserleri
              </p>

              {isBooksLoading ? (
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-base-content/12 bg-base-100/20 p-4">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Eserler yukleniyor...
                </div>
              ) : authorBooks.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-base-content/18 bg-base-100/20 p-4 text-sm text-base-content/68">
                  Bu yazar icin listelenecek yayinlanmis eser bulunamadi.
                </div>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {authorBooks.map((book) => (
                    <Link
                      key={book.slug}
                      href={`/Books/${book.slug}`}
                      className="rounded-2xl border border-base-content/12 bg-base-100/18 p-4 no-underline transition hover:border-primary/30 hover:bg-base-100/28"
                    >
                      <p className="line-clamp-1 text-base font-black text-base-content">{book.title}</p>
                      <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-relaxed text-base-content/70">
                        {book.description || "Aciliklama bulunmuyor."}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
              </section>
            ) : null}
          </>
        ) : (
          <section className="glass-frame p-6">Public profil bulunamadi.</section>
        )}
      </div>
    </main>
  );
}
