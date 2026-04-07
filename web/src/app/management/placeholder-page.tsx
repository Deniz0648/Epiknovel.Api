"use client";

import { Construction, LayoutDashboard } from "lucide-react";
import Link from "next/link";

export default function ManagementPlaceholder({ title = "Bu Modul Hazirlaniyor", desc = "Bu bolum uzerinde calismalarimiz devam ediyor. Cok yakinda burada olacak!" }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
       <div className="glass-frame mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-orange-500/10 text-orange-500">
          <Construction className="h-10 w-10 animate-pulse" />
       </div>
       <h1 className="text-3xl font-black uppercase italic tracking-tight text-base-content/80 sm:text-4xl">{title}</h1>
       <p className="mx-auto mt-4 max-w-md text-sm font-medium leading-relaxed text-base-content/40 text-balance px-4">
          {desc}
       </p>
       
       <Link 
         href="/management" 
         className="mt-10 flex items-center gap-2 rounded-2xl bg-base-content/5 px-6 py-3 text-xs font-black uppercase tracking-widest text-base-content/40 transition hover:bg-primary/10 hover:text-primary"
       >
          <LayoutDashboard className="h-4 w-4" />
          <span>Dashboard'a Don</span>
       </Link>
    </div>
  );
}
