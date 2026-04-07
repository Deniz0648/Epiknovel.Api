"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { Users, BookOpen, BarChart3, Bell, LayoutDashboard } from "lucide-react";

export default function ManagementPage() {
  const { profile } = useAuth();

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-primary/10 p-8 sm:p-12">
        <div className="absolute right-[-5%] top-[-10%] h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4">
          <h1 className="text-3xl font-black uppercase italic tracking-tight sm:text-5xl text-base-content">
            Hos Geldin, <span className="text-primary">{profile?.displayName.split(' ')[0]}</span>
          </h1>
          <p className="max-w-xl text-sm font-medium leading-relaxed text-base-content/50 sm:text-lg">
            Platform bugun her zamankinden daha canli. Iste son veriler ve bekleyen islemlerin ozeti.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
         {[
           { label: "Toplam Kullanici", value: "1,294", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10", trend: "+12%" },
           { label: "Aktif Kitaplar", value: "482", icon: BookOpen, color: "text-emerald-500", bg: "bg-emerald-500/10", trend: "+3" },
           { label: "Yeni Destek Talebi", value: "12", icon: Bell, color: "text-orange-500", bg: "bg-orange-500/10", trend: "Acil" },
           { label: "Gelir (Aylik)", value: "₺28.4k", icon: BarChart3, color: "text-primary", bg: "bg-primary/10", trend: "+8.4%" }
         ].map((stat, i) => (
           <div key={i} className="glass-frame group relative overflow-hidden p-6 transition-all hover:border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
                   <stat.icon className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 bg-primary/5 px-2 py-1 rounded-lg">
                   {stat.trend}
                </span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-base-content/30 mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-base-content/85">{stat.value}</p>
           </div>
         ))}
      </div>

      {/* Quick View Content */}
      <div className="glass-frame flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-base-content/5 opacity-40">
           <LayoutDashboard className="h-10 w-10 text-base-content" />
        </div>
        <h2 className="text-2xl font-black uppercase italic tracking-tight text-base-content/60">Gosterge Paneli Hazir</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-relaxed text-base-content/40 text-balance px-4">
           Sol menuden bir kategori secerek detayli analize ve yonetime baslayabilirsin. Bugun yapacak cok isimiz var!
        </p>
      </div>
    </div>
  );
}
