"use client";

import React, { useState, useEffect } from "react";
import {
  ClipboardList,
  ChevronRight,
  Zap,
  UserPlus,
  CreditCard,
  History,
  Clock,
  Search,
  Filter,
  MoreVertical,
  Loader2,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Check,
  X
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { toast } from "@/lib/toast";
import { ModerationTicketsView } from "@/components/management/moderation-tickets-view";

type RequestType = 'author' | 'paid' | 'moderation';
type RequestStatus = 'active' | 'history';

interface AuthorApplication {
  id: string;
  userId: string;
  userName: string;
  sampleContent: string;
  experience: string;
  plannedWork: string;
  status: number; // 0: Pending, 1: Approved, 2: Rejected
  createdAt: string;
}

interface PaidAuthorApplication {
  id: string;
  userId: string;
  userName: string;
  bankName: string;
  iban: string;
  bankDocumentUrl: string;
  gvkExemptionCertificateUrl: string;
  status: number;
  createdAt: string;
}

export default function RequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentType = (searchParams.get('type') as RequestType) || 'author';
  const currentStatus = (searchParams.get('status') as RequestStatus) || 'active';

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  const [selectedApplication, setSelectedApplication] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [note, setNote] = useState("");
  const [modalMode, setModalMode] = useState<'view' | 'rejecting'>('view');

  const handleAction = async (status: number) => {
    if (!selectedApplication) return;
    
    // Status 1: Approve, 2: Reject
    if (status === 2 && modalMode === 'view') {
      setModalMode('rejecting');
      return;
    }

    if (status === 2 && !note.trim()) {
      toast.error({ description: "Lütfen red nedenini belirtin." });
      return;
    }

    setActionLoading(true);
    try {
      const isAuthor = currentType === 'author';
      const endpoint = isAuthor ? '/management/author/review' : '/management/paid-author/review';
      
      const payload = isAuthor 
        ? { applicationId: selectedApplication.id, status, rejectionReason: note }
        : { applicationId: selectedApplication.id, status, adminNote: note };

      await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      toast.success({ description: `Başvuru başarıyla ${status === 1 ? 'onaylandı' : 'reddedildi'}.` });
      
      setData(prev => prev.filter(item => item.id !== selectedApplication.id));
      setSelectedApplication(null);
    } catch (error: any) {
      toast.error({ description: error.message || "İşlem sırasında bir hata oluştu." });
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentType, currentStatus]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      let endpoint = '';
      if (currentType === 'author') endpoint = '/management/author-applications';
      else if (currentType === 'paid') endpoint = '/management/paid-author-applications';
      else if (currentType === 'moderation') endpoint = '/compliance/moderation/tickets';

      const statusParam = currentStatus === 'active' ? (currentType === 'moderation' ? '' : '?status=0') : '';

      const response = await apiRequest<any[]>(`${endpoint}${statusParam}`);

      if (currentStatus === 'history' && currentType !== 'moderation') {
        setData(response.filter(item => item.status !== 0));
      } else {
        setData(response);
      }
    } catch (error) {
      toast.error({ description: "Veriler yüklenirken bir hata oluştu." });
    } finally {
      setIsLoading(false);
    }
  };

  const setTabState = (type: RequestType, status: RequestStatus) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('type', type);
    params.set('status', status);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const getBadgeInfo = (status: number) => {
    switch (status) {
      case 0: return { label: 'Beklemede', color: 'bg-warning/10 text-warning border-warning/20' };
      case 1: return { label: 'Onaylandı', color: 'bg-success/10 text-success border-success/20' };
      case 2: return { label: 'Reddedildi', color: 'bg-error/10 text-error border-error/20' };
      default: return { label: 'Bilinmiyor', color: 'bg-base-content/10 text-base-content/40 border-base-content/20' };
    }
  };

  const RequestCard = ({ item }: { item: any }) => {
    const badge = getBadgeInfo(item.status);
    const dateStr = new Date(item.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

    return (
      <div className="group relative bg-base-content/2 border border-base-content/5 rounded-4xl p-6 transition-all hover:bg-base-content/5 hover:border-primary/20">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black">
              {item.userName.charAt(0)}
            </div>
            <div className="min-w-0">
              <h4 className="font-black text-sm text-base-content truncate group-hover:text-primary transition-colors">{item.userName}</h4>
              <div className="flex items-center gap-2 mt-0.5">
                <Clock size={10} className="text-base-content/20" />
                <span className="text-[10px] font-bold text-base-content/30 italic">{dateStr}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${badge.color}`}>
              {badge.label}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-base-content/5 space-y-3">
          {currentType === 'author' ? (
            <>
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase text-base-content/30 tracking-thighter">Deneyim:</span>
                <p className="text-[11px] font-medium text-base-content/60 leading-relaxed italic line-clamp-2">"{item.experience}"</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase text-base-content/30 tracking-thighter">Planlanan Eser:</span>
                <p className="text-[11px] font-medium text-base-content/60 italic line-clamp-2">"{item.plannedWork}"</p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase text-base-content/30 italic">{item.bankName}</span>
                <span className="text-[10px] font-mono font-bold text-base-content/60">{item.iban}</span>
              </div>
              <div className="flex gap-2">
                <a href={item.bankDocumentUrl} target="_blank" className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-base-content/5 border border-base-content/5 text-[10px] font-black uppercase hover:bg-primary/10 hover:text-primary transition-colors no-underline">
                  <FileText size={12} /> Banka Dekontu
                </a>
                <a href={item.gvkExemptionCertificateUrl} target="_blank" className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-base-content/5 border border-base-content/5 text-[10px] font-black uppercase hover:bg-primary/10 hover:text-primary transition-colors no-underline">
                  <ShieldCheck size={12} /> GVK Muafiyet
                </a>
              </div>
            </>
          )}
        </div>

        {/* Action Button */}
        {item.status === 0 && (
          <div className="mt-4">
            <button
              onClick={() => { setSelectedApplication(item); setModalMode('view'); setNote(''); }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-base-content/10 text-[10px] font-black uppercase tracking-widest text-base-content/60 hover:bg-primary hover:text-primary-content transition-all no-underline shadow-lg shadow-base-content/5"
            >
              Başvuru Detayını İncele
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <ClipboardList className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">Talepler</h1>
          </div>
          <p className="text-sm font-bold text-base-content/40 uppercase tracking-widest ml-1">Kullanıcı Başvuruları ve Sistem Talepleri</p>
        </div>

        {/* Top Type Tabs */}
        <div className="inline-flex p-1.5 rounded-[1.8rem] bg-base-content/5 border border-base-content/5 shadow-inner">
          <button
            onClick={() => setTabState('author', currentStatus)}
            className={`flex items-center gap-2 px-6 py-3 rounded-[1.4rem] text-[10px] font-black uppercase tracking-widest transition-all ${currentType === 'author'
                ? 'bg-primary text-primary-content shadow-xl shadow-primary/30 scale-105'
                : 'text-base-content/40 hover:text-base-content/60 hover:bg-base-content/5'
              }`}
          >
            <UserPlus size={14} />
            Yazar Talepleri
          </button>
          <button
            onClick={() => setTabState('paid', currentStatus)}
            className={`flex items-center gap-2 px-6 py-3 rounded-[1.4rem] text-[10px] font-black uppercase tracking-widest transition-all ${currentType === 'paid'
                ? 'bg-primary text-primary-content shadow-xl shadow-primary/30 scale-105'
                : 'text-base-content/40 hover:text-base-content/60 hover:bg-base-content/5'
              }`}
          >
            <CreditCard size={14} />
            Ücretli Yazarlık
          </button>
          <button
            onClick={() => setTabState('moderation', currentStatus)}
            className={`flex items-center gap-2 px-6 py-3 rounded-[1.4rem] text-[10px] font-black uppercase tracking-widest transition-all ${currentType === 'moderation'
                ? 'bg-primary text-primary-content shadow-xl shadow-primary/30 scale-105'
                : 'text-base-content/40 hover:text-base-content/60 hover:bg-base-content/5'
              }`}
          >
            <ShieldAlert size={14} />
            Raporlar
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="glass-island rounded-[3rem] p-8 md:p-10 relative overflow-hidden min-h-[600px] flex flex-col border border-primary/5">
        <div className="absolute top-0 right-0 p-12 opacity-[0.015] pointer-events-none select-none">
          <ClipboardList className="h-96 w-96 -mr-24 -mt-24" />
        </div>

        {/* Sub Status Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-10 z-10">
          <div className="flex items-center gap-1 p-1 bg-base-content/2 rounded-2xl border border-base-content/5">
            <button
              onClick={() => setTabState(currentType, 'active')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentStatus === 'active'
                  ? 'bg-base-content/10 text-primary scale-105 shadow-sm font-black'
                  : 'text-base-content/30 hover:text-base-content/50'
                }`}
            >
              <Zap size={13} className={currentStatus === 'active' ? 'fill-primary' : ''} />
              Aktif İşlemler
            </button>
            <button
              onClick={() => setTabState(currentType, 'history')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentStatus === 'history'
                  ? 'bg-base-content/10 text-primary scale-105 shadow-sm font-black'
                  : 'text-base-content/30 hover:text-base-content/50'
                }`}
            >
              <History size={13} />
              Geçmiş İşlemler
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/20 transition-colors group-focus-within:text-primary" />
              <input
                type="text"
                placeholder="Başvuran ara..."
                className="w-full h-11 rounded-2xl bg-base-content/2 border border-base-content/5 pl-11 pr-4 text-xs font-bold outline-none ring-primary/5 transition focus:border-primary/20 focus:ring-8"
              />
            </div>
            <button onClick={fetchData} className="h-11 w-11 flex items-center justify-center rounded-2xl bg-base-content/5 border border-base-content/5 text-base-content/40 hover:text-primary transition-all">
              <Filter size={18} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative z-10">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-40 animate-pulse">
              <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Veriler Çekiliyor</p>
            </div>
          ) : currentType === 'moderation' ? (
            <ModerationTicketsView 
              tickets={data} 
              onRefresh={fetchData} 
            />
          ) : data.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {data.map((item) => (
                <RequestCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="py-40 flex flex-col items-center justify-center text-center opacity-30 animate-in zoom-in duration-500">
              <Zap size={32} className="mb-4" />
              <p className="text-sm font-black uppercase tracking-widest italic">Henüz bir talep bulunamadı.</p>
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="mt-auto pt-10 border-t border-base-content/5 flex items-center justify-between z-10">
          <span className="text-[10px] font-black uppercase tracking-widest text-base-content/20">Toplam {data.length} Kayıt</span>
          <div className="flex items-center gap-2">
            <button disabled className="btn btn-sm btn-ghost rounded-xl border border-base-content/5 opacity-50 text-[10px] font-black uppercase">Önceki</button>
            <button disabled className="btn btn-sm btn-ghost rounded-xl border border-base-content/5 opacity-50 text-[10px] font-black uppercase">Sonraki</button>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-base-300/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-3xl max-h-[90vh] bg-base-100 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative flex flex-col border border-base-content/5 animate-in zoom-in-95 duration-300">
            {/* Close Button */}
            <button 
               onClick={() => setSelectedApplication(null)}
               className="absolute top-6 right-6 p-2 rounded-full bg-base-content/5 hover:bg-base-content/10 transition-colors"
            >
               <X className="h-5 w-5 text-base-content/50" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-4 mb-8 shrink-0">
               <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl">
                 {selectedApplication.userName.charAt(0)}
               </div>
               <div>
                  <h2 className="text-2xl font-black text-base-content">{selectedApplication.userName}</h2>
                  <p className="text-[10px] font-bold text-base-content/40 uppercase tracking-widest mt-1">
                    {currentType === 'author' ? 'Yazarlık Başvurusu' : 'Ücretli Yazarlık Başvurusu'}
                  </p>
               </div>
            </div>

            {/* Modal Body */}
            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-4">
               {currentType === 'author' ? (
                  <>
                     <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-base-content/30 tracking-widest">Yazarlık Deneyimi</span>
                        <div className="p-4 rounded-2xl bg-base-content/5 text-sm font-medium text-base-content/70 leading-relaxed italic">
                           {selectedApplication.experience}
                        </div>
                     </div>
                     <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-base-content/30 tracking-widest">Planlanan Eser</span>
                        <div className="p-4 rounded-2xl bg-base-content/5 text-sm font-medium text-base-content/70 leading-relaxed italic">
                           {selectedApplication.plannedWork}
                        </div>
                     </div>
                     <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-base-content/30 tracking-widest">Örnek İçerik</span>
                        <div className="p-5 rounded-3xl bg-base-content/5 text-sm font-medium text-base-content/70 leading-loose whitespace-pre-wrap shadow-inner border border-base-content/5">
                           {selectedApplication.sampleContent}
                        </div>
                     </div>
                  </>
               ) : (
                  <>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <span className="text-[10px] font-black uppercase text-base-content/30 tracking-widest">Banka Adı</span>
                           <div className="p-4 rounded-2xl bg-base-content/5 text-sm font-black text-base-content/70">
                              {selectedApplication.bankName}
                           </div>
                        </div>
                        <div className="space-y-2">
                           <span className="text-[10px] font-black uppercase text-base-content/30 tracking-widest">IBAN</span>
                           <div className="p-4 rounded-2xl bg-base-content/5 text-sm font-mono font-black text-base-content/70 break-all">
                              {selectedApplication.iban}
                           </div>
                        </div>
                     </div>
                     <div className="flex gap-4 pt-4">
                        <a href={selectedApplication.bankDocumentUrl} target="_blank" className="flex-1 flex flex-col items-center justify-center gap-3 py-6 rounded-3xl bg-base-content/5 border border-base-content/10 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all no-underline group">
                           <FileText size={24} className="text-base-content/40 group-hover:text-primary transition-colors" /> 
                           <span className="text-[10px] font-black uppercase tracking-widest text-center px-2">Banka Dekontunu Görüntüle</span>
                        </a>
                        <a href={selectedApplication.gvkExemptionCertificateUrl} target="_blank" className="flex-1 flex flex-col items-center justify-center gap-3 py-6 rounded-3xl bg-base-content/5 border border-base-content/10 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all no-underline group">
                           <ShieldCheck size={24} className="text-base-content/40 group-hover:text-primary transition-colors" /> 
                           <span className="text-[10px] font-black uppercase tracking-widest text-center px-2">GVK Muafiyet Belgesi</span>
                        </a>
                     </div>
                  </>
               )}

               {modalMode === 'rejecting' && (
                  <div className="pt-6 mt-6 border-t border-error/10 animate-in fade-in slide-in-from-top-4 duration-300">
                     <label className="text-[10px] font-black uppercase text-error/80 tracking-widest block mb-2">Red Nedeni <span className="opacity-50">(Zorunlu ve kullanıcıya iletilecek)</span></label>
                     <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Örn: Örnek içerik yetersiz bulundu veya dilbilgisi kurallarına uyulmadı..."
                        className="w-full h-32 rounded-2xl bg-error/5 border border-error/20 p-4 text-sm font-medium outline-none focus:border-error/50 focus:ring-4 focus:ring-error/20 transition-all resize-none text-base-content"
                     />
                  </div>
               )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 mt-4 pt-6 border-t border-base-content/5 shrink-0">
                {modalMode === 'view' ? (
                   <>
                     <button 
                        onClick={() => handleAction(2)}
                        disabled={actionLoading}
                        className="px-6 py-3.5 rounded-2xl bg-error/10 text-error hover:bg-error hover:text-error-content text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex-1 sm:flex-none flex justify-center"
                     >
                        Başvuruyu Reddet
                     </button>
                     <button 
                        onClick={() => handleAction(1)}
                        disabled={actionLoading}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-success text-success-content hover:bg-success/90 text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-success/20 disabled:opacity-50"
                     >
                        {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        Başvuruyu Onayla
                     </button>
                   </>
                ) : (
                   <>
                     <button 
                        onClick={() => { setModalMode('view'); setNote(''); }}
                        disabled={actionLoading}
                        className="px-6 py-3.5 rounded-2xl bg-base-content/10 text-base-content/60 hover:bg-base-content/20 text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex-1 sm:flex-none"
                     >
                        Vazgeç
                     </button>
                     <button 
                        onClick={() => handleAction(2)}
                        disabled={actionLoading || !note.trim()}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-error text-error-content hover:bg-error/90 text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-error/20 disabled:opacity-50 disabled:grayscale"
                     >
                        {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                        Reddetmeyi Onayla
                     </button>
                   </>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
