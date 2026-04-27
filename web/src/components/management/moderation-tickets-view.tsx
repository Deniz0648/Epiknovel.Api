"use client";

import React, { useState } from "react";
import { 
  ShieldAlert, 
  Flag, 
  Clock, 
  Trash2, 
  Loader2,
  AlertCircle
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { toast } from "@/lib/toast";

interface ModerationTicketsViewProps {
  tickets: any[];
  onRefresh: () => void;
}

export function ModerationTicketsView({ tickets, onRefresh }: ModerationTicketsViewProps) {
  const [isResolving, setIsResolving] = useState<string | null>(null);

  const handleResolve = async (ticketId: string, action: string) => {
    if (!confirm(`Bu bilet için "${action}" kararı alınacak. Emin misiniz?`)) return;
    setIsResolving(ticketId);
    try {
      await apiRequest(`/compliance/moderation/tickets/${ticketId}/resolve`, {
        method: "POST",
        body: JSON.stringify({
          ticketId,
          action,
          reason: "İnceleme sonucu karar verildi.",
          targetUserId: null
        })
      });
      toast.success({ description: "İşlem başarıyla tamamlandı." });
      onRefresh();
    } catch (err: any) {
      toast.error({ description: err.message || "İşlem sırasında bir hata oluştu." });
    } finally {
      setIsResolving(null);
    }
  };

  if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 opacity-20">
        <ShieldAlert className="h-20 w-20 mb-6 text-primary" />
        <p className="text-sm font-black uppercase tracking-[0.5em] italic">Bekleyen Şikayet Bulunmuyor</p>
      </div>
    );
  }

  return (
    <div className="grid gap-8 max-w-5xl mx-auto">
      {tickets.map((ticket) => (
        <div key={ticket.id} className="relative group overflow-hidden rounded-4xl border border-base-content/5 bg-base-content/2 p-8 transition-all hover:bg-base-content/5">
          <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none group-hover:rotate-12 transition-transform duration-700">
            <Flag className="h-48 w-48" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-8">
            <div className="flex-1 space-y-6">
              <div className="flex items-center gap-4">
                <div className="px-4 py-1.5 rounded-full bg-error/10 text-error text-[10px] font-black uppercase tracking-widest border border-error/5 shadow-sm">
                  {ticket.topReason}
                </div>
                <div className="h-1.5 w-1.5 rounded-full bg-base-content/20" />
                <span className="text-[10px] font-black text-base-content/30 tracking-widest">
                  #{ticket.id?.toString().slice(0, 8).toUpperCase() || '????'}
                </span>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-error animate-pulse">
                  <Flag className="h-3 w-3" />
                  {ticket.reportCount} RAPOR
                </div>
              </div>

              <div>
                <h4 className="text-xl font-black italic text-base-content tracking-tight">
                  {ticket.contentType} Denetimi
                </h4>
                <p className="mt-4 text-base font-medium text-base-content/60 leading-relaxed italic max-w-2xl">
                  "{ticket.initialDescription || 'Açıklama girilmemiş.'}"
                </p>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2 group/meta">
                  <div className="h-8 w-8 rounded-xl bg-base-content/5 flex items-center justify-center text-base-content/30 group-hover/meta:bg-primary/10 group-hover/meta:text-primary transition-colors">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase text-base-content/20 tracking-widest">Rapor Tarihi</span>
                    <span className="text-[11px] font-bold text-base-content/50">{new Date(ticket.createdAt).toLocaleString('tr-TR')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
              <button
                disabled={isResolving === ticket.id}
                onClick={() => handleResolve(ticket.id, 'DeleteContent')}
                className="h-14 px-8 rounded-2xl bg-error text-white text-[11px] font-black uppercase tracking-[0.15em] shadow-xl shadow-error/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isResolving === ticket.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                İçeriği Sil ve Çöz
              </button>
              <button
                disabled={isResolving === ticket.id}
                onClick={() => handleResolve(ticket.id, 'Ignore')}
                className="h-14 px-8 rounded-2xl bg-base-content/5 border border-base-content/10 text-base-content/60 text-[11px] font-black uppercase tracking-[0.15em] hover:bg-base-content/10 transition-all flex items-center justify-center gap-2"
              >
                Hatalı İşlem / Kapat
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
