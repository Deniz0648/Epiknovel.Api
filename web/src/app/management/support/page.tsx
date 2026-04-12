"use client";

import React, { useState, useEffect } from "react";
import { 
  LifeBuoy, 
  Search, 
  Filter, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  User,
  Loader2,
  X,
  Send
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { connectHub } from "@/lib/signalr-client";
import { useRef } from "react";

export default function SupportManagementPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<number | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [reply, setReply] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (selectedTicket?.messages) {
      scrollToBottom();
    }
  }, [selectedTicket?.messages]);

  async function loadTickets() {
    setIsLoading(true);
    try {
      const url = `/management/support/tickets?${selectedStatus !== null ? `status=${selectedStatus}` : ""}`;
      const data = await apiRequest<{ tickets: any[] }>(url);
      setTickets(data.tickets);
    } catch (err) {
      console.error("Talep listesi yuklenirken hata:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, [selectedStatus]);

  useEffect(() => {
    if (!selectedTicket?.id) return;

    const hub = connectHub("/hubs/support", {
      onInvocation: (msg) => {
        if (msg.target === "ReceiveMessage") {
          const newMsg = msg.args[0] as any;
          if (newMsg.ticketId === selectedTicket.id) {
            setSelectedTicket((prev: any) => {
              if (!prev || prev.messages.some((m: any) => m.id === newMsg.id)) return prev;
              const next = { 
                ...prev, 
                messages: [...prev.messages, newMsg] 
              };
              return next;
            });
          }
          // Refresh the list to show late response or update counters
          loadTickets();
        }
      }
    });

    const timer = setTimeout(() => {
      hub.invoke("JoinTicket", selectedTicket.id);
    }, 500);

    return () => {
      clearTimeout(timer);
      hub.invoke("LeaveTicket", selectedTicket.id);
      hub.dispose();
    };
  }, [selectedTicket?.id]);

  async function loadTicketDetails(id: string) {
    try {
      const data = await apiRequest<any>(`/management/support/tickets/${id}`);
      setSelectedTicket(data);
    } catch (err) {
      console.error("Talep detaylari yuklenirken hata:", err);
    }
  }

  const handleSendReply = async () => {
    if (!reply.trim() || isSending || !selectedTicket) return;
    
    setIsSending(true);
    try {
      await apiRequest(`/management/support/tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: reply })
      });
      setReply("");
      await loadTicketDetails(selectedTicket.id);
      loadTickets(); // Refresh list to update status/last response
    } catch (err) {
      console.error("Cevap gonderilirken hata:", err);
      showToast({ title: "Hata", description: "Cevap gönderilemedi.", tone: "error" });
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateStatus = async (status: number) => {
    if (!selectedTicket) return;
    try {
      await apiRequest(`/management/support/tickets/${selectedTicket.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      showToast({ title: "Başarılı", description: "Durum güncellendi.", tone: "success" });
      await loadTicketDetails(selectedTicket.id);
      loadTickets();
    } catch (err) {
      console.error("Durum guncellenirken hata:", err);
    }
  };

  const getStatusLabel = (status: number) => {
    switch (status) {
      case 0: return "AÇIK";
      case 1: return "İNCELENİYOR";
      case 2: return "ÇÖZÜLDÜ";
      case 3: return "KAPALI";
      default: return String(status);
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.userDisplayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tight text-base-content/80">Support Management</h1>
          <p className="text-sm font-medium text-base-content/40 mt-1">Gelen destek taleplerini yönetin ve yanıtlayın.</p>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
        {/* Ticket List Sidebar */}
        <div className="flex w-full flex-col gap-4 sm:w-80 lg:w-96">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/20" />
            <input
              type="text"
              placeholder="Talep veya kullanıcı ara..."
              className="h-12 w-full rounded-2xl border border-base-content/10 bg-base-100/50 pl-12 pr-4 text-sm font-bold outline-none transition focus:border-primary/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
             {[null, 0, 1, 2, 3].map(status => (
               <button
                 key={String(status)}
                 onClick={() => setSelectedStatus(status)}
                 className={`whitespace-nowrap rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition ${
                   selectedStatus === status 
                   ? "bg-primary text-primary-content" 
                   : "bg-base-content/5 text-base-content/40 hover:bg-base-content/10"
                 }`}
               >
                 {status === null ? "HEPSİ" : getStatusLabel(status)}
               </button>
             ))}
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-12 opacity-20 italic text-sm font-bold">Sonuç bulunamadı</div>
            ) : (
              filteredTickets.map(ticket => (
                <button
                  key={ticket.id}
                  onClick={() => loadTicketDetails(ticket.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all ${
                    selectedTicket?.id === ticket.id 
                    ? "border-primary/30 bg-primary/5 shadow-lg shadow-primary/5" 
                    : "border-base-content/5 bg-base-100/50 hover:bg-base-content/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${
                      ticket.status === 0 ? "text-info" : 
                      ticket.status === 1 ? "text-warning" : 
                      ticket.status === 2 ? "text-success" : "text-base-content/30"
                    }`}>
                      {getStatusLabel(ticket.status)}
                    </span>
                    <span className="text-[9px] font-medium text-base-content/20">#{ticket.id.slice(0, 8)}</span>
                  </div>
                  <h3 className="text-sm font-bold text-base-content truncate mb-1">{ticket.title}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-base-content/40">{ticket.userDisplayName}</span>
                    <span className="text-[10px] font-medium text-base-content/20 italic">{new Date(ticket.createdAt).toLocaleDateString("tr-TR")}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Ticket Content Area */}
        <div className="flex-1 rounded-[2.5rem] border border-base-content/5 bg-base-100/50 backdrop-blur-md overflow-hidden flex flex-col min-h-0">
          {selectedTicket ? (
            <>
              {/* Detail Header */}
              <div className="border-b border-base-content/5 p-6 flex items-center justify-between bg-base-content/2">
                <div>
                  <h2 className="text-xl font-black italic text-base-content/80">{selectedTicket.title}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-bold text-base-content/40 uppercase tracking-widest">USER: {selectedTicket.messages[0]?.userDisplayName}</span>
                    <span className="text-base-content/10">|</span>
                    <span className="text-[10px] font-bold text-base-content/20 uppercase tracking-widest">{new Date(selectedTicket.createdAt).toLocaleString("tr-TR")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select 
                    value={selectedTicket.status}
                    onChange={(e) => handleUpdateStatus(parseInt(e.target.value))}
                    className="bg-base-content/5 border border-base-content/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest focus:outline-none"
                  >
                    <option value={0}>AÇIK</option>
                    <option value={1}>İNCELENİYOR</option>
                    <option value={2}>ÇÖZÜLDÜ</option>
                    <option value={3}>KAPALI</option>
                  </select>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-pattern-dots">
                {/* Initial Description */}
                <div className="flex flex-col items-center mb-8">
                   <div className="max-w-[70%] text-center p-4 rounded-2xl bg-base-content/5 border border-dashed border-base-content/10 italic text-sm text-base-content/60">
                     {selectedTicket.description}
                   </div>
                </div>

                {selectedTicket.messages.map((msg: any) => (
                  <div key={msg.id} className={`flex flex-col ${msg.isAdminResponse ? "items-end" : "items-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                      msg.isAdminResponse 
                      ? "bg-primary text-primary-content rounded-tr-none" 
                      : "bg-base-content/10 text-base-content rounded-tl-none"
                    }`}>
                      <div className="flex items-center gap-2 mb-1 opacity-60 text-[9px] font-black uppercase tracking-widest">
                        <span>{msg.userDisplayName}</span>
                        <span>•</span>
                        <span>{new Date(msg.createdAt).toLocaleString("tr-TR")}</span>
                      </div>
                      <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Area */}
              <div className="p-6 border-t border-base-content/5 bg-base-content/2">
                <div className="relative">
                  <textarea
                    placeholder="Yanıtınızı yazın..."
                    className="w-full rounded-2xl border border-base-content/10 bg-base-100 px-5 py-4 pr-16 text-sm font-medium focus:border-primary/50 focus:outline-none resize-none shadow-inner min-h-[100px]"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    disabled={isSending}
                  />
                  <button 
                    onClick={handleSendReply}
                    disabled={isSending || !reply.trim()}
                    className="absolute right-3 bottom-3 h-10 w-10 flex items-center justify-center rounded-xl bg-primary text-primary-content shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition disabled:opacity-50"
                  >
                    {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center opacity-10">
              <LifeBuoy className="h-24 w-24 mb-4" />
              <p className="text-xl font-black uppercase italic tracking-widest">Select a ticket to view</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
