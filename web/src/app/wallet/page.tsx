"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { getWalletTransactions, getWalletPackages, initializeCoinPurchase, type TransactionDto, type WalletPackageDto } from "@/lib/wallet";
import { toast } from "@/lib/toast";
import { Coins, History, Sparkles, TrendingUp, Zap, ArrowUpRight, ArrowDownLeft, ShieldCheck, HelpCircle, X, Check, Home, Package, ArrowRight, Download } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ICON_MAP: Record<string, any> = {
  Zap,
  TrendingUp,
  Sparkles,
  Gift: Sparkles // Fallback
};

const STYLE_MAP: Record<string, { color: string, bg: string }> = {
  Zap: { color: "text-blue-500", bg: "bg-blue-500/10" },
  TrendingUp: { color: "text-purple-500", bg: "bg-purple-500/10" },
  Sparkles: { color: "text-warning", bg: "bg-warning/10" }
};

export default function WalletPage() {
  const router = useRouter();
  const { profile, isLoading } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [packages, setPackages] = useState<WalletPackageDto[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isPackagesLoading, setIsPackagesLoading] = useState(true);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [checkoutHtml, setCheckoutHtml] = useState<string | null>(null);

  const handlePurchase = async (pkgId?: string) => {
    const targetId = pkgId || selectedPackage;
    if (!targetId) {
      toast.error({ title: "Lütfen bir paket seçin." });
      return;
    }

    if (!profile?.billingAddress) {
      toast.error({
        title: "Fatura Bilgileri Eksik",
        description: "Ödeme yapabilmek için profilinizden fatura adresinizi doldurmalısınız."
      });
      router.push("/profile#billing");
      return;
    }

    setSelectedPackage(targetId);
    setIsPurchasing(true);
    try {
      const response = await initializeCoinPurchase(targetId);
      setCheckoutHtml(response.checkoutFormContent);
    } catch (error: any) {
      toast.error({ title: error.message || "Ödeme başlatılamadı." });
      setIsPurchasing(false);
    }
  };

  useEffect(() => {
    async function fetchPackages() {
      try {
        const response = await getWalletPackages();
        setPackages(response);
      } catch (error) {
        console.error("Paketler yüklenemedi:", error);
      } finally {
        setIsPackagesLoading(false);
      }
    }
    fetchPackages();
  }, []);

  useEffect(() => {
    if (!profile) return;

    async function fetchHistory() {
      try {
        const response = await getWalletTransactions(1, 10);
        setTransactions(response.items);
      } catch (error) {
        console.error("Geçmiş yüklenemedi:", error);
      } finally {
        setIsHistoryLoading(false);
      }
    }

    fetchHistory();
  }, [profile?.userId]);

  // Iyzico scriptlerini manuel olarak tetikle
  useEffect(() => {
    if (!checkoutHtml) return;

    // Önceki scriptleri temizle (isteğe bağlı ama karışıklığı önler)
    const existingScripts = document.querySelectorAll('script[data-iyzico]');
    existingScripts.forEach(s => s.remove());

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = checkoutHtml;

    const scripts = tempDiv.getElementsByTagName("script");
    const scriptArray = Array.from(scripts);

    const loadScript = (index: number) => {
      if (index >= scriptArray.length) return;

      const oldScript = scriptArray[index];
      const newScript = document.createElement("script");
      newScript.type = "text/javascript";
      newScript.setAttribute('data-iyzico', 'true');

      if (oldScript.src) {
        newScript.src = oldScript.src;
        newScript.onload = () => loadScript(index + 1);
        newScript.onerror = () => loadScript(index + 1);
        document.body.appendChild(newScript);
      } else {
        newScript.textContent = oldScript.textContent;
        document.body.appendChild(newScript);
        loadScript(index + 1);
      }
    };

    loadScript(0);

    return () => {
      const addedScripts = document.querySelectorAll('script[data-iyzico]');
      addedScripts.forEach(s => s.remove());
    };
  }, [checkoutHtml]);

  if (isLoading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="loading loading-spinner loading-lg text-primary"></div>
        <p className="mt-4 text-sm font-bold text-base-content/40 uppercase tracking-widest italic">Cüzdan Hazırlanıyor</p>
      </div>
    </div>
  );

  if (!profile) return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="glass-frame max-w-md rounded-4xl p-10 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-base-content/5">
          <ShieldCheck className="h-10 w-10 text-base-content/20" />
        </div>
        <h1 className="text-2xl font-black italic">Hoş Geldiniz</h1>
        <p className="mt-3 text-sm font-semibold text-base-content/60 leading-relaxed italic">Cüzdan işlemlerinizi gerçekleştirmek için lütfen giriş yapın.</p>
        <Link href="/login" className="btn btn-primary btn-md mt-8 w-full rounded-xl font-black uppercase italic shadow-lg shadow-primary/25">
          Giriş Yap
        </Link>
      </div>
    </div>
  );

  return (
    <main className="relative overflow-hidden">
      <div className="site-shell mx-auto flex min-h-screen flex-col gap-6 px-4 pb-8 pt-28 sm:px-8 sm:pb-12 sm:pt-32">
        <section className="glass-frame space-y-10 p-4 sm:p-6">

          {/* Header Row */}
          <div className="space-y-4">
            <div className="breadcrumbs text-xs font-semibold text-base-content/50 mb-1">
              <ul>
                <li><Link href="/" className="hover:text-primary transition-colors flex items-center"><Home className="w-3.5 h-3.5 mr-1.5" /> Ana Sayfa</Link></li>
                <li className="text-base-content/40 italic">Cüzdan</li>
              </ul>
            </div>

            <div className="flex items-center gap-3 text-primary">
              <Coins className="h-7 w-7" strokeWidth={2.5} />
              <h1 className="hero-title-gradient text-3xl font-black tracking-tight sm:text-4xl uppercase italic">Cüzdanım</h1>
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-base-content/30 italic">Jeton yükleyerek en sevdiğiniz serilerin yeni bölümlerini anında okuyun.</p>
          </div>

          {/* Top Row: Balance & History */}
          <div className="grid gap-8 lg:grid-cols-3 items-stretch">
            {/* Balance Card */}
            <div className="lg:col-span-2 rounded-4xl border border-base-content/12 bg-base-100/24 p-8 sm:p-12 flex flex-col justify-center">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-12">
                <div className="text-center sm:text-left">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-base-content/30 italic mb-2">Güncel Bakiye</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-6xl font-black italic tracking-tighter text-base-content">{profile.tokenBalance.toLocaleString()}</span>
                    <span className="text-sm font-black uppercase tracking-widest text-primary italic">Jeton</span>
                  </div>

                  <div className="mt-10 flex flex-wrap gap-3 justify-center sm:justify-start">
                    <Link href="/profile#wallet" className="btn btn-ghost btn-sm rounded-xl border-base-content/15 bg-base-100/32 font-bold px-6 h-12">
                      <History className="h-4 w-4 mr-2" />
                      İşlem Geçmişi
                    </Link>
                    <button
                      onClick={() => setIsHelpModalOpen(true)}
                      className="btn btn-ghost btn-sm rounded-xl border border-warning/25 bg-warning/8 font-bold text-warning px-6 h-12 hover:bg-warning/15"
                    >
                      <HelpCircle className="mr-2 h-4 w-4" />
                      Yardım
                    </button>
                  </div>
                </div>

                <div className="relative group shrink-0">
                  <div className="absolute -inset-8 rounded-full bg-primary/20 blur-3xl transition-opacity group-hover:opacity-100 opacity-60"></div>
                  <div className="relative flex h-48 w-48 items-center justify-center rounded-full border border-base-content/12 bg-base-100/32 backdrop-blur-xl shadow-2xl transition-transform group-hover:scale-105">
                    <Coins className="h-20 w-20 text-primary/40 animate-pulse" />
                    <div className="absolute inset-0 rounded-full border-4 border-primary/10 border-t-primary/40 animate-[spin_10s_linear_infinite]"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* History Card */}
            <div className="rounded-4xl border border-base-content/12 bg-base-100/24 p-6 flex flex-col">
              <div className="mb-5 flex items-center justify-between px-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-base-content/40 italic">Son İşlemler</p>
              </div>

              <div className="space-y-3 flex-1">
                {isHistoryLoading ? (
                  Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-base-content/5" />
                  ))
                ) : transactions.length > 0 ? (
                  transactions.slice(0, 7).map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-xl border border-base-content/5 bg-base-100/32 p-3 transition-colors hover:bg-base-100/45">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.amount > 0 ? 'bg-success/10 text-success' : 'bg-base-content/5 text-base-content/40'}`}>
                        {item.amount > 0 ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-bold leading-tight text-base-content/80 italic">{item.description}</p>
                        <p className="text-[9px] font-bold text-base-content/40 uppercase tracking-tighter">
                          {new Date(item.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <p className={`text-[11px] font-black italic ${item.amount > 0 ? 'text-success' : 'text-base-content/50'}`}>
                          {item.amount > 0 ? `+${item.amount}` : item.amount}
                        </p>
                        {(item.invoiceDocumentId || item.invoiceFileUrl) && (
                          <a
                            href={item.invoiceDocumentId ? `/api/compliance/documents/${item.invoiceDocumentId}/download` : item.invoiceFileUrl!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            title="Faturayı İndir"
                          >
                            <Download className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-full flex-col items-center justify-center opacity-20">
                    <History className="h-8 w-8 mb-2" />
                    <p className="text-[10px] font-black uppercase italic tracking-widest">İşlem Yok</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row: Packages (Full Width) */}
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-base-content/5 pb-6">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-black uppercase italic tracking-tight">Jeton Paketleri</h2>
              </div>
              <p className="text-xs font-bold text-base-content/40 italic hidden sm:block">İhtiyacınıza en uygun paketi seçin.</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {isPackagesLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-96 w-full animate-pulse rounded-[3rem] bg-base-content/5" />
                ))
              ) : packages.filter(p => p.isActive).map((pkg) => {
                const Icon = ICON_MAP[pkg.icon] || Zap;
                const style = STYLE_MAP[pkg.icon] || STYLE_MAP.Zap;
                const isSelected = selectedPackage === pkg.id;

                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg.id)}
                    className={`group relative cursor-pointer overflow-hidden rounded-[3rem] border-2 transition-all duration-500 hover:-translate-y-4 ${isSelected
                      ? "border-primary bg-primary/8 shadow-[0_30px_60px_-15px_rgba(var(--color-primary-rgb),0.3)]"
                      : "border-base-content/5 bg-base-200/40 hover:border-primary/30"
                      }`}
                  >
                    {/* Hover Glow Effect */}
                    <div className="absolute -inset-24 bg-primary/10 blur-[100px] opacity-0 transition-opacity duration-700 group-hover:opacity-100 pointer-events-none" />

                    {/* Decorative Background Pattern */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                      style={{ backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`, backgroundSize: '24px 24px' }} />

                    {pkg.popular && (
                      <div className="absolute -right-16 top-10 w-56 rotate-45 bg-linear-to-r from-primary to-secondary px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary-content shadow-xl z-20 text-center">
                        Popüler
                      </div>
                    )}

                    {pkg.bestValue && (
                      <div className="absolute -right-16 top-10 w-56 rotate-45 bg-linear-to-r from-success to-emerald-500 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-success-content shadow-xl z-20 text-center">
                        Fırsat
                      </div>
                    )}

                    <div className="relative p-10 z-10 flex flex-col h-full">
                      {/* Icon Container with Neon Glow */}
                      <div className="relative mb-10 inline-block">
                        <div className={`absolute -inset-3 blur-2xl opacity-40 transition-opacity group-hover:opacity-100 ${style.color} ${style.bg}`} />
                        <div className={`relative flex h-20 w-20 items-center justify-center rounded-3xl shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${style.bg} ${style.color} ${isSelected ? 'ring-2 ring-primary/50' : ''}`}>
                          <Icon className="h-10 w-10" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-base-content/30 italic">{pkg.name}</p>
                          {pkg.popular && <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
                        </div>

                        <div className="flex items-baseline gap-3">
                          <span className="text-5xl font-black italic tracking-tighter bg-linear-to-br from-base-content to-base-content/60 bg-clip-text text-transparent">{pkg.tokens}</span>
                          <span className="text-sm font-black text-primary/40 uppercase italic tracking-widest">Jeton</span>
                        </div>

                        {pkg.bonus > 0 && (
                          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-success/15 px-4 py-1.5 text-[11px] font-black text-success italic border border-success/10">
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>+{pkg.bonus} Bonus Jeton</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-auto pt-12 space-y-6">
                        <div className="flex items-end justify-between border-t border-base-content/5 pt-8">
                          <div className="space-y-0.5">
                            <span className="block text-[10px] font-black uppercase tracking-widest text-base-content/20 italic">Toplam Ücret</span>
                            <span className="text-3xl font-black italic tracking-tight">₺{pkg.price}</span>
                          </div>

                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${isSelected ? 'bg-primary text-primary-content border-primary' : 'bg-base-content/5 border-base-content/10 group-hover:border-primary/50 text-base-content/20 group-hover:text-primary'}`}>
                            <ArrowRight className="h-5 w-5" />
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePurchase(pkg.id);
                          }}
                          disabled={isPurchasing}
                          className={`w-full rounded-2xl py-5 text-sm font-black uppercase italic tracking-widest transition-all duration-300 active:scale-95 disabled:opacity-50 ${isSelected
                            ? "bg-linear-to-r from-primary to-primary/80 text-primary-content shadow-[0_15px_30px_-5px_rgba(var(--color-primary-rgb),0.4)]"
                            : "bg-base-content/5 hover:bg-base-content/10 border border-base-content/5 group-hover:bg-primary group-hover:text-primary-content transition-colors"
                            }`}
                        >
                          {isPurchasing && selectedPackage === pkg.id ? (
                            <span className="loading loading-spinner loading-sm"></span>
                          ) : (
                            "Hemen Satın Al"
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Help Modal */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-base-300/80 backdrop-blur-xl" onClick={() => setIsHelpModalOpen(false)} />
          <div className="relative w-full h-full sm:h-auto sm:max-w-xl overflow-hidden bg-base-100 sm:rounded-[3rem] shadow-2xl flex flex-col border border-white/5">
            <div className="flex items-center justify-between border-b border-base-content/5 p-6">
              <div className="flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-black uppercase italic tracking-tight">Cüzdan Yardımı</h2>
              </div>
              <button onClick={() => setIsHelpModalOpen(false)} className="btn btn-ghost btn-circle btn-sm"><X className="h-5 w-5" /></button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-6 md:p-8 custom-scrollbar">
              <div className="space-y-8">
                <section className="space-y-3">
                  <h3 className="text-sm font-black uppercase tracking-widest text-primary italic flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    Jeton Nedir?
                  </h3>
                  <p className="text-sm font-semibold text-base-content/60 leading-relaxed italic pl-3.5">
                    Jetonlar, Epiknovel üzerindeki premium bölümleri okumak için kullanılan dijital para birimidir. Desteklediğiniz yazarların eserlerini bu jetonlar ile açabilirsiniz.
                  </p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-black uppercase tracking-widest text-primary italic flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    Ödeme Güvenliği
                  </h3>
                  <p className="text-sm font-semibold text-base-content/60 leading-relaxed italic pl-3.5">
                    Ödemeleriniz iyzico alt yapısı ile 256-bit şifrelenmiş SSL sertifikalı sayfalarda güvenle gerçekleştirilir. Kart bilgileriniz asla sunucularımızda saklanmaz.
                  </p>
                </section>

                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 italic">
                  <div className="flex gap-4">
                    <Sparkles className="h-6 w-6 text-primary shrink-0" />
                    <p className="text-xs font-bold text-primary/80 leading-relaxed">Bonus jetonlar kampanyalı paket alımlarında anında bakiyenize eklenir ve kullanım süresi bulunmaz.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-base-100/32 border-t border-base-content/5">
              <button onClick={() => setIsHelpModalOpen(false)} className="btn btn-primary w-full rounded-xl font-black uppercase italic">Anladım</button>
            </div>
          </div>
        </div>
      )}
      {/* Iyzico Checkout Modal */}
      {checkoutHtml && (
        <div className="fixed inset-0 z-110 flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-base-300/95 backdrop-blur-xl" onClick={() => setCheckoutHtml(null)} />
          <div className="relative w-full h-full sm:h-auto sm:max-w-lg overflow-hidden bg-white sm:rounded-[2.5rem] shadow-[0_0_100px_-20px_rgba(0,0,0,0.5)] flex flex-col transition-all duration-500 scale-in-center">

            {/* Minimal Header */}
            <div className="flex items-center justify-between border-b border-base-content/5 p-5 bg-base-100/50">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-black uppercase italic tracking-widest text-base-content/70">Güvenli Ödeme Bölgesi</h2>
              </div>
              <button
                onClick={() => { setCheckoutHtml(null); setIsPurchasing(false); }}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-base-content/10 transition-colors"
                title="Kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Iyzico Content Wrapper */}
            <div className="flex-1 overflow-y-auto bg-white min-h-[550px] custom-scrollbar">
              <div id="iyzico-checkout-form-wrapper" className="p-2 sm:p-4">
                <div dangerouslySetInnerHTML={{ __html: checkoutHtml }} />
              </div>
            </div>

            {/* Simple Footer */}
            <div className="p-4 bg-base-100/30 border-t border-base-content/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                <p className="text-[9px] font-black text-base-content/30 uppercase tracking-[0.2em] italic">256-Bit SSL Secured Transaction</p>
              </div>
              <button
                onClick={() => { setCheckoutHtml(null); setIsPurchasing(false); }}
                className="text-[10px] font-black text-error/60 hover:text-error uppercase tracking-widest transition-colors mr-2"
              >
                İptal Et
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
