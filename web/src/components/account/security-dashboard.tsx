"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Mail, Monitor, Smartphone, Trash2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import {
  changeEmail,
  changePassword,
  getSessions,
  revokeAllSessions,
  revokeSession,
  type UserSession,
} from "@/lib/auth";
import { useAuth } from "@/components/providers/auth-provider";

type SecurityModal = "email" | "password" | null;

const sessionDateFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "Europe/Istanbul",
});

export function SecurityDashboard() {
  const router = useRouter();
  const { profile, isLoading, logout } = useAuth();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [sessionsMessage, setSessionsMessage] = useState<string | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [isSessionsLoading, setIsSessionsLoading] = useState(false);
  const [activeModal, setActiveModal] = useState<SecurityModal>(null);
  const [changeEmailValue, setChangeEmailValue] = useState("");
  const [changeEmailMessage, setChangeEmailMessage] = useState<string | null>(null);
  const [changeEmailError, setChangeEmailError] = useState<string | null>(null);
  const [isChangeEmailSubmitting, setIsChangeEmailSubmitting] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [changePasswordMessage, setChangePasswordMessage] = useState<string | null>(null);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [isChangePasswordSubmitting, setIsChangePasswordSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !profile) {
      router.replace("/");
    }
  }, [isLoading, profile, router]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    void loadSessions();
  }, [profile]);

  async function loadSessions() {
    setIsSessionsLoading(true);
    setSessionsError(null);

    try {
      const nextSessions = await getSessions();
      setSessions(nextSessions);
    } catch (error) {
      if (error instanceof ApiError) {
        setSessionsError(error.message);
      } else {
        setSessionsError("Oturumlar yuklenemedi.");
      }
    } finally {
      setIsSessionsLoading(false);
    }
  }

  async function handleChangeEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChangeEmailError(null);
    setChangeEmailMessage(null);
    setIsChangeEmailSubmitting(true);

    try {
      const result = await changeEmail({ newEmail: changeEmailValue.trim() });
      setChangeEmailMessage(result.message);
      setChangeEmailValue("");
      setActiveModal(null);
    } catch (error) {
      if (error instanceof ApiError) {
        setChangeEmailError(error.message);
      } else {
        setChangeEmailError("E-posta degistirme talebi gonderilemedi.");
      }
    } finally {
      setIsChangeEmailSubmitting(false);
    }
  }

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChangePasswordError(null);
    setChangePasswordMessage(null);

    if (newPassword !== repeatPassword) {
      setChangePasswordError("Yeni sifre alanlari ayni olmali.");
      return;
    }

    setIsChangePasswordSubmitting(true);

    try {
      const result = await changePassword({ currentPassword, newPassword });
      setChangePasswordMessage(result.message);
      setCurrentPassword("");
      setNewPassword("");
      setRepeatPassword("");
      setActiveModal(null);
    } catch (error) {
      if (error instanceof ApiError) {
        setChangePasswordError(error.message);
      } else {
        setChangePasswordError("Sifre degistirilemedi.");
      }
    } finally {
      setIsChangePasswordSubmitting(false);
    }
  }

  async function handleRevokeSession(sessionId: string) {
    setSessionsError(null);
    setSessionsMessage(null);

    const session = sessions.find((s) => s.sessionId === sessionId);
    const isRevokingCurrent = (session as any)?.isCurrent === true || (session as any)?.IsCurrent === true;

    try {
      const result = await revokeSession(sessionId);
      
      if (isRevokingCurrent) {
        await logout();
        window.location.href = "/";
        return;
      }

      setSessions((current) => current.filter((session) => session.sessionId !== sessionId));
      setSessionsMessage(result.message);
    } catch (error) {
      if (error instanceof ApiError) {
        setSessionsError(error.message);
      } else {
        setSessionsError("Oturum kapatilamadi.");
      }
    }
  }

  async function handleRevokeAllSessions() {
    setSessionsError(null);
    setSessionsMessage(null);

    try {
      const result = await revokeAllSessions();
      setSessions([]);
      setSessionsMessage(result.message);
      await logout();
      window.location.href = "/";
    } catch (error) {
      if (error instanceof ApiError) {
        setSessionsError(error.message);
      } else {
        setSessionsError("Tum oturumlar kapatilamadi.");
      }
    }
  }

  if (isLoading) {
    return <div className="glass-frame p-6">Yukleniyor...</div>;
  }

  if (!profile) {
    return (
      <div className="glass-frame p-6 text-center">
        <p className="text-base font-semibold text-base-content/75">Bu alana erismek icin giris yapman gerekiyor.</p>
        <Link href="/login" className="btn btn-primary mt-4 rounded-full px-6">
          Giris Yap
        </Link>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)]">
        <article className="glass-frame relative overflow-hidden border border-base-content/12 bg-gradient-to-br from-base-100/90 via-base-100/84 to-primary/8 p-5 shadow-lg shadow-primary/8 sm:p-6">
          <div className="pointer-events-none absolute -left-12 top-6 h-32 w-32 rounded-full bg-primary/12 blur-3xl" />
          <div className="relative z-10">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-base-content/45">Guvenlik Katmani</p>
            <h2 className="mt-2 text-2xl font-black">Kimlik ve Erisim</h2>
            <p className="mt-2 text-sm leading-relaxed text-base-content/68">
              Sifre, e-posta ve oturumlarini tek merkezden yonet. Her aksiyon audit izi ile identity servisinden geciyor.
            </p>

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={() => setActiveModal("email")}
                className="btn btn-primary justify-start rounded-[1.3rem] border-0 px-5 shadow-lg shadow-primary/25"
              >
                <Mail className="h-4 w-4" />
                E-posta Degistir
              </button>
              <button
                type="button"
                onClick={() => setActiveModal("password")}
                className="btn justify-start rounded-[1.3rem] border border-base-content/12 bg-base-100/24 px-5 hover:bg-base-100/34"
              >
                <KeyRound className="h-4 w-4" />
                Sifre Degistir
              </button>
            </div>

            {changeEmailMessage ? <p className="mt-4 text-sm font-medium text-success">{changeEmailMessage}</p> : null}
            {changePasswordMessage ? <p className="mt-2 text-sm font-medium text-success">{changePasswordMessage}</p> : null}
          </div>
        </article>

        <article className="glass-frame relative overflow-hidden border border-base-content/12 bg-gradient-to-br from-base-100/90 via-base-100/84 to-secondary/7 p-5 shadow-lg shadow-secondary/8 sm:p-6">
          <div className="pointer-events-none absolute -right-14 top-4 h-28 w-28 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-base-content/45">Session Kontrolu</p>
              <h2 className="mt-2 text-2xl font-black">Aktif Oturumlar</h2>
              <p className="mt-2 text-sm text-base-content/65">Tarayici, cihaz ve IP izlerini bu panelden temizleyebilirsin.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => void loadSessions()} className="btn rounded-full border border-base-content/12 bg-base-100/24 px-4 hover:bg-base-100/36">
                Yenile
              </button>
              <button type="button" onClick={() => void handleRevokeAllSessions()} className="btn btn-error rounded-full border-0 px-4 shadow-lg shadow-error/25">
                Tumunu Kapat
              </button>
            </div>
          </div>

          {sessionsError ? <p className="mt-4 text-sm font-medium text-error">{sessionsError}</p> : null}
          {sessionsMessage ? <p className="mt-4 text-sm font-medium text-success">{sessionsMessage}</p> : null}

          <div className="mt-5 space-y-3">
            {isSessionsLoading ? <div className="rounded-[1.4rem] border border-base-content/12 bg-base-100/16 p-4">Oturumlar yukleniyor...</div> : null}
            {!isSessionsLoading && sessions.length === 0 ? (
              <div className="rounded-[1.4rem] border border-dashed border-base-content/18 bg-base-100/12 p-5 text-sm text-base-content/65">
                Aktif ek oturum bulunamadi.
              </div>
            ) : null}
            {sessions.map((session) => {
              const deviceName = session.device || "Bilinmeyen Cihaz";
              const isCurrent = (session as any).isCurrent === true || (session as any).IsCurrent === true;
              const isMobile = deviceName.toLowerCase().includes("mobil");
              
              return (
                <div 
                  key={session.sessionId} 
                  className={`group relative rounded-[1.8rem] border p-4 transition-all duration-300 backdrop-blur-md overflow-hidden ${
                    isCurrent 
                      ? 'border-primary/40 bg-gradient-to-br from-primary/15 to-transparent ring-1 ring-primary/20 shadow-xl shadow-primary/5' 
                      : 'border-base-content/8 bg-base-100/30 hover:border-base-content/15 hover:bg-base-100/40'
                  }`}
                >
                  {/* Dekoratif Arkaplan Glow (Sadece Aktif Oturum İçin) */}
                  {isCurrent && (
                    <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/15 blur-2xl transition-all group-hover:bg-primary/25" />
                  )}

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                      {/* Platform Ikonu */}
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105 ${
                        isCurrent ? 'bg-primary text-primary-content shadow-lg shadow-primary/25' : 'bg-base-content/8 text-base-content/70'
                      }`}>
                        {isMobile ? <Smartphone className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-black tracking-tight text-base-content sm:text-base">
                            {deviceName}
                          </h4>
                          {isCurrent && (
                             <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-primary ring-1 ring-primary/20">
                               <span className="relative flex h-1.5 w-1.5">
                                 <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                                 <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary"></span>
                               </span>
                               Bu Cihaz
                             </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <p className="flex items-center gap-1.5 text-xs font-medium text-base-content/60">
                            <span className="h-1 w-1 rounded-full bg-base-content/30" />
                            {session.ipAddress || "0.0.0.0"}
                          </p>
                          <p className="flex items-center gap-1.5 text-xs text-base-content/50">
                            {sessionDateFormatter.format(new Date(session.createdAt))}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => void handleRevokeSession(session.sessionId)}
                        className={`btn btn-sm h-10 rounded-2xl border-0 px-4 font-bold shadow-sm transition-all active:scale-95 ${
                          isCurrent 
                            ? 'btn-primary shadow-lg shadow-primary/20' 
                            : 'bg-base-content/5 text-base-content/50 hover:bg-error/15 hover:text-error'
                        }`}
                      >
                        <Trash2 className="h-4 w-4" />
                        {isCurrent ? "Oturumu Sonlandir" : "Kapat"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </div>

      {activeModal === "email" ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-base-content/38 p-4 backdrop-blur-md">
          <div className="glass-frame w-full max-w-xl p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-base-content/45">E-posta Akisi</p>
                <h3 className="mt-2 text-2xl font-black">Yeni E-posta Tanimla</h3>
              </div>
              <button type="button" onClick={() => setActiveModal(null)} className="btn btn-ghost btn-sm rounded-full px-4">
                Kapat
              </button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleChangeEmail}>
              <input
                type="email"
                value={changeEmailValue}
                onChange={(event) => setChangeEmailValue(event.target.value)}
                placeholder="yeni@mail.com"
                autoComplete="email"
                required
                className="input input-bordered h-12 w-full rounded-2xl border-base-content/18 bg-base-100/28"
              />
              {changeEmailError ? <p className="text-sm font-medium text-error">{changeEmailError}</p> : null}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setActiveModal(null)} className="btn rounded-full px-5">
                  Iptal
                </button>
                <button type="submit" disabled={isChangeEmailSubmitting} className="btn btn-primary rounded-full px-6">
                  {isChangeEmailSubmitting ? "Gonderiliyor" : "Onay Baglantisi Gonder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {activeModal === "password" ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-base-content/38 p-4 backdrop-blur-md">
          <div className="glass-frame w-full max-w-xl p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-base-content/45">Sifre Akisi</p>
                <h3 className="mt-2 text-2xl font-black">Sifreni Guncelle</h3>
              </div>
              <button type="button" onClick={() => setActiveModal(null)} className="btn btn-ghost btn-sm rounded-full px-4">
                Kapat
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleChangePassword}>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Mevcut sifre"
                autoComplete="current-password"
                required
                className="input input-bordered h-12 w-full rounded-2xl border-base-content/18 bg-base-100/28"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Yeni sifre"
                autoComplete="new-password"
                required
                className="input input-bordered h-12 w-full rounded-2xl border-base-content/18 bg-base-100/28"
              />
              <input
                type="password"
                value={repeatPassword}
                onChange={(event) => setRepeatPassword(event.target.value)}
                placeholder="Yeni sifre tekrar"
                autoComplete="new-password"
                required
                className="input input-bordered h-12 w-full rounded-2xl border-base-content/18 bg-base-100/28"
              />
              {changePasswordError ? <p className="text-sm font-medium text-error">{changePasswordError}</p> : null}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setActiveModal(null)} className="btn rounded-full px-5">
                  Iptal
                </button>
                <button type="submit" disabled={isChangePasswordSubmitting} className="btn btn-primary rounded-full px-6">
                  {isChangePasswordSubmitting ? "Guncelleniyor" : "Sifreyi Guncelle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
