"use client";

import { useEffect, useState } from "react";
import { Bell, Mail, Smartphone, ShieldCheck, Loader2 } from "lucide-react";
import { getMyNotificationPreferences, updateMyNotificationPreferences, type NotificationPreference } from "@/lib/auth";

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const result = await getMyNotificationPreferences();
        setPreferences(result);
      } catch (err) {
        setError("Bildirim tercihleri yüklenemedi.");
      } finally {
        setIsLoading(false);
      }
    };
    loadPreferences();
  }, []);

  const handleToggle = async (key: keyof NotificationPreference) => {
    if (!preferences) return;

    const newValue = !preferences[key];
    const updated = { ...preferences, [key]: newValue };
    setPreferences(updated);

    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      await updateMyNotificationPreferences({ [key]: newValue });
      setMessage("Tercihleriniz güncellendi.");
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || "Güncelleme başarısız oldu.");
      // Rollback on error
      setPreferences(preferences);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-frame p-20 flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs font-black uppercase tracking-widest opacity-40">Ayarlar Yükleniyor...</p>
      </div>
    );
  }

  return (
    <article className="glass-frame p-6 sm:p-8 xl:col-span-2 relative overflow-hidden">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl opacity-50" />

      <header className="mb-10 flex items-center gap-4 border-b border-base-content/5 pb-8">
        <div className="p-4 rounded-3xl bg-primary/12 text-primary shadow-lg shadow-primary/10">
          <Bell className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">Bildirim Ayarları</h2>
          <p className="text-[10px] font-bold text-base-content/40 uppercase tracking-widest mt-2">Hangi durumlarda haber almak istediğinizi seçin</p>
        </div>
      </header>

      <div className="space-y-12">
        {/* E-posta Bildirimleri */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Mail className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary/80">E-posta Bildirimleri</h3>
          </div>

          <div className="grid gap-4">
            <PreferenceItem
              title="Yeni Bölümler"
              description="Takip ettiğiniz kitaplara yeni bölüm eklendiğinde haber ver."
              checked={preferences?.emailOnNewChapter ?? true}
              onChange={() => handleToggle("emailOnNewChapter")}
              disabled={isSubmitting}
            />
            <PreferenceItem
              title="Yeni İncelemeler"
              description="Kitaplarınıza yeni bir inceleme yazıldığında haber ver."
              checked={preferences?.emailOnNewReview ?? true}
              onChange={() => handleToggle("emailOnNewReview")}
              disabled={isSubmitting}
            />
            <PreferenceItem
              title="Yeni Yorumlar"
              description="Yorumlarınıza yanıt geldiğinde veya kitabınıza yorum yapıldığında haber ver."
              checked={preferences?.emailOnNewComment ?? true}
              onChange={() => handleToggle("emailOnNewComment")}
              disabled={isSubmitting}
            />
          </div>
        </section>

        {/* Push Bildirimleri */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Smartphone className="w-4 h-4 text-secondary" />
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-secondary/80">Uygulama Bildirimleri (Push)</h3>
          </div>

          <div className="grid gap-4">
            <PreferenceItem
              title="Yeni Bölümler"
              description="Yeni bölümler için anlık bildirim gönder."
              checked={preferences?.pushOnNewChapter ?? true}
              onChange={() => handleToggle("pushOnNewChapter")}
              disabled={isSubmitting}
              color="secondary"
            />
            <PreferenceItem
              title="Yeni İncelemeler"
              description="Yeni incelemeler için anlık bildirim gönder."
              checked={preferences?.pushOnNewReview ?? true}
              onChange={() => handleToggle("pushOnNewReview")}
              disabled={isSubmitting}
              color="secondary"
            />
            <PreferenceItem
              title="Yeni Yorumlar"
              description="Yeni yorumlar ve yanıtlar için anlık bildirim gönder."
              checked={preferences?.pushOnNewComment ?? true}
              onChange={() => handleToggle("pushOnNewComment")}
              disabled={isSubmitting}
              color="secondary"
            />
          </div>
        </section>

        {/* Pazarlama */}
        <section className="pt-6 border-t border-base-content/5">
          <PreferenceItem
            title="Kampanya ve Duyurular"
            description="Özel teklifler, haftalık özetler ve platform duyuruları hakkında e-posta gönder."
            checked={preferences?.emailMarketing ?? false}
            onChange={() => handleToggle("emailMarketing")}
            disabled={isSubmitting}
            icon={<ShieldCheck className="w-5 h-5 text-success" />}
          />
        </section>
      </div>

      <footer className="mt-12 flex items-center justify-between min-h-[40px]">
        {message && <p className="text-sm font-bold text-success animate-pulse">{message}</p>}
        {error && <p className="text-sm font-bold text-error">{error}</p>}
        {isSubmitting && <div className="ml-auto flex items-center gap-2 opacity-40"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-[10px] font-black uppercase">Kaydediliyor...</span></div>}
      </footer>
    </article>
  );
}

function PreferenceItem({
  title,
  description,
  checked,
  onChange,
  disabled,
  color = "primary",
  icon
}: {
  title: string,
  description: string,
  checked: boolean,
  onChange: () => void,
  disabled?: boolean,
  color?: "primary" | "secondary",
  icon?: React.ReactNode
}) {
  return (
    <div className={`group flex items-center justify-between p-5 rounded-[1.8rem] bg-base-content/2 border border-transparent hover:border-${color}/20 transition-all duration-300`}>
      <div className="flex items-center gap-4">
        {icon && <div className="shrink-0">{icon}</div>}
        <div className="min-w-0">
          <h4 className="font-black text-lg italic leading-tight group-hover:text-base-content transition-colors">{title}</h4>
          <p className="text-[11px] font-medium text-base-content/40 mt-1 leading-relaxed max-w-md">{description}</p>
        </div>
      </div>

      <div className="form-control">
        <label className="label cursor-pointer">
          <input
            type="checkbox"
            className={`toggle toggle-lg ${color === "primary" ? "toggle-primary" : "toggle-secondary"} rounded-full border-4`}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
          />
        </label>
      </div>
    </div>
  );
}
