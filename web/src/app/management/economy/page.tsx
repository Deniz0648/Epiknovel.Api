"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  getWalletPackages, 
  getAdminWalletPackages,
  createWalletPackage, 
  updateWalletPackage, 
  deleteWalletPackage,
  getAdminCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  CampaignTargetType,
  CampaignSponsorType,
  OrderStatus,
  type WalletPackageDto,
  type CampaignDto,
  type OrderDto,
  getAdminOrders,
  createManualOrder,
  uploadInvoice,
  // Para Çekme New
  getAdminWithdrawals,
  processWithdrawal,
  WithdrawStatus,
  type WithdrawDto
} from "@/lib/wallet";
import { getCategories, getAdminBooks, type CategoryDto, type ManagementBookDto } from "@/lib/books";
import { toast } from "@/lib/toast";
import { 
  Coins, TrendingUp, Wallet, Banknote, Package, History, Percent, 
  FileText, Plus, Edit2, Trash2, Save, X, Check, Power, LayoutGrid,
  FilePlus, Download, Upload, Loader2, Search, AlertCircle, ChevronLeft, ChevronRight
} from "lucide-react";

type TabType = "packages" | "discounts" | "invoices" | "withdrawals";

export default function EconomyManagementPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center opacity-50">Yükleniyor...</div>}>
      <EconomyManagementContent />
    </Suspense>
  );
}

function EconomyManagementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URL'den başlangıç tabını al veya varsayılan "packages" yap
  const initialTab = (searchParams.get("tab") as TabType) || "packages";
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [packages, setPackages] = useState<WalletPackageDto[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [books, setBooks] = useState<ManagementBookDto[]>([]);
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOrderLoading, setIsOrderLoading] = useState(false);
  const [isWithdrawLoading, setIsWithdrawLoading] = useState(false);
  
  // Pagination & Search States
  const [packagesState, setPackagesState] = useState({ page: 1, search: "", total: 0 });
  const [campaignsState, setCampaignsState] = useState({ page: 1, search: "", total: 0 });
  const [ordersState, setOrdersState] = useState({ page: 1, search: "", total: 0 });
  const [withdrawalsState, setWithdrawalsState] = useState({ page: 1, total: 0 });

  // Withdrawal Filters
  const [withdrawFilter, setWithdrawFilter] = useState<{status?: WithdrawStatus, search: string}>({ search: "" });

  // Withdrawal Process Modal State
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [processingWithdraw, setProcessingWithdraw] = useState<WithdrawDto | null>(null);
  const [withdrawProcessData, setWithdrawProcessData] = useState({
    status: WithdrawStatus.Approved,
    note: "",
    receiptFile: null as File | null,
    receiptId: "",
    isUploading: false
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<WalletPackageDto | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    amount: 0,
    bonusAmount: 0,
    icon: "Zap",
    displayOrder: 0,
    isBestValue: false
  });

  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignDto | null>(null);
  const [campaignFormData, setCampaignFormData] = useState({
    name: "",
    targetType: CampaignTargetType.Global,
    targetId: "",
    discountPercentage: 20,
    sponsorType: CampaignSponsorType.Platform,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  });

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isUploadingInvoice, setIsUploadingInvoice] = useState<string | null>(null);
  const [orderFormData, setOrderFormData] = useState({
    userId: "",
    buyerEmail: "",
    pricePaid: 0,
    coinAmount: 0,
    description: "Manuel Fatura Girişi",
    invoiceFile: null as File | null
  });

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (activeTab === "packages") fetchPackages();
    if (activeTab === "discounts") fetchCampaigns();
    if (activeTab === "invoices") fetchOrders();
    if (activeTab === "withdrawals") fetchWithdrawals();
  }, [
    activeTab, 
    withdrawFilter, 
    packagesState.page, packagesState.search,
    campaignsState.page, campaignsState.search,
    ordersState.page, ordersState.search,
    withdrawalsState.page
  ]);

  async function fetchWithdrawals() {
    setIsWithdrawLoading(true);
    try {
      const data = await getAdminWithdrawals({ 
        page: withdrawalsState.page,
        status: withdrawFilter.status, 
        search: withdrawFilter.search 
      });
      setWithdrawals(data.items);
      setWithdrawalsState(prev => ({ ...prev, total: data.totalCount }));
    } catch (e) {
      toast.error({ description: "Talepler yüklenemedi." });
    } finally {
      setIsWithdrawLoading(false);
    }
  }

  const handleWithdrawProcess = async () => {
    if (!processingWithdraw) return;
    
    if (withdrawProcessData.status === WithdrawStatus.Approved && !withdrawProcessData.receiptId) {
       toast.error({ description: "Lütfen önce dekont yükleyin." });
       return;
    }

    if (withdrawProcessData.status === WithdrawStatus.Rejected && !withdrawProcessData.note) {
        toast.error({ description: "Ret için bir açıklama girmeniz zorunludur." });
        return;
    }
    
    setIsWithdrawLoading(true);
    try {
      await processWithdrawal(
          processingWithdraw.id, 
          withdrawProcessData.status, 
          withdrawProcessData.note, 
          withdrawProcessData.receiptId
      );
      toast.success({ description: "Talep işlendi." });
      setIsWithdrawModalOpen(false);
      fetchWithdrawals();
    } catch (e) {
      toast.error({ description: "İşlem başarısız." });
    } finally {
        setIsWithdrawLoading(false);
    }
  };

  const uploadReceipt = async (file: File) => {
    setWithdrawProcessData(prev => ({ ...prev, isUploading: true }));
    try {
        const formData = new FormData();
        formData.append("File", file);
        formData.append("Category", "receipts");
        const res = await fetch("/api/compliance/documents/upload", { method: "POST", body: formData });
        const json = await res.json();
        
        if (json.isSuccess) {
            setWithdrawProcessData(prev => ({ 
                ...prev, 
                receiptId: json.data.documentId, 
                receiptFile: file 
            }));
            toast.success({ description: "Dekont başarıyla yüklendi." });
        } else {
            throw new Error(json.message);
        }
    } catch (e) {
        toast.error({ description: "Dekont yüklenemedi." });
    } finally {
        setWithdrawProcessData(prev => ({ ...prev, isUploading: false }));
    }
  };

  async function fetchOrders() {
    setIsOrderLoading(true);
    try {
      const data = await getAdminOrders({
        page: ordersState.page,
        search: ordersState.search
      });
      setOrders(data.items);
      setOrdersState(prev => ({ ...prev, total: data.totalCount }));
    } catch (e) {
      toast.error({ description: "Siparişler yüklenemedi." });
    } finally {
      setIsOrderLoading(false);
    }
  }

  async function fetchMetadata() {
    try {
      const catRes = await getCategories();
      setCategories(catRes.categories);
      const bookRes = await getAdminBooks();
      setBooks(bookRes.items);
    } catch (e) {
      console.error("Metadata fetch error", e);
    }
  }

  async function fetchCampaigns() {
    try {
      const data = await getAdminCampaigns({
        page: campaignsState.page,
        search: campaignsState.search
      });
      setCampaigns(data.items);
      setCampaignsState(prev => ({ ...prev, total: data.totalCount }));
    } catch (error) {
      toast.error({ description: "Kampanyalar yüklenemedi." });
    }
  }

  async function fetchPackages() {
    setIsLoading(true);
    try {
      const data = await getAdminWalletPackages({
        page: packagesState.page,
        search: packagesState.search
      });
      setPackages(data.items);
      setPackagesState(prev => ({ ...prev, total: data.totalCount }));
    } catch (error) {
      toast.error({ description: "Paketler yüklenemedi." });
    } finally {
      setIsLoading(false);
    }
  }

  const openModal = (pkg: WalletPackageDto | null = null) => {
    if (pkg) {
      setEditingPackage(pkg);
      setFormData({
        name: pkg.name,
        price: pkg.price,
        amount: pkg.tokens,
        bonusAmount: pkg.bonus,
        icon: pkg.icon,
        displayOrder: pkg.displayOrder,
        isBestValue: pkg.bestValue || false
      });
    } else {
      setEditingPackage(null);
      setFormData({
        name: "",
        price: 0,
        amount: 0,
        bonusAmount: 0,
        icon: "Zap",
        displayOrder: packages.length + 1,
        isBestValue: false
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingPackage) {
        await updateWalletPackage(editingPackage.id, {
          name: formData.name,
          price: formData.price,
          tokens: formData.amount,
          bonus: formData.bonusAmount,
          icon: formData.icon,
          displayOrder: formData.displayOrder,
          bestValue: formData.isBestValue,
          isActive: editingPackage.isActive
        });
        toast.info({ description: "Paket başarıyla güncellendi." });
      } else {
        await createWalletPackage({
          name: formData.name,
          price: formData.price,
          tokens: formData.amount,
          bonus: formData.bonusAmount,
          icon: formData.icon,
          displayOrder: formData.displayOrder,
          isBestValue: formData.isBestValue
        });
        toast.success({ description: "Yeni paket başarıyla eklendi." });
      }
      setIsModalOpen(false);
      fetchPackages();
    } catch (error) {
      toast.error({ description: "İşlem başarısız oldu." });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu paketi silmek istediğinize emin misiniz?")) return;
    try {
      await deleteWalletPackage(id);
      toast.success({ description: "Paket silindi." });
      fetchPackages();
    } catch (error) {
      toast.error({ description: "Silme işlemi başarısız." });
    }
  };

  const toggleStatus = async (pkg: WalletPackageDto) => {
    try {
      await updateWalletPackage(pkg.id, { ...pkg, isActive: !pkg.isActive });
      fetchPackages();
    } catch (error) {
      toast.error({ description: "Durum güncellenemedi." });
    }
  };

  const openCampaignModal = (cp: CampaignDto | null = null) => {
    if (cp) {
      setEditingCampaign(cp);
      setCampaignFormData({
        name: cp.name,
        targetType: cp.targetType,
        targetId: cp.targetId || "",
        discountPercentage: cp.discountPercentage,
        sponsorType: cp.sponsorType,
        startDate: cp.startDate.split('T')[0],
        endDate: cp.endDate.split('T')[0]
      });
    } else {
      setEditingCampaign(null);
      setCampaignFormData({
        name: "",
        targetType: CampaignTargetType.Global,
        targetId: "",
        discountPercentage: 20,
        sponsorType: CampaignSponsorType.Platform,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
      });
    }
    setIsCampaignModalOpen(true);
  };

  const handleSaveCampaign = async () => {
    try {
      const payload = {
        name: campaignFormData.name,
        targetType: campaignFormData.targetType,
        targetId: campaignFormData.targetType === CampaignTargetType.Global ? null : campaignFormData.targetId,
        discountPercentage: campaignFormData.discountPercentage,
        sponsorType: campaignFormData.sponsorType,
        startDate: new Date(campaignFormData.startDate).toISOString(),
        endDate: new Date(campaignFormData.endDate).toISOString()
      };

      if (editingCampaign) {
        await updateCampaign(editingCampaign.id, payload);
        toast.info({ description: "Kampanya güncellendi." });
      } else {
        await createCampaign(payload);
        toast.success({ description: "Yeni kampanya oluşturuldu." });
      }
      setIsCampaignModalOpen(false);
      fetchCampaigns();
    } catch (error) {
      toast.error({ description: "Kampanya kaydedilirken hata oluştu." });
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm("Bunu silmek istediğinize emin misiniz?")) return;
    try {
      await deleteCampaign(id);
      fetchCampaigns();
    } catch (error) {
      toast.error({ description: "Silme başarısız." });
    }
  };

  const openOrderModal = () => {
    setOrderFormData({
      userId: "",
      buyerEmail: "",
      pricePaid: 0,
      coinAmount: 0,
      description: "Manuel Fatura Girişi",
      invoiceFile: null
    });
    setIsOrderModalOpen(true);
  };

  const handleCreateManualOrder = async () => {
    if (!orderFormData.userId || !orderFormData.buyerEmail || orderFormData.pricePaid <= 0) {
      toast.error({ description: "Lütfen gerekli tüm alanları doldurun." });
      return;
    }
    
    setIsOrderLoading(true);
    try {
      let documentId: string | null = null;
      if (orderFormData.invoiceFile) {
        const formData = new FormData();
        formData.append("File", orderFormData.invoiceFile);
        formData.append("Category", "invoices");
        const res = await fetch("/api/compliance/documents/upload", { method: "POST", body: formData });
        const json = await res.json();
        if (json.isSuccess) documentId = json.data.documentId;
      }

      await createManualOrder({
        ...orderFormData,
        invoiceDocumentId: documentId
      });
      
      toast.success({ description: "Manuel sipariş ve fatura girişi başarıyla tamamlandı." });
      setIsOrderModalOpen(false);
      fetchOrders();
    } catch (e) {
      toast.error({ description: "Sipariş oluşturulurken hata oluştu." });
    } finally {
      setIsOrderLoading(false);
    }
  };

  const handleUploadInvoice = async (orderId: string, file: File) => {
    setIsUploadingInvoice(orderId);
    try {
      const formData = new FormData();
      formData.append("File", file);
      formData.append("Category", "invoices");
      const res = await fetch("/api/compliance/documents/upload", { method: "POST", body: formData });
      const json = await res.json();
      
      if (!json.isSuccess) throw new Error(json.message);

      await uploadInvoice(orderId, json.data.documentId);
      toast.success({ description: "Fatura başarıyla yüklendi." });
      fetchOrders();
    } catch (e) {
      toast.error({ description: "Fatura yüklenemedi." });
    } finally {
      setIsUploadingInvoice(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <Coins className="h-6 w-6" />
            </div>
            Ekonomi Yönetimi
          </h1>
          <p className="text-sm font-bold text-base-content/40 uppercase tracking-widest mt-1">Platform Finansal Kontrol Paneli</p>
        </div>
        
        <button 
          onClick={() => activeTab === "packages" ? openModal() : activeTab === "discounts" ? openCampaignModal() : activeTab === "invoices" ? openOrderModal() : fetchWithdrawals()}
          className="flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-black text-primary-content shadow-lg shadow-primary/25 transition hover:opacity-90 active:scale-95"
        >
          {activeTab === "withdrawals" ? (
             <>
               <History className="h-4 w-4" />
               Listeyi Tazele
             </>
          ) : (
             <>
               <Plus className="h-4 w-4" />
               {activeTab === "packages" ? "Yeni Paket Ekle" : activeTab === "discounts" ? "Yeni İndirim Tanımla" : "Fatura Oluştur"}
             </>
          )}
        </button>
      </div>

      {/* Stats Quick View */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Toplam Jeton", value: "245,610", icon: Coins, color: "text-warning", bg: "bg-warning/10" },
          { label: "Aylık Gelir", value: "₺12,450", icon: Banknote, color: "text-success", bg: "bg-success/10" },
          { label: "Aktif Siparişler", value: "142", icon: Package, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Para Çekme Talepleri", value: withdrawals.filter(w => w.status === WithdrawStatus.Pending).length.toString(), icon: Wallet, color: "text-purple-500", bg: "bg-purple-500/10" },
        ].map((stat, i) => (
          <div key={i} className="glass-island rounded-[2rem] p-6 transition-transform hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <TrendingUp className="h-4 w-4 text-success opacity-50" />
            </div>
            <p className="text-2xl font-black">{stat.value}</p>
            <p className="text-xs font-bold text-base-content/40 uppercase tracking-widest mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs Switcher */}
      <div className="glass-island inline-flex p-1.5 rounded-[1.8rem] gap-1">
        {[
          { id: "packages", label: "Paketler", icon: Package },
          { id: "discounts", label: "İndirimler", icon: Percent },
          { id: "invoices", label: "Faturalar", icon: FileText },
          { id: "withdrawals", label: "Para Çekme", icon: Wallet },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType);
                // URL'yi güncelle (F5 sonrası aynı sekmede kalmak için)
                const params = new URLSearchParams(searchParams.toString());
                params.set("tab", tab.id);
                router.replace(`/management/economy?${params.toString()}`, { scroll: false });
              }}
              className={`flex items-center gap-2.5 rounded-[1.4rem] px-6 py-3 text-sm font-bold transition-all ${
                isActive 
                  ? "bg-primary text-primary-content shadow-lg shadow-primary/20" 
                  : "text-base-content/40 hover:bg-base-content/5 hover:text-base-content/70"
              }`}
            >
              <tab.icon className={`h-4 w-4 ${isActive ? "" : "opacity-40"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "packages" && (
           <div className="glass-island rounded-[2.5rem] p-8 md:p-12 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] -mr-8 -mt-8">
                 <Package className="h-64 w-64" />
              </div>
              <div className="relative z-10">
                 <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-black">Aktif Jeton Paketleri</h3>
                        <p className="mt-1 text-sm font-medium text-base-content/50">Kullanıcılara sunulan satın alma seçenekleri.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                           <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-30" />
                           <input 
                              type="text" 
                              placeholder="Paket ara..."
                              className="input input-bordered h-11 rounded-2xl pl-11 bg-base-100/30 text-sm focus:ring-primary w-64"
                              value={packagesState.search}
                              onChange={(e) => setPackagesState(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                           />
                        </div>
                    </div>
                 </div>
                 
                 {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                       <div className="loading loading-spinner loading-lg text-primary"></div>
                    </div>
                 ) : packages.length > 0 ? (
                    <div className="grid gap-4">
                       {packages.map((pkg) => (
                          <div key={pkg.id} className={`flex flex-col md:flex-row items-center gap-6 rounded-3xl border p-6 transition hover:bg-base-content/5 ${pkg.isActive ? 'border-base-content/10 bg-base-100/20' : 'border-dashed border-base-content/20 opacity-60 bg-base-content/5'}`}>
                             <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-warning/10 text-warning">
                                <Coins className="h-8 w-8" />
                             </div>
                             
                             <div className="flex-1 min-w-0 text-center md:text-left">
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                   <p className="text-lg font-black">{pkg.name}</p>
                                   {pkg.popular && <span className="text-[10px] font-black uppercase tracking-widest text-warning bg-warning/10 px-2 py-0.5 rounded-full ring-1 ring-warning/20">Popüler</span>}
                                   {pkg.bestValue && <span className="text-[10px] font-black uppercase tracking-widest text-success bg-success/10 px-2 py-0.5 rounded-full ring-1 ring-success/20">Avantajlı</span>}
                                   {!pkg.isActive && <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40 bg-base-content/10 px-2 py-0.5 rounded-full">Pasif</span>}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 text-xs font-bold text-base-content/40 uppercase tracking-widest">
                                   <span>{pkg.tokens} Jeton</span>
                                   {pkg.bonus > 0 && <span className="text-success">+{pkg.bonus} Bonus</span>}
                                   <span className="text-primary">₺{pkg.price}</span>
                                </div>
                             </div>

                             <div className="flex shrink-0 items-center gap-2">
                                <button 
                                  onClick={() => toggleStatus(pkg)}
                                  className={`p-3 rounded-xl transition ${pkg.isActive ? 'text-success hover:bg-success/10' : 'text-base-content/30 hover:bg-base-content/10'}`}
                                  title={pkg.isActive ? "Pasife Al" : "Aktife Al"}
                                >
                                   <Power className="h-5 w-5" />
                                </button>
                                <button 
                                  onClick={() => openModal(pkg)}
                                  className="p-3 rounded-xl text-primary hover:bg-primary/10 transition"
                                  title="Düzenle"
                                >
                                   <Edit2 className="h-5 w-5" />
                                </button>
                                <button 
                                  onClick={() => handleDelete(pkg.id)}
                                  className="p-3 rounded-xl text-error hover:bg-error/10 transition"
                                  title="Sil"
                                >
                                   <Trash2 className="h-5 w-5" />
                                </button>
                             </div>
                          </div>
                       ))}
                    </div>
                 ) : (
                    <div className="mt-10 flex flex-col items-center justify-center border border-dashed border-base-content/10 rounded-[2rem] p-20 text-center bg-base-content/2">
                       <History className="h-10 w-10 text-base-content/20 mb-4" />
                       <p className="text-sm font-bold text-base-content/40 uppercase tracking-widest">Henüz paket oluşturulmamış</p>
                    </div>
                 )}

                 {packagesState.total > 20 && (
                    <div className="mt-10 flex items-center justify-center gap-2">
                        <button 
                           onClick={() => setPackagesState(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))} 
                           disabled={packagesState.page === 1}
                           className="btn btn-ghost btn-sm rounded-xl"
                        >
                           <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-xs font-black uppercase tracking-widest opacity-40">Sayfa {packagesState.page}</span>
                        <button 
                           onClick={() => setPackagesState(prev => ({ ...prev, page: prev.page + 1 }))} 
                           disabled={packages.length < 20}
                           className="btn btn-ghost btn-sm rounded-xl"
                        >
                           <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                 )}
              </div>
           </div>
        )}

        {activeTab === "discounts" && (
           <div className="glass-island rounded-[2.5rem] p-8 md:p-12 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] -mr-8 -mt-8">
                 <Percent className="h-64 w-64" />
              </div>
              <div className="relative z-10">
                 <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-black">Kampanyalar ve İndirimler</h3>
                        <p className="mt-1 text-sm font-medium text-base-content/50">Bölüm açma işlemlerinde uygulanan hiyerarşik indirimler.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                           <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-30" />
                           <input 
                              type="text" 
                              placeholder="Kampanya ara..."
                              className="input input-bordered h-11 rounded-2xl pl-11 bg-base-100/30 text-sm focus:ring-primary w-64"
                              value={campaignsState.search}
                              onChange={(e) => setCampaignsState(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                           />
                        </div>
                    </div>
                 </div>
                 
                 {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                       <div className="loading loading-spinner loading-lg text-primary"></div>
                    </div>
                 ) : campaigns.length > 0 ? (
                    <div className="grid gap-4">
                       {campaigns.map((cp) => (
                          <div key={cp.id} className={`flex flex-col md:flex-row items-center gap-6 rounded-3xl border p-6 transition hover:bg-base-content/5 ${cp.isActive ? 'border-base-content/10 bg-base-100/20' : 'border-dashed border-base-content/20 opacity-60 bg-base-content/5'}`}>
                             <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-warning/10 text-warning">
                                <Percent className="h-8 w-8" />
                             </div>
                             
                             <div className="flex-1 min-w-0 text-center md:text-left">
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                   <p className="text-lg font-black">{cp.name}</p>
                                   <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ring-1 ${
                                      cp.targetType === CampaignTargetType.Global ? "bg-primary/10 text-primary ring-primary/20" :
                                      cp.targetType === CampaignTargetType.Book ? "bg-purple-500/10 text-purple-500 ring-purple-500/20" :
                                      "bg-blue-500/10 text-blue-500 ring-blue-500/20"
                                   }`}>
                                      {cp.targetType === CampaignTargetType.Global ? "Global" : cp.targetType === CampaignTargetType.Book ? "Kitap" : "Kategori"}
                                   </span>
                                   <span className="text-[10px] font-black uppercase tracking-widest text-success bg-success/10 px-2 py-0.5 rounded-full ring-1 ring-success/20">%{cp.discountPercentage} İndirim</span>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 text-xs font-bold text-base-content/40 uppercase tracking-widest">
                                   <span>{new Date(cp.startDate).toLocaleDateString()} - {new Date(cp.endDate).toLocaleDateString()}</span>
                                   <span className={cp.sponsorType === CampaignSponsorType.Platform ? "text-primary" : "text-warning"}>
                                      Sponsor: {cp.sponsorType === CampaignSponsorType.Platform ? "Platform" : "Yazar"}
                                   </span>
                                </div>
                             </div>

                             <div className="flex shrink-0 items-center gap-2">
                                <button 
                                  onClick={() => openCampaignModal(cp)}
                                  className="p-3 rounded-xl text-primary hover:bg-primary/10 transition"
                                >
                                   <Edit2 className="h-5 w-5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteCampaign(cp.id)}
                                  className="p-3 rounded-xl text-error hover:bg-error/10 transition"
                                >
                                   <Trash2 className="h-5 w-5" />
                                </button>
                             </div>
                          </div>
                       ))}
                    </div>
                 ) : (
                    <div className="mt-10 flex flex-col items-center justify-center border border-dashed border-base-content/10 rounded-[2rem] p-20 text-center bg-base-content/2">
                       <Percent className="h-10 w-10 text-base-content/20 mb-4" />
                       <p className="text-sm font-bold text-base-content/40 uppercase tracking-widest">Aktif kampanya bulunamadı</p>
                    </div>
                 )}

                 {campaignsState.total > 20 && (
                    <div className="mt-10 flex items-center justify-center gap-2">
                        <button 
                           onClick={() => setCampaignsState(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))} 
                           disabled={campaignsState.page === 1}
                           className="btn btn-ghost btn-sm rounded-xl"
                        >
                           <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-xs font-black uppercase tracking-widest opacity-40">Sayfa {campaignsState.page}</span>
                        <button 
                           onClick={() => setCampaignsState(prev => ({ ...prev, page: prev.page + 1 }))} 
                           disabled={campaigns.length < 20}
                           className="btn btn-ghost btn-sm rounded-xl"
                        >
                           <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                 )}
              </div>
           </div>
        )}

        {activeTab === "invoices" && (
           <div className="glass-island rounded-[2.5rem] p-12 overflow-hidden relative border-primary/10">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] -mr-8 -mt-8">
                 <FileText className="h-64 w-64" />
              </div>
              <div className="relative z-10">
                 <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-black">Giden Faturalar</h3>
                        <p className="mt-1 text-sm font-medium text-base-content/50">Müşteri ödemelerine ait resmi fatura dökümleri.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                           <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-30" />
                           <input 
                              type="text" 
                              placeholder="E-posta veya ID ara..."
                              className="input input-bordered h-11 rounded-2xl pl-11 bg-base-100/30 text-sm focus:ring-primary w-64"
                              value={ordersState.search}
                              onChange={(e) => setOrdersState(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                           />
                        </div>
                    </div>
                 </div>
                 
                 <div className="mt-1 border border-base-content/5 rounded-2xl overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[600px]">
                       <thead className="bg-base-content/5 uppercase text-[10px] font-black tracking-widest text-base-content/40">
                          <tr>
                             <th className="px-6 py-4">Sipariş No</th>
                             <th className="px-6 py-4">Müşteri</th>
                             <th className="px-6 py-4">Paket / İçerik</th>
                             <th className="px-6 py-4">Tarih</th>
                             <th className="px-6 py-4">Tutar</th>
                             <th className="px-6 py-4">Durum</th>
                             <th className="px-6 py-4 text-right">Fatura</th>
                          </tr>
                       </thead>
                       <tbody>
                          {isOrderLoading ? (
                             <tr>
                                <td colSpan={7} className="px-6 py-20 text-center">
                                   <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                   <p className="mt-2 font-bold opacity-40">Siparişler yükleniyor...</p>
                                </td>
                             </tr>
                          ) : orders.length > 0 ? (
                             orders.map(order => (
                                <tr key={order.id} className="border-t border-base-content/5 hover:bg-base-content/2 transition-colors">
                                   <td className="px-6 py-4 font-bold text-[10px] uppercase tracking-tighter">#{order.id.slice(0, 8)}</td>
                                   <td className="px-6 py-4">
                                      <div className="flex flex-col">
                                         <span className="font-bold">{order.buyerEmail}</span>
                                         <span className="text-[10px] opacity-40 uppercase font-black">{order.userId.slice(0, 8)}</span>
                                      </div>
                                   </td>
                                   <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                         <div className="p-1.5 rounded-lg bg-warning/10 text-warning">
                                            <Coins className="h-3.5 w-3.5" />
                                         </div>
                                         <span className="font-bold opacity-70">{order.packageName}</span>
                                         <span className="text-[10px] font-black text-warning">({order.coinAmount} Jeton)</span>
                                      </div>
                                   </td>
                                   <td className="px-6 py-4 opacity-50 font-medium">
                                      {new Date(order.createdAt).toLocaleDateString()}
                                   </td>
                                   <td className="px-6 py-4 font-black text-primary">₺{order.pricePaid}</td>
                                   <td className="px-6 py-4">
                                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                                         order.status === OrderStatus.Paid ? "bg-success/10 text-success" :
                                         order.status === OrderStatus.Pending ? "bg-warning/10 text-warning" :
                                         "bg-error/10 text-error"
                                      }`}>
                                         {order.status === OrderStatus.Paid ? "Ödendi" :
                                          order.status === OrderStatus.Pending ? "Bekliyor" : "Hata/İptal"}
                                      </span>
                                   </td>
                                   <td className="px-6 py-4 text-right">
                                      {order.invoiceDocumentId || order.invoiceFileUrl ? (
                                         <a 
                                           href={order.invoiceDocumentId ? `/api/compliance/documents/${order.invoiceDocumentId}/download` : order.invoiceFileUrl!} 
                                           target="_blank" 
                                           rel="noopener noreferrer"
                                           className="inline-flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-xs font-black text-primary transition hover:bg-primary/20"
                                         >
                                            <Download className="h-3.5 w-3.5" />
                                            İndir
                                         </a>
                                      ) : (
                                         <div className="flex justify-end">
                                            <label className={`cursor-pointer inline-flex items-center gap-2 rounded-xl bg-base-content/5 px-4 py-2 text-xs font-black text-base-content/60 transition hover:bg-base-content/10 ${isUploadingInvoice === order.id ? 'opacity-50 pointer-events-none' : ''}`}>
                                               {isUploadingInvoice === order.id ? (
                                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                               ) : (
                                                  <Upload className="h-3.5 w-3.5" />
                                               )}
                                               Yükle
                                               <input 
                                                 type="file" 
                                                 className="hidden" 
                                                 accept=".pdf,.jpg,.jpeg,.png"
                                                 onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleUploadInvoice(order.id, file);
                                                 }}
                                               />
                                            </label>
                                         </div>
                                      )}
                                   </td>
                                </tr>
                             ))
                          ) : (
                             <tr>
                                <td colSpan={7} className="px-6 py-20 text-center opacity-30 font-bold uppercase tracking-widest text-xs">
                                   Henüz işlem kaydı bulunamadı.
                                </td>
                             </tr>
                          )}
                       </tbody>
                    </table>
                 </div>

                 {ordersState.total > 20 && (
                    <div className="mt-10 flex items-center justify-center gap-2">
                        <button 
                           onClick={() => setOrdersState(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))} 
                           disabled={ordersState.page === 1}
                           className="btn btn-ghost btn-sm rounded-xl"
                        >
                           <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-xs font-black uppercase tracking-widest opacity-40">Sayfa {ordersState.page}</span>
                        <button 
                           onClick={() => setOrdersState(prev => ({ ...prev, page: prev.page + 1 }))} 
                           disabled={orders.length < 20}
                           className="btn btn-ghost btn-sm rounded-xl"
                        >
                           <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                 )}
              </div>
           </div>
        )}

        {activeTab === "withdrawals" && (
           <div className="glass-island rounded-[2.5rem] p-12 overflow-hidden relative border-purple-500/10">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] -mr-8 -mt-8">
                 <Wallet className="h-64 w-64 text-purple-500" />
              </div>
              <div className="relative z-10">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h3 className="text-xl font-black">Para Çekme Talepleri</h3>
                        <p className="mt-1 text-sm font-medium text-base-content/50">Yazarların nakit ödeme talepleri ve işlem geçmişi.</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <select 
                          className="h-10 rounded-xl bg-base-content/5 border border-base-content/10 px-4 text-xs font-bold focus:border-primary/40 outline-none transition"
                          onChange={(e) => {
                             setWithdrawFilter({...withdrawFilter, status: e.target.value === "" ? undefined : parseInt(e.target.value)});
                             setWithdrawalsState(prev => ({ ...prev, page: 1 }));
                          }}
                        >
                            <option value="">Tümü</option>
                            <option value={WithdrawStatus.Pending}>🔴 Bekleyenler</option>
                            <option value={WithdrawStatus.Approved}>🟢 Onaylananlar</option>
                            <option value={WithdrawStatus.Rejected}>⚪ Reddedilenler</option>
                        </select>
                        <div className="relative">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-30" />
                           <input 
                              type="text" 
                              placeholder="IBAN veya İsim..." 
                              className="h-10 pl-10 pr-4 rounded-xl bg-base-content/5 border border-base-content/10 text-xs font-bold focus:border-primary/40 outline-none transition w-48"
                              onChange={(e) => {
                                 setWithdrawFilter({...withdrawFilter, search: e.target.value});
                                 setWithdrawalsState(prev => ({ ...prev, page: 1 }));
                              }}
                           />
                        </div>
                    </div>
                 </div>
                 
                 <div className="border border-base-content/5 rounded-2xl overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[700px]">
                       <thead className="bg-base-content/5 uppercase text-[10px] font-black tracking-widest text-base-content/40">
                          <tr>
                             <th className="px-6 py-4">Müşteri / Yazar</th>
                             <th className="px-6 py-4">IBAN / Hesap Sahibi</th>
                             <th className="px-6 py-4">Tutar</th>
                             <th className="px-6 py-4">Tarih</th>
                             <th className="px-6 py-4">Durum</th>
                             <th className="px-6 py-4 text-right">İşlem</th>
                          </tr>
                       </thead>
                       <tbody>
                          {isWithdrawLoading ? (
                             <tr>
                                <td colSpan={6} className="px-6 py-20 text-center">
                                   <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                   <p className="mt-2 font-bold opacity-40 uppercase tracking-widest text-[10px]">Talepler yükleniyor...</p>
                                </td>
                             </tr>
                          ) : withdrawals.length > 0 ? (
                             withdrawals.map(req => (
                                <tr key={req.id} className="border-t border-base-content/5 hover:bg-base-content/2 transition-colors">
                                   <td className="px-6 py-4">
                                      <div className="flex flex-col">
                                         <span className="font-bold text-base-content/80 text-xs">{req.userName}</span>
                                         <span className="text-[10px] opacity-40 uppercase font-black">{req.userId.slice(0, 8)}</span>
                                      </div>
                                   </td>
                                   <td className="px-6 py-4">
                                      <div className="flex flex-col max-w-[200px]">
                                         <span className="font-mono text-xs font-bold text-primary truncate" title={req.iban}>{req.iban}</span>
                                         <span className="text-[10px] font-black uppercase opacity-60">{req.accountHolderName}</span>
                                      </div>
                                   </td>
                                   <td className="px-6 py-4 font-black text-xs">
                                      <span className="text-success text-sm">₺{req.amount}</span>
                                   </td>
                                   <td className="px-6 py-4 opacity-50 font-bold text-[10px]">
                                      {new Date(req.createdAt).toLocaleDateString()}
                                   </td>
                                   <td className="px-6 py-4">
                                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                                         req.status === WithdrawStatus.Pending ? "bg-warning/10 text-warning" :
                                         req.status === WithdrawStatus.Approved ? "bg-success/10 text-success" :
                                         req.status === WithdrawStatus.Rejected ? "bg-error/10 text-error" :
                                         "bg-blue-500/10 text-blue-500"
                                      }`}>
                                         {req.status === WithdrawStatus.Pending ? "🔴 Beklemede" :
                                          req.status === WithdrawStatus.Approved ? "🟢 Onaylandı" : 
                                          req.status === WithdrawStatus.Rejected ? "⚪ Reddedildi" : "🔵 Tamamlandı"}
                                      </span>
                                   </td>
                                   <td className="px-6 py-4 text-right">
                                      {req.status === WithdrawStatus.Pending ? (
                                         <div className="flex justify-end gap-2">
                                            <button 
                                              onClick={() => {
                                                setProcessingWithdraw(req);
                                                setWithdrawProcessData({
                                                    status: WithdrawStatus.Approved,
                                                    note: "",
                                                    receiptFile: null,
                                                    receiptId: "",
                                                    isUploading: false
                                                });
                                                setIsWithdrawModalOpen(true);
                                              }}
                                              className="p-2 rounded-xl bg-success/10 text-success hover:bg-success/20 transition"
                                              title="İşlem Yap"
                                            >
                                               <Edit2 className="h-4 w-4" />
                                            </button>
                                         </div>
                                      ) : (
                                         <div className="flex items-center justify-end gap-2">
                                            {req.receiptDocumentId && (
                                                <a 
                                                    href={`/api/compliance/documents/${req.receiptDocumentId}/download`}
                                                    target="_blank"
                                                    className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition"
                                                    title="Dekontu İndir"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </a>
                                            )}
                                            <span className="text-[10px] font-bold opacity-30 italic">{req.adminNote || "- İşlem Tamam -"}</span>
                                         </div>
                                      )}
                                   </td>
                                </tr>
                             ))
                          ) : (
                             <tr>
                                <td colSpan={6} className="px-6 py-20 text-center opacity-30 font-bold uppercase tracking-widest text-xs">
                                   Henüz para çekme talebi bulunamadı.
                                </td>
                             </tr>
                          )}
                       </tbody>
                    </table>
                 </div>

                 {withdrawalsState.total > 20 && (
                    <div className="mt-10 flex items-center justify-center gap-2">
                        <button 
                           onClick={() => setWithdrawalsState(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))} 
                           disabled={withdrawalsState.page === 1}
                           className="btn btn-ghost btn-sm rounded-xl"
                        >
                           <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-xs font-black uppercase tracking-widest opacity-40">Sayfa {withdrawalsState.page}</span>
                        <button 
                           onClick={() => setWithdrawalsState(prev => ({ ...prev, page: prev.page + 1 }))} 
                           disabled={withdrawals.length < 20}
                           className="btn btn-ghost btn-sm rounded-xl"
                        >
                           <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                 )}
              </div>
           </div>
        )}
      </div>

      {/* Withdrawal Process Modal */}
      {isWithdrawModalOpen && processingWithdraw && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-base-100/90 backdrop-blur-xl" onClick={() => setIsWithdrawModalOpen(false)} />
           <div className="glass-frame relative w-full max-w-lg p-8 md:p-10 border-primary/20">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                       <Wallet className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black">Ödeme İşlemi</h2>
                        <p className="text-[10px] font-bold text-base-content/40 uppercase tracking-widest">#{processingWithdraw.id.slice(0, 8)}</p>
                    </div>
                 </div>
                 <button onClick={() => setIsWithdrawModalOpen(false)} className="p-2 rounded-xl hover:bg-base-content/5"><X className="h-5 w-5" /></button>
              </div>

              <div className="grid gap-6">
                 {/* Summary Info */}
                 <div className="p-4 rounded-2xl bg-base-content/5 border border-base-content/5">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Yazar</span>
                        <span className="font-bold">{processingWithdraw.userName}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">IBAN</span>
                        <span className="font-mono text-sm text-primary">{processingWithdraw.iban}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-base-content/5">
                        <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Ödenecek Tutar</span>
                        <span className="text-lg font-black text-success">₺{processingWithdraw.amount}</span>
                    </div>
                 </div>

                 {/* Status Selector */}
                 <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => setWithdrawProcessData(prev => ({ ...prev, status: WithdrawStatus.Approved }))}
                        className={`h-12 rounded-xl border-2 flex items-center justify-center gap-2 font-bold text-sm transition ${
                            withdrawProcessData.status === WithdrawStatus.Approved 
                            ? 'bg-success/10 border-success text-success' 
                            : 'border-base-content/5 bg-base-content/5 text-base-content/40'
                        }`}
                    >
                        <Check className="h-4 w-4" />
                        Öde / Onayla
                    </button>
                    <button 
                        onClick={() => setWithdrawProcessData(prev => ({ ...prev, status: WithdrawStatus.Rejected }))}
                        className={`h-12 rounded-xl border-2 flex items-center justify-center gap-2 font-bold text-sm transition ${
                            withdrawProcessData.status === WithdrawStatus.Rejected 
                            ? 'bg-error/10 border-error text-error' 
                            : 'border-base-content/5 bg-base-content/5 text-base-content/40'
                        }`}
                    >
                        <Trash2 className="h-4 w-4" />
                        Reddet / İptal
                    </button>
                 </div>

                 {withdrawProcessData.status === WithdrawStatus.Approved ? (
                     <div className="grid gap-4">
                        <label className="text-xs font-black uppercase tracking-widest text-base-content/40 ml-1">Ödeme Dekontu (Zorunlu)</label>
                        <div className="relative">
                            <label className={`flex flex-col items-center justify-center h-32 rounded-3xl border-2 border-dashed transition-all cursor-pointer ${
                                withdrawProcessData.receiptId 
                                ? 'border-success/40 bg-success/5' 
                                : 'border-base-content/10 bg-base-content/2 hover:bg-base-content/5'
                            }`}>
                                {withdrawProcessData.isUploading ? (
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                ) : withdrawProcessData.receiptFile ? (
                                    <>
                                        <Check className="h-8 w-8 text-success mb-1" />
                                        <span className="text-[10px] font-bold uppercase text-success truncate max-w-[200px]">{withdrawProcessData.receiptFile.name}</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-8 w-8 opacity-20 mb-1" />
                                        <span className="text-[10px] font-bold uppercase opacity-40">PDF veya Görsel Yükleyin</span>
                                    </>
                                )}
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) uploadReceipt(file);
                                    }}
                                />
                            </label>
                        </div>
                     </div>
                 ) : (
                     <div className="p-4 rounded-2xl bg-error/10 border border-error/20 flex gap-3">
                        <AlertCircle className="h-5 w-5 text-error shrink-0" />
                        <p className="text-xs font-bold text-error leading-relaxed">
                            Bu işlem talebi reddedecek ve tutarı yazarın bakiyesine iade edecektir. Lütfen reddetme nedenini aşağıya yazın.
                        </p>
                     </div>
                 )}

                 <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-widest text-base-content/40 ml-1">İşlem Notu</label>
                    <textarea 
                        value={withdrawProcessData.note}
                        onChange={e => setWithdrawProcessData(prev => ({ ...prev, note: e.target.value }))}
                        placeholder={withdrawProcessData.status === WithdrawStatus.Rejected ? "Mecburi ret sebebi..." : "Opsiyonel not..."}
                        className="w-full h-24 rounded-2xl bg-base-content/5 border border-base-content/10 p-4 text-sm font-bold focus:border-primary/40 outline-none transition resize-none"
                    />
                 </div>
              </div>

              <div className="mt-10 flex gap-4">
                 <button onClick={() => setIsWithdrawModalOpen(false)} className="flex-1 h-12 rounded-2xl bg-base-content/5 text-sm font-black transition hover:bg-base-content/10">İptal</button>
                 <button 
                    disabled={isWithdrawLoading || withdrawProcessData.isUploading || (withdrawProcessData.status === WithdrawStatus.Approved && !withdrawProcessData.receiptId) || (withdrawProcessData.status === WithdrawStatus.Rejected && !withdrawProcessData.note)}
                    onClick={handleWithdrawProcess} 
                    className="flex-[2] h-12 rounded-2xl bg-primary text-primary-content text-sm font-black shadow-lg shadow-primary/20 transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                 >
                    {isWithdrawLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    İşlemi Tamamla
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Package Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-base-100/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
           <div className="glass-frame relative w-full max-w-xl p-8 md:p-10">
              <div className="flex items-center justify-between mb-8">
                 <h2 className="text-2xl font-black">{editingPackage ? "Paketi Düzenle" : "Yeni Paket Oluştur"}</h2>
                 <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl hover:bg-base-content/5"><X className="h-5 w-5" /></button>
              </div>

              <div className="grid gap-6">
                 <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-widest text-base-content/40 ml-1">Paket Adı</label>
                    <input 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      type="text" 
                      placeholder="Örn: Başlangıç Paketi" 
                      className="h-12 rounded-xl bg-base-content/5 border border-base-content/10 px-4 text-sm font-bold focus:border-primary/40 focus:ring-4 focus:ring-primary/10 outline-none transition" 
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="grid gap-2">
                       <label className="text-xs font-black uppercase tracking-widest text-base-content/40 ml-1">Fiyat (₺)</label>
                       <input 
                         value={formData.price}
                         onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                         type="number" 
                         className="h-12 rounded-xl bg-base-content/5 border border-base-content/10 px-4 text-sm font-bold focus:border-primary/40 outline-none transition" 
                       />
                    </div>
                    <div className="grid gap-2">
                       <label className="text-xs font-black uppercase tracking-widest text-base-content/40 ml-1">Jeton Miktarı</label>
                       <input 
                         value={formData.amount}
                         onChange={e => setFormData({...formData, amount: parseInt(e.target.value) || 0})}
                         type="number" 
                         className="h-12 rounded-xl bg-base-content/5 border border-base-content/10 px-4 text-sm font-bold focus:border-primary/40 outline-none transition" 
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="grid gap-2">
                       <label className="text-xs font-black uppercase tracking-widest text-base-content/40 ml-1">Bonus Jeton</label>
                       <input 
                         value={formData.bonusAmount}
                         onChange={e => setFormData({...formData, bonusAmount: parseInt(e.target.value) || 0})}
                         type="number" 
                         className="h-12 rounded-xl bg-base-content/5 border border-base-content/10 px-4 text-sm font-bold focus:border-primary/40 outline-none transition" 
                       />
                    </div>
                    <div className="grid gap-2">
                       <label className="text-xs font-black uppercase tracking-widest text-base-content/40 ml-1">Görünüm Sırası</label>
                       <input 
                         value={formData.displayOrder}
                         onChange={e => setFormData({...formData, displayOrder: parseInt(e.target.value) || 0})}
                         type="number" 
                         className="h-12 rounded-xl bg-base-content/5 border border-base-content/10 px-4 text-sm font-bold focus:border-primary/40 outline-none transition" 
                       />
                    </div>
                 </div>

                 <div className="mt-6 flex items-center gap-3 p-4 rounded-2xl bg-base-content/5 border border-base-content/5 transition hover:bg-base-content/10 cursor-pointer select-none" onClick={() => setFormData({...formData, isBestValue: !formData.isBestValue})}>
                    <div className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 transition ${formData.isBestValue ? 'bg-primary border-primary text-primary-content' : 'border-base-content/20'}`}>
                       {formData.isBestValue && <Check className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                       <p className="text-sm font-black">En Avantajlı Paket</p>
                       <p className="text-[10px] font-bold text-base-content/40 uppercase tracking-widest">Kullanıcılara "Fırsat" etiketiyle gösterilir</p>
                    </div>
                 </div>
              </div>

              <div className="mt-10 flex gap-4">
                 <button onClick={() => setIsModalOpen(false)} className="flex-1 h-12 rounded-2xl bg-base-content/5 text-sm font-black transition hover:bg-base-content/10">İptal</button>
                 <button onClick={handleSave} className="flex-1 h-12 rounded-2xl bg-primary text-primary-content text-sm font-black shadow-lg shadow-primary/20 transition hover:opacity-90 flex items-center justify-center gap-2">
                    <Save className="h-4 w-4" />
                    {editingPackage ? "Güncelle" : "Oluştur"}
                 </button>
              </div>
           </div>
        </div>
      )}
      {/* Campaign Form Modal */}
      {isCampaignModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-base-100/80 backdrop-blur-md" onClick={() => setIsCampaignModalOpen(false)} />
           <div className="glass-frame relative w-full max-w-xl p-8 md:p-10">
              <div className="flex items-center justify-between mb-8">
                 <h2 className="text-2xl font-black">{editingCampaign ? "Kampanyayı Düzenle" : "Yeni Kampanya Oluştur"}</h2>
                 <button onClick={() => setIsCampaignModalOpen(false)} className="p-2 rounded-xl hover:bg-base-content/5"><X className="h-5 w-5" /></button>
              </div>

              <div className="grid gap-6 max-h-[70vh] overflow-y-auto px-1 pr-4 custom-scrollbar">
                 <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-widest text-base-content/40 ml-1">Kampanya Adı</label>
                    <input 
                      value={campaignFormData.name}
                      onChange={e => setCampaignFormData({...campaignFormData, name: e.target.value})}
                      type="text" 
                      placeholder="Örn: Hafta Sonu Aksiyon İndirimi" 
                      className="h-12 rounded-xl bg-base-content/5 border border-base-content/10 px-4 text-sm font-bold focus:border-primary/40 focus:ring-4 focus:ring-primary/10 outline-none transition" 
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="grid gap-2">
                       <label className="text-xs font-black uppercase tracking-widest text-base-content/40 ml-1">Kapsam (Hedef)</label>
                       <select 
                         value={campaignFormData.targetType}
                         onChange={e => {
                           const type = parseInt(e.target.value);
                           setCampaignFormData({
                             ...campaignFormData, 
                             targetType: type,
                             // Global seçilirse Sponsoru mecburen Platform yap
                             sponsorType: type === CampaignTargetType.Global ? CampaignSponsorType.Platform : campaignFormData.sponsorType
                           });
                         }}
                         className="h-12 rounded-xl bg-base-content/5 border border-base-content/10 px-4 text-sm font-bold focus:border-primary/40 outline-none transition"
                       >
                          <option value={CampaignTargetType.Global}>Global (Tümü)</option>
                          <option value={CampaignTargetType.Book}>Kitap Bazlı</option>
                          <option value={CampaignTargetType.Category}>Kategori Bazlı</option>
                       </select>
                    </div>

                    <div className="grid gap-2">
                       <label className="text-xs font-black uppercase tracking-widest text-base-content/40 ml-1">İndirim Oranı (%)</label>
                       <input 
                         value={campaignFormData.discountPercentage}
                         onChange={e => setCampaignFormData({...campaignFormData, discountPercentage: parseInt(e.target.value) || 0})}
                         type="number" 
                         min="1" max="99"
                         className="h-12 rounded-xl bg-base-content/5 border border-base-content/10 px-4 text-sm font-bold focus:border-primary/40 outline-none transition" 
                       />
                    </div>
                 </div>

                 {campaignFormData.targetType !== CampaignTargetType.Global && (
                    <div className="grid gap-2">
                       <label className="text-xs font-black uppercase tracking-widest text-base-content/40 ml-1">
                          {campaignFormData.targetType === CampaignTargetType.Book ? "Kitap Seçin" : "Kategori Seçin"}
                       </label>
                       <select 
                         value={campaignFormData.targetId}
                         onChange={e => setCampaignFormData({...campaignFormData, targetId: e.target.value})}
                         className="h-12 rounded-xl bg-base-content/5 border border-base-content/10 px-4 text-sm font-bold focus:border-primary/40 outline-none transition"
                       >
                          <option value="">Seçiniz...</option>
                          {campaignFormData.targetType === CampaignTargetType.Book ? (
                             books.map(b => (
                                <option key={b.id} value={b.id}>{b.title}</option>
                             ))
                          ) : (
                             categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                             ))
                          )}
                       </select>
                    </div>
                 )}

                 <div className="grid grid-cols-2 gap-6">
                    <div className="grid gap-2 text-left">
                       <div className="flex items-center gap-2 mb-1">
                          <label className="text-xs font-black uppercase tracking-widest text-base-content/40 ml-1">Başlangıç</label>
                       </div>
                       <input 
                         value={campaignFormData.startDate}
                         onChange={e => setCampaignFormData({...campaignFormData, startDate: e.target.value})}
                         type="date" 
                         className="h-12 rounded-xl bg-base-content/5 border border-base-content/10 px-4 text-sm font-bold focus:border-primary/40 outline-none transition" 
                       />
                    </div>
                    <div className="grid gap-2 text-left">
                       <label className="text-xs font-black uppercase tracking-widest text-base-content/40 ml-1">Bitiş</label>
                       <input 
                         value={campaignFormData.endDate}
                         onChange={e => setCampaignFormData({...campaignFormData, endDate: e.target.value})}
                         type="date" 
                         className="h-12 rounded-xl bg-base-content/5 border border-base-content/10 px-4 text-sm font-bold focus:border-primary/40 outline-none transition" 
                       />
                    </div>
                 </div>

                 <div className="grid gap-2">
                    <div className="flex items-center gap-2">
                       <label className="text-xs font-black uppercase tracking-widest text-base-content/40 ml-1">Sponsor (Maliyeti Karşılayan)</label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <button
                         type="button"
                         onClick={() => setCampaignFormData({...campaignFormData, sponsorType: CampaignSponsorType.Platform})}
                         title="İndirim maliyetini platform üstlenir; yazar sanki ürün tam fiyata satılmış gibi payını alır."
                         className={`h-12 rounded-xl border-2 flex items-center justify-center gap-2 font-bold text-sm transition ${
                            campaignFormData.sponsorType === CampaignSponsorType.Platform 
                            ? 'bg-primary/10 border-primary text-primary' 
                            : 'border-base-content/5 bg-base-content/5 text-base-content/40'
                         }`}
                       >
                          Platform Karşılar
                       </button>
                       <button
                         type="button"
                         disabled={campaignFormData.targetType === CampaignTargetType.Global}
                         onClick={() => setCampaignFormData({...campaignFormData, sponsorType: CampaignSponsorType.Author})}
                         title="İndirim maliyeti yazara yansıtılır; yazarın payı indirimli fiyat üzerinden hesaplanır."
                         className={`h-12 rounded-xl border-2 flex items-center justify-center gap-2 font-bold text-sm transition ${
                            campaignFormData.targetType === CampaignTargetType.Global ? 'opacity-30 cursor-not-allowed' : ''
                         } ${
                            campaignFormData.sponsorType === CampaignSponsorType.Author 
                            ? 'bg-warning/10 border-warning text-warning' 
                            : 'border-base-content/5 bg-base-content/5 text-base-content/40'
                         }`}
                       >
                          Yazar Karşılar
                       </button>
                    </div>
                 </div>

                 {campaignFormData.sponsorType === CampaignSponsorType.Author && (
                    <div className="p-4 rounded-2xl bg-warning/10 border border-warning/20 text-warning">
                       <p className="text-sm font-bold flex items-center gap-2">
                          <Trash2 className="h-4 w-4" /> {/* Warning-like icon */}
                          ⚠️ Uyarı: Bu indirim yazar tarafından karşılanacak. Yazarın bu işlem başına geliri %{campaignFormData.discountPercentage} oranında azalacaktır.
                       </p>
                    </div>
                 )}
              </div>

              <div className="mt-10 flex gap-4">
                 <button onClick={() => setIsCampaignModalOpen(false)} className="flex-1 h-12 rounded-2xl bg-base-content/5 text-sm font-black transition hover:bg-base-content/10">İptal</button>
                 <button onClick={handleSaveCampaign} className="flex-1 h-12 rounded-2xl bg-primary text-primary-content text-sm font-black shadow-lg shadow-primary/20 transition hover:opacity-90 flex items-center justify-center gap-2">
                    <Save className="h-4 w-4" />
                    {editingCampaign ? "Güncelle" : "Oluştur"}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Manual Order Modal */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-base-100/80 backdrop-blur-md" onClick={() => setIsOrderModalOpen(false)} />
           <div className="glass-frame relative w-full max-w-xl p-8 md:p-10">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                       <FilePlus className="h-6 w-6" />
                    </div>
                    <h2 className="text-2xl font-black">Manuel Fatura Girişi</h2>
                 </div>
                 <button onClick={() => setIsOrderModalOpen(false)} className="p-2 rounded-xl hover:bg-base-content/5"><X className="h-5 w-5" /></button>
              </div>

              <div className="grid gap-6">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="grid gap-2">
                       <label className="text-xs font-black uppercase tracking-widest text-base-content/40 ml-1">Kullanıcı ID</label>
                       <input 
                         value={orderFormData.userId}
                         onChange={e => setOrderFormData({...orderFormData, userId: e.target.value})}
                         type="text" 
                         placeholder="GUID formatında" 
                         className="h-12 rounded-xl bg-base-content/5 border border-base-content/10 px-4 text-sm font-bold focus:border-primary/40 outline-none transition" 
                       />
                    </div>
                    <div className="grid gap-2">
                       <label className="text-xs font-black uppercase tracking-widest text-base-content/40 ml-1">Müşteri E-Posta</label>
                       <input 
                         value={orderFormData.buyerEmail}
                         onChange={e => setOrderFormData({...orderFormData, buyerEmail: e.target.value})}
                         type="email" 
                         placeholder="musteri@mail.com" 
                         className="h-12 rounded-xl bg-base-content/5 border border-base-content/10 px-4 text-sm font-bold focus:border-primary/40 outline-none transition" 
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="grid gap-2">
                       <label className="text-xs font-black uppercase tracking-widest text-base-content/40 ml-1">Ödenen Tutar (₺)</label>
                       <input 
                         value={orderFormData.pricePaid}
                         onChange={e => setOrderFormData({...orderFormData, pricePaid: parseFloat(e.target.value) || 0})}
                         type="number" 
                         className="h-12 rounded-xl bg-base-content/5 border border-base-content/10 px-4 text-sm font-bold focus:border-primary/40 outline-none transition" 
                       />
                    </div>
                    <div className="grid gap-2">
                       <label className="text-xs font-black uppercase tracking-widest text-base-content/40 ml-1">Jeton Miktarı</label>
                       <input 
                         value={orderFormData.coinAmount}
                         onChange={e => setOrderFormData({...orderFormData, coinAmount: parseInt(e.target.value) || 0})}
                         type="number" 
                         className="h-12 rounded-xl bg-base-content/5 border border-base-content/10 px-4 text-sm font-bold focus:border-primary/40 outline-none transition" 
                       />
                    </div>
                 </div>

                 <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-widest text-base-content/40 ml-1">Açıklama</label>
                    <input 
                      value={orderFormData.description}
                      onChange={e => setOrderFormData({...orderFormData, description: e.target.value})}
                      type="text" 
                      className="h-12 rounded-xl bg-base-content/5 border border-base-content/10 px-4 text-sm font-bold focus:border-primary/40 outline-none transition" 
                    />
                 </div>

                 <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-widest text-base-content/40 ml-1">Fatura Belgesi (PDF/Resim)</label>
                    <div className="flex items-center gap-4">
                       <label className="flex-1 cursor-pointer">
                          <div className="h-24 rounded-2xl border-2 border-dashed border-base-content/10 bg-base-content/2 hover:bg-base-content/5 transition flex flex-col items-center justify-center gap-1">
                             <Upload className="h-6 w-6 opacity-30" />
                             <span className="text-[10px] font-black uppercase opacity-40">
                                {orderFormData.invoiceFile ? orderFormData.invoiceFile.name : "Tıkla veya Sürükle"}
                             </span>
                          </div>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={e => setOrderFormData({...orderFormData, invoiceFile: e.target.files?.[0] || null})}
                          />
                       </label>
                       {orderFormData.invoiceFile && (
                          <button 
                            onClick={() => setOrderFormData({...orderFormData, invoiceFile: null})}
                            className="p-3 rounded-xl text-error bg-error/10 hover:bg-error/20 transition"
                          >
                             <Trash2 className="h-5 w-5" />
                          </button>
                       )}
                    </div>
                 </div>

                 <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                    <p className="text-xs font-bold leading-relaxed">
                       ℹ️ <strong>Önemli:</strong> Bu işlem tamamlandığında kullanıcı hesabına yukarıda belirtilen miktarda jeton anında yüklenecektir. Fatura belgesi sisteme kaydedilecek ve kullanıcıya bildirim gönderilecektir.
                    </p>
                 </div>
              </div>

              <div className="mt-10 flex gap-4">
                 <button onClick={() => setIsOrderModalOpen(false)} className="flex-1 h-12 rounded-2xl bg-base-content/5 text-sm font-black transition hover:bg-base-content/10">İptal</button>
                 <button onClick={handleCreateManualOrder} className="flex-1 h-12 rounded-2xl bg-primary text-primary-content text-sm font-black shadow-lg shadow-primary/20 transition hover:opacity-90 flex items-center justify-center gap-2">
                    <Save className="h-4 w-4" />
                    Kaydet ve Onayla
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
