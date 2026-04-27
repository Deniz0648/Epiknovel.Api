"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Settings, MessageSquare,
  Minus, Plus, Pin, Maximize, Share2,
  Eye, EyeOff, BookOpen, Scaling,
  Send, AlertCircle, Home, Heart, ShoppingCart, Lock, Coins, LogIn, Info,
  AlignLeft
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { getWalletBalance, purchaseChapter } from "@/lib/wallet";
import { toast } from "sonner";
import { CommentSection } from "@/components/social/comments/CommentSection";

// --- TİPLER ---
interface Paragraph { id: string; content: string; }
interface ChapterDetail {
  id: string; title: string; slug: string; paragraphs: Paragraph[];
  nextChapterSlug?: string; previousChapterSlug?: string;
  bookTitle: string; bookSlug: string; order: number; totalChapters: number;
  viewCount: number; bookId: string;
  isFree: boolean; price: number; isPreview: boolean; previewMessage?: string;
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
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentType, setCommentType] = useState<'chapter' | 'paragraph'>('chapter');
  const [activeParagraphId, setActiveParagraphId] = useState<string | null>(null);
  const [paragraphCommentCounts, setParagraphCommentCounts] = useState<Record<string, number>>({});
  const [showHeader, setShowHeader] = useState(true);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const [isSpoiler, setIsSpoiler] = useState(false);

  const lastScrollY = useRef(0);
  const loadingRef = useRef(false);
  const progressRef = useRef<{ paragraphId: string | null; chapterId: string | null }>({
    paragraphId: null,
    chapterId: null
  });
  const skipNextUrlUpdate = useRef(false);
  const lastSaveTime = useRef(0);

  const [settings, setSettings] = useState<ReaderSettings>({
    fontSize: 16, fontFamily: 'serif', theme: 'light', lineHeight: 1.6,
    maxWidth: 'normal', readingMode: 'paged', isPinned: false, isSiteHeaderVisible: false
  });

  useEffect(() => {
    const saved = localStorage.getItem("reader-settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("reader-settings", JSON.stringify(settings));
  }, [settings]);

  // İlerleme Kaydetme Fonksiyonu
  const saveProgress = useCallback(async (isImmediate = false) => {
    const { paragraphId, chapterId } = progressRef.current;
    if (!profile || !chapterId) return;

    const now = Date.now();
    if (!isImmediate && now - lastSaveTime.current < 15000) return;

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
    } catch (err) {
      console.error("[PROGRESS] Kayıt hatası:", err);
    }
  }, [profile, chapters, params?.chapterSlug]);

  const fetchParagraphCommentCounts = useCallback(async (chapterId: string) => {
    try {
      interface InlineCommentGroup {
        paragraphId?: string;
        ParagraphId?: string;
        id?: string;
        Id?: string;
        commentCount?: number;
        CommentCount?: number;
        count?: number;
        Count?: number;
      }
      const groups = await apiRequest<InlineCommentGroup[]>(`/social/inline-comments/chapter/${chapterId}`);
      console.log(`[READER] fetched ${groups?.length || 0} inline comment groups for chapter ${chapterId}`);
      if (groups && Array.isArray(groups)) {
        const counts: Record<string, number> = {};
        groups.forEach((group) => {
          // Support both camelCase and PascalCase from API
          const pId = group.paragraphId || group.ParagraphId || group.id || group.Id;
          const count = group.commentCount ?? group.CommentCount ?? group.count ?? group.Count ?? 0;
          
          if (pId) {
            const normalizedId = pId.toString().toLowerCase();
            counts[normalizedId] = count;
          }
        });
        setParagraphCommentCounts(prev => ({ ...prev, ...counts }));
      }
    } catch (err) {
      console.error("Satır yorum sayıları alınamadı:", err);
    }
  }, []);

  useEffect(() => {
    async function loadFirstChapter() {
      if (isAuthLoading || !params?.chapterSlug) return;
      if (chapters.some(c => c.slug === params.chapterSlug)) return;

      try {
        setIsLoading(true);
        const data = await apiRequest<ChapterDetail>(`/books/chapters/${params.chapterSlug}`);
        setChapters([data]);
        void fetchParagraphCommentCounts(data.id);

        setTimeout(() => {
          const targetPId = searchParams.get('p');
          if (targetPId) {
            const el = document.getElementById(targetPId);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            const savedProgress = localStorage.getItem(`read-progress-${params.chapterSlug}`);
            if (savedProgress) {
              const scrollHeight = document.documentElement.scrollHeight;
              window.scrollTo({ top: parseFloat(savedProgress) * scrollHeight, behavior: 'instant' });
            }
          }
        }, 500);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    if (!skipNextUrlUpdate.current) {
      loadFirstChapter();
    } else {
      skipNextUrlUpdate.current = false;
    }

    if (profile) {
      getWalletBalance()
        .then(res => setCoinBalance(res.coinBalance))
        .catch(console.error);
    }
  }, [params?.chapterSlug, isAuthLoading, searchParams, profile]);

  const loadNextChapter = useCallback(async () => {
    const lastChapter = chapters[chapters.length - 1];
    if (!lastChapter?.nextChapterSlug || loadingRef.current) return;
    try {
      loadingRef.current = true;
      setIsNextLoading(true);
      const data = await apiRequest<ChapterDetail>(`/books/chapters/${lastChapter.nextChapterSlug}`);

      skipNextUrlUpdate.current = true;
      window.history.replaceState(null, "", `/read/${data.bookSlug}/${data.slug}`);

      setChapters(prev => [...prev, data]);
      void fetchParagraphCommentCounts(data.id);
      void saveProgress(true);
    } catch (err) {
      console.error(err);
    } finally {
      loadingRef.current = false;
      setIsNextLoading(false);
    }
  }, [chapters, saveProgress]);

  const handlePurchase = async (chapterId: string, chapterSlug: string) => {
    if (!profile) return;
    try {
      setIsPurchasing(true);
      await purchaseChapter(chapterId);
      toast.success("Bölüm kilidi başarıyla açıldı!");

      // Satın alınan bölümü en güncel haliyle çek
      const data = await apiRequest<ChapterDetail>(`/books/chapters/${chapterSlug}`);

      // State içindeki ilgili bölümü güncelle (Diğer bölümleri bozmadan)
      setChapters(prev => prev.map(c => c.id === chapterId ? data : c));

      // Bakiyeyi güncelle
      const balanceRes = await getWalletBalance();
      setCoinBalance(balanceRes.coinBalance);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Satın alma işlemi başarısız oldu.";
      toast.error(message);
    } finally {
      setIsPurchasing(false);
    }
  };

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
    document.querySelectorAll('.reader-paragraph').forEach(p => observer.observe(p));
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
      className="min-h-screen transition-all duration-300 text-base-content antialiased"
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
                <span className="font-bold text-[13px] truncate max-w-[200px] tracking-tight">{chapters[0]?.bookTitle}</span>
              </Link>
            </div>
            <div className="flex items-center gap-8">
              <button onClick={() => { setIsCommentsOpen(true); setCommentType('chapter'); }} className="text-base-content/40 hover:text-primary transition-all"><MessageSquare size={19} /></button>
              <button className="text-base-content/40 hover:text-primary transition-all"><Share2 size={19} /></button>
              <button onClick={() => setIsSettingsOpen(true)} className="text-base-content/40 hover:text-primary transition-all hover:rotate-90"><Settings size={19} /></button>
            </div>
          </div>
        </motion.div>
      </div>

      <main className={`site-shell mx-auto px-4 sm:px-8 pb-40 flex flex-col items-center gap-6 ${settings.isSiteHeaderVisible ? 'pt-[165px]' : 'pt-[80px]'}`}>
        {chapters.map((chapter, index) => (
          <section key={chapter.id} className={`${index > 0 ? "mt-12" : ""} w-full flex justify-center`}>
            <div className="bg-base-200/95 border border-base-content/10 rounded-3xl p-4 sm:p-8 lg:p-12 shadow-2xl w-full">
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

              <div className="select-none" onContextMenu={(e) => e.preventDefault()} onCopy={(e) => e.preventDefault()}>
                <div className={`text-center mb-16 px-4 font-${settings.fontFamily}`}>
                  <h1 className="text-2xl md:text-6xl font-black mb-6 leading-tight tracking-tight">{chapter.title}</h1>
                  <div className="flex items-center justify-center gap-4">
                    {index > 0 && <span className="text-[10px] font-black text-base-content/30 uppercase tracking-widest bg-base-content/5 px-6 py-2 rounded-full border border-base-content/5 font-sans">Bölüm {chapter.order}</span>}
                  </div>
                </div>

                <article
                  className={`transition-all duration-300 mx-auto text-justify font-${settings.fontFamily} ${settings.maxWidth === 'narrow' ? 'max-w-2xl' : settings.maxWidth === 'wide' ? 'max-w-400' : 'max-w-4xl'}`}
                  style={{ fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight, wordBreak: 'break-word' }}
                >
                  {chapter.paragraphs.map((p) => (
                    <div key={p.id} className={`reader-paragraph-wrapper mb-8 group/p ${activeParagraphId === p.id ? 'is-focused' : ''}`} onClick={() => setActiveParagraphId(p.id)}>
                      <div
                        id={p.id}
                        data-chapter-id={chapter.id}
                        dangerouslySetInnerHTML={{ __html: p.content }}
                        style={{ fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight }}
                        className="text-base-content reader-paragraph scroll-mt-32 opacity-[0.92] group-hover/p:opacity-100 transition-opacity pr-2 lg:pr-0"
                      />
                      <button
                        onClick={() => { setIsCommentsOpen(true); setCommentType('paragraph'); setActiveParagraphId(p.id); }}
                        className="comment-trigger flex flex-col items-center justify-center w-7 h-7 rounded-md bg-primary text-primary-content shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all group/icon"
                        title={`${paragraphCommentCounts[p.id.toLowerCase()] || 0} Yorum`}
                      >
                        <MessageSquare size={11} className="group-hover/icon:scale-110 transition-transform" />
                        {(() => {
                           const count = paragraphCommentCounts[p.id.toLowerCase()] || 0;
                           if (count > 0) {
                             return (
                               <span className="text-[8px] font-black leading-none mt-0.5">
                                 {count > 99 ? '99+' : count}
                               </span>
                             );
                           }
                           return null;
                        })()}
                      </button>
                    </div>
                  ))}
                </article>

                {chapter.isPreview && (
                  <div className="mt-12 relative">
                    <div className="absolute -top-32 left-0 right-0 h-32 bg-linear-to-t from-base-200 to-transparent pointer-events-none" />
                    <div className="bg-base-300/50 backdrop-blur-md border border-primary/20 rounded-3xl p-8 sm:p-12 text-center shadow-xl relative overflow-hidden">
                      <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
                      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary/5 rounded-full blur-3xl" />
                      <div className="flex flex-col items-center gap-6 relative z-10">
                        <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                          {profile ? <Lock size={40} className="animate-pulse" /> : <LogIn size={40} />}
                        </div>
                        <div className="max-w-md">
                          <h3 className="text-2xl sm:text-3xl font-black mb-3 leading-tight">
                            {profile ? "Bu Bölümün Devamı İçin Kilitli" : "Okumaya Devam Etmek İçin Giriş Yapın"}
                          </h3>
                          <p className="text-sm font-medium text-base-content/60 leading-relaxed">
                            {chapter.previewMessage || (profile
                              ? "Yazar bu bölümü ücretli olarak belirlemiş. Coinlerinizi kullanarak hemen erişim sağlayabilirsiniz."
                              : "Bu bölümün tamamını okumak ve kütüphanenize eklemek için lütfen giriş yapın.")}
                          </p>
                        </div>
                        {profile ? (
                          <div className="flex flex-col items-center gap-4 w-full max-w-sm">
                            <div className="flex items-center gap-6 bg-base-100 px-8 py-4 rounded-2xl border border-base-content/10 w-full justify-between shadow-sm">
                              <div className="flex items-center gap-3">
                                <Coins className="text-amber-500" size={20} />
                                <span className="text-xs font-black uppercase tracking-widest text-base-content/40">Mevcut Bakiye</span>
                              </div>
                              <span className="text-xl font-black text-amber-500 font-mono">{coinBalance ?? "..."}</span>
                            </div>
                            <button
                              onClick={() => handlePurchase(chapter.id, chapter.slug || params.chapterSlug)}
                              disabled={isPurchasing || (coinBalance !== null && coinBalance < chapter.price)}

                              className="btn btn-primary btn-lg w-full rounded-2xl font-black gap-3 shadow-lg shadow-primary/20 h-16 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 text-white"
                            >
                              {isPurchasing ? <span className="loading loading-spinner"></span> : <><ShoppingCart size={22} /> {chapter.price} Coin ile Aç</>}
                            </button>
                            {coinBalance !== null && coinBalance < chapter.price && (
                              <Link href="/wallet" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-primary hover:underline group">
                                <Plus size={14} className="group-hover:rotate-90 transition-transform" /> Yetersiz Bakiye? Coin Yükle
                              </Link>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-4 w-full max-w-sm">
                            <Link href={`/login?redirect=/read/${chapter.bookSlug}/${chapter.slug}`} className="btn btn-primary btn-lg w-full rounded-2xl font-black gap-3 shadow-lg shadow-primary/20 h-16 text-white">
                              <LogIn size={22} /> Hemen Giriş Yap
                            </Link>
                            <p className="text-[10px] font-black uppercase tracking-widest text-base-content/30">
                              Hesabınız yok mu? <Link href="/register" className="text-primary hover:underline">Kaydolun</Link>
                            </p>
                          </div>
                        )}
                        <div className="mt-4 flex items-center gap-2 px-6 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full">
                          <Info size={14} className="text-amber-600" />
                          <span className="text-[10px] font-black uppercase text-amber-600 tracking-tighter italic">Bölümün %15'lik önizlemesini görmektesiniz.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {settings.readingMode === 'paged' && (
                <div className="mt-20 mb-12 flex items-center justify-between gap-4 w-full px-4 font-sans">
                  {chapter.previousChapterSlug ? (
                    <Link href={`/read/${chapter.bookSlug}/${chapter.previousChapterSlug}`} className="flex-1 flex items-center justify-center h-14 bg-base-300 hover:bg-base-300/80 text-base-content/80 rounded-2xl font-bold gap-2 transition-all border border-base-content/10 shadow-sm">
                      <ChevronLeft size={20} /> Önceki
                    </Link>
                  ) : <div className="flex-1 h-14 bg-base-content/5 text-base-content/10 rounded-2xl flex items-center justify-center font-bold gap-2 border border-base-content/5">Önceki</div>}
                  <div className="px-10 text-base font-black text-base-content/20 tracking-widest font-mono hidden sm:block">{chapter.order} / {chapter.totalChapters}</div>
                  {chapter.nextChapterSlug ? (
                    <Link href={`/read/${chapter.bookSlug}/${chapter.nextChapterSlug}`} className="flex-1 flex items-center justify-center h-14 bg-primary text-white rounded-2xl font-black gap-2 transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95">
                      Sonraki <ChevronRight size={20} />
                    </Link>
                  ) : <div className="flex-1 h-14 bg-base-content/5 text-base-content/10 rounded-2xl flex items-center justify-center font-bold gap-2 border border-base-content/5">Son</div>}
                </div>
              )}

              <div className="mt-16 pt-16 border-t border-base-content/5 w-full px-4 font-sans text-left">
                <CommentSection
                  bookId={chapters[0]?.bookId}
                  chapterId={chapters[0]?.id}
                  authorName={chapters[0]?.bookTitle.split(' ').pop()}
                  title="Bölüm Tartışması"
                  hideList={true}
                  onCommentAdded={(pId) => {
                    if (pId) {
                      const normalizedId = pId.toLowerCase();
                      setParagraphCommentCounts(prev => ({
                        ...prev,
                        [normalizedId]: (prev[normalizedId] || 0) + 1
                      }));
                    }
                  }}
                />
              </div>
            </div>
          </section>
        ))}
        {isNextLoading && <div className="py-24 flex justify-center"><span className="loading loading-bars loading-lg text-primary opacity-20"></span></div>}
      </main>

      <AnimatePresence mode="wait">
        {isSettingsOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSettingsOpen(false)} className="fixed inset-0 z-70 bg-black/50 transition-all" />
            <motion.div
              initial={{ right: '-100%' }} animate={{ right: 0 }} exit={{ right: '-100%' }}
              transition={{ type: "spring", damping: 33, stiffness: 350 }}
              className="fixed top-0 z-80 h-full w-full max-w-[310px] bg-base-100 p-7 shadow-[-15px_0_70px_rgba(0,0,0,0.5)] overflow-y-auto border-l border-base-content/10 font-sans subpixel-antialiased"
              style={{ backfaceVisibility: 'hidden', textRendering: 'optimizeLegibility' }}
            >
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-xl font-black tracking-widest text-base-content uppercase">AYARLAR</h2>
                <button onClick={() => setIsSettingsOpen(false)} className="btn btn-ghost btn-sm btn-circle text-base-content/50 hover:text-base-content border border-base-content/10">✕</button>
              </div>
              <section className="mb-6">
                <h4 className="text-[11px] font-bold text-base-content/70 uppercase tracking-widest mb-4">GÖRÜNÜM TEMASI</h4>
                <div className="grid grid-cols-5 gap-2.5">
                  {['light', 'dark', 'cupcake', 'bumblebee', 'emerald', 'corporate', 'retro', 'valentine', 'garden', 'aqua', 'lofi', 'pastel', 'fantasy', 'wireframe', 'cmyk', 'autumn', 'acid', 'lemonade', 'winter', 'nord', 'synthwave', 'halloween', 'forest', 'black', 'luxury', 'dracula', 'business', 'night', 'coffee', 'dim', 'sunset'].map((t: string) => (
                    <button key={t} onClick={() => setSettings({ ...settings, theme: t })} className={`h-9 rounded-xl border-2 transition-all flex items-center justify-center ${settings.theme === t ? 'border-primary ring-2 ring-primary/40 shadow-lg' : 'border-base-content/10 hover:border-primary/40'}`} data-theme={t}><div className="h-2.5 w-2.5 rounded-full bg-primary" /></button>
                  ))}
                </div>
              </section>
              <div className="mb-6">
                <h4 className="text-[11px] font-bold text-base-content/70 uppercase tracking-widest mb-4">METİN BOYUTU</h4>
                <div className="flex items-center justify-between bg-base-200 border border-base-content/10 rounded-[1.2rem] p-1.5 h-14">
                  <button onClick={() => setSettings({ ...settings, fontSize: settings.fontSize - 1 })} className="btn btn-ghost btn-circle btn-sm bg-base-100 text-primary shadow-sm active:scale-95"><Minus size={18} /></button>
                  <span className="font-black text-base text-base-content">{settings.fontSize}px</span>
                  <button onClick={() => setSettings({ ...settings, fontSize: settings.fontSize + 1 })} className="btn btn-ghost btn-circle btn-sm bg-base-100 text-primary shadow-sm active:scale-95"><Plus size={18} /></button>
                </div>
              </div>
              <div className="mb-6">
                <h4 className="text-[11px] font-bold text-base-content/70 uppercase tracking-widest mb-4">YAZI FONTU</h4>
                <div className="grid grid-cols-3 gap-2 bg-base-200 p-1.5 rounded-[1.2rem] border border-base-content/10">
                  {['serif', 'sans', 'mono'].map((f) => (<button key={f} onClick={() => setSettings({ ...settings, fontFamily: f as any })} className={`h-11 text-[11px] font-black capitalize rounded-xl transition-all ${settings.fontFamily === f ? 'bg-base-100 shadow-xl text-primary ring-1 ring-primary/20' : 'text-base-content/40 hover:text-base-content/70'}`}>{f}</button>))}
                </div>
              </div>
              <div className="mb-6 px-1">
                <div className="flex justify-between text-[11px] font-bold text-base-content/70 uppercase tracking-widest mb-4"><span>SATIR ARALIĞI</span><span className="text-primary font-mono text-xs">{settings.lineHeight}</span></div>
                <input type="range" min="1.2" max="2.4" step="0.1" value={settings.lineHeight} onChange={(e) => setSettings({ ...settings, lineHeight: parseFloat(e.target.value) })} className="range range-xs range-primary" />
              </div>
              <section className="mb-6">
                <h4 className="text-[11px] font-bold text-base-content/70 uppercase tracking-widest mb-4">OKUMA MODU</h4>
                <div className="grid grid-cols-2 gap-2 bg-base-200 p-1.5 rounded-[1.2rem] border border-base-content/10">
                  <button onClick={() => { setSettings({ ...settings, readingMode: 'infinite' }); setChapters(prev => prev.slice(0, 1)); }} className={`flex items-center justify-center gap-2 h-11 text-[10px] font-black uppercase rounded-xl transition-all ${settings.readingMode === 'infinite' ? 'bg-base-100 shadow-xl text-primary ring-1 ring-primary/20' : 'text-base-content/40 hover:text-base-content/70'}`}><BookOpen size={14} /> Sonsuz</button>
                  <button onClick={() => { setSettings({ ...settings, readingMode: 'paged' }); setChapters(prev => prev.slice(0, 1)); }} className={`flex items-center justify-center gap-2 h-11 text-[10px] font-black uppercase rounded-xl transition-all ${settings.readingMode === 'paged' ? 'bg-base-100 shadow-xl text-primary ring-1 ring-primary/20' : 'text-base-content/40 hover:text-base-content/70'}`}><Scaling size={14} /> Sayfalı</button>
                </div>
              </section>
              <section className="mb-6">
                <h4 className="text-[11px] font-bold text-base-content/70 uppercase tracking-widest mb-4">ARAYÜZ AYARLARI</h4>
                <div className="grid grid-cols-2 gap-2.5 px-1">
                  <button onClick={() => setSettings({ ...settings, isPinned: !settings.isPinned })} className={`flex items-center justify-center gap-2 h-11 rounded-xl transition-all border-2 ${settings.isPinned ? 'bg-primary/10 border-primary/40 text-primary shadow-inner' : 'bg-base-200 border-transparent text-base-content/40 hover:text-base-content/70'}`}><Pin size={14} /><span className="text-[10px] font-bold uppercase">SABİT</span></button>
                  <button onClick={() => setSettings({ ...settings, isSiteHeaderVisible: !settings.isSiteHeaderVisible })} className={`flex items-center justify-center gap-2 h-11 rounded-xl transition-all border-2 ${!settings.isSiteHeaderVisible ? 'bg-primary/10 border-primary/40 text-primary shadow-inner' : 'bg-base-200 border-transparent text-base-content/40 hover:text-base-content/70'}`}>{settings.isSiteHeaderVisible ? <Maximize size={14} /> : <Scaling size={14} />} <span className="text-[10px] font-bold uppercase">SİTE</span></button>
                </div>
              </section>
              <div className="hidden lg:block">
                <h4 className="text-[11px] font-bold text-base-content/70 uppercase tracking-widest mb-4">SAYFA GENİŞLİĞİ</h4>
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-2 bg-base-200 p-1.5 rounded-[1.2rem] border border-base-content/10">
                  {['narrow', 'normal', 'wide'].map((w) => (<button key={w} onClick={() => setSettings({ ...settings, maxWidth: w as any })} className={`h-11 text-[10px] font-black uppercase rounded-xl transition-all ${settings.maxWidth === w ? 'bg-base-100 shadow-xl text-primary ring-1 ring-primary/20' : 'text-base-content/40 hover:text-base-content/70'} ${w === 'wide' ? 'hidden xl:flex items-center justify-center' : ''}`}>{w === 'narrow' ? 'Dar' : w === 'normal' ? 'Norm' : 'Geniş'}</button>))}
                </div>
              </div>
            </motion.div>
          </>
        )}
        {isCommentsOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCommentsOpen(false)} className="fixed inset-0 z-70 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ right: '-100%' }} animate={{ right: 0 }} exit={{ right: '-100%' }}
              transition={{ type: "spring", damping: 35, stiffness: 400 }}
              className="fixed top-0 z-80 h-full w-full max-w-[420px] bg-base-100 shadow-[-15px_0_70px_rgba(0,0,0,0.5)] flex flex-col font-sans subpixel-antialiased overflow-hidden"
            >
              <div className="p-6 border-b border-base-content/5 flex items-center justify-between bg-base-200/40 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    {commentType === 'chapter' ? <MessageSquare size={20} /> : <AlignLeft size={20} />}
                  </div>
                  <div>
                    <h2 className="text-sm font-black tracking-widest text-base-content uppercase leading-tight">
                      {commentType === 'chapter' ? 'Bölüm Tartışması' : 'Satır Yorumu'}
                    </h2>
                    <p className="text-[10px] font-black tracking-widest text-base-content/30 mt-0.5 uppercase">
                      {commentType === 'chapter' ? 'GENEL DÜŞÜNCELER' : 'BU SATIRA ÖZEL'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsCommentsOpen(false)} className="btn btn-ghost btn-sm btn-circle text-base-content/50 hover:text-base-content border border-base-content/10">✕</button>
              </div>

              {/* Tabs for Separation */}
              <div className="flex items-center px-6 pt-4 gap-6 bg-base-100 border-b border-base-content/5">
                <button
                  onClick={() => setCommentType('chapter')}
                  className={`pb-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 relative ${commentType === 'chapter' ? 'border-primary text-primary' : 'border-transparent text-base-content/40 hover:text-base-content/70'}`}
                >
                  BÖLÜM GENELİ
                </button>
                {activeParagraphId && (
                  <button
                    onClick={() => setCommentType('paragraph')}
                    className={`pb-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 relative ${commentType === 'paragraph' ? 'border-primary text-primary' : 'border-transparent text-base-content/40 hover:text-base-content/70'}`}
                  >
                    BU SATIR
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-base-content/10">
                <CommentSection
                  bookId={chapters[0]?.bookId}
                  chapterId={chapters[0]?.id}
                  paragraphId={commentType === 'paragraph' ? activeParagraphId || undefined : undefined}
                  authorName={chapters.length > 0 ? chapters[0].bookTitle.split(' ').pop() : ""}
                  title={commentType === 'chapter' ? 'Bölüm Yorumları' : 'Satır Yorumları'}
                  onCommentAdded={(pId) => {
                    if (pId) {
                      const normalizedId = pId.toLowerCase();
                      setParagraphCommentCounts(prev => ({
                        ...prev,
                        [normalizedId]: (prev[normalizedId] || 0) + 1
                      }));
                    }
                  }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
