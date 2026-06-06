"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import {
  Eye, BookOpen, Clock, ExternalLink, ChevronLeft, ChevronRight,
  Feather, Loader2, Plus, Search, SlidersHorizontal, Home, Star,
  MessageSquare, LayoutGrid, Wallet, Trash2, BarChart3,
  CircleDollarSign, AlertCircle, CheckCircle2, ShieldCheck,
  FileText, Building2, Zap, PenTool, X
} from "lucide-react";
import { BookCover } from "@/components/ui/book-cover";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { canAccessAuthorPanel as hasAuthorPanelAccess, getMyBooks, restoreBook, type MyBookListItem } from "@/lib/auth";
import { getWalletBalance, getWalletTransactions, type WalletBalanceDto, type TransactionDto } from "@/lib/wallet";
import { apiRequest, resolveMediaUrl } from "@/lib/api";
import { toast } from "@/lib/toast";
import { LegalDocumentModal } from "@/components/legal/legal-document-modal";

const STATUS_OPTIONS = [
  { label: "Tüm Durumlar", value: "" },
  { label: "Taslak", value: "Draft" },
  { label: "Devam Ediyor", value: "Ongoing" },
  { label: "Tamamlandı", value: "Completed" },
  { label: "Ara Verildi", value: "Hiatus" },
  { label: "İptal Edildi", value: "Cancelled" },
] as const;

type PaidAuthorStatus = {
  id?: string;
  status?: string | number;
  rejectionReason?: string | null;
  adminNote?: string | null;
  reviewedAt?: string | null;
  createdAt?: string;
  bankName?: string | null;
  iban?: string | null;
};
type ApiEnvelope<T> = {
  isSuccess?: boolean;
  data?: T;
};

type AuthorInsightsResponse = {
  books: MyBookListItem[];
  chaptersByBook: Array<{
    bookId: string;
    bookSlug: string;
    items: Array<{
      id: string;
      title: string;
      slug: string;
      status: string | number;
      viewCount?: number;
      createdAt: string;
      publishedAt?: string;
    }>;
  }>;
  auditLogs: Array<{
    tableName?: string;
    operation?: string;
    createdAt?: string;
    keyValues?: string;
    oldValues?: string;
    newValues?: string;
    changedColumns?: string;
  }>;
  backendInsights?: {
    funnel?: {
      bookViews: number;
      chapterOpens: number;
      chapterCompletions: number;
      votes: number;
    };
    revisionTimeline?: Array<{
      createdAt: string;
      module: string;
      action: string;
      entityName: string;
      state: string;
      changedColumns?: string;
      primaryKeys?: string;
    }>;
    funnelDaily?: Array<{
      date: string;
      chapterOpens: number;
      chapterCompletions: number;
      votes: number;
    }>;
  } | null;
};


function getStatusProps(status: MyBookListItem["status"] | string | number) {
  // Hem string hem integer değerleri karşıla
  const statusStr = typeof status === "number" ?
    (["Draft", "Ongoing", "Completed", "Hiatus", "Cancelled"][status] || String(status)) : status;

  switch (statusStr) {
    case "Draft": return { label: "Taslak", color: "bg-base-content/10 text-base-content" };
    case "Ongoing": return { label: "Devam Ediyor", color: "bg-info/20 text-info border-info/20" };
    case "Completed": return { label: "Tamamlandı", color: "bg-success/20 text-success border-success/20" };
    case "Hiatus": return { label: "Ara Verildi", color: "bg-warning/20 text-warning border-warning/20" };
    case "Cancelled": return { label: "İptal Edildi", color: "bg-error/20 text-error border-error/20" };
    default: return { label: statusStr, color: "bg-base-content/10 text-base-content" };
  }
}

function getContentRatingProps(rating: MyBookListItem["contentRating"] | string | number) {
  // Hem string hem integer değerleri karşıla
  const ratingStr = typeof rating === "number" ?
    (["General", "Teen", "Mature"][rating] || String(rating)) : rating;

  switch (ratingStr) {
    case "General": return { label: "G", color: "bg-success/80 text-success-content" };
    case "Teen": return { label: "PG-13", color: "bg-warning/80 text-warning-content" };
    case "Mature": return { label: "R", color: "bg-error/80 text-error-content" };
    default: return { label: ratingStr, color: "bg-base-content/80 text-base-content-content" };
  }
}

import { Suspense } from "react";

