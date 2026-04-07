"use client";

import Link from "next/link";
import { useState } from "react";
import { HelpCircle, Home, LifeBuoy, Mail, MessageCircle, ArrowRight, Plus, FileQuestion, Clock, ChevronRight, X } from "lucide-react";

type Ticket = {
  id: string;
  title: string;
  category: string;
  status: "AÇIK" | "KAPALI" | "BEKLEMEDE";
  lastUpdated: string;
  content: string;
};

const SAMPLE_TICKET: Ticket = {
  id: "019D63D2",
  title: "asd",
  category: "Diğer",
  status: "AÇIK",
  lastUpdated: "bir dakikadan az önce güncellendi",
  content: "Bu bir örnek destek talebi içeriğidir. Platformumuzla ilgili geri bildirimlerinizi bu alandan takip edebilirsiniz.",
};

export default function SupportPage() {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="site-shell mx-auto flex flex-col gap-6 px-4 pb-12 pt-28 sm:px-8 sm:pt-32">
        <section className="glass-frame space-y-7 p-4 sm:p-6">
          {/* Breadcrumb & Header Row */}
          <div className="flex flex-col gap-6">
            <div className="space-y-4">
              <div className="breadcrumbs text-xs font-semibold text-base-content/50 mb-1">
                <ul>
                  <li>
                    <Link href="/" className="hover:text-primary transition-colors flex items-center">
                      <Home className="w-3.5 h-3.5 mr-1.5" /> Ana Sayfa
                    </Link>
                  </li>
                  <li className="text-base-content/40">Destek</li>
                </ul>
              </div>
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 text-primary">
                  <LifeBuoy className="h-7 w-7" strokeWidth={2.5} />
                  <h1 className="hero-title-gradient text-3xl font-black tracking-tight sm:text-4xl uppercase italic">Destek Taleplerim</h1>
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-base-content/30 italic">Şikayet, istek ve önerilerinizi buradan iletebilirsiniz.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
             {/* SSS Kartı */}
             <div className="rounded-2xl border border-base-content/12 bg-base-100/24 p-5 transition hover:border-primary/35 hover:bg-base-100/32">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-black leading-tight">Sıkça Sorulan Sorular</h3>
                <p className="mt-2 text-sm leading-relaxed text-base-content/60">En yaygın sorunlarınıza hızlıca çözüm bulmak için dökümanlarımızı inceleyin.</p>
                <Link href="/announcements" className="mt-4 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary hover:opacity-80 transition-opacity">
                  İncele <ArrowRight className="h-3.5 w-3.5" />
                </Link>
             </div>

             {/* Topluluk Kartı */}
             <div className="rounded-2xl border border-base-content/12 bg-base-100/24 p-5 transition hover:border-secondary/35 hover:bg-base-100/32">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-black leading-tight">Topluluk & Canlı Destek</h3>
                <p className="mt-2 text-sm leading-relaxed text-base-content/60">Moderatörlerimizle ve diğer üyelerle anlık iletişim kurmak için topluluğa katılın.</p>
                <Link href="/community" className="mt-4 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-secondary hover:opacity-80 transition-opacity">
                  Katıl <ArrowRight className="h-3.5 w-3.5" />
                </Link>
             </div>

             {/* E-Posta Kartı */}
             <div className="rounded-2xl border border-base-content/12 bg-base-100/24 p-5 transition hover:border-base-content/30 hover:bg-base-100/32">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-base-content/5 text-base-content/60">
                  <Mail className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-black leading-tight">E-Posta Desteği</h3>
                <p className="mt-2 text-sm leading-relaxed text-base-content/60">Detaylı sorularınız veya iş birliği talepleriniz için bize e-posta yoluyla ulaşın.</p>
                <a href="mailto:hello@epiknovel.com" className="mt-4 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-base-content/60 hover:text-primary transition-colors">
                  Bize Yazın <ArrowRight className="h-3.5 w-3.5" />
                </a>
             </div>
          </div>

          <div className="pt-6 border-t border-base-content/5 mt-4">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                   <div className="h-2 w-2 rounded-full bg-primary" />
                   <h2 className="text-xl font-black uppercase italic tracking-tight">Taleplerim (1)</h2>
                </div>
                <Link href="/support/new" className="btn btn-primary btn-sm rounded-full font-black uppercase tracking-[0.08em] px-4 shadow-lg shadow-primary/20">
                   <Plus className="h-3.5 w-3.5 mr-1" strokeWidth={3} />
                   Yeni Talep Oluştur
                </Link>
             </div>

             {/* Örnek Talep Kartı */}
             <Link
               href={`/support/ticket/${SAMPLE_TICKET.id}`}
               className="block w-full rounded-2xl border border-base-content/10 bg-base-100/20 p-4 transition-all hover:border-base-content/25 hover:bg-base-100/32 text-left group no-underline"
             >
                <div className="flex items-center gap-4">
                   <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-base-content/5 group-hover:bg-primary/5 transition-colors">
                      <Clock className="h-5 w-5 text-base-content/30 group-hover:text-primary/50 transition-colors" />
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                         <span className="rounded bg-base-content/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-base-content/60">{SAMPLE_TICKET.category}</span>
                         <span className="text-[10px] font-black uppercase tracking-widest text-info">{SAMPLE_TICKET.status}</span>
                      </div>
                      <h3 className="text-base font-bold text-base-content/90 truncate">{SAMPLE_TICKET.title}</h3>
                      <p className="text-[10px] font-medium text-base-content/40 italic">
                         #{SAMPLE_TICKET.id} • {SAMPLE_TICKET.lastUpdated}
                      </p>
                   </div>
                   <div className="h-8 w-8 flex items-center justify-center rounded-full bg-base-content/5 opacity-0 group-hover:opacity-100 transition-all">
                      <ChevronRight className="h-4 w-4 text-base-content/40" />
                   </div>
                </div>
             </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
