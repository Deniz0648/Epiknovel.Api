"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  AlertTriangle, BookOpenText, Camera, MailCheck, PencilLine, 
  Quote, Shield, Sparkles, UserPlus2, Users, UserRound, Wallet, 
  ArrowDownRight, ArrowUpRight, Clock, ChevronLeft, ChevronRight, 
  History, Loader2, Search, Download, FileText
} from "lucide-react";
import { ApiError } from "@/lib/api";
import { resendConfirmEmail, updateMyAvatar, updateMyUserProfile } from "@/lib/auth";
import { getWalletTransactions, getMyOrders, type TransactionDto, type OrderDto, OrderStatus } from "@/lib/wallet";
import { AvatarCropperModal } from "@/components/account/avatar-cropper-modal";
import { SecurityDashboard } from "@/components/account/security-dashboard";
import { useAuth } from "@/components/providers/auth-provider";

type ProfileTab = "profile" | "security" | "wallet" | "billing" | "orders";

function WalletHistory() {
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const pageSize = 12;

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      const loadTransactions = async () => {
        setIsLoading(true);
        try {
          const data = await getWalletTransactions(page, pageSize, searchQuery);
          if (isMounted) {
            setTransactions(data.items);
            setTotalCount(data.totalCount);
            setError(null);
          }
        } catch (err) {
          if (isMounted) setError("Islem gecmisi yuklenemedi.");
        } finally {
          if (isMounted) setIsLoading(false);
        }
      };
      loadTransactions();
    }, 400);

    return () => { 
      isMounted = false; 
      clearTimeout(timer);
    };
  }, [page, searchQuery]);

  const totalPages = Math.ceil(totalCount / pageSize);

  if (isLoading) return <div className="glass-frame p-10 flex flex-col items-center gap-4"><Loader2 className="w-8 h-8 animate-spin text-primary" /><p className="text-xs font-black uppercase tracking-widest opacity-40">Yukleniyor...</p></div>;
  
  if (error) return <article className="glass-frame p-6 border-error/20 bg-error/5 text-error text-center font-bold">{error}</article>;

  return (
    <article className="glass-frame relative overflow-hidden border border-primary/15 bg-gradient-to-br from-base-100/90 via-base-100/80 to-primary/5 p-6 shadow-2xl xl:col-span-2">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl opacity-50" />
      <div className="pointer-events-none absolute -left-12 bottom-0 h-44 w-44 rounded-full bg-secondary/10 blur-3xl opacity-30" />

      <div className="relative z-10 space-y-7">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-base-content/5 pb-7">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-[1.5rem] bg-primary/12 text-primary shadow-lg shadow-primary/10">
              <Wallet className="w-8 h-8" />
            </div>
            <div>
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Hesap Hareketleri</p>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">Cüzdan Geçmişi</h2>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/20 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="İşlem detaylarında ara..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="input input-bordered h-12 w-full sm:w-80 pl-12 rounded-[1.1rem] bg-base-100/50 focus:bg-base-100 transition-all border-base-content/10 font-bold text-sm"
              />
            </div>
          </div>
        </header>

        {transactions.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center gap-4 opacity-40">
             <History className="w-12 h-12" />
             <p className="text-sm font-bold uppercase tracking-widest italic">Herhangi bir kayıt bulunamadı.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            <div className="hidden lg:grid grid-cols-[1fr_120px_160px] gap-4 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-base-content/30 border-b border-base-content/5 mb-2">
               <span>İşlem Bilgisi</span>
               <span className="text-center">Tutar</span>
               <span className="text-right">Tarih</span>
            </div>
            
            <div className="space-y-2">
              {transactions.map((tx) => {
                const isNegative = tx.amount < 0;
                return (
                  <div key={tx.id} className="group flex flex-col lg:grid lg:grid-cols-[1fr_120px_160px] lg:items-center gap-4 p-4 lg:p-3 px-5 rounded-[1.4rem] bg-base-content/2 hover:bg-base-100/40 transition-all border border-transparent hover:border-primary/15">
                    <div className="flex items-center gap-4 min-w-0">
                       <div className={`hidden sm:flex p-2.5 rounded-xl shrink-0 ${isNegative ? "bg-error/10 text-error" : "bg-success/10 text-success"}`}>
                          {isNegative ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                       </div>
                       <div className="min-w-0">
                          <p className="text-sm font-bold italic truncate leading-tight group-hover:text-primary transition-colors">{tx.description}</p>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 mt-1 inline-block rounded border ${isNegative ? "bg-error/5 border-error/10 text-error/60" : "bg-success/5 border-success/10 text-success/60"}`}>
                            {tx.type}
                          </span>
                       </div>
                    </div>
                    
                    <div className="text-center">
                       <p className={`text-lg font-black tracking-tight ${isNegative ? "text-error" : "text-success"}`}>
                         {isNegative ? "" : "+"}{tx.amount.toLocaleString("tr-TR")} <span className="text-[10px] ml-1 opacity-50">C</span>
                       </p>
                    </div>

                    <div className="text-right">
                       <span className="text-[10px] font-bold text-base-content/30 flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <Clock className="w-3 h-3" />
                          {new Date(tx.createdAt).toLocaleDateString("tr-TR")}
                          <span className="opacity-50">{new Date(tx.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>
                       </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <footer className="pt-7 border-t border-base-content/5 flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="px-5 py-2 rounded-full bg-base-100/40 border border-base-content/5 shadow-inner">
             <span className="text-[10px] font-black uppercase tracking-widest italic opacity-50">Toplam {totalCount} işlem kaydı listeleniyor</span>
           </div>

           {totalPages > 1 && (
             <div className="join p-1 rounded-2xl border border-base-content/10 bg-base-100/20 shadow-lg">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={page === 1}
                  className="join-item btn btn-ghost btn-sm h-10 w-10 min-h-0 rounded-xl"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="join-item flex items-center px-4 text-[10px] font-black uppercase tracking-widest italic opacity-60">
                  {page} / {totalPages}
                </div>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                  disabled={page === totalPages}
                  className="join-item btn btn-ghost btn-sm h-10 w-10 min-h-0 rounded-xl"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
             </div>
           )}
        </footer>
      </div>
    </article>
  );
}

function OrderHistory() {
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      try {
        const data = await getMyOrders(page, pageSize);
        setOrders(data.items);
        setTotalCount(data.totalCount);
        setError(null);
      } catch (err) {
        setError("Sipariş geçmişi yüklenemedi.");
      } finally {
        setIsLoading(false);
      }
    };
    loadOrders();
  }, [page]);

  const totalPages = Math.ceil(totalCount / pageSize);

  if (isLoading) return <div className="glass-frame p-10 flex flex-col items-center gap-4"><Loader2 className="w-8 h-8 animate-spin text-secondary" /><p className="text-xs font-black uppercase tracking-widest opacity-40">Siparişler Yükleniyor...</p></div>;
  if (error) return <article className="glass-frame p-6 border-error/20 bg-error/5 text-error text-center font-bold">{error}</article>;

  return (
    <article className="glass-frame relative overflow-hidden border border-secondary/15 bg-gradient-to-br from-base-100/90 via-base-100/80 to-secondary/5 p-6 shadow-2xl xl:col-span-2">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-secondary/10 blur-3xl opacity-50" />
      
      <div className="relative z-10 space-y-7">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-base-content/5 pb-7">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-[1.5rem] bg-secondary/12 text-secondary shadow-lg shadow-secondary/10">
              <History className="w-8 h-8" />
            </div>
            <div>
              <p className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] mb-1">Satın Alımlar & Belgeler</p>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">Sipariş Geçmişi</h2>
            </div>
          </div>
          
          <div className="px-5 py-2 rounded-full bg-base-100/40 border border-base-content/5 shadow-inner">
             <span className="text-[10px] font-black uppercase tracking-widest italic opacity-50">Toplam {totalCount} ödeme kaydı</span>
          </div>
        </header>

        {orders.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4 opacity-40">
             <BookOpenText className="w-12 h-12" />
             <p className="text-sm font-bold uppercase tracking-widest italic text-center">Henüz herhangi bir finansal işlem kaydınız bulunmuyor.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {orders.map((order) => {
              const statusColor = order.status === OrderStatus.Paid ? "text-success bg-success/10 border-success/20" : 
                                order.status === OrderStatus.Pending ? "text-warning bg-warning/10 border-warning/20" : 
                                "text-error bg-error/10 border-error/20";
              const statusText = order.status === OrderStatus.Paid ? "Ödendi" : 
                               order.status === OrderStatus.Pending ? "Bekliyor" : "Hata";

              return (
                <div key={order.id} className="group grid grid-cols-1 md:grid-cols-[1fr_auto_auto] items-center gap-6 p-5 rounded-[1.6rem] bg-base-content/2 hover:bg-base-100/60 transition-all border border-transparent hover:border-secondary/15">
                  <div className="flex items-center gap-5 min-w-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                      <Wallet className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-lg truncate leading-tight">{order.packageName}</h4>
                      <div className="mt-1 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest opacity-40">
                         <span>#{order.id.slice(0, 8)}</span>
                         <span>•</span>
                         <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(order.createdAt).toLocaleDateString("tr-TR")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-start md:items-end gap-1">
                     <p className="text-xl font-black italic">₺{order.pricePaid.toLocaleString("tr-TR")}</p>
                     <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${statusColor}`}>
                        {statusText}
                     </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {order.invoiceDocumentId ? (
                      <a 
                        href={`/api/compliance/documents/${order.invoiceDocumentId}/download`}
                        className="btn btn-secondary btn-sm rounded-xl px-4 font-black uppercase italic text-[10px]"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Download className="h-3.5 w-3.5" /> Faturayı İndir
                      </a>
                    ) : (
                      <button disabled className="btn btn-sm rounded-xl px-4 opacity-30 text-[10px] font-bold uppercase italic">Fatura Hazırlanıyor</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
           <footer className="pt-6 border-t border-base-content/5 flex justify-center">
              <div className="join p-1 rounded-2xl border border-base-content/10 bg-base-100/20 shadow-lg">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="join-item btn btn-ghost btn-sm h-10 w-10 min-h-0 rounded-xl"><ChevronLeft className="w-4 h-4" /></button>
                <div className="join-item flex items-center px-4 text-[10px] font-black uppercase tracking-widest italic opacity-60">{page} / {totalPages}</div>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="join-item btn btn-ghost btn-sm h-10 w-10 min-h-0 rounded-xl"><ChevronRight className="w-4 h-4" /></button>
              </div>
           </footer>
        )}
      </div>
    </article>
  );
}

function BillingAddressForm() {
  const { profile, refreshProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: profile?.billingAddress?.fullName ?? profile?.displayName ?? "",
    country: profile?.billingAddress?.country ?? "Turkey",
    city: profile?.billingAddress?.city ?? "",
    district: profile?.billingAddress?.district ?? "",
    addressLine: profile?.billingAddress?.addressLine ?? "",
    zipCode: profile?.billingAddress?.zipCode ?? "",
    phoneNumber: profile?.billingAddress?.phoneNumber ?? "",
    taxNumber: profile?.billingAddress?.taxNumber ?? "",
    taxOffice: profile?.billingAddress?.taxOffice ?? "",
    identityNumber: profile?.billingAddress?.identityNumber ?? ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const result = await (await import("@/lib/auth")).updateMyBillingAddress(formData);
      setMessage(result.message);
      await refreshProfile();
    } catch (err: any) {
      setError(err.message || "Fatura bilgileri guncellenemedi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <article className="glass-frame p-6 sm:p-8 xl:col-span-2">
      <header className="mb-8 flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tight">Fatura Bilgileri</h2>
          <p className="text-[10px] font-bold text-base-content/40 uppercase tracking-widest mt-1">Yasal fatura ve ödeme güvenliği için gereklidir</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
           <label className="label text-[10px] font-black uppercase tracking-widest opacity-50">Ad Soyad / Ticari Ünvan</label>
           <input name="fullName" value={formData.fullName} onChange={handleChange} className="input input-bordered w-full rounded-2xl" required />
        </div>

        <div>
           <label className="label text-[10px] font-black uppercase tracking-widest opacity-50">TC Kimlik No</label>
           <input name="identityNumber" value={formData.identityNumber} onChange={handleChange} className="input input-bordered w-full rounded-2xl" placeholder="Bireysel fatura için zorunludur" />
        </div>

        <div>
           <label className="label text-[10px] font-black uppercase tracking-widest opacity-50">Telefon</label>
           <input name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className="input input-bordered w-full rounded-2xl" placeholder="+90 5xx ..." required />
        </div>

        <div>
           <label className="label text-[10px] font-black uppercase tracking-widest opacity-50">Şehir</label>
           <input name="city" value={formData.city} onChange={handleChange} className="input input-bordered w-full rounded-2xl" required />
        </div>

        <div>
           <label className="label text-[10px] font-black uppercase tracking-widest opacity-50">İlçe</label>
           <input name="district" value={formData.district} onChange={handleChange} className="input input-bordered w-full rounded-2xl" required />
        </div>

        <div className="md:col-span-2">
           <label className="label text-[10px] font-black uppercase tracking-widest opacity-50">Adres Detayı</label>
           <textarea name="addressLine" value={formData.addressLine} onChange={handleChange} className="textarea textarea-bordered w-full rounded-2xl h-24" required />
        </div>

        <div className="border-t border-base-content/5 pt-4 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="md:col-span-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-2">Kurumsal Bilgiler (Opsiyonel)</p>
           </div>
           <div>
              <label className="label text-[10px] font-black uppercase tracking-widest opacity-50">Vergi Dairesi</label>
              <input name="taxOffice" value={formData.taxOffice} onChange={handleChange} className="input input-bordered w-full rounded-2xl" />
           </div>
           <div>
              <label className="label text-[10px] font-black uppercase tracking-widest opacity-50">Vergi Numarası</label>
              <input name="taxNumber" value={formData.taxNumber} onChange={handleChange} className="input input-bordered w-full rounded-2xl" />
           </div>
        </div>

        <div className="md:col-span-2 pt-6">
           <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full rounded-2xl h-14 font-black uppercase italic shadow-lg shadow-primary/20">
              {isSubmitting ? <span className="loading loading-spinner" /> : "Fatura Bilgilerini Kaydet"}
           </button>
           {message && <p className="mt-4 text-sm font-bold text-success text-center">{message}</p>}
           {error && <p className="mt-4 text-sm font-bold text-error text-center">{error}</p>}
        </div>
      </form>
    </article>
  );
}

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
      const hash = window.location.hash;
      if (hash === "#security") setActiveTab("security");
      else if (hash === "#wallet") setActiveTab("wallet");
      else if (hash === "#billing") setActiveTab("billing");
      else if (hash === "#orders") setActiveTab("orders");
      else setActiveTab("profile");
    };

    syncTabWithHash();
    window.addEventListener("hashchange", syncTabWithHash);

    return () => window.removeEventListener("hashchange", syncTabWithHash);
  }, []);

  function switchTab(tab: ProfileTab) {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      let hash = "#profile";
      if (tab === "security") hash = "#security";
      else if (tab === "wallet") hash = "#wallet";
      else if (tab === "billing") hash = "#billing";
      else if (tab === "orders") hash = "#orders";
      window.history.replaceState(null, "", hash);
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
                Profili Düzenle
              </button>

              <label className="btn rounded-full border border-base-content/12 bg-base-100/24 px-6 hover:bg-base-100/34">
                <Camera className="h-4 w-4" />
                {isAvatarUploading ? "Yükleniyor" : "Avatar Güncelle"}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={isAvatarUploading} />
              </label>

              <button
                type="button"
                onClick={() => switchTab("orders")}
                className="btn rounded-full border border-base-content/12 bg-base-100/24 px-6 hover:bg-base-100/34"
              >
                <History className="h-4 w-4" />
                Siparişlerim
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
            onClick={() => switchTab("wallet")}
            className={`btn rounded-full px-5 ${activeTab === "wallet" ? "btn-primary" : "bg-base-100/20"}`}
          >
            <Wallet className="h-4 w-4" />
            Cüzdan Girdileri
          </button>
          <button
            type="button"
            onClick={() => switchTab("orders")}
            className={`btn rounded-full px-5 ${activeTab === "orders" ? "btn-primary" : "bg-base-100/20"}`}
          >
            <History className="h-4 w-4" />
            Siparişler & Belgeler
          </button>
          <button
            type="button"
            onClick={() => switchTab("billing")}
            className={`btn rounded-full px-5 ${activeTab === "billing" ? "btn-primary" : "bg-base-100/20"}`}
          >
            <FileText className="h-4 w-4" />
            Fatura Bilgileri
          </button>
          <button
            type="button"
            onClick={() => switchTab("security")}
            className={`btn rounded-full px-5 ${activeTab === "security" ? "btn-primary" : "bg-base-100/20"}`}
          >
            <Shield className="h-4 w-4" />
            Güvenlik
          </button>
        </div>
      </div>

      {activeTab === "profile" && (
        <div id="profile" className="grid gap-6">
          <article className="glass-frame relative overflow-hidden p-8 border border-primary/10 bg-gradient-to-br from-base-100 to-primary/5 shadow-xl">
             <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div>
                   <h2 className="text-3xl font-black italic uppercase leading-tight tracking-tighter">Profil Özetin</h2>
                   <p className="mt-2 text-sm font-bold text-base-content/40 uppercase tracking-widest leading-relaxed">Platform üzerindeki etkileşiminin özeti</p>
                </div>
                
                <div className="stats shadow-lg bg-base-100/50 border border-base-content/5 rounded-3xl overflow-hidden">
                   <div className="stat px-8 py-6">
                      <div className="stat-figure text-primary">
                        <BookOpenText className="w-8 h-8" />
                      </div>
                      <div className="stat-title text-[10px] font-black uppercase tracking-widest opacity-60">Okunan Bölüm</div>
                      <div className="stat-value text-3xl font-black">1.2k</div>
                    </div>
                    
                    <div className="stat px-8 py-6 border-l border-base-content/5">
                      <div className="stat-figure text-secondary">
                        <Wallet className="w-8 h-8" />
                      </div>
                      <div className="stat-title text-[10px] font-black uppercase tracking-widest opacity-60">Harcanan Jeton</div>
                      <div className="stat-value text-3xl font-black">2.4k</div>
                    </div>
                </div>
             </div>
          </article>
        </div>
      )}

      {activeTab === "orders" && (
        <div id="orders" className="scroll-mt-32">
          <OrderHistory />
        </div>
      )}

      {activeTab === "security" && (
        <div id="security" className="scroll-mt-32">
          <SecurityDashboard />
        </div>
      )}

      {activeTab === "wallet" && (
        <div id="wallet" className="scroll-mt-32">
          <WalletHistory />
        </div>
      )}

      {activeTab === "billing" && (
        <div id="billing" className="scroll-mt-32">
          <BillingAddressForm />
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