function AuthorPanelContent() {
  const { profile, isLoading: isSessionLoading } = useAuth();
  const router = useRouter();

  const searchParams = useSearchParams();
  const pathname = usePathname();

  // URL'den tab bilgisini al, yoksa 'stats' (Dashboard) varsayılan olsun
  const activeTab = searchParams.get("tab") || "stats";

  const setActiveTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Sekme veya odak değiştiğinde seçimi hafızaya kaydet (Yedek olarak dursun)
  useEffect(() => {
    localStorage.setItem("author_panel_active_tab", activeTab);
  }, [activeTab]);


  const [books, setBooks] = useState<MyBookListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState(() => searchParams.get("q") ?? "");
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [status, setStatus] = useState(() => searchParams.get("status") ?? "");
  const [bookType, setBookType] = useState(() => searchParams.get("type") ?? "");
  const [page, setPage] = useState(() => {
    const initialPage = Number(searchParams.get("page") ?? "1");
    return Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1;
  });
  const [pageSize, setPageSize] = useState(() => {
    const initialPageSize = Number(searchParams.get("pageSize") ?? "10");
    return [10, 20, 50].includes(initialPageSize) ? initialPageSize : 10;
  });
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [deletedBooks, setDeletedBooks] = useState<MyBookListItem[]>([]);
  const [isTrashLoading, setIsTrashLoading] = useState(false);
  const [trashQuery, setTrashQuery] = useState(() => searchParams.get("trashQ") ?? "");
  const [selectedDeletedBookIds, setSelectedDeletedBookIds] = useState<string[]>([]);
  const [confirmRestoreIds, setConfirmRestoreIds] = useState<string[] | null>(null);

  // Gelirlerim State
  const [walletBalance, setWalletBalance] = useState<WalletBalanceDto | null>(null);
  const [earningsTransactions, setEarningsTransactions] = useState<TransactionDto[]>([]);
  const [isEarningsLoading, setIsEarningsLoading] = useState(false);
  const [earningsPage, setEarningsPage] = useState(1);
  const [totalEarningsCount, setTotalEarningsCount] = useState(0);
  const [paidStatus, setPaidStatus] = useState<PaidAuthorStatus | null>(null);
  const [, setIsPaidStatusLoading] = useState(false);
  const [isPaidSubmitting, setIsPaidSubmitting] = useState(false);
  const [legalSlug, setLegalSlug] = useState<string | null>(null);
  const [paidTermsAccepted, setPaidTermsAccepted] = useState(false);
  const [isPaidModalOpen, setIsPaidModalOpen] = useState(false);
  const [insightsBookFilter, setInsightsBookFilter] = useState("");
  const [insightsData, setInsightsData] = useState<AuthorInsightsResponse | null>(null);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [insightsBookId, setInsightsBookId] = useState("");
  const [insightsAction, setInsightsAction] = useState("");
  const [insightsEntity, setInsightsEntity] = useState("");
  const [insightsStartDate, setInsightsStartDate] = useState("");
  const [insightsEndDate, setInsightsEndDate] = useState("");
  const [showAllFunnelRows, setShowAllFunnelRows] = useState(false);
  const [showAllTimelineRows, setShowAllTimelineRows] = useState(false);

  useEffect(() => {
    if (isSessionLoading) return;
    if (!profile) { router.replace("/login"); return; }
    if (!hasAuthorPanelAccess(profile)) router.replace("/");
  }, [isSessionLoading, profile, router]);

  useEffect(() => {
    const timer = setTimeout(() => { setQuery(searchInput); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", activeTab);

    if (searchInput.trim()) params.set("q", searchInput.trim());
    else params.delete("q");
    if (status) params.set("status", status);
    else params.delete("status");
    if (bookType) params.set("type", bookType);
    else params.delete("type");
    if (page > 1) params.set("page", String(page));
    else params.delete("page");
    if (pageSize !== 10) params.set("pageSize", String(pageSize));
    else params.delete("pageSize");
    if (trashQuery.trim()) params.set("trashQ", trashQuery.trim());
    else params.delete("trashQ");

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [activeTab, searchInput, status, bookType, page, pageSize, trashQuery, pathname, router, searchParams]);

  useEffect(() => {
    let isMountedLocal = true;
    const loadBooks = async (isDeleted: boolean = false) => {
      try {
        if (isDeleted) setIsTrashLoading(true);
        setIsLoading(true);
        const response = await getMyBooks({
          pageNumber: page,
          pageSize: pageSize,
          search: query || undefined,
          status: status || undefined,
          type: bookType || undefined,
          OnlyDeleted: isDeleted
        });

        if (isMountedLocal) {
          if (isDeleted) {
            setDeletedBooks(response.items);
          } else {
            setBooks(response.items);
            setTotalCount(response.totalCount);
            setTotalPages(response.totalPages);
          }
          setError(null);
        }
      } catch {
        if (isMountedLocal) {
          setError("Eserler yüklenirken bir hata oluştu.");
          if (isDeleted) toast.error({ description: "Çöp kutusu verisi alınamadı." });
        }
      } finally {
        if (isMountedLocal) {
          setIsLoading(false);
          setIsTrashLoading(false);
        }
      }
    };
    if (hasAuthorPanelAccess(profile)) {
      if (activeTab === "trash") loadBooks(true);
      else loadBooks(false); // Dashboard ve Eserlerim için kitaplar yüklenmeli
    }
    return () => { isMountedLocal = false; };
  }, [profile, query, status, bookType, page, pageSize, activeTab]);

  // Gelirleri Yükle
  useEffect(() => {
    if (activeTab === "earnings" && hasAuthorPanelAccess(profile)) {
      const loadEarnings = async () => {
        setIsEarningsLoading(true);
        try {
          const [balance, txs] = await Promise.all([
            getWalletBalance(),
            getWalletTransactions(earningsPage, 20, undefined, "Revenue")
          ]);
          setWalletBalance(balance);
          setEarningsTransactions(txs.items);
          setTotalEarningsCount(txs.totalCount);
        } catch (err) {
          console.error("Gelirler yüklenemedi:", err);
        } finally {
          setIsEarningsLoading(false);
        }
      };

      const loadPaidStatus = async () => {
        setIsPaidStatusLoading(true);
        try {
          const res = await apiRequest<ApiEnvelope<PaidAuthorStatus>>("/paid-author/application-status", { method: "GET" });
          if (res.isSuccess) {
            setPaidStatus(res.data ?? null);
          }
        } catch (err) {
          console.error("Başvuru durumu yüklenemedi:", err);
        } finally {
          setIsPaidStatusLoading(false);
        }
      };

      loadEarnings();
      loadPaidStatus();
    }
  }, [activeTab, profile, earningsPage]);

  useEffect(() => {
    if (activeTab !== "insights" || !hasAuthorPanelAccess(profile)) return;
    let mounted = true;
    const loadInsights = async () => {
      setIsInsightsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("days", "30");
        if (insightsBookId) params.set("bookId", insightsBookId);
        if (insightsAction.trim()) params.set("action", insightsAction.trim());
        if (insightsEntity.trim()) params.set("entity", insightsEntity.trim());
        if (insightsStartDate) params.set("startDate", insightsStartDate);
        if (insightsEndDate) params.set("endDate", insightsEndDate);
        const res = await fetch(`/api/author/insights?${params.toString()}`, { method: "GET", cache: "no-store" });
        const json = await res.json();
        if (!mounted) return;
        if (!res.ok || !json?.isSuccess) throw new Error(json?.message || "Insights alınamadı.");
        setInsightsData(json.data as AuthorInsightsResponse);
      } catch (err) {
        if (mounted) toast.error({ description: err instanceof Error ? err.message : "Insights alınamadı." });
      } finally {
        if (mounted) setIsInsightsLoading(false);
      }
    };
    loadInsights();
    return () => {
      mounted = false;
    };
  }, [activeTab, profile, insightsBookId, insightsAction, insightsEntity, insightsStartDate, insightsEndDate]);

  const handleSubmitPaidApplication = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const iban = formData.get("iban") as string;
    const bankName = formData.get("bankName") as string;
    const certFile = formData.get("exemptionCertificate") as File;
    const docFile = formData.get("bankDocument") as File;

    if (!iban || !bankName || !certFile.name || !docFile.name) {
      toast.error({ description: "Lütfen tüm alanları doldurun ve dosyaları yükleyin." });
      return;
    }

    setIsPaidSubmitting(true);
    try {
      // 1. İstisna Belgesini Merkezi Upload Endpointi ile Yükle
      const certFormData = new FormData();
      certFormData.append("file", certFile);
      certFormData.append("category", "paid-author-docs");

      const certRes = await apiRequest<{ documentId: string; message: string }>("/compliance/documents/upload", {
        method: "POST",
        body: certFormData,
      });
      const certId = certRes.documentId;

      // 2. Banka Belgesini Merkezi Upload Endpointi ile Yükle
      const docFormData = new FormData();
      docFormData.append("file", docFile);
      docFormData.append("category", "paid-author-docs");

      const docRes = await apiRequest<{ documentId: string; message: string }>("/compliance/documents/upload", {
        method: "POST",
        body: docFormData,
      });
      const docId = docRes.documentId;

      // 3. Başvuruyu Tamamla
      await apiRequest<unknown>("/paid-author/apply", {
        method: "POST",
        body: JSON.stringify({
          exemptionCertificateId: certId,
          bankDocumentId: docId,
          iban,
          bankName
        }),
      });

      toast.success({ description: "Başvurunuz başarıyla alındı! Belgeleriniz mühürlendi ve incelemeye alındı." });
      setIsPaidModalOpen(false);
      // Durumu güncelle
      const statusRes = await apiRequest<PaidAuthorStatus>("/paid-author/application-status", { method: "GET" });
      setPaidStatus(statusRes);
    } catch (err) {
      toast.error({ description: err instanceof Error ? err.message : "Başvuru sırasında bir hata oluştu." });
    } finally {
      setIsPaidSubmitting(false);
    }
  };

  // Gerçek Veri Hesaplamaları (Dashboard Genişletme)
  const stats = useMemo(() => {
    if (!books.length) return { totalViews: 0, avgRating: 0, totalVotes: 0 };

    const views = books.reduce((acc, b) => acc + (b.viewCount || 0), 0);
    const votes = books.reduce((acc, b) => acc + (b.voteCount || 0), 0);
    const avg = books.filter(b => b.voteCount > 0).reduce((acc, b) => acc + b.averageRating, 0) / (books.filter(b => b.voteCount > 0).length || 1);

    return { totalViews: views, avgRating: avg.toFixed(1), totalVotes: votes };
  }, [books]);

  const filteredDeletedBooks = useMemo(() => {
    const q = trashQuery.trim().toLowerCase();
    if (!q) return deletedBooks;
    return deletedBooks.filter((book) =>
      book.title.toLowerCase().includes(q) ||
      book.slug.toLowerCase().includes(q)
    );
  }, [deletedBooks, trashQuery]);

  const insightsBooks = insightsData?.books ?? books;

  const contentHealth = useMemo(() => {
    const total = insightsBooks.length;
    const missingCover = insightsBooks.filter((b) => !b.coverImageUrl).length;
    const missingDescription = insightsBooks.filter((b) => !b.description || b.description.trim().length < 80).length;
    const lowEngagement = insightsBooks.filter((b) => (b.viewCount ?? 0) < 500 && (b.voteCount ?? 0) < 5).length;
    return { total, missingCover, missingDescription, lowEngagement };
  }, [insightsBooks]);

  const funnel = useMemo(() => {
    const backendFunnel = insightsData?.backendInsights?.funnel;
    if (backendFunnel) {
      const readToVote = backendFunnel.bookViews > 0 ? (backendFunnel.votes / backendFunnel.bookViews) * 100 : 0;
      const catalogConversion = books.length > 0 ? (backendFunnel.votes / books.length) * 100 : 0;
      return {
        discovered: backendFunnel.bookViews,
        voteCount: backendFunnel.votes,
        ratedBooks: backendFunnel.chapterOpens,
        readToVote,
        catalogConversion,
        chapterCompletions: backendFunnel.chapterCompletions,
      };
    }
    const discovered = insightsBooks.reduce((sum, b) => sum + (b.viewCount ?? 0), 0);
    const voteCount = insightsBooks.reduce((sum, b) => sum + (b.voteCount ?? 0), 0);
    const ratedBooks = insightsBooks.filter((b) => (b.voteCount ?? 0) > 0).length;
    const readToVote = discovered > 0 ? (voteCount / discovered) * 100 : 0;
    const catalogConversion = insightsBooks.length > 0 ? (ratedBooks / insightsBooks.length) * 100 : 0;
    return { discovered, voteCount, ratedBooks, readToVote, catalogConversion, chapterCompletions: 0 };
  }, [insightsBooks, insightsData?.backendInsights?.funnel, books.length]);

  const abIdeas = useMemo(() => {
    return insightsBooks
      .map((b) => {
        const views = b.viewCount ?? 0;
        const votes = b.voteCount ?? 0;
        const score = views > 0 ? votes / views : 0;
        return {
          id: b.id,
          title: b.title,
          slug: b.slug,
          score,
          suggestion:
            views > 1500 && score < 0.01
              ? "Kapak varyant testi önerilir"
              : views > 800 && score < 0.015
              ? "Başlık + kapak kombine testi önerilir"
              : "Mevcut kreatif korunabilir",
        };
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);
  }, [insightsBooks]);

  const changeHistoryRows = useMemo(() => {
    const q = insightsBookFilter.trim().toLowerCase();
    return insightsBooks
      .filter((b) => !q || b.title.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q))
      .map((b) => ({
        id: b.id,
        title: b.title,
        slug: b.slug,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        status: getStatusProps(b.status).label,
      }))
      .sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt));
  }, [insightsBooks, insightsBookFilter]);
  const funnelDailyRows = insightsData?.backendInsights?.funnelDaily ?? [];
  const revisionTimelineRows = insightsData?.backendInsights?.revisionTimeline ?? [];

  if (isSessionLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-base-100">
      <span className="loading loading-spinner loading-lg text-primary"></span>
    </div>
  );



  const handleRestoreBooks = async (ids: string[]) => {
    try {
      if (ids.length === 0) return;
      setIsTrashLoading(true);
      await Promise.all(ids.map((id) => restoreBook(id)));

      // Çöp kutusunu yenile
      const response = await getMyBooks({ pageNumber: 1, pageSize: 50, OnlyDeleted: true });
      setDeletedBooks(response.items);
      setSelectedDeletedBookIds((prev) => prev.filter((id) => !ids.includes(id)));

      toast.success({ description: ids.length === 1 ? "Eser geri yüklendi." : `${ids.length} eser geri yüklendi.` });
    } catch (err) {
      toast.error({ description: "Geri yükleme sırasında bir hata oluştu: " + (err instanceof Error ? err.message : "Bilinmeyen hata") });
    } finally {
      setIsTrashLoading(false);
      setConfirmRestoreIds(null);
    }
  };

  // Ortak Glassmorphism Sınıfı
  const glassStyle = "bg-base-100/40 backdrop-blur-xl border border-base-content/10 shadow-xl";

  return (
    <main className="relative min-h-screen bg-base-200/30 pb-12 pt-28 sm:pt-32">
      {/* Dekoratif bulanık daireler */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-40 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="site-shell mx-auto px-4 sm:px-8 space-y-8 relative z-10">

        {/* Üst Kısım: Başlık ve İstatistikler Birleşik */}
        <section className={`p-4 sm:p-6 rounded-4xl ${glassStyle} space-y-8`}>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-4">
                <div className="breadcrumbs text-xs font-semibold text-base-content/50 mb-1">
                  <ul>
                    <li><Link href="/" className="hover:text-primary transition-colors flex items-center"><Home className="w-3.5 h-3.5 mr-1.5" /> Ana Sayfa</Link></li>
                    <li className="text-base-content/40">Yazarlık Paneli</li>
                  </ul>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 text-primary">
                    <Feather className="h-7 w-7" strokeWidth={2.5} />
                    <h1 className="hero-title-gradient text-3xl font-black tracking-tight sm:text-4xl uppercase italic leading-none">Yazarlık Paneli</h1>
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-base-content/30 italic">Eserlerini yönet ve performans verilerini anlık takip et.</p>
                </div>
              </div>

              {hasAuthorPanelAccess(profile) && (
                <Link href="/author/new" className="btn btn-primary h-11 rounded-xl px-6 font-black uppercase tracking-widest shadow-lg shadow-primary/20 shrink-0 hover:-translate-y-0.5 transition-transform">
                  <Plus className="w-4 h-4 ml-[-4px]" strokeWidth={3} /> Yeni Eser
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Sekme Seçici (Tabs) */}
        <div className={`mx-auto w-full rounded-[1.8rem] p-1.5 ${glassStyle} lg:mx-0 lg:w-fit`}>
          <div className="no-scrollbar -mx-1 flex items-center gap-1.5 overflow-x-auto px-1">
          <button
            onClick={() => setActiveTab("stats")}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition-all sm:px-5 sm:py-2.5 sm:text-xs sm:tracking-widest ${activeTab === "stats" ? "bg-primary text-primary-content shadow-lg shadow-primary/20" : "hover:bg-base-100/40 text-base-content/50"
              }`}
          >
            <BarChart3 className="w-4 h-4" /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab("works")}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition-all sm:px-5 sm:py-2.5 sm:text-xs sm:tracking-widest ${activeTab === "works" ? "bg-primary text-primary-content shadow-lg shadow-primary/20" : "hover:bg-base-100/40 text-base-content/50"
              }`}
          >
            <LayoutGrid className="w-4 h-4" /> Eserlerim
          </button>
          <button
            onClick={() => setActiveTab("earnings")}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition-all sm:px-5 sm:py-2.5 sm:text-xs sm:tracking-widest ${activeTab === "earnings" ? "bg-primary text-primary-content shadow-lg shadow-primary/20" : "hover:bg-base-100/40 text-base-content/50"
              }`}
          >
            <Wallet className="w-4 h-4" /> Gelirlerim
          </button>
          <button
            onClick={() => setActiveTab("trash")}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition-all sm:px-5 sm:py-2.5 sm:text-xs sm:tracking-widest ${activeTab === "trash" ? "bg-primary text-primary-content shadow-lg shadow-primary/20" : "hover:bg-base-100/40 text-base-content/50"
              }`}
          >
            <Trash2 className="w-4 h-4" /> Çöp Kutusu
          </button>
          <button
            onClick={() => setActiveTab("insights")}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition-all sm:px-5 sm:py-2.5 sm:text-xs sm:tracking-widest ${activeTab === "insights" ? "bg-primary text-primary-content shadow-lg shadow-primary/20" : "hover:bg-base-100/40 text-base-content/50"
              }`}
          >
            <Zap className="w-4 h-4" /> Insights
          </button>
          </div>
        </div>

        {activeTab === "stats" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <div className="space-y-8">
              {/* Ana İstatistikler Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`p-6 rounded-3xl ${glassStyle} flex flex-col gap-1`}>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-base-content/40 italic">
                    <Eye className="w-3 h-3 text-primary" /> Toplam Okunma
                  </div>
                  <div className="text-3xl font-black tracking-tighter text-primary">
                    {stats.totalViews.toLocaleString("tr-TR")}
                  </div>
                </div>

                <div className={`p-6 rounded-3xl ${glassStyle} flex flex-col gap-1`}>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-base-content/40 italic">
                    <Star className="w-3 h-3 text-warning" /> Ortalama Puan
                  </div>
                  <div className="text-3xl font-black tracking-tighter text-base-content/80">
                    {stats.avgRating}
                  </div>
                </div>

                <div className={`p-6 rounded-3xl ${glassStyle} flex flex-col gap-1`}>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-base-content/40 italic">
                    <MessageSquare className="w-3 h-3 text-secondary" /> Toplam Oy
                  </div>
                  <div className="text-3xl font-black tracking-tighter text-base-content/80">
                    {stats.totalVotes.toLocaleString("tr-TR")}
                  </div>
                </div>
              </div>

              <div className={`p-8 rounded-[2.5rem] ${glassStyle} relative overflow-hidden group`}>
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all">
                  <Feather className="w-32 h-32" />
                </div>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-4">Hoş geldin, {profile?.displayName || "Yazar"}!</h2>
                <p className="text-base-content/60 font-bold leading-relaxed max-w-lg italic">
                  Bugün eserlerin için harika bir gün. Anlık istatistiklerini yukarıdan takip edebilir, yeni içeriklerin için plan yapabilirsin.
                </p>

                <div className="flex gap-4 mt-8">
                  <Link href="/author?tab=works" className="btn btn-primary px-8 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20">Eserlerime Git</Link>
                  <Link href="/author/new" className="btn btn-ghost px-8 rounded-2xl font-black uppercase tracking-widest bg-base-content/5 hover:bg-base-content/10">Yeni Taslak</Link>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === "works" && (
          <>
            {/* Filtreleme ve Arama (Glass Forms) */}
            <div className={`flex flex-col xl:flex-row gap-4 p-4 rounded-4xl ${glassStyle}`}>
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 w-5 h-5 -translate-y-1/2 text-base-content/40" />
                <input
                  type="text"
                  placeholder="Eserlerin arasında ara..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="input h-14 w-full rounded-xl bg-base-100/30 pl-12 text-sm font-bold tracking-tight border-transparent focus:border-primary/30 focus:bg-base-100/50 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full xl:w-auto">
                {/* Durum Filtresi */}
                <div className="relative group">
                  <SlidersHorizontal className="absolute left-4 top-1/2 w-4 h-4 -translate-y-1/2 text-base-content/40 pointer-events-none" />
                  <select
                    value={status}
                    onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                    className="select h-14 w-full rounded-xl bg-base-100/30 pl-11 text-xs font-bold uppercase tracking-widest text-base-content/80 border-transparent focus:border-primary/30 focus:bg-base-100/50 cursor-pointer appearance-none"
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value} className="bg-base-100 font-sans">{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Tür Filtresi */}
                <div className="relative group">
                  <BookOpen className="absolute left-4 top-1/2 w-4 h-4 -translate-y-1/2 text-base-content/40 pointer-events-none" />
                  <select
                    value={bookType}
                    onChange={(e) => { setBookType(e.target.value); setPage(1); }}
                    className="select h-14 w-full rounded-xl bg-base-100/30 pl-11 text-xs font-bold uppercase tracking-widest text-base-content/80 border-transparent focus:border-primary/30 focus:bg-base-100/50 cursor-pointer appearance-none"
                  >
                    <option value="" className="bg-base-100 font-sans">Tüm Türler</option>
                    <option value="0" className="bg-base-100 font-sans">Orijinal</option>
                    <option value="1" className="bg-base-100 font-sans">Çeviri</option>
                  </select>
                </div>

                {/* Sayfa Boyutu */}
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 w-4 h-4 -translate-y-1/2 text-base-content/40 pointer-events-none text-[10px] font-black uppercase">P.</div>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                    className="select h-14 w-full rounded-xl bg-base-100/30 pl-11 text-xs font-bold uppercase tracking-widest text-base-content/80 border-transparent focus:border-primary/30 focus:bg-base-100/50 cursor-pointer appearance-none"
                  >
                    {[10, 20, 50, 100].map(sz => (
                      <option key={sz} value={sz} className="bg-base-100 font-sans">{sz} Kayıt</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => { setSearchInput(""); setStatus(""); setBookType(""); setPage(1); setPageSize(10); }}
                  className="btn h-14 w-full lg:w-14 rounded-xl border-none bg-base-100/30 hover:bg-base-100/50 text-base-content/60 hover:text-base-content"
                  title="Temizle"
                >
                  {isLoading ? <span className="loading loading-spinner loading-sm opacity-50"></span> : <Loader2 className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Başlık Ayırıcı */}
            <div className="flex items-center gap-6 px-4">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-base-content/40 italic whitespace-nowrap">
                Kayıtlı Eserler ({totalCount})
              </h2>
              <div className="h-px flex-1 bg-linear-to-r from-base-content/10 to-transparent" />
            </div>

            <div>
              {isLoading ? (
                <div className={`py-32 flex flex-col items-center justify-center gap-5 rounded-4xl ${glassStyle} opacity-60`}>
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] italic">Yükleniyor...</p>
                </div>
              ) : error ? (
                <div className="alert alert-error shadow-sm rounded-4xl bg-error/10 text-error border border-error/20 backdrop-blur-md">
                  <span>{error}</span>
                </div>
              ) : books.length === 0 ? (
                <div className={`py-32 flex flex-col items-center justify-center gap-6 rounded-4xl border-dashed ${glassStyle} opacity-50`}>
                  <div className="w-20 h-20 rounded-full bg-base-content/5 flex items-center justify-center">
                    <BookOpen className="w-10 h-10 text-base-content/30" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] italic">Henüz bir hikaye bulunamadı</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {books.map((book) => {
                    const statusInfo = getStatusProps(book.status);
                    const ratingInfo = getContentRatingProps(book.contentRating);

                    return (
                      <article key={book.id} className={`card sm:card-side rounded-4xl bg-transparent! group hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/30 transition-all duration-500 overflow-hidden ${glassStyle}`}>
                        <figure className="sm:w-52 shrink-0 relative m-3 rounded-3xl overflow-hidden bg-base-100/40 aspect-4/5 sm:aspect-auto">
                          <BookCover 
                            src={resolveMediaUrl(book.coverImageUrl)} 
                            alt={book.title} 
                            className="h-full w-full transition duration-700 group-hover:scale-110" 
                            sizes="200px"
                          />
                        </figure>

                        <div className="card-body p-5 sm:p-6 sm:pl-3">
                          <div className="flex-1 space-y-4">
                            <div>
                              <Link href={`/author/${book.slug}`} className="text-xl sm:text-2xl font-black tracking-tight leading-tight group-hover:text-primary transition-colors line-clamp-2 mb-2">
                                {book.title}
                              </Link>

                              <div className="flex flex-wrap gap-2.5 items-center">
                                <span className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest border text-center min-w-[80px] ${statusInfo.color}`}>
                                  {statusInfo.label}
                                </span>

                                <div className="flex flex-wrap gap-1.5 items-center">
                                  {book.categories?.slice(0, 3).map((cat) => (
                                    <span key={cat.id} className="px-3 py-1.5 rounded-md bg-base-content/5 text-[9px] font-bold text-base-content/40 uppercase tracking-widest border border-base-content/10">
                                      {cat.name}
                                    </span>
                                  ))}
                                  {book.categories?.length > 3 && (
                                    <span className="text-[9px] font-black text-base-content/20 ml-1">+{book.categories.length - 3}</span>
                                  )}

                                  <span className="px-3 py-1.5 rounded-md bg-base-100/50 text-[9px] font-black uppercase tracking-widest border border-base-content/10 text-base-content/60">
                                    {book.type === "Original" || book.type === 0 ? "Orijinal" : "Çeviri"}
                                  </span>
                                  <span className={`px-2 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest border min-w-[32px] text-center ${ratingInfo.color}`}>
                                    {ratingInfo.label}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <p className="text-[11px] font-medium leading-relaxed text-base-content/40 italic line-clamp-2">
                              {book.description || "Henüz bir açıklama eklenmemiş."}
                            </p>

                            {book.isHidden && (
                              <div className="flex gap-3 items-center p-3 rounded-xl bg-error/12 border border-error/20 animate-pulse">
                                <div className="p-2 rounded-lg bg-error/20 text-error">
                                  <SlidersHorizontal className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-error">YONETICI MUDAHALESI</p>
                                  <p className="text-[11px] font-bold text-error/80 leading-tight">
                                    Kitabınız yönetici tarafından gizlenmiştir. Problem olduğunu düşünüyorsanız lütfen destek talebi oluşturun.
                                  </p>
                                </div>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-5 border-t border-base-content/5 pt-4">
                              <div className="flex items-center gap-2 text-xs font-black text-base-content/60">
                                <Eye className="w-4 h-4 text-primary" />
                                {book.viewCount?.toLocaleString("tr-TR") || "0"}
                              </div>
                              <div className="flex items-center gap-2 text-xs font-black text-base-content/60">
                                <BookOpen className="w-4 h-4 text-secondary" />
                                {book.chapterCount} <span className="text-[9px] opacity-40 font-bold tracking-widest">BÖLÜM</span>
                              </div>
                              <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-base-content/30 uppercase tracking-widest italic ml-auto mr-1">
                                <Clock className="w-3.5 h-3.5" />
                                {book.updatedAt ? new Date(book.updatedAt).toLocaleDateString("tr-TR") : "-"}
                              </div>
                            </div>
                          </div>

                          <div className="card-actions justify-end mt-4 pt-4 border-t border-base-content/5">
                            <Link href={`/author/${book.slug}`} className="btn btn-primary h-12 flex-1 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40">
                              Yönet
                            </Link>
                            <Link href={`/Books/${book.slug}`} target="_blank" className="btn h-12 w-12 p-0 rounded-xl border border-base-content/10 bg-base-100/10 text-base-content/40 hover:text-primary hover:bg-base-100/20 hover:border-primary/20 transition-all">
                              <ExternalLink className="w-5 h-5" />
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {/* Sayfalama (Pagination) - Standart Yapı */}
              {!isLoading && totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-base-content/5 px-4 backdrop-blur-xs">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30 italic">
                    Sayfa {page} / {totalPages} — Toplam {totalCount} Eser
                  </div>
                  <div className="join gap-1 p-1 rounded-2xl bg-base-100/30 border border-base-content/5">
                    <button
                      onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      disabled={page === 1}
                      className="btn btn-sm h-10 w-10 p-0 rounded-xl bg-transparent! border-none hover:bg-primary hover:text-primary-content transition-all duration-300 disabled:opacity-20"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                       let pageNum = page;
                       if (totalPages <= 5) pageNum = i + 1;
                       else {
                         if (page <= 3) pageNum = i + 1;
                         else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                         else pageNum = page - 2 + i;
                       }
                       
                       return (
                         <button
                           key={pageNum}
                           onClick={() => { setPage(pageNum); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                           className={`btn btn-sm h-10 w-10 p-0 rounded-xl border-none transition-all duration-300 text-[10px] font-black uppercase tracking-widest ${
                             page === pageNum ? "bg-primary! text-primary-content shadow-lg shadow-primary/20" : "bg-transparent! hover:bg-base-content/5"
                           }`}
                         >
                           {pageNum}
                         </button>
                       );
                    })}

                    <button
                      onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      disabled={page === totalPages}
                      className="btn btn-sm h-10 w-10 p-0 rounded-xl bg-transparent! border-none hover:bg-primary hover:text-primary-content transition-all duration-300 disabled:opacity-20"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}


        {/* Gelirlerim Sekmesi */}
        {activeTab === "earnings" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Üst Özet Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className={`p-6 rounded-4xl ${glassStyle} relative overflow-hidden group`}>
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                  <Wallet className="w-24 h-24" />
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-base-content/40 mb-2">Hakediş (Net Kazanç)</h4>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-4xl font-black text-primary">₺{isEarningsLoading ? "..." : (walletBalance?.revenueBalance || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <button
                    disabled={isEarningsLoading || (walletBalance?.revenueBalance || 0) < 100}
                    className="btn btn-primary btn-xs h-8 px-4 rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-lg shadow-primary/20"
                  >
                    Para Çek
                  </button>
                </div>
                <p className="text-[10px] font-bold text-base-content/30 mt-4 uppercase tracking-tighter italic">Bu miktar cüzdanınızdaki çekilebilir nakit karşılığıdır. (Min: 100 TL)</p>
              </div>

              <div className={`p-6 rounded-4xl ${glassStyle} relative overflow-hidden group`}>
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                  <CircleDollarSign className="w-24 h-24" />
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-base-content/40 mb-2">Toplam Bölüm Satışı</h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-secondary">{isEarningsLoading ? "..." : totalEarningsCount}</span>
                  <span className="text-[11px] font-bold opacity-30 text-secondary uppercase">İşlem</span>
                </div>
                <p className="text-[10px] font-bold text-base-content/30 mt-4 uppercase tracking-tighter italic">Kayıtlı bölüm satın alım işlemlerinin adedi.</p>
              </div>

              <div className={`p-6 rounded-4xl ${glassStyle} relative overflow-hidden group lg:col-span-1 md:col-span-2`}>
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-24 h-24" />
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-base-content/40 mb-2">Durum Özeti</h4>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black text-base-content/50 uppercase italic">Son Tahsil Edilen</span>
                    <span className="text-xs font-bold text-success">₺0.00</span>
                  </div>
                  <div className="h-px bg-base-content/5" />
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black text-base-content/50 uppercase italic">Bekleyen Ödeme</span>
                    <span className="text-xs font-bold text-warning">₺0.00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ücretli Yazarlık Statüsü / Başvuru Alanı */}
            <div className={`p-8 rounded-4xl ${glassStyle} relative overflow-hidden group border-primary/20 bg-primary/5`}>
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-48 h-48 text-primary" />
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
                <div className="max-w-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight italic hero-title-gradient">Ücretli Yazarlık Modülü</h3>
                      <p className="text-[10px] font-bold text-base-content/40 uppercase tracking-widest italic">Eserlerinden gelir elde etmeye başla.</p>
                    </div>
                  </div>

                  {!paidStatus ? (
                    <div className="space-y-4">
                      <p className="text-sm text-base-content/60 leading-relaxed font-medium">
                        Epiknovel&apos;de profesyonel bir yazar olarak bölüm satışı yapabilmek ve kazancını banka hesabına nakit olarak çekebilmek için
                        <span className="text-primary font-bold"> Ücretli Yazarlık</span> statüsüne geçmeniz gerekmektedir.
                        Gerekli belgeleri (İstisna Belgesi, Banka Dekontu) hazırlayıp hemen başvurabilirsiniz.
                      </p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <li className="flex items-center gap-2 text-[11px] font-bold text-base-content/50 uppercase"><CheckCircle2 className="w-4 h-4 text-success" /> Bölüm Satma Yetkisi</li>
                        <li className="flex items-center gap-2 text-[11px] font-bold text-base-content/50 uppercase"><CheckCircle2 className="w-4 h-4 text-success" /> Nakit Para Çekme</li>
                        <li className="flex items-center gap-2 text-[11px] font-bold text-base-content/50 uppercase"><CheckCircle2 className="w-4 h-4 text-success" /> Premium Yazar Rozeti</li>
                        <li className="flex items-center gap-2 text-[11px] font-bold text-base-content/50 uppercase"><CheckCircle2 className="w-4 h-4 text-success" /> GVK İstisna Desteği</li>
                      </ul>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className={`p-4 rounded-3xl border ${paidStatus.status === "Approved" || paidStatus.status === 1 ? "bg-success/10 border-success/20 text-success" :
                        paidStatus.status === "Pending" || paidStatus.status === 0 ? "bg-warning/10 border-warning/20 text-warning" :
                          "bg-error/10 border-error/20 text-error"
                        }`}>
                        <div className="flex items-center gap-3 mb-2">
                          {paidStatus.status === "Approved" || paidStatus.status === 1 ? <CheckCircle2 className="w-5 h-5" /> :
                            paidStatus.status === "Pending" || paidStatus.status === 0 ? <Clock className="w-5 h-5 animate-pulse" /> :
                              <AlertCircle className="w-5 h-5" />}
                          <span className="font-black uppercase tracking-widest text-xs">
                            {paidStatus.status === "Approved" || paidStatus.status === 1 ? "ÜCRETLİ YAZARLIK ONAYLANDI" :
                              paidStatus.status === "Pending" || paidStatus.status === 0 ? "BAŞVURU İNCELENİYOR" :
                                "BAŞVURU REDDEDİLDİ"}
                          </span>
                        </div>
                        <p className="text-sm font-medium opacity-80 italic">
                          {paidStatus.status === "Approved" || paidStatus.status === 1 ? "Tebrikler! Platformumuzda ücretli yazar statüsündesiniz. Gelirlerinizi hakediş kartından çekebilirsiniz." :
                            paidStatus.status === "Pending" || paidStatus.status === 0 ? "Belgeleriniz editörlerimiz tarafından inceleniyor. Ortalama 3-5 iş günü sürmektedir." :
                              `Maalesef başvurunuz uygun görülmedi. Admin Notu: ${paidStatus.adminNote || 'Belirtilmedi.'}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 min-w-[200px]">
                  {!paidStatus ? (
                    <button
                      onClick={() => setIsPaidModalOpen(true)}
                      className="btn btn-primary h-14 rounded-2xl font-black uppercase tracking-widest px-8 shadow-xl shadow-primary/25 hover:-translate-y-1 transition-all"
                    >
                      Hemen Başvur
                    </button>
                  ) : (paidStatus.status === "Rejected" || paidStatus.status === 2) ? (
                    <button
                      onClick={() => setIsPaidModalOpen(true)}
                      className="btn btn-outline btn-error h-14 rounded-2xl font-black uppercase tracking-widest px-8"
                    >
                      Yeniden Başvur
                    </button>
                  ) : (paidStatus.status === "Approved" || paidStatus.status === 1) ? (
                    <div className="flex flex-col gap-2">
                      <div className="p-4 rounded-2xl bg-success/5 border border-success/10 text-center">
                        <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] italic decoration-primary underline-offset-4 decoration-2 underline">Aktif Ödeme Hesabı</span>
                        <div className="mt-2 text-xs font-bold text-success/60">
                          {paidStatus.bankName || "Banka"} - {(paidStatus.iban || "").substring(0, 4)}...
                        </div>
                      </div>
                      <button
                        onClick={() => setIsPaidModalOpen(true)}
                        className="btn btn-ghost btn-xs h-8 text-[9px] font-black uppercase tracking-tighter opacity-40 hover:opacity-100"
                      >
                        Bankayı Güncelle
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-base-100/30 border border-base-content/5 text-center">
                      <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] italic">Kayıtlı</span>
                      <div className="mt-2 text-xs font-bold text-base-content/60">
                        {paidStatus.bankName || "Banka"} - {(paidStatus.iban || "").substring(0, 4)}...
                      </div>
                    </div>
                  )}
                  <p className="text-[9px] text-center font-bold text-base-content/25 uppercase tracking-tighter">İşlemler yasal mevzuat gereğidir.</p>
                </div>
              </div>
            </div>

            {/* İşlem Listesi */}
            <div className={`rounded-4xl ${glassStyle} overflow-hidden`}>
              <div className="p-6 border-b border-base-content/5 bg-base-content/2 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-3">
                  <Wallet className="w-4 h-4 text-primary" /> Son Bölüm Satışları & Kazanç Hareketleri
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="table w-full border-separate border-spacing-0">
                  <thead className="bg-base-content/3">
                    <tr>
                      <th className="bg-transparent! text-[10px] font-black uppercase tracking-widest text-base-content/40 py-5 pl-8">İşlem ID / Tarih</th>
                      <th className="bg-transparent! text-[10px] font-black uppercase tracking-widest text-base-content/40">Detay</th>
                      <th className="bg-transparent! text-[10px] font-black uppercase tracking-widest text-base-content/40 text-right pr-8">Kazanç</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-content/5">
                    {isEarningsLoading ? (
                      <tr>
                        <td colSpan={3} className="py-20 text-center">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary opacity-20" />
                        </td>
                      </tr>
                    ) : earningsTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-20 text-center">
                          <div className="opacity-20 italic font-bold uppercase tracking-widest text-xs">Henüz bir kazanç kaydı bulunmuyor.</div>
                        </td>
                      </tr>
                    ) : (
                      earningsTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-base-content/2 transition-colors group">
                          <td className="py-5 pl-8">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] font-black text-base-content/30 uppercase tracking-tighter truncate w-24">#{tx.id.split('-')[0]}</span>
                              <span className="text-[11px] font-bold text-base-content/60 italic">{new Date(tx.createdAt).toLocaleString("tr-TR")}</span>
                            </div>
                          </td>
                          <td className="py-5">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-black text-base-content italic line-clamp-1">{tx.description}</span>
                              <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">{tx.type}</span>
                            </div>
                          </td>
                          <td className="py-5 text-right pr-8">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-sm font-black text-success">+ ₺{tx.fiatAmount?.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              <span className="text-[10px] font-bold text-base-content/20 uppercase">NET KAZANÇ</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Sayfalama (Pagination) - Standart Yapı */}
              {!isEarningsLoading && Math.ceil(totalEarningsCount / 20) > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-t border-base-content/5 px-4 backdrop-blur-xs">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30 italic">
                    Sayfa {earningsPage} / {Math.ceil(totalEarningsCount / 20)} — Toplam {totalEarningsCount} İşlem
                  </div>
                  <div className="join gap-1 p-1 rounded-2xl bg-base-100/30 border border-base-content/5">
                    <button
                      onClick={() => { setEarningsPage(p => Math.max(1, p - 1)); }}
                      disabled={earningsPage === 1}
                      className="btn btn-sm h-10 w-10 p-0 rounded-xl bg-transparent! border-none hover:bg-primary hover:text-primary-content transition-all duration-300 disabled:opacity-20"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    {Array.from({ length: Math.min(5, Math.ceil(totalEarningsCount / 20)) }, (_, i) => {
                       const earningsTotalPages = Math.ceil(totalEarningsCount / 20);
                       let pageNum = earningsPage;
                       if (earningsTotalPages <= 5) pageNum = i + 1;
                       else {
                         if (earningsPage <= 3) pageNum = i + 1;
                         else if (earningsPage >= earningsTotalPages - 2) pageNum = earningsTotalPages - 4 + i;
                         else pageNum = earningsPage - 2 + i;
                       }
                       
                       return (
                         <button
                           key={pageNum}
                           onClick={() => { setEarningsPage(pageNum); }}
                           className={`btn btn-sm h-10 w-10 p-0 rounded-xl border-none transition-all duration-300 text-[10px] font-black uppercase tracking-widest ${
                             earningsPage === pageNum ? "bg-primary! text-primary-content shadow-lg shadow-primary/20" : "bg-transparent! hover:bg-base-content/5"
                           }`}
                         >
                           {pageNum}
                         </button>
                       );
                    })}

                    <button
                      onClick={() => { setEarningsPage(p => Math.min(Math.ceil(totalEarningsCount / 20), p + 1)); }}
                      disabled={earningsPage === Math.ceil(totalEarningsCount / 20)}
                      className="btn btn-sm h-10 w-10 p-0 rounded-xl bg-transparent! border-none hover:bg-primary hover:text-primary-content transition-all duration-300 disabled:opacity-20"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Çöp Kutusu Sekmesi */}
        {activeTab === "trash" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between px-2">
              <div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter hero-title-gradient">Çöp Kutusu</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-base-content/30 italic">Silinen Eserleriniz</p>
              </div>
            </div>

            {isTrashLoading ? (
              <div className={`py-32 flex flex-col items-center justify-center gap-5 rounded-4xl ${glassStyle} opacity-60`}>
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-[11px] font-black uppercase tracking-[0.3em] italic">Yükleniyor...</p>
              </div>
            ) : filteredDeletedBooks.length === 0 ? (
              <div className={`py-40 flex flex-col items-center justify-center gap-6 rounded-4xl border-dashed ${glassStyle} opacity-60`}>
                <div className="w-24 h-24 rounded-full bg-base-content/5 flex items-center justify-center">
                  <Trash2 className="w-12 h-12 text-base-content/20" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-black uppercase italic tracking-tighter">Çöp Kutusu Boş</h2>
                  <p className="text-xs font-bold uppercase tracking-widest text-base-content/40 italic">
                    {trashQuery ? "Aramaya uygun silinmiş eser bulunamadı." : "Burada henüz silinmiş bir eseriniz bulunmuyor."}
                  </p>
                </div>
              </div>
            ) : (
              <>
              <div className={`p-4 rounded-3xl ${glassStyle} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
                <input
                  type="text"
                  placeholder="Çöp kutusunda ara..."
                  value={trashQuery}
                  onChange={(e) => setTrashQuery(e.target.value)}
                  className="input input-bordered h-11 w-full rounded-xl bg-base-100/40 text-sm font-semibold sm:max-w-sm"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedDeletedBookIds(filteredDeletedBooks.map((b) => b.id))}
                    className="btn btn-ghost btn-sm rounded-xl"
                  >
                    Tümünü Seç
                  </button>
                  <button
                    onClick={() => setSelectedDeletedBookIds([])}
                    className="btn btn-ghost btn-sm rounded-xl"
                  >
                    Seçimi Temizle
                  </button>
                  <button
                    onClick={() => setConfirmRestoreIds(selectedDeletedBookIds)}
                    disabled={selectedDeletedBookIds.length === 0}
                    className="btn btn-primary btn-sm rounded-xl"
                  >
                    Seçilileri Geri Yükle ({selectedDeletedBookIds.length})
                  </button>
                </div>
              </div>
              {error && (
                <div className="alert alert-error rounded-2xl">
                  <span>{error}</span>
                  <button onClick={() => setPage((p) => p)} className="btn btn-xs rounded-lg">Tekrar Dene</button>
                </div>
              )}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredDeletedBooks.map((book) => {
                  const statusInfo = getStatusProps(book.status);
                  const selected = selectedDeletedBookIds.includes(book.id);
                  return (
                    <article key={book.id} className={`group relative overflow-hidden rounded-4xl border border-base-content/10 transition-all hover:border-primary/30 ${glassStyle} hover:shadow-2xl hover:shadow-primary/5`}>
                      <div className="flex gap-5 p-6">
                        <div className="relative aspect-2/3 w-24 shrink-0 overflow-hidden rounded-xl border border-base-content/10 bg-base-100/40">
                          {book.coverImageUrl ? (
                            <Image src={resolveMediaUrl(book.coverImageUrl)} alt={book.title} width={96} height={128} className="h-full w-full object-cover opacity-50 grayscale" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[8px] font-bold text-base-content/20">NO IMAGE</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                          <div>
                            <label className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-base-content/60">
                              <input
                                type="checkbox"
                                className="checkbox checkbox-xs"
                                checked={selected}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedDeletedBookIds((prev) => [...prev, book.id]);
                                  else setSelectedDeletedBookIds((prev) => prev.filter((id) => id !== book.id));
                                }}
                              />
                              Seç
                            </label>
                            <h3 className="text-sm font-black tracking-tight line-clamp-1 opacity-70 italic group-hover:text-primary transition-colors">{book.title}</h3>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border ${statusInfo.color} opacity-60`}>
                                {statusInfo.label}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => setConfirmRestoreIds([book.id])}
                            className="btn btn-primary btn-sm h-10 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all"
                          >
                            Geri Getir
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              </>
            )}
          </div>
        )}
        {activeTab === "insights" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {isInsightsLoading && (
              <div className={`rounded-3xl p-4 ${glassStyle} flex items-center gap-3`}>
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <p className="text-xs font-bold uppercase tracking-widest text-base-content/60">Insights yükleniyor...</p>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className={`rounded-3xl p-4 ${glassStyle}`}>
                <p className="text-[10px] font-black uppercase tracking-widest text-base-content/40">İçerik Sağlığı</p>
                <p className="mt-2 text-sm font-bold">Kapaksız: {contentHealth.missingCover} / Açıklaması zayıf: {contentHealth.missingDescription}</p>
                <p className="mt-1 text-xs text-base-content/60">Düşük etkileşimli eser: {contentHealth.lowEngagement}</p>
              </div>
              <div className={`rounded-3xl p-4 ${glassStyle}`}>
                <p className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Funnel</p>
                <p className="mt-2 text-sm font-bold">Keşif: {funnel.discovered.toLocaleString("tr-TR")} görüntüleme</p>
                <p className="mt-1 text-xs text-base-content/60">Okuma to Oy: %{funnel.readToVote.toFixed(2)}</p>
                <p className="mt-1 text-xs text-base-content/60">Chapter Completion: {funnel.chapterCompletions.toLocaleString("tr-TR")}</p>
              </div>
              <div className={`rounded-3xl p-4 ${glassStyle}`}>
                <p className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Katalog Dönüşümü</p>
                <p className="mt-2 text-sm font-bold">Oy alan eser: {funnel.ratedBooks} / {books.length}</p>
                <p className="mt-1 text-xs text-base-content/60">Dönüşüm: %{funnel.catalogConversion.toFixed(1)}</p>
              </div>
            </div>

            <details className={`rounded-3xl p-4 ${glassStyle}`}>
              <summary className="cursor-pointer list-none text-sm font-black uppercase tracking-widest text-base-content/70">Timeline Filtreleri</summary>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
                <select className="select select-bordered" value={insightsBookId} onChange={(e) => setInsightsBookId(e.target.value)}>
                  <option value="">Tüm Kitaplar</option>
                  {insightsBooks.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
                </select>
                <input className="input input-bordered" placeholder="Action" value={insightsAction} onChange={(e) => setInsightsAction(e.target.value)} />
                <input className="input input-bordered" placeholder="Entity" value={insightsEntity} onChange={(e) => setInsightsEntity(e.target.value)} />
                <input className="input input-bordered" type="date" value={insightsStartDate} onChange={(e) => setInsightsStartDate(e.target.value)} />
                <input className="input input-bordered" type="date" value={insightsEndDate} onChange={(e) => setInsightsEndDate(e.target.value)} />
              </div>
            </details>

            <section className={`rounded-3xl p-4 ${glassStyle}`}>
              <h3 className="text-sm font-black uppercase tracking-widest text-base-content/70">Günlük Funnel (Chart-Ready)</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Chapter Open</th>
                      <th>Completion</th>
                      <th>Vote</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAllFunnelRows ? funnelDailyRows : funnelDailyRows.slice(0, 7)).map((d, idx) => (
                      <tr key={`${d.date}-${idx}`}>
                        <td>{d.date}</td>
                        <td>{d.chapterOpens}</td>
                        <td>{d.chapterCompletions}</td>
                        <td>{d.votes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {funnelDailyRows.length > 7 ? (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAllFunnelRows((prev) => !prev)}
                    className="btn btn-ghost btn-xs rounded-lg"
                  >
                    {showAllFunnelRows ? "Daha Az Göster" : `Tümünü Gör (${funnelDailyRows.length})`}
                  </button>
                </div>
              ) : null}
            </section>

            <details className={`rounded-3xl p-4 ${glassStyle}`}>
              <summary className="cursor-pointer list-none text-sm font-black uppercase tracking-widest text-base-content/70">A/B Test Önerileri</summary>
              <h3 className="text-sm font-black uppercase tracking-widest text-base-content/70">A/B Test Önerileri</h3>
              <div className="mt-4 space-y-2">
                {abIdeas.length === 0 ? (
                  <p className="text-xs text-base-content/60">Öneri üretecek yeterli eser verisi yok.</p>
                ) : (
                  abIdeas.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-xl border border-base-content/10 bg-base-100/40 px-3 py-2">
                      <div>
                        <p className="text-sm font-bold">{item.title}</p>
                        <p className="text-[11px] text-base-content/60">{item.suggestion}</p>
                      </div>
                      <Link href={`/author/${item.slug}/edit`} className="btn btn-ghost btn-xs rounded-lg">Düzenle</Link>
                    </div>
                  ))
                )}
              </div>
            </details>

            <section className={`rounded-3xl p-4 ${glassStyle}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-base-content/70">Eser Değişiklik Geçmişi</h3>
                <input
                  type="text"
                  placeholder="Eser ara..."
                  value={insightsBookFilter}
                  onChange={(e) => setInsightsBookFilter(e.target.value)}
                  className="input input-bordered h-10 w-full rounded-xl bg-base-100/40 text-sm sm:max-w-xs"
                />
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Eser</th>
                      <th>Durum</th>
                      <th>Oluşturulma</th>
                      <th>Son Güncelleme</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(revisionTimelineRows.length
                      ? (showAllTimelineRows ? revisionTimelineRows : revisionTimelineRows.slice(0, 10)).map((item, idx) => (
                          <tr key={`${item.createdAt}-${idx}`}>
                            <td className="font-semibold">{item.entityName}</td>
                            <td>{item.action}</td>
                            <td>{item.createdAt ? new Date(item.createdAt).toLocaleString("tr-TR") : "-"}</td>
                            <td>{item.state}</td>
                          </tr>
                        ))
                      : (showAllTimelineRows ? changeHistoryRows : changeHistoryRows.slice(0, 10)).map((row) => (
                          <tr key={row.id}>
                            <td className="font-semibold">{row.title}</td>
                            <td>{row.status}</td>
                            <td>{row.createdAt ? new Date(row.createdAt).toLocaleString("tr-TR") : "-"}</td>
                            <td>{row.updatedAt ? new Date(row.updatedAt).toLocaleString("tr-TR") : "-"}</td>
                          </tr>
                        )))}
                  </tbody>
                </table>
              </div>
              {((revisionTimelineRows.length > 10) || (revisionTimelineRows.length === 0 && changeHistoryRows.length > 10)) ? (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAllTimelineRows((prev) => !prev)}
                    className="btn btn-ghost btn-xs rounded-lg"
                  >
                    {showAllTimelineRows ? "Daha Az Göster" : "Tüm Geçmişi Gör"}
                  </button>
                </div>
              ) : null}
            </section>
          </div>
        )}

      </div>

      {/* Ücretli Yazarlık Başvuru Modalı */}
      <AnimatePresence>
        {isPaidModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-base-300/80 backdrop-blur-xl" onClick={() => setIsPaidModalOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full h-full sm:h-auto sm:max-w-2xl overflow-hidden bg-base-100 sm:rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] flex flex-col border border-white/5 transition-all duration-500`}
            >
              <div className="p-8 sm:p-10 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                      <PenTool className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black italic uppercase tracking-tighter hero-title-gradient">Ücretli Yazarlık <span className="text-primary">Başvurusu</span></h2>
                      <p className="text-[10px] font-bold text-base-content/30 uppercase tracking-[0.2em] italic">Gelir elde etmek için belgelerinizi hazırlayın.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsPaidModalOpen(false)}
                    className="btn btn-circle btn-sm btn-ghost hover:bg-base-content/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={async (e) => {
                  await handleSubmitPaidApplication(e);
                  if (!e.currentTarget.hasAttribute('data-error')) {
                    setIsPaidModalOpen(false);
                  }
                }} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-black uppercase tracking-widest text-[10px] text-base-content/40 italic">Banka Adı</span>
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/20" />
                        <input
                          name="bankName"
                          type="text"
                          placeholder="Ziraat Bankası, İş Bankası vb."
                          className="input h-14 w-full rounded-2xl bg-base-100/30 pl-12 text-sm font-bold border-transparent focus:border-primary/30 focus:bg-base-100/50 transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-black uppercase tracking-widest text-[10px] text-base-content/40 italic">IBAN Numarası</span>
                      </label>
                      <div className="relative">
                        <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/20" />
                        <input
                          name="iban"
                          type="text"
                          placeholder="TR00 0000 0000..."
                          className="input h-14 w-full rounded-2xl bg-base-100/30 pl-12 text-sm font-bold border-transparent focus:border-primary/30 focus:bg-base-100/50 transition-all"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-black uppercase tracking-widest text-[10px] text-base-content/40 italic flex items-center gap-2">
                          <FileText className="w-3 h-3" /> GVK 20/B İstisna Belgesi (PDF/JPG)
                        </span>
                      </label>
                      <input
                        name="exemptionCertificate"
                        type="file"
                        className="file-input file-input-bordered w-full h-14 rounded-2xl bg-base-100/30 text-xs font-bold border-transparent focus:border-primary/30"
                        accept=".pdf,.jpg,.jpeg,.png"
                        required
                      />
                      <p className="mt-2 text-[9px] font-bold text-base-content/30 italic uppercase">* Vergi dairesinden alınan sosyal içerik üreticiliği istisna belgesi.</p>
                    </div>

                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-black uppercase tracking-widest text-[10px] text-base-content/40 italic flex items-center gap-2">
                          <ShieldCheck className="w-3 h-3" /> Banka Hesap Dekontu / Cüzdanı (PDF/JPG)
                        </span>
                      </label>
                      <input
                        name="bankDocument"
                        type="file"
                        className="file-input file-input-bordered w-full h-14 rounded-2xl bg-base-100/30 text-xs font-bold border-transparent focus:border-primary/30"
                        accept=".pdf,.jpg,.jpeg,.png"
                        required
                      />
                      <p className="mt-2 text-[9px] font-bold text-base-content/30 italic uppercase">* Üzerinde adınızın ve IBAN&apos;ın göründüğü resmi belge veya dekont.</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-warning/5 border border-warning/10">
                    <p className="text-[10px] font-bold text-warning uppercase italic flex items-center gap-2 leading-relaxed">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      Paylaştığınız bilgilerin size ait olması zorunludur. Yanlış veya başkasına ait bilgiler başvurunuzun reddine neden olur.
                    </p>
                  </div>

                    <div className="form-control">
                      <label className="label cursor-pointer justify-start gap-4 p-4 rounded-2xl bg-base-content/5 border border-base-content/5">
                        <input 
                          type="checkbox" 
                          className="checkbox checkbox-primary rounded-lg checkbox-sm" 
                          checked={paidTermsAccepted}
                          onChange={(e) => setPaidTermsAccepted(e.target.checked)}
                          required
                        />
                        <span className="label-text text-[11px] font-bold leading-relaxed">
                          <button type="button" onClick={() => setLegalSlug("paid-author-terms")} className="text-primary hover:underline">Ücretli Yazarlık Şartlarını</button> ve <button type="button" onClick={() => setLegalSlug("kvkk")} className="text-primary hover:underline">KVKK Aydınlatma Metni&apos;ni</button> okudum, onaylıyorum.
                        </span>
                      </label>
                    </div>

                    <div className="pt-4 flex gap-4">
                      <button
                        type="button"
                        onClick={() => setIsPaidModalOpen(false)}
                        className="btn btn-ghost h-14 flex-1 rounded-2xl font-black uppercase tracking-widest"
                      >
                        Vazgeç
                      </button>
                      <button
                        type="submit"
                        disabled={isPaidSubmitting || !paidTermsAccepted}
                        className="btn btn-primary h-14 flex-2 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                      >
                        {isPaidSubmitting ? <span className="loading loading-spinner"></span> : "Başvuruyu Gönder"}
                      </button>
                    </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <LegalDocumentModal 
        slug={legalSlug || ""} 
        isOpen={!!legalSlug} 
        onClose={() => setLegalSlug(null)} 
      />
      <AnimatePresence>
        {confirmRestoreIds && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-base-300/70" onClick={() => setConfirmRestoreIds(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative w-full max-w-md rounded-3xl border border-base-content/10 bg-base-100 p-6 shadow-2xl"
            >
              <h3 className="text-lg font-black">Geri Yükleme Onayı</h3>
              <p className="mt-2 text-sm text-base-content/70">
                {confirmRestoreIds.length === 1 ? "Bu eseri geri yüklemek istiyor musun?" : `${confirmRestoreIds.length} eseri geri yüklemek istiyor musun?`}
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => setConfirmRestoreIds(null)} className="btn btn-ghost rounded-xl">Vazgeç</button>
                <button onClick={() => handleRestoreBooks(confirmRestoreIds)} className="btn btn-primary rounded-xl">Onayla</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default function AuthorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    }>
      <AuthorPanelContent />
    </Suspense>
  );
}
