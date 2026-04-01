"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, BookOpenText, Camera, MailCheck, PencilLine, Quote, Shield, Sparkles, UserPlus2, Users, UserRound } from "lucide-react";
import { ApiError } from "@/lib/api";
import { resendConfirmEmail, updateMyAvatar, updateMyUserProfile } from "@/lib/auth";
import { AvatarCropperModal } from "@/components/account/avatar-cropper-modal";
import { SecurityDashboard } from "@/components/account/security-dashboard";
import { useAuth } from "@/components/providers/auth-provider";

type ProfileTab = "profile" | "security";

function withCacheBust(url: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${Date.now()}`;
}

export function ProfileDashboard() {
  const router = useRouter();
  const { profile, isLoading, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [confirmEmailMessage, setConfirmEmailMessage] = useState<string | null>(null);
  const [confirmEmailError, setConfirmEmailError] = useState<string | null>(null);
  const [isConfirmEmailSubmitting, setIsConfirmEmailSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !profile) {
      router.replace("/");
    }
  }, [isLoading, profile, router]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setDisplayName(profile.displayName);
    setBio(profile.bio ?? "");
  }, [profile]);

  useEffect(() => {
    if (!avatarPreviewUrl || !profile?.avatarUrl) {
      return;
    }

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const probeRemoteAvatar = () => {
      const image = new Image();

      image.onload = () => {
        if (cancelled) {
          return;
        }

        setAvatarPreviewUrl((current) => {
          if (current?.startsWith("blob:")) {
            URL.revokeObjectURL(current);
          }
          return null;
        });
      };

      image.onerror = () => {
        if (cancelled) {
          return;
        }

        retryTimer = setTimeout(probeRemoteAvatar, 800);
      };

      image.src = profile.avatarUrl!;
    };

    probeRemoteAvatar();

    return () => {
      cancelled = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [avatarPreviewUrl, profile?.avatarUrl]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncTabWithHash = () => {
      setActiveTab(window.location.hash === "#security" ? "security" : "profile");
    };

    syncTabWithHash();
    window.addEventListener("hashchange", syncTabWithHash);

    return () => window.removeEventListener("hashchange", syncTabWithHash);
  }, []);

  function switchTab(tab: ProfileTab) {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", tab === "security" ? "#security" : "#profile");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const result = await updateMyUserProfile({
        displayName: displayName.trim(),
        bio: bio.trim() || null,
      });
      setMessage(result.message);
      await refreshProfile();
      setIsEditModalOpen(false);
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
      } else {
        setError("Profil bilgileri guncellenemedi.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setAvatarError(null);
    setAvatarMessage(null);

    if (!file) {
      return;
    }

    setAvatarFile(file);
  }

  async function handleAvatarUpload(file: File) {
    const nextPreviewUrl = URL.createObjectURL(file);
    setAvatarPreviewUrl((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return nextPreviewUrl;
    });
    setIsAvatarUploading(true);

    try {
      const result = await updateMyAvatar(file);
      const refreshedAvatarUrl = result.avatarUrl ? withCacheBust(result.avatarUrl) : null;
      setAvatarMessage(result.message);
      await refreshProfile((nextProfile) => ({
        ...nextProfile,
        avatarUrl: refreshedAvatarUrl ?? nextProfile.avatarUrl,
      }));
      setAvatarPreviewUrl((current) => {
        if (current?.startsWith("blob:")) {
          URL.revokeObjectURL(current);
        }
        return refreshedAvatarUrl;
      });
      setAvatarFile(null);
    } catch (uploadError) {
      if (uploadError instanceof ApiError) {
        setAvatarError(uploadError.message);
      } else {
        setAvatarError("Avatar yuklenemedi.");
      }
    } finally {
      setIsAvatarUploading(false);
    }
  }

  async function handleResendConfirmEmail() {
    setConfirmEmailError(null);
    setConfirmEmailMessage(null);
    setIsConfirmEmailSubmitting(true);

    try {
      const result = await resendConfirmEmail();
      setConfirmEmailMessage(result.message);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setConfirmEmailError(requestError.message);
      } else {
        setConfirmEmailError("Onay baglantisi gonderilemedi.");
      }
    } finally {
      setIsConfirmEmailSubmitting(false);
    }
  }

  if (isLoading) {
    return <div className="glass-frame p-6">Yukleniyor...</div>;
  }

  if (!profile) {
    return (
      <div className="glass-frame p-6 text-center">
        <p className="text-base font-semibold text-base-content/75">Profil sayfasini gormek icin giris yapman gerekiyor.</p>
        <Link href="/login" className="btn btn-primary mt-4 rounded-full px-6">
          Giris Yap
        </Link>
      </div>
    );
  }

  const listedWorks = 0;
  const followingCount = profile.followingCount;
  const followerCount = profile.followersCount;

  return (
    <section className="space-y-7">
      {!profile.emailConfirmed ? (
        <article className="glass-frame relative overflow-hidden border border-warning/25 bg-warning/8 p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-warning/18 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-warning">
                <AlertTriangle className="h-3.5 w-3.5" />
                Hesap Durumu
              </p>
              <h2 className="mt-2 text-2xl font-black">Hesabiniz onaylanmadi</h2>
              <p className="mt-2 text-sm leading-relaxed text-base-content/72">
                E-posta dogrulamasini tamamlamadan bazi akislarda kisitlarla karsilasabilirsin. Yeni bir onay baglantisi alip
                dogrulamayi tamamla.
              </p>
            </div>

            <div className="flex flex-col items-start gap-2">
              <button
                type="button"
                onClick={() => void handleResendConfirmEmail()}
                disabled={isConfirmEmailSubmitting}
                className="btn btn-warning rounded-full px-6 text-warning-content"
              >
                <MailCheck className="h-4 w-4" />
                {isConfirmEmailSubmitting ? "Gonderiliyor" : "Onay Baglantisi Al"}
              </button>
              {confirmEmailError ? <p className="text-sm font-medium text-error">{confirmEmailError}</p> : null}
              {confirmEmailMessage ? <p className="text-sm font-medium text-success">{confirmEmailMessage}</p> : null}
            </div>
          </div>
        </article>
      ) : null}

      <article className="glass-frame relative overflow-hidden border border-primary/20 bg-gradient-to-br from-base-100/92 via-base-100/85 to-primary/8 p-5 shadow-2xl shadow-primary/10 sm:p-7">
        <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-primary/18 blur-3xl" />
        <div className="pointer-events-none absolute -right-12 bottom-0 h-44 w-44 rounded-full bg-secondary/18 blur-3xl" />

        <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] xl:items-start">
          <div className="flex flex-col items-center gap-4 rounded-[1.9rem] border border-base-content/12 bg-base-100/20 p-5 text-center xl:items-start xl:text-left">
            <div className="relative">
              <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-br from-primary/45 via-secondary/30 to-transparent blur-md" />
              {avatarPreviewUrl || profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreviewUrl ?? profile.avatarUrl ?? ""}
                  alt={profile.displayName}
                  className="relative h-32 w-32 rounded-[2.2rem] border border-base-100/70 object-cover shadow-2xl shadow-primary/20 sm:h-36 sm:w-36"
                />
              ) : (
                <span className="relative inline-flex h-32 w-32 items-center justify-center rounded-[2.2rem] border border-base-100/70 bg-base-100/24 text-4xl font-black text-primary sm:h-36 sm:w-36">
                  {profile.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-base-content/50">Yazar Kartin</p>
              <h1 className="mt-2 truncate text-[clamp(2rem,4vw,3.5rem)] font-black leading-[0.94]">{profile.displayName}</h1>
              <p className="mt-2 text-sm text-base-content/68">
                {followerCount} takipci • {followingCount} takip
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.5rem] border border-base-content/12 bg-base-100/20 p-4 backdrop-blur-sm">
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-base-content/50">
                <BookOpenText className="h-3.5 w-3.5 text-primary" />
                Eser
              </p>
              <p className="mt-3 text-3xl font-black">{listedWorks}</p>
              <p className="mt-1 text-sm text-base-content/66">toplam eser</p>
            </div>

            <div className="rounded-[1.5rem] border border-base-content/12 bg-base-100/20 p-4 backdrop-blur-sm">
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-base-content/50">
                <UserPlus2 className="h-3.5 w-3.5 text-primary" />
                Takip
              </p>
              <p className="mt-3 text-3xl font-black">{followingCount}</p>
              <p className="mt-1 text-sm text-base-content/66">takip ettigin yazar</p>
            </div>

            <div className="rounded-[1.5rem] border border-base-content/12 bg-base-100/20 p-4 backdrop-blur-sm">
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-base-content/50">
                <Users className="h-3.5 w-3.5 text-primary" />
                Takipci
              </p>
              <p className="mt-3 text-3xl font-black">{followerCount}</p>
              <p className="mt-1 text-sm text-base-content/66">seni takip eden okur</p>
            </div>

            <div className="sm:col-span-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="btn btn-primary rounded-full border-0 px-6 shadow-lg shadow-primary/28"
              >
                <PencilLine className="h-4 w-4" />
                Profili Duzenle
              </button>

              <label className="btn rounded-full border border-base-content/12 bg-base-100/24 px-6 hover:bg-base-100/34">
                <Camera className="h-4 w-4" />
                {isAvatarUploading ? "Yukleniyor" : "Avatar Guncelle"}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={isAvatarUploading} />
              </label>

              <button
                type="button"
                onClick={() => switchTab("security")}
                className="btn rounded-full border border-base-content/12 bg-base-100/24 px-6 hover:bg-base-100/34"
              >
                <Shield className="h-4 w-4" />
                Guvenlige Git
              </button>
            </div>

            <div className="sm:col-span-3 rounded-[1.6rem] border border-primary/15 bg-gradient-to-r from-base-100/26 via-base-100/18 to-primary/8 p-4">
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-base-content/48">
                <Quote className="h-3.5 w-3.5 text-primary" />
                Profil Notu
              </p>
              <p className="mt-3 text-base leading-relaxed text-base-content/78">
                {profile.bio?.trim() || "Hikayenin baslangic satirlarini henuz buraya birakmadin."}
              </p>
            </div>

            {avatarError ? <p className="sm:col-span-3 text-sm font-medium text-error">{avatarError}</p> : null}
            {avatarMessage ? <p className="sm:col-span-3 text-sm font-medium text-success">{avatarMessage}</p> : null}
            {message ? <p className="sm:col-span-3 text-sm font-medium text-success">{message}</p> : null}
          </div>
        </div>
      </article>

      <div className="glass-frame border border-base-content/12 bg-base-100/18 p-2 shadow-lg shadow-base-content/6">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => switchTab("profile")}
            className={`btn rounded-full px-5 ${activeTab === "profile" ? "btn-primary" : "bg-base-100/20"}`}
          >
            <UserRound className="h-4 w-4" />
            Profil
          </button>
          <button
            type="button"
            onClick={() => switchTab("security")}
            className={`btn rounded-full px-5 ${activeTab === "security" ? "btn-primary" : "bg-base-100/20"}`}
          >
            <Shield className="h-4 w-4" />
            Guvenlik
          </button>
        </div>
      </div>

      {activeTab === "profile" ? (
        <div id="profile" className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <article className="glass-frame p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-base-content/45">Gorunen Alanlar</p>
            <h2 className="mt-2 text-2xl font-black">Okurlarin Gorduğu Profil</h2>
            <p className="mt-2 text-sm leading-relaxed text-base-content/68">
              Bu alan, halka acik profil dilini ve kimlik izlenimini toplar. Biyografin, avatarin ve gorunen adin
              buradan yonetilir.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-base-content/12 bg-base-100/14 p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-base-content/45">Gorunen Ad</p>
                <p className="mt-3 text-xl font-black">{profile.displayName}</p>
              </div>
              <div className="rounded-[1.5rem] border border-base-content/12 bg-base-100/14 p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-base-content/45">Biyografi</p>
                <p className="mt-3 text-sm leading-relaxed text-base-content/74">
                  {profile.bio?.trim() || "Henüz biyografi eklenmedi."}
                </p>
              </div>
            </div>
          </article>

          <article className="glass-frame relative overflow-hidden p-5 sm:p-6">
            <div className="pointer-events-none absolute -right-12 bottom-0 h-32 w-32 rounded-full bg-primary/12 blur-3xl" />
            <div className="relative z-10">
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-base-content/45">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Profil Ritimleri
              </p>
              <h2 className="mt-2 text-2xl font-black">Hizli Aksiyonlar</h2>
              <div className="mt-5 grid gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(true)} className="btn btn-primary justify-start rounded-[1.3rem] px-5">
                  <PencilLine className="h-4 w-4" />
                  Gorunen bilgileri duzenle
                </button>
                <label className="btn justify-start rounded-[1.3rem] px-5">
                  <Camera className="h-4 w-4" />
                  Avatar yukle veya degistir
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={isAvatarUploading} />
                </label>
                <button type="button" onClick={() => switchTab("security")} className="btn justify-start rounded-[1.3rem] px-5">
                  <Shield className="h-4 w-4" />
                  Guvenlik sekmesine gec
                </button>
              </div>
            </div>
          </article>
        </div>
      ) : (
        <div id="security" className="scroll-mt-32">
          <SecurityDashboard />
        </div>
      )}

      {avatarFile ? (
        <AvatarCropperModal
          file={avatarFile}
          isSubmitting={isAvatarUploading}
          onCancel={() => {
            if (!isAvatarUploading) {
              setAvatarFile(null);
            }
          }}
          onConfirm={handleAvatarUpload}
        />
      ) : null}

      {isEditModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-base-content/38 p-4 backdrop-blur-md">
          <div className="glass-frame w-full max-w-2xl p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-base-content/45">Profil Duzenleme</p>
                <h2 className="mt-2 text-2xl font-black">Gorunen Bilgileri Guncelle</h2>
              </div>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-ghost btn-sm rounded-full px-4">
                Kapat
              </button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <label className="form-control w-full">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-base-content/55">
                  Gorunen Ad
                </span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="input input-bordered h-12 w-full rounded-2xl border-base-content/18 bg-base-100/28"
                  required
                />
              </label>

              <label className="form-control w-full">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-base-content/55">
                  Biyografi
                </span>
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  rows={6}
                  maxLength={280}
                  className="textarea textarea-bordered min-h-40 w-full rounded-2xl border-base-content/18 bg-base-100/28"
                  placeholder="Okurlara kendinden kisaca bahset."
                />
              </label>

              {error ? <p className="text-sm font-medium text-error">{error}</p> : null}

              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-base-content/60">{bio.length}/280 karakter</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn rounded-full px-5">
                    Iptal
                  </button>
                  <button type="submit" disabled={isSubmitting} className="btn btn-primary rounded-full px-6">
                    {isSubmitting ? "Kaydediliyor" : "Kaydet"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
