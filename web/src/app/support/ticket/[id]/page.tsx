"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { use } from "react";
import { Home, Send, User, ChevronRight, LifeBuoy, Clock, ArrowLeft, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { connectHub } from "@/lib/signalr-client";
import { useRef } from "react";


export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [ticket, setTicket] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (ticket?.messages) {
      scrollToBottom();
    }
  }, [ticket?.messages]);

  async function loadTicket() {
    try {
      const data = await apiRequest<any>(`/management/support/tickets/${id}`);
      setTicket(data);
    } catch (err) {
      console.error("Talep yuklenirken hata:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTicket();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const hub = connectHub("/hubs/support", {
      onInvocation: (msg) => {
        if (msg.target === "ReceiveMessage") {
          const newMsg = msg.args[0] as any;
          // Note: Backend gives us the message object. 
          // userId, content, isAdminResponse, createdAt etc.
          setTicket((prev: any) => {
            if (!prev) return prev;
            if (prev.messages.some((m: any) => m.id === newMsg.id)) return prev;
            return {
              ...prev,
              messages: [...prev.messages, newMsg]
            };
          });
        }
      }
    });

    // Gruba katıl
    const timer = setTimeout(() => {
        hub.invoke("JoinTicket", id);
    }, 500);

    return () => {
      clearTimeout(timer);
      hub.invoke("LeaveTicket", id);
      hub.dispose();
    };
  }, [id]);

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;
    
    setIsSending(true);
    try {
      await apiRequest(`/management/support/tickets/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: newMessage })
      });
      setNewMessage("");
      loadTicket(); // Refresh messages
    } catch (err) {
      console.error("Mesaj gonderilirken hata:", err);
      showToast({ title: "Hata", description: "Mesaj gönderilemedi.", tone: "error" });
    } finally {
      setIsSending(false);
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Talep bulunamadı</h1>
        <Link href="/support" className="btn btn-primary">Geri Dön</Link>
      </div>
    );
  }

  return (
    <main className="relative h-screen overflow-hidden flex flex-col bg-base-200/20">
      <div className="site-shell mx-auto flex flex-col gap-4 px-4 pb-4 pt-24 sm:px-8 sm:pt-28 h-full min-h-0 w-full">
        {/* Breadcrumb - Outside the scrollable area */}
        <div className="breadcrumbs text-[10px] font-black uppercase tracking-widest text-base-content/30">
          <ul>
            <li><Link href="/">ANA SAYFA</Link></li>
            <li><Link href="/support">DESTEK</Link></li>
            <li className="text-primary/60">TALEP DETAYI</li>
          </ul>
        </div>

        <section className="glass-frame flex flex-col h-full p-4 sm:p-6 min-h-0 overflow-hidden">
          {/* Ticket Header Card - Minimal version */}
          <div className="rounded-[1.5rem] border border-base-content/10 bg-base-100/40 p-5 mb-6 relative shrink-0">
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-info px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-info-content">
                  {getStatusLabel(ticket.status)}
                </span>
                <span className="text-[10px] font-black tracking-widest text-base-content/30 opacity-50">#{ticket.id.slice(0, 8)}</span>
              </div>
              <div className="flex items-center gap-3">
                {ticket.status !== 3 && (
                  <button 
                    onClick={async () => {
                      if (!confirm("Bu talebi kapatmak istediğinize emin misiniz?")) return;
                      try {
                        await apiRequest(`/management/support/tickets/${id}/close`, { method: "POST" });
                        showToast({ title: "Başarılı", description: "Bilet kapatıldı.", tone: "success" });
                        loadTicket();
                      } catch (err) {
                        showToast({ title: "Hata", description: "Bilet kapatılamadı.", tone: "error" });
                      }
                    }}
                    className="text-[9px] font-black uppercase tracking-widest text-error/60 hover:text-error transition-colors"
                  >
                    BİLETİ KAPAT
                  </button>
                )}
                <Link href="/support" className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-base-content/40 hover:text-primary transition-colors">
                  <ArrowLeft className="h-3 w-3" />
                  DÖN
                </Link>
              </div>
            </div>
            
            <h1 className="text-xl font-black italic tracking-tight mb-2 line-clamp-1">{ticket.title}</h1>
            <p className="text-[11px] font-medium text-base-content/60 italic line-clamp-2 bg-base-content/5 p-2 rounded-xl border border-base-content/5">{ticket.description}</p>
          </div>

          {/* Chat Messages Area - THE SCROLLABLE PART */}
          <div className="flex-1 flex flex-col gap-4 mb-4 overflow-y-auto pr-2 custom-scrollbar min-h-0">
            {ticket.messages.map((msg: any) => (
              <div key={msg.id} className={`flex flex-col ${!msg.isAdminResponse ? "items-end" : "items-start"}`}>
                <div className={`max-w-[80%] rounded-[1.5rem] px-5 py-3 ${
                  !msg.isAdminResponse 
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

          {/* Chat Input Field */}
          <div className="relative mt-auto">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Mesajınızı buraya yazın..."
              rows={4}
              disabled={ticket.status === 3 || isSending}
              className={`w-full rounded-3xl border-2 border-base-content/15 bg-base-100/20 px-6 py-5 pr-20 text-sm font-medium focus:border-primary/50 focus:outline-none transition-all resize-none shadow-inner ${ticket.status === 3 ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button 
              onClick={handleSend}
              disabled={ticket.status === 3 || isSending}
              className="absolute bottom-4 right-4 h-12 w-12 flex items-center justify-center rounded-2xl bg-base-content/10 hover:bg-primary hover:text-primary-content transition-all group disabled:opacity-50"
            >
              {isSending ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <Send className="h-5 w-5 text-base-content/30 group-hover:text-primary-content group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              )}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
