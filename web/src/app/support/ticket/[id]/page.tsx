"use client";

import Link from "next/link";
import { useState } from "react";
import { use } from "react";
import { Home, Send, User, ChevronRight, LifeBuoy, Clock, ArrowLeft } from "lucide-react";

type Message = {
  id: string;
  sender: "user" | "admin";
  content: string;
  timestamp: string;
};

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", sender: "user", content: "asd", timestamp: "1 DAKİKA ÖNCE" },
  ]);
  const [newMessage, setNewMessage] = useState("");

  const handleSend = () => {
    if (!newMessage.trim()) return;
    const msg: Message = {
      id: Date.now().toString(),
      sender: "user",
      content: newMessage,
      timestamp: "ŞİMDİ",
    };
    setMessages([...messages, msg]);
    setNewMessage("");
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="site-shell mx-auto flex flex-col gap-6 px-4 pb-12 pt-28 sm:px-8 sm:pt-32">
        <section className="glass-frame flex flex-col min-h-[70vh] p-4 sm:p-8">
          {/* Breadcrumb */}
          <div className="breadcrumbs text-[10px] font-black uppercase tracking-widest text-base-content/30 mb-8">
            <ul>
              <li><Link href="/">ANA SAYFA</Link></li>
              <li><Link href="/support">DESTEK</Link></li>
              <li className="text-primary/60">TALEP DETAYI</li>
            </ul>
          </div>

          {/* Ticket Header Card */}
          <div className="rounded-[2rem] border border-base-content/10 bg-base-100/20 p-6 sm:p-10 mb-8 relative">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-base-content/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-base-content/60">Diğer</span>
                <span className="rounded-md bg-info px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-info-content">Açık</span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-base-content/30">#{id || "019D63D2"}</span>
            </div>
            
            <h1 className="text-4xl font-black italic tracking-tight mb-4">asd</h1>
            
            <div className="flex items-center gap-4 text-[11px] font-black uppercase tracking-widest text-base-content/40">
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span>Talep Sahibi</span>
              </div>
              <span>•</span>
              <span>06.04.2026 tarihinde açıldı</span>
            </div>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 flex flex-col gap-4 mb-8">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                <div className={`max-w-[80%] rounded-[1.5rem] px-5 py-3 ${
                  msg.sender === "user" 
                  ? "bg-primary text-primary-content rounded-tr-none" 
                  : "bg-base-content/10 text-base-content rounded-tl-none"
                }`}>
                  <div className="flex items-center gap-2 mb-1 opacity-60 text-[9px] font-black uppercase tracking-widest">
                    <span>{msg.sender === "user" ? "SİZ" : "DESTEK"}</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Chat Input Field */}
          <div className="relative mt-auto">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Mesajınızı buraya yazın..."
              rows={4}
              className="w-full rounded-3xl border-2 border-base-content/15 bg-base-100/20 px-6 py-5 pr-20 text-sm font-medium focus:border-primary/50 focus:outline-none transition-all resize-none shadow-inner"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button 
              onClick={handleSend}
              className="absolute bottom-4 right-4 h-12 w-12 flex items-center justify-center rounded-2xl bg-base-content/10 hover:bg-primary hover:text-primary-content transition-all group"
            >
              <Send className="h-5 w-5 text-base-content/30 group-hover:text-primary-content group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </button>
          </div>

          {/* Back button for mobile */}
          <div className="mt-8">
            <Link href="/support" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-base-content/30 hover:text-primary transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Destek Sayfasına Dön
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
