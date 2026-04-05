"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { 
  ChevronLeft, ChevronRight, Settings, MessageSquare, 
  Minus, Plus, Pin, Maximize, Share2, 
  Eye, EyeOff, BookOpen, Scaling, 
  Send, AlertCircle, Home
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";

// --- TİPLER ---
interface Paragraph { id: string; content: string; }
interface ChapterDetail {
  id: string; title: string; slug: string; paragraphs: Paragraph[];
  nextChapterSlug?: string; previousChapterSlug?: string;
  bookTitle: string; bookSlug: string; order: number; totalChapters: number;
  viewCount: number; bookId: string;
}
interface ReaderSettings {
  fontSize: number; fontFamily: 'serif' | 'sans' | 'mono'; theme: string;
  lineHeight: number; maxWidth: 'narrow' | 'normal' | 'wide';
  readingMode: 'infinite' | 'paged'; isPinned: boolean; isSiteHeaderVisible: boolean;
}

export default function ReaderPage() {
  const params = useParams<{ bookSlug: string; chapterSlug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profile, isLoading: isAuthLoading } = useAuth();
  
  const [chapters, setChapters] = useState<ChapterDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNextLoading, setIsNextLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [isSpoiler, setIsSpoiler] = useState(false);
  
  const lastScrollY = useRef(0);
  const loadingRef = useRef(false);
  const progressRef = useRef<{ paragraphId: string | null; chapterId: string | null }>({ 
    paragraphId: null, 
    chapterId: null 
  });
  const lastSaveTime = useRef(0);

  const [settings, setSettings] = useState<ReaderSettings>({
    fontSize: 16, fontFamily: 'serif', theme: 'light', lineHeight: 1.8,
    maxWidth: 'normal', readingMode: 'paged', isPinned: false, isSiteHeaderVisible: false
  });

  useEffect(() => {
    const saved = localStorage.getItem("reader-settings");
    if (saved) try { setSettings(JSON.parse(saved)); } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    localStorage.setItem("reader-settings", JSON.stringify(settings));
  }, [settings]);

  // İlerleme Kaydetme Fonksiyonu
  const saveProgress = useCallback(async (isImmediate = false) => {
    const { paragraphId, chapterId } = progressRef.current;
    if (!profile || !chapterId) return;

    const now = Date.now();
    if (!isImmediate && now - lastSaveTime.current < 15000) return; // 15 saniyede bir

    const currentChapter = chapters.find(c => c.id === chapterId);
    if (!currentChapter) return;

    try {
      lastSaveTime.current = now;
      await apiRequest("/social/library/progress", {
        method: "POST",
        body: JSON.stringify({
          bookId: currentChapter.bookId,
          chapterId: currentChapter.id,
          chapterSlug: params?.chapterSlug || currentChapter.slug,
          chapterOrder: currentChapter.order,
          paragraphId: paragraphId,
          totalChapters: currentChapter.totalChapters
        })
      });
      console.log("[PROGRESS] Kaydedildi:", currentChapter.title, paragraphId);
    } catch (err) {
      console.error("[PROGRESS] Kayıt hatası:", err);
    }
  }, [profile, chapters, params?.chapterSlug]);

  useEffect(() => {
    async function loadFirstChapter() {
      if (isAuthLoading) return;
      try {
        setIsLoading(true);
        const data = await apiRequest<ChapterDetail>(`/books/chapters/${params?.chapterSlug}`);
        setChapters([data]);
        
        // Initial Scroll to Paragraph or Saved Progress
        setTimeout(() => {
          const targetPId = searchParams.get('p');
          if (targetPId) {
            const el = document.getElementById(targetPId);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            const savedProgress = localStorage.getItem(`read-progress-${params?.chapterSlug}`);
            if (savedProgress) {
              const y = parseFloat(savedProgress) * document.documentElement.scrollHeight;
              window.scrollTo({ top: y, behavior: 'instant' });
            }
          }
        }, 500);
      } catch (err) { console.error(err); } finally { setIsLoading(false); }
    }
    if (params?.chapterSlug) loadFirstChapter();
  }, [params?.chapterSlug, isAuthLoading, searchParams]);

  const loadNextChapter = useCallback(async () => {
    const lastChapter = chapters[chapters.length - 1];
    if (!lastChapter?.nextChapterSlug || loadingRef.current) return;
    try {
      loadingRef.current = true;
      setIsNextLoading(true);
      const data = await apiRequest<ChapterDetail>(`/books/chapters/${lastChapter.nextChapterSlug}`);
      setChapters(prev => [...prev, data]);
      window.history.replaceState(null, "", `/read/${data.bookSlug}/${lastChapter.nextChapterSlug}`);
      // Bölüm değişince anlık kaydet
      void saveProgress(true);
    } catch (err) { console.error(err); } finally {
      loadingRef.current = false;
      setIsNextLoading(false);
    }
  }, [chapters, saveProgress]);

  // IntersectionObserver ile Paragraf Takibi
  useEffect(() => {
    if (isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pId = entry.target.id;
            const cId = entry.target.getAttribute('data-chapter-id');
            if (pId && cId) {
              progressRef.current = { paragraphId: pId, chapterId: cId };
              void saveProgress();
            }
          }
        });
      },
      { threshold: 0.5, rootMargin: '0px 0px -20% 0px' }
    );

    const paragraphs = document.querySelectorAll('.reader-paragraph');
    paragraphs.forEach(p => observer.observe(p));

    return () => observer.disconnect();
  }, [isLoading, saveProgress]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      if (params?.chapterSlug && currentScrollY > 0) {
        localStorage.setItem(`read-progress-${params?.chapterSlug}`, (currentScrollY / scrollHeight).toString());
      }
      if (settings.isPinned) setShowHeader(true);
      else if (currentScrollY < 100) setShowHeader(true);
      else if (currentScrollY > lastScrollY.current) setShowHeader(false);
      else setShowHeader(true);
      lastScrollY.current = currentScrollY;

      if (settings.readingMode === 'infinite' && (currentScrollY + clientHeight) / scrollHeight > 0.85) {
        void loadNextChapter();
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [settings.isPinned, settings.readingMode, loadNextChapter, params?.chapterSlug]);

  useEffect(() => {
    const gh = document.getElementById('global-header-container');
    const gf = document.getElementById('global-footer-container');
    if (gh) gh.style.display = settings.isSiteHeaderVisible ? 'block' : 'none';
    if (gf) gf.style.display = 'none';
    return () => { if (gh) gh.style.display = 'block'; if (gf) gf.style.display = 'block'; };
  }, [settings.isSiteHeaderVisible]);

  if (isLoading) return <div className="min-h-screen bg-base-100 flex items-center justify-center font-black opacity-40"><div className="loading loading-spinner text-primary"></div></div>;

  return (
    <div 
      data-theme={settings.theme} 
      className={`min-h-screen transition-all duration-300 text-base-content antialiased`}
      style={{
        background: `
          radial-gradient(circle at 8% -12%, color-mix(in oklab, var(--color-primary) 26%, transparent) 0%, transparent 42%),
          radial-gradient(circle at 88% 4%, color-mix(in oklab, var(--color-secondary) 26%, transparent) 0%, transparent 40%),
          linear-gradient(145deg,
            color-mix(in oklab, var(--color-base-100) 92%, black 8%) 0%,
            var(--color-base-200) 48%,
            color-mix(in oklab, var(--color-base-300) 78%, black 22%) 100%
          )
        `
      }}
    >
      
      {/* FLOATING READER HEADER */}
      <div className={`fixed inset-x-0 z-40 pointer-events-none overflow-hidden transition-all duration-300 ${settings.isSiteHeaderVisible ? 'top-[85px] h-[72px]' : 'top-0 h-[72px]'}`}>
        <motion.div 
          animate={{ y: showHeader ? 0 : -110 }} 
          transition={{ type: "spring", damping: 25, stiffness: 180 }} 
          className="site-shell mx-auto pt-2.5 pointer-events-auto px-4 sm:px-8" 
          style={{ width: '100%', backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
        >
          <div className="navbar bg-base-300/95 border border-base-content/10 rounded-[1.2rem] min-h-[52px] h-[52px] px-8">
            <div className="flex-1">
              <Link href={`/Books/${chapters[0]?.bookSlug}`} className="flex items-center gap-3 hover:text-primary transition-all group">
                <ChevronLeft size={18} className="text-primary group-hover:-translate-x-1 transition-transform" />
                <span className="font-bold text-[13px] truncate max-w-[200px] tracking-tight text-base-content">{chapters[0]?.bookTitle}</span>
              </Link>
            </div>
            <div className="flex items-center gap-8">
               <button className="text-base-content/40 hover:text-primary transition-all"><MessageSquare size={19} /></button>
               <button className="text-base-content/40 hover:text-primary transition-all"><Share2 size={19} /></button>
               <button onClick={() => setIsSettingsOpen(true)} className="text-base-content/40 hover:text-primary transition-all hover:rotate-90"><Settings size={19} /></button>
            </div>
          </div>
        </motion.div>
      </div>

      <main className={`site-shell mx-auto px-4 sm:px-8 pb-40 transition-all duration-500 flex flex-col items-center gap-6 ${settings.isSiteHeaderVisible ? 'pt-[165px]' : 'pt-[80px]'}`}>
        {chapters.map((chapter, index) => (
          <section key={chapter.id} className={`${index > 0 ? "mt-12" : ""} w-full flex justify-center`}>
            
            {/* ISLAND READER FRAME */}
            <div className="bg-base-200/95 border border-base-content/10 rounded-3xl p-6 md:p-12 shadow-2xl w-full">
              
              {/* 1. Breadcrumb (Optimized font for mobile) */}
              {index === 0 && (
                <div className="breadcrumbs text-[9px] sm:text-[11px] font-bold uppercase tracking-widest text-base-content/40 mb-8 px-4 font-sans">
                  <ul>
                    <li><Link href="/" className="hover:text-primary transition-colors flex items-center gap-2"><Home size={13} className="text-base-content/70" /> Ana Sayfa</Link></li>
                    <li><Link href="/Books" className="hover:text-primary transition-colors">Kesfet</Link></li>
                    <li><Link href={`/Books/${chapter.bookSlug}`} className="hover:text-primary transition-colors truncate max-w-[200px]">{chapter.bookTitle}</Link></li>
                    <li className="text-base-content/40 truncate max-w-[200px]">{chapter.title}</li>
                  </ul>
                </div>
              )}

              {/* 2. Başlık (MOBILE SCALE OPTIMIZATION) */}
              <div className={`text-center mb-16 px-4 font-${settings.fontFamily}`}>
                 <h1 className="text-2xl md:text-6xl font-black mb-6 leading-tight text-base-content tracking-tight">{chapter.title}</h1>
                 <div className="flex items-center justify-center gap-6">
                    {index > 0 && <span className="text-[10px] font-black text-base-content/30 uppercase tracking-[0.3em] bg-base-content/5 px-6 py-2 rounded-full border border-base-content/5 font-sans">Bölüm {chapter.order}</span>}
                    <div className="flex items-center gap-2 text-base-content/40 font-bold text-xs uppercase tracking-widest">
                       <Eye size={16} className="text-primary" />
                       <span>{chapter.viewCount?.toLocaleString("tr-TR") || 0} OKUNMA</span>
                    </div>
                 </div>
              </div>

              {/* 3. Makale Metni (HYDRATION RESILIENT DIVS) */}
              <article 
                className={`prose prose-lg transition-all duration-500 mx-auto text-justify font-${settings.fontFamily} ${
                   settings.maxWidth === 'narrow' ? 'max-w-2xl' : settings.maxWidth === 'wide' ? 'max-w-[100rem]' : 'max-w-4xl'
                }`} 
                style={{ fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight }}
              >
                 {chapter.paragraphs.map((p) => (
                   <div 
                    key={p.id} 
                    id={p.id} 
                    data-chapter-id={chapter.id}
                    dangerouslySetInnerHTML={{ __html: p.content }} 
                    className="text-base-content mb-10 reader-paragraph scroll-mt-32" 
                   />
                 ))}
              </article>

              {/* 4. Navigasyon (SYNCED MOBILE DESIGN) */}
              {settings.readingMode === 'paged' && (
                <div className="mt-20 mb-12 flex items-center justify-between gap-4 w-full px-4 font-sans">
                  {chapter.previousChapterSlug ? (
                    <Link href={`/read/${chapter.bookSlug}/${chapter.previousChapterSlug}`} className="flex-1 flex items-center justify-center h-14 bg-base-300 hover:bg-base-300/80 text-base-content/80 rounded-2xl font-bold gap-2 transition-all border border-base-content/10 shadow-sm">
                      <ChevronLeft size={20} /> Önceki
                    </Link>
                  ) : <div className="flex-1 h-14 bg-base-content/5 text-base-content/10 rounded-2xl flex items-center justify-center font-bold gap-2 border border-base-content/5">Önceki</div>}
                  
                  <div className="px-10 text-base font-black text-base-content/20 tracking-[0.3em] font-mono hidden sm:block">{chapter.order} / {chapter.totalChapters}</div>
                  
                  {chapter.nextChapterSlug ? (
                    <Link href={`/read/${chapter.bookSlug}/${chapter.nextChapterSlug}`} className="flex-1 flex items-center justify-center h-14 bg-primary text-white rounded-2xl font-black gap-2 transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95">
                      Sonraki <ChevronRight size={20} />
                    </Link>
                  ) : <div className="flex-1 h-14 bg-base-content/5 text-base-content/10 rounded-2xl flex items-center justify-center font-bold gap-2 border border-base-content/5">Son</div>}
                </div>
              )}

              {/* 5. Yorum Alanı */}
              <div className="mt-16 pt-16 border-t border-base-content/5 w-full px-4 text-base-content font-sans">
                 <div className="flex items-center gap-4 mb-8">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><MessageSquare size={26} /></div>
                    <div>
                      <h4 className="text-xl font-black text-base-content/80 leading-tight">Yorumunuzu Yazın</h4>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30 mt-1">DÜŞÜNCELERİNİZİ PAYLAŞIN</p>
                    </div>
                 </div>
                 <div className="relative group overflow-hidden rounded-2xl bg-base-100 border border-base-content/10 focus-within:border-primary/40 transition-all shadow-inner">
                    <textarea placeholder="Yorumunuzu buraya yazın..." className="w-full min-h-[140px] bg-transparent p-7 text-sm focus:outline-none resize-none" />
                    <div className="absolute bottom-4 right-4 flex items-center justify-center">
                      <button className="btn btn-ghost btn-circle bg-base-content/10 hover:bg-primary transition-all group border-none"><Send size={19} className="text-base-content/40 group-hover:text-white transition-all" /></button>
                    </div>
                 </div>
                 <div className="mt-6 flex items-center justify-start gap-4 px-2">
                    <button onClick={() => setIsSpoiler(!isSpoiler)} className="flex items-center gap-3 group">
                       <div className={`h-5 w-5 rounded-lg border-2 transition-all flex items-center justify-center ${isSpoiler ? 'bg-amber-400 border-amber-400' : 'border-base-content/10 bg-transparent'}`}>{isSpoiler && <div className="h-2 w-2 rounded-full bg-white shadow-sm" />}</div>
                       <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40 group-hover:text-amber-500 flex items-center gap-2 transition-colors"><AlertCircle size={14} /> SPOİLER İÇERİYOR MU?</span>
                    </button>
                 </div>
              </div>
            </div>
          </section>
        ))}
        {isNextLoading && <div className="py-24 flex justify-center"><span className="loading loading-bars loading-lg text-primary opacity-20"></span></div>}
      </main>

      <AnimatePresence mode="wait">
        {isSettingsOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSettingsOpen(false)} className="fixed inset-0 z-[70] bg-black/50 transition-all" />
            <motion.div 
              initial={{ right: '-100%' }} animate={{ right: 0 }} exit={{ right: '-100%' }} 
              transition={{ type: "spring", damping: 33, stiffness: 350 }} 
              className="fixed top-0 z-[80] h-full w-full max-w-[310px] bg-base-100 p-7 shadow-[-15px_0_70px_rgba(0,0,0,0.5)] overflow-y-auto border-l border-base-content/10 font-sans subpixel-antialiased"
              style={{ backfaceVisibility: 'hidden', textRendering: 'optimizeLegibility' }}
            >
                <div className="flex items-center justify-between mb-10">
                  <h2 className="text-xl font-black tracking-[0.2em] text-base-content">AYARLAR</h2>
                  <button onClick={() => setIsSettingsOpen(false)} className="btn btn-ghost btn-sm btn-circle text-base-content/50 hover:text-base-content border border-base-content/10">✕</button>
               </div>
               <section className="mb-6">
                  <h4 className="text-[11px] font-bold text-base-content/70 uppercase tracking-[0.2em] mb-4">GÖRÜNÜM TEMASI</h4>
                  <div className="grid grid-cols-5 gap-2.5">
                    {['light', 'dark', 'cupcake', 'bumblebee', 'emerald', 'corporate', 'retro', 'valentine', 'garden', 'aqua', 'lofi', 'pastel', 'fantasy', 'wireframe', 'cmyk', 'autumn', 'acid', 'lemonade', 'winter', 'nord', 'synthwave', 'halloween', 'forest', 'black', 'luxury', 'dracula', 'business', 'night', 'coffee', 'dim', 'sunset'].map((t: string) => (
                      <button key={t} onClick={() => setSettings({...settings, theme: t})} className={`h-9 rounded-xl border-2 transition-all flex items-center justify-center ${settings.theme === t ? 'border-primary ring-2 ring-primary/40 shadow-lg' : 'border-base-content/10 hover:border-primary/40'}`} data-theme={t}><div className="h-2.5 w-2.5 rounded-full bg-primary" /></button>
                    ))}
                  </div>
               </section>
               <div className="mb-6">
                  <h4 className="text-[11px] font-bold text-base-content/70 uppercase tracking-[0.2em] mb-4">METİN BOYUTU</h4>
                  <div className="flex items-center justify-between bg-base-200 border border-base-content/10 rounded-[1.2rem] p-1.5 h-14">
                     <button onClick={() => setSettings({...settings, fontSize: settings.fontSize - 1})} className="btn btn-ghost btn-circle btn-sm bg-base-100 text-primary shadow-sm active:scale-95"><Minus size={18}/></button>
                     <span className="font-black text-base text-base-content">{settings.fontSize}px</span>
                     <button onClick={() => setSettings({...settings, fontSize: settings.fontSize + 1})} className="btn btn-ghost btn-circle btn-sm bg-base-100 text-primary shadow-sm active:scale-95"><Plus size={18}/></button>
                  </div>
               </div>
               <div className="mb-6"><div className="grid grid-cols-3 gap-2 bg-base-200 p-1.5 rounded-[1.2rem] border border-base-content/10">{['serif', 'sans', 'mono'].map((f) => (<button key={f} onClick={() => setSettings({...settings, fontFamily: f as any})} className={`h-11 text-[11px] font-black capitalize rounded-xl transition-all ${settings.fontFamily === f ? 'bg-base-100 shadow-xl text-primary ring-1 ring-primary/20' : 'text-base-content/40 hover:text-base-content/70'}`}>{f}</button>))}</div></div>
               <div className="mb-6 px-1">
                  <div className="flex justify-between text-[11px] font-bold text-base-content/70 uppercase tracking-[0.1em] mb-4"><span>SATIR ARALIĞI</span><span className="text-primary font-mono text-xs">{settings.lineHeight}</span></div>
                  <input type="range" min="1.2" max="2.4" step="0.1" value={settings.lineHeight} onChange={(e) => setSettings({...settings, lineHeight: parseFloat(e.target.value)})} className="range range-xs range-primary" />
               </div>
               <section className="mb-6">
                  <h4 className="text-[11px] font-bold text-base-content/70 uppercase tracking-[0.2em] mb-4">OKUMA MODU</h4>
                  <div className="grid grid-cols-2 gap-2 bg-base-200 p-1.5 rounded-[1.2rem] border border-base-content/10">
                     <button onClick={() => { setSettings({...settings, readingMode: 'infinite'}); setChapters(prev => prev.slice(0, 1)); }} className={`flex items-center justify-center gap-2 h-11 text-[10px] font-black uppercase rounded-xl transition-all ${settings.readingMode === 'infinite' ? 'bg-base-100 shadow-xl text-primary ring-1 ring-primary/20' : 'text-base-content/40 hover:text-base-content/70'}`}><BookOpen size={14}/> Sonsuz</button>
                     <button onClick={() => { setSettings({...settings, readingMode: 'paged'}); setChapters(prev => prev.slice(0, 1)); }} className={`flex items-center justify-center gap-2 h-11 text-[10px] font-black uppercase rounded-xl transition-all ${settings.readingMode === 'paged' ? 'bg-base-100 shadow-xl text-primary ring-1 ring-primary/20' : 'text-base-content/40 hover:text-base-content/70'}`}><Scaling size={14}/> Sayfalı</button>
                  </div>
               </section>
               <section className="mb-6">
                  <h4 className="text-[11px] font-bold text-base-content/70 uppercase tracking-[0.2em] mb-4">ARAYÜZ AYARLARI</h4>
                  <div className="grid grid-cols-2 gap-2.5 px-1">
                     <button onClick={() => setSettings({...settings, isPinned: !settings.isPinned})} className={`flex items-center justify-center gap-2 h-11 rounded-xl transition-all border-2 ${settings.isPinned ? 'bg-primary/10 border-primary/40 text-primary shadow-inner' : 'bg-base-200 border-transparent text-base-content/40 hover:text-base-content/70'}`}><Pin size={14} /><span className="text-[10px] font-bold uppercase">{settings.isPinned ? 'SABİT' : 'SABİTLE'}</span></button>
                     <button onClick={() => setSettings({...settings, isSiteHeaderVisible: !settings.isSiteHeaderVisible})} className={`flex items-center justify-center gap-2 h-11 rounded-xl transition-all border-2 ${!settings.isSiteHeaderVisible ? 'bg-primary/10 border-primary/40 text-primary shadow-inner' : 'bg-base-200 border-transparent text-base-content/40 hover:text-base-content/70'}`}>{settings.isSiteHeaderVisible ? <Maximize size={14} /> : <Scaling size={14} />} <span className="text-[10px] font-bold uppercase">{settings.isSiteHeaderVisible ? 'FOKUS' : 'SİTE'}</span></button>
                  </div>
               </section>
               <div className="hidden lg:block">
                  <h4 className="text-[11px] font-bold text-base-content/70 uppercase tracking-[0.2em] mb-4 text-center">SAYFA GENİŞLİĞİ</h4>
                  <div className="grid grid-cols-2 xl:grid-cols-3 gap-2 bg-base-200 p-1.5 rounded-[1.2rem] border border-base-content/10">
                     {['narrow', 'normal', 'wide'].map((w) => (<button key={w} onClick={() => setSettings({...settings, maxWidth: w as any})} className={`h-11 text-[10px] font-black uppercase rounded-xl transition-all ${settings.maxWidth === w ? 'bg-base-100 shadow-xl text-primary ring-1 ring-primary/20' : 'text-base-content/40 hover:text-base-content/70'} ${w === 'wide' ? 'hidden xl:flex items-center justify-center' : ''}`}>{w === 'narrow' ? 'Dar' : w === 'normal' ? 'Norm' : 'Geniş'}</button>))}
                  </div>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
