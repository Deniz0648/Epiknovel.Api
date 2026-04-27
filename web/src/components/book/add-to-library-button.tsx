"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Check,
  ChevronDown,
  Loader2,
  BookOpen,
  Clock,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Trash2
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { useAuth } from "@/components/providers/auth-provider";

type LibraryStatus = "Reading" | "Completed" | "Dropped" | "PlanToRead" | "OnHold" | "Archived" | null;

interface AddToLibraryButtonProps {
  bookId: string;
  bookStatus?: string; // Kitabın genel durumu (Ongoing, Completed vb.)
  className?: string;
}

export function AddToLibraryButton({ bookId, bookStatus, className }: AddToLibraryButtonProps) {
  const { profile, isLoading: isAuthLoading } = useAuth();
  const [libraryEntryId, setLibraryEntryId] = useState<string | null>(null);
  const [libraryStatus, setLibraryStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const getStatusText = (status: any) => {
    if (status === 0 || status === "Reading") return "Okuyorum";
    if (status === 1 || status === "Completed") return "Tamamlandı";
    if (status === 2 || status === "Dropped") return "Bırakıldı";
    if (status === 3 || status === "PlanToRead") return "Okuyacağım";
    if (status === 4 || status === "OnHold") return "Beklemede";
    if (status === 5 || status === "Archived") return "Arşiv";
    return status?.toString() || "Kütüphanede";
  };

  const checkLibraryStatus = async () => {
    if (!profile) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await apiRequest<{
        isAdded: boolean;
        libraryItem?: { id: string; status: any; Id?: string; Status?: any }
      } | null>(`/social/library/check/${bookId}`);

      const isAdded = res?.isAdded ?? (res as any)?.IsAdded;

      if (isAdded && res) {
        const libItem = res.libraryItem ?? (res as any).LibraryItem;
        if (libItem) {
          setLibraryEntryId(libItem.id || libItem.Id || null);
          const statusVal = libItem.status !== undefined ? libItem.status : libItem.Status;
          setLibraryStatus(getStatusText(statusVal));
        } else {
          setLibraryEntryId(null);
          setLibraryStatus(null);
        }
      } else {
        setLibraryEntryId(null);
        setLibraryStatus(null);
      }
    } catch (err) {
      console.error("Kutuphane durumu alinamadı:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (bookId && !isAuthLoading) {
      checkLibraryStatus();
    }
  }, [bookId, profile, isAuthLoading]);

  const handleLibraryAction = async (targetStatus?: number) => {
    if (!profile) {
      showToast({
        title: "Giriş Yapmalısınız",
        description: "Kütüphane işlemleri için lütfen giriş yapın.",
        tone: "error",
      });
      return;
    }

    try {
      setIsActionLoading(true);

      // 1️⃣ Kütüphaneden Çıkarma
      if (libraryEntryId && targetStatus === undefined) {
        await apiRequest(`/social/library/${libraryEntryId}`, { method: "DELETE" });
        setLibraryEntryId(null);
        setLibraryStatus(null);
        showToast({
          title: "Kütüphaneden Çıkarıldı",
          description: "Kitap okuma listenizden kaldırıldı.",
          tone: "success",
        });
        return;
      }

      // 🛑 AKILLI KONTROL: Devam eden eser tamamlandı işaretlenemez.
      const isBookOngoing = bookStatus === "Ongoing" || bookStatus === "Devam Ediyor";
      if (targetStatus === 1 && isBookOngoing) {
        showToast({
          title: "Geçersiz İşlem",
          description: "Devam eden bir eseri 'Tamamlandı' olarak işaretleyemezsiniz.",
          tone: "error",
        });
        return;
      }

      // 2️⃣ Durum Güncelleme
      if (libraryEntryId && targetStatus !== undefined) {
        await apiRequest(`/social/library/${libraryEntryId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: targetStatus }),
        });
        setLibraryStatus(getStatusText(targetStatus));
        showToast({
          title: "Durum Güncellendi",
          description: `Okuma durumunuz "${getStatusText(targetStatus)}" olarak güncellendi.`,
          tone: "success",
        });
        return;
      }

      // 3️⃣ Kütüphaneye Ekleme
      if (!libraryEntryId) {
        if (targetStatus === undefined) return;

        const response = await apiRequest<{ id?: string; Id?: string; status?: any; Status?: any }>("/social/library", {
          method: "POST",
          body: JSON.stringify({
            bookId: bookId,
            status: targetStatus
          }),
        });

        const newId = response.id || response.Id;
        const statusVal = response.status !== undefined ? response.status : response.Status;

        setLibraryEntryId(newId || null);
        setLibraryStatus(getStatusText(statusVal));

        showToast({
          title: "Kütüphaneye Eklendi",
          description: `Kitap "${getStatusText(statusVal)}" olarak listenize eklendi.`,
          tone: "success",
        });
      }
    } catch (err: any) {
      if (err.message?.includes("zaten kütüphanenizde")) {
        await checkLibraryStatus();
      } else {
        showToast({
          title: "Hata",
          description: err.message || "İşlem gerçekleştirilemedi.",
          tone: "error",
        });
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className={`dropdown dropdown-end ${className}`}>
      <div
        tabIndex={0}
        role="button"
        className={`flex h-12 w-full items-center justify-between rounded-2xl border px-6 transition-all duration-500 shadow-sm ${libraryEntryId
            ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 shadow-primary/5"
            : "border-base-content/15 bg-base-100/30 hover:bg-base-100/50 hover:border-base-content/25"
          } ${isLoading || isActionLoading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <div className="flex items-center gap-3">
          {isLoading || isActionLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : libraryEntryId ? (
            <div className="flex items-center justify-center h-6 w-6 rounded-lg bg-primary/20">
              <Check className="h-3.5 w-3.5 stroke-3" />
            </div>
          ) : (
            <Plus className="h-4 w-4 opacity-70" />
          )}

          <span className="font-bold tracking-tight">
            {libraryEntryId ? libraryStatus : "Kütüphaneye Ekle"}
          </span>
        </div>

        <ChevronDown className="h-4 w-4 opacity-30 group-hover:opacity-100 transition-opacity" />
      </div>

      <ul tabIndex={0} className="dropdown-content z-100 menu p-2 shadow-2xl bg-base-200/95 border border-base-content/10 rounded-2xl w-full mt-2 font-semibold backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
        <li className="menu-title text-[9px] font-black uppercase tracking-[0.15em] opacity-40 px-3 py-2">DURUMU GÜNCELLE</li>

        <li>
          <button onClick={() => handleLibraryAction(0)} className="hover:bg-primary/10 py-3 rounded-xl flex items-center gap-3 group">
            <BookOpen className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
            <span>Okuyorum</span>
          </button>
        </li>
        <li>
          <button onClick={() => handleLibraryAction(3)} className="hover:bg-primary/10 py-3 rounded-xl flex items-center gap-3 group">
            <Clock className="h-4 w-4 text-amber-500 group-hover:rotate-12 transition-transform" />
            <span>Okuyacağım</span>
          </button>
        </li>
        <li>
          <button onClick={() => handleLibraryAction(1)} className="hover:bg-primary/10 py-3 rounded-xl flex items-center gap-3 group">
            <CheckCircle2 className="h-4 w-4 text-green-500 group-hover:scale-110 transition-transform" />
            <span>Tamamlandı</span>
          </button>
        </li>
        <li>
          <button onClick={() => handleLibraryAction(4)} className="hover:bg-primary/10 py-3 rounded-xl flex items-center gap-3 group">
            <PauseCircle className="h-4 w-4 text-zinc-400 group-hover:scale-110 transition-transform" />
            <span>Beklemede</span>
          </button>
        </li>
        <li>
          <button onClick={() => handleLibraryAction(2)} className="hover:bg-primary/10 py-3 rounded-xl flex items-center gap-3 group">
            <XCircle className="h-4 w-4 text-red-400 group-hover:scale-110 transition-transform" />
            <span>Bıraktım</span>
          </button>
        </li>

        {libraryEntryId && (
          <>
            <div className="divider mx-3 my-1 opacity-10"></div>
            <li>
              <button
                onClick={() => handleLibraryAction()}
                className="bg-error/5 text-error hover:bg-error/15 py-3 rounded-xl flex items-center gap-3 group transition-all"
              >
                <Trash2 className="h-4 w-4 group-hover:shake" />
                <span>Kütüphaneden Kaldır</span>
              </button>
            </li>
          </>
        )}
      </ul>
    </div>
  );
}
