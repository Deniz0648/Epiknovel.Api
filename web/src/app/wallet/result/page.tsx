"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, ArrowRight, Wallet, Home } from "lucide-react";

function ResultContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const message = searchParams.get("message");
  
  const isSuccess = status === "success";

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4 py-20">
      <div className={`glass-frame relative max-w-lg w-full overflow-hidden p-8 sm:p-12 text-center shadow-2xl transition-all duration-700 ${isSuccess ? 'shadow-success/20 border-success/20' : 'shadow-error/20 border-error/20'}`}>
        
        {/* Decorative Glow Effects */}
        <div className={`absolute -top-32 -right-32 h-64 w-64 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-700 ${isSuccess ? 'bg-success' : 'bg-error'}`} />
        <div className={`absolute -bottom-32 -left-32 h-64 w-64 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-700 ${isSuccess ? 'bg-success' : 'bg-error'}`} />

        <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-500">
          
          <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-base-100/50 backdrop-blur-sm shadow-xl">
             <div className={`absolute inset-0 rounded-full opacity-30 ${isSuccess ? 'bg-success animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]' : 'bg-error animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]'}`} />
             <div className={`absolute inset-2 rounded-full opacity-20 ${isSuccess ? 'bg-success' : 'bg-error'}`} />
             {isSuccess ? (
                <CheckCircle2 className="h-12 w-12 text-success drop-shadow-md" />
             ) : (
                <XCircle className="h-12 w-12 text-error drop-shadow-md" />
             )}
          </div>

          <h1 className="hero-title-gradient text-3xl font-black uppercase italic tracking-tight mb-4 text-base-content drop-shadow-sm">
            {isSuccess ? "İşlem Başarılı!" : "İşlem Başarısız"}
          </h1>
          
          <div className="bg-base-100/40 rounded-2xl p-5 mb-10 w-full border border-base-content/5 shadow-inner">
             <p className="text-sm font-semibold text-base-content/80 italic leading-relaxed">
               {message || (isSuccess ? "Ödemeniz başarıyla alınmış ve jetonlarınız hesabınıza yüklenmiştir." : "Ödeme sırasında beklenmedik bir hata oluştu veya işlem iptal edildi.")}
             </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full mt-4">
            {isSuccess ? (
               <>
                 <Link href="/wallet" className="btn btn-primary rounded-xl font-black uppercase italic flex-1 w-full shadow-lg shadow-primary/25 group">
                   <Wallet className="mr-2 h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
                   Cüzdanıma Dön
                 </Link>
                 <Link href="/" className="btn btn-ghost rounded-xl font-black uppercase italic flex-1 w-full group hidden sm:flex">
                   <Home className="mr-2 h-5 w-5 shrink-0 transition-transform group-hover:-translate-y-1" />
                   Ana Sayfa
                 </Link>
               </>
            ) : (
               <>
                 <Link href="/wallet" className="btn btn-outline border-error/50 text-error hover:bg-error hover:border-error hover:text-error-content rounded-xl font-black uppercase italic flex-1 w-full shadow-lg shadow-error/20 group">
                   Tekrar Dene
                   <ArrowRight className="ml-2 h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
                 </Link>
               </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WalletResultPage() {
  return (
    <main className="relative overflow-hidden site-shell mx-auto px-4 sm:px-8">
       <Suspense fallback={
          <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
            <span className="loading loading-spinner text-primary loading-lg"></span>
            <p className="text-xs font-black uppercase tracking-widest text-base-content/40 italic animate-pulse">Sonuç Yükleniyor</p>
          </div>
       }>
          <ResultContent />
       </Suspense>
    </main>
  );
}
