"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Book,
  Layers,
  Tag as TagIcon,
  Quote as QuoteIcon,
  HelpCircle,
  Search,
  Plus,
  Filter,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  X,
  Check,
  UserPlus,
  MessageSquare,
  Clock,
  ThumbsUp,
  ShieldAlert,
  Star
} from "lucide-react";
import { resolveMediaUrl } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

type ContentTab = "books-original" | "books-translated" | "books-editor-choice" | "reviews-editor-choice" | "categories" | "tags" | "quotes" | "faq";
type ComplianceBook = {
  id: string;
  slug: string;
  title: string;
  authorName?: string;
  coverImageUrl?: string | null;
  isHidden: boolean;
  isEditorChoice: boolean;
  viewCount?: number;
  type?: string;
  createdAt: string;
  updatedAt?: string | null;
  priorityScore?: number;
  prioritySignals?: string[];
};
type ListingItem = {
  id: string;
  name?: string;
  question?: string;
  content?: string;
  slug?: string;
  description?: string;
  authorName?: string;
  answer?: string;
  iconUrl?: string;
};
type ListingEditData = Partial<ListingItem>;
type UserSearchResult = {
  id: string;
  userId: string;
  displayName: string;
  email?: string;
};
type AssignedMember = {
  userId: string;
  displayName: string;
  role: string;
};
type FeaturedReview = {
  id: string;
  userName?: string;
  bookTitle?: string;
  content?: string;
  rating?: number;
};
type SocialActivityItem = {
  id: string;
  userName?: string;
  content: string;
  createdAt: string;
  rating?: number;
  isHidden?: boolean;
  isSpoiler?: boolean;
  isEditorChoice?: boolean;
  likeCount?: number;
  parentId?: string | null;
};
type SocialActivity = {
  reviews?: SocialActivityItem[];
  bookComments?: SocialActivityItem[];
  chapterComments?: SocialActivityItem[];
  inlineComments?: SocialActivityItem[];
};
type ComplianceData = {
  items?: ComplianceBook[];
  categories?: ListingItem[];
  tags?: ListingItem[];
  totalCount?: number;
  pageNumber?: number;
  pageSize?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
} | ListingItem[] | FeaturedReview[] | null;

const VALID_CONTENT_TABS: ContentTab[] = [
  "books-original",
  "books-translated",
  "books-editor-choice",
  "reviews-editor-choice",
  "categories",
  "tags",
  "quotes",
  "faq",
];

export default function CompliancePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: ContentTab = VALID_CONTENT_TABS.includes(tabParam as ContentTab)
    ? (tabParam as ContentTab)
    : "books-original";
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") ?? "");
  const [pageNumber, setPageNumber] = useState<number>(Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1));
  const [pageSize, setPageSize] = useState<number>(() => {
    const raw = Number.parseInt(searchParams.get("take") ?? "25", 10) || 25;
    return [10, 25, 50, 100].includes(raw) ? raw : 25;
  });
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "visible" | "hidden">(
    (searchParams.get("isHidden") === "true" ? "hidden" : searchParams.get("isHidden") === "false" ? "visible" : "all")
  );
  const [data, setData] = useState<ComplianceData>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [assigningBook, setAssigningBook] = useState<ComplianceBook | null>(null);
  const [reviewingBook, setReviewingBook] = useState<ComplianceBook | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isFilterSubscribed, setIsFilterSubscribed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.localStorage.getItem("management:compliance:follow"));
  });
  const canModerateContent = Boolean(
    profile?.permissions?.moderateContent ||
    profile?.permissions?.adminAccess ||
    profile?.permissions?.superAdminAccess
  );
  const canDeleteBooks = Boolean(
    profile?.permissions?.adminAccess ||
    profile?.permissions?.superAdminAccess
  );

  const tabs = [
    { id: "books-original", label: "Ozgun Kitaplar", icon: Book },
    { id: "books-translated", label: "Ceviri Eserler", icon: Book },
    { id: "books-editor-choice", label: "Editorun Secimi", icon: Star },
    { id: "reviews-editor-choice", label: "One Cikan Incelemeler", icon: MessageSquare },
    { id: "categories", label: "Kategoriler", icon: Layers },
    { id: "tags", label: "Etiketler", icon: TagIcon },
    { id: "quotes", label: "Ozlu Sozler", icon: QuoteIcon },
    { id: "faq", label: "SSS", icon: HelpCircle },
  ];

  const fetchData = React.useCallback(async () => {
    setData(null);
    setLoadError(null);
    setIsAdding(false);
    setIsLoading(true);

    try {
      let endpoint = "";
      if (activeTab.startsWith("books")) {
        let type = "";
        let isEditorChoice = "";
        if (activeTab === "books-original") type = "Original";
        else if (activeTab === "books-translated") type = "Translation";
        else if (activeTab === "books-editor-choice") isEditorChoice = "true";

        endpoint = `/api/management/compliance/books?search=${encodeURIComponent(searchQuery)}&page=${pageNumber}&take=${pageSize}`;
        if (type) endpoint += `&type=${type}`;
        if (isEditorChoice) endpoint += `&isEditorChoice=${isEditorChoice}`;
        if (visibilityFilter === "hidden") endpoint += "&isHidden=true";
        if (visibilityFilter === "visible") endpoint += "&isHidden=false";
      } else if (activeTab === "categories" || activeTab === "tags") {
        endpoint = `/api/management/compliance/metadata`;
      } else if (activeTab === "reviews-editor-choice") {
        // NOTE: Bu sekme yalnizca review (inceleme) kayitlarini yonetir.
        // Book/chapter/inline yorum moderasyonu "Etkilesim Denetimi" modalindadir.
        endpoint = `/api/social/reviews?isEditorChoice=true&size=50`;
      } else {
        endpoint = `/api/management/compliance/${activeTab}`;
      }

      const res = await fetch(endpoint);
      if (!res.ok) {
        const message = `Veri yuklenemedi (${res.status}).`;
        console.error(`Fetch error: ${res.status} ${res.statusText}`);
        setLoadError(message);
        toast.error(message);
        return;
      }

      const json = await res.json();

      // Handle Result<T> structure safely
      if (json && typeof json === 'object' && 'isSuccess' in json) {
        if (json.isSuccess) {
          setData(json.data);
        } else {
          const message = json.message || "API hatasi olustu.";
          console.error("API Error:", message);
          setLoadError(message);
          toast.error(message);
        }
      } else {
        const message = "Beklenmeyen API yanit formati.";
        console.error(message, json);
        setLoadError(message);
        toast.error(message);
      }
    } catch (err) {
      const message = "Veri cekilirken baglanti hatasi olustu.";
      console.error("Fetch error:", err);
      setLoadError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, searchQuery, pageNumber, pageSize, visibilityFilter]);

  React.useEffect(() => {
    const timer = setTimeout(fetchData, 300); // Debounce
    return () => clearTimeout(timer);
  }, [fetchData]);

  React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", activeTab);
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    else params.delete("search");
    params.set("page", String(pageNumber));
    params.set("take", String(pageSize));
    if (visibilityFilter === "all") params.delete("isHidden");
    else params.set("isHidden", visibilityFilter === "hidden" ? "true" : "false");
    router.replace(`/management/compliance?${params.toString()}`, { scroll: false });
  }, [activeTab, pageNumber, pageSize, router, searchParams, searchQuery, visibilityFilter]);

  React.useEffect(() => {
    if (!isFilterSubscribed || typeof window === "undefined") return;
    const payload = JSON.stringify({ activeTab, searchQuery, visibilityFilter, pageSize });
    const key = "management:compliance:follow";
    const prev = window.localStorage.getItem(key);
    if (prev && prev !== payload) {
      toast.info("Takip edilen filtre seti degisti.");
    }
    window.localStorage.setItem(key, payload);
  }, [activeTab, isFilterSubscribed, pageSize, searchQuery, visibilityFilter]);

  async function handleToggleVisibility(bookId: string, currentHidden: boolean) {
    const nextIsVisible = currentHidden;
    const needsReason = !nextIsVisible; // gizleme aksiyonu
    const reason = needsReason
      ? window.prompt("Bu icerigi neden gizliyorsunuz? (zorunlu)")?.trim()
      : undefined;
    if (needsReason && !reason) {
      toast.error("Gizleme icin islem nedeni zorunludur.");
      return;
    }
    try {
      const res = await fetch(`/api/management/compliance/books/${bookId}/visibility`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, isVisible: currentHidden, reason, expectedUpdatedAt: data && !Array.isArray(data) ? (data.items?.find((b) => b.id === bookId)?.updatedAt ?? null) : null }), // Toggle logic
      });
      if (res.ok) {
        const changedToVisible = currentHidden;
        const changedToHidden = !currentHidden;
        const successMessage = changedToVisible ? "Icerik gorunur yapildi." : "Icerik gizlendi.";
        toast.success(successMessage, {
          action: {
            label: "Geri Al",
            onClick: async () => {
              try {
                const undoRes = await fetch(`/api/management/compliance/books/${bookId}/visibility`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    bookId,
                    isVisible: changedToHidden ? true : false,
                    expectedUpdatedAt: data && !Array.isArray(data) ? (data.items?.find((b) => b.id === bookId)?.updatedAt ?? null) : null,
                    reason: "UNDO: yonetici geri al islemi"
                  }),
                });
                if (undoRes.ok) {
                  toast.success("Degisiklik geri alindi.");
                  fetchData();
                } else {
                  const payload = await undoRes.json().catch(() => null);
                  toast.error(payload?.message || `Geri alma basarisiz (${undoRes.status}).`);
                }
              } catch {
                toast.error("Geri alma sirasinda baglanti hatasi olustu.");
              }
            }
          }
        });
        // Refresh data
        fetchData();
      } else {
        const payload = await res.json().catch(() => null);
        const message = payload?.message || `Gorunurluk guncellenemedi (${res.status}).`;
        toast.error(message);
      }
    } catch (err) {
      console.error("Visibility toggle error:", err);
      toast.error("Gorunurluk guncellenirken baglanti hatasi olustu.");
    }
  }

  async function handleToggleEditorChoice(bookId: string, currentStatus: boolean) {
    const nextIsEditorChoice = !currentStatus;
    const reason = nextIsEditorChoice
      ? window.prompt("Bu icerigi neden one cikariyorsunuz? (zorunlu)")?.trim()
      : undefined;
    if (nextIsEditorChoice && !reason) {
      toast.error("One cikarma icin islem nedeni zorunludur.");
      return;
    }
    try {
      const res = await fetch(`/api/management/compliance/books/${bookId}/editor-choice`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, isEditorChoice: !currentStatus, reason, expectedUpdatedAt: data && !Array.isArray(data) ? (data.items?.find((b) => b.id === bookId)?.updatedAt ?? null) : null }),
      });
      if (res.ok) {
        const becameEditorChoice = !currentStatus;
        toast.success(becameEditorChoice ? "Editor secimine eklendi." : "Editor seciminden kaldirildi.", {
          action: {
            label: "Geri Al",
            onClick: async () => {
              try {
                const undoRes = await fetch(`/api/management/compliance/books/${bookId}/editor-choice`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    bookId,
                    isEditorChoice: currentStatus,
                    expectedUpdatedAt: data && !Array.isArray(data) ? (data.items?.find((b) => b.id === bookId)?.updatedAt ?? null) : null,
                    reason: "UNDO: yonetici geri al islemi"
                  }),
                });
                if (undoRes.ok) {
                  toast.success("Degisiklik geri alindi.");
                  fetchData();
                } else {
                  const payload = await undoRes.json().catch(() => null);
                  toast.error(payload?.message || `Geri alma basarisiz (${undoRes.status}).`);
                }
              } catch {
                toast.error("Geri alma sirasinda baglanti hatasi olustu.");
              }
            }
          }
        });
        fetchData();
      } else {
        const payload = await res.json().catch(() => null);
        const message = payload?.message || `Editor secimi guncellenemedi (${res.status}).`;
        toast.error(message);
      }
    } catch (err) {
      console.error("Editor choice toggle error:", err);
      toast.error("Editor secimi guncellenirken baglanti hatasi olustu.");
    }
  }

  async function handleToggleEditorChoiceFromTab(reviewId: string, currentStatus: boolean) {
    const nextIsEditorChoice = !currentStatus;
    const reason = nextIsEditorChoice
      ? window.prompt("Bu incelemeyi neden one cikariyorsunuz? (zorunlu)")?.trim()
      : undefined;
    if (nextIsEditorChoice && !reason) {
      toast.error("One cikarma icin islem nedeni zorunludur.");
      return;
    }
    try {
      const res = await fetch(`/api/social/admin/reviews/${reviewId}/editor-choice`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reviewId, isEditorChoice: !currentStatus, reason }),
      });
      if (res.ok) {
        fetchData();
      } else {
        const payload = await res.json().catch(() => null);
        const message = payload?.message || `Yorum editor secimi guncellenemedi (${res.status}).`;
        toast.error(message);
      }
    } catch (err) {
      console.error("Review Editor choice toggle error:", err);
      toast.error("Yorum editor secimi guncellenirken baglanti hatasi olustu.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu ogeyi silmek istediginizden emin misiniz?")) return;
    const reason = window.prompt("Bu kaydi neden siliyorsunuz? (zorunlu)")?.trim();
    if (!reason) {
      toast.error("Silme icin islem nedeni zorunludur.");
      return;
    }

    try {
      const endpoint = activeTab.startsWith("books")
        ? `/api/management/compliance/books/${id}` // If delete exists
        : `/api/management/compliance/${activeTab}/${id}`;

      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          expectedUpdatedAt: data && !Array.isArray(data) ? (data.items?.find((b) => b.id === id)?.updatedAt ?? null) : null
        })
      });
      if (res.ok) {
        fetchData();
      } else {
        const payload = await res.json().catch(() => null);
        const message = payload?.message || `Silme islemi basarisiz (${res.status}).`;
        toast.error(message);
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Silme islemi sirasinda baglanti hatasi olustu.");
    }
  }

  async function handleBulkAction(action: "hide" | "show" | "editorOn" | "editorOff" | "delete", books: ComplianceBook[]) {
    if (!books.length) return;
    const previewTitles = books.slice(0, 5).map((b) => `- ${b.title}`).join("\n");
    const actionLabel =
      action === "hide" ? "gizleme" :
      action === "show" ? "gosterme" :
      action === "editorOn" ? "one cikarma" :
      action === "editorOff" ? "one cikarimi kaldirma" :
      "silme";
    const previewMessage =
      `Toplu ${actionLabel} islemi uygulanacak.\n` +
      `Secili kayit: ${books.length}\n\n` +
      `Ornek kayitlar:\n${previewTitles}\n` +
      `${books.length > 5 ? `\n... ve ${books.length - 5} kayit daha` : ""}\n\n` +
      "Devam etmek istiyor musunuz?";
    if (!confirm(previewMessage)) return;
    const requiresReason = action === "hide" || action === "editorOn" || action === "delete";
    const reason = requiresReason
      ? window.prompt("Toplu islem nedeni nedir? (zorunlu)")?.trim()
      : undefined;
    if (requiresReason && !reason) {
      toast.error("Bu toplu islem icin neden zorunludur.");
      return;
    }

    let success = 0;
    for (const book of books) {
      try {
        let res: Response;
        if (action === "hide" || action === "show") {
          res = await fetch(`/api/management/compliance/books/${book.id}/visibility`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookId: book.id, isVisible: action === "show", reason, expectedUpdatedAt: book.updatedAt ?? null })
          });
        } else if (action === "editorOn" || action === "editorOff") {
          res = await fetch(`/api/management/compliance/books/${book.id}/editor-choice`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookId: book.id, isEditorChoice: action === "editorOn", reason, expectedUpdatedAt: book.updatedAt ?? null })
          });
        } else {
          res = await fetch(`/api/management/compliance/books/${book.id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason, expectedUpdatedAt: book.updatedAt ?? null })
          });
        }
        if (res.ok) success++;
      } catch {
        // continue other items
      }
    }

    if (success > 0) {
      toast.success(`${success}/${books.length} kayit icin islem tamamlandi.`);
      fetchData();
    } else {
      toast.error("Toplu islem basarisiz.");
    }
  }

  function handleAdd() {
    setIsAdding(true);
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">

        <div className="flex items-center gap-2 overflow-x-auto rounded-2xl bg-base-content/5 p-1 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  router.push(`/management/compliance?tab=${tab.id}`);
                }}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${isActive
                  ? "bg-primary text-primary-content shadow-lg shadow-primary/20"
                  : "text-base-content/40 hover:bg-base-content/5 hover:text-base-content/60"
                  }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="min-h-[600px] overflow-hidden rounded-[2.5rem] border border-base-content/5 bg-base-100/50 backdrop-blur-md">

        {/* Sub-Header: Search & Actions */}
        <div className="flex flex-col gap-4 border-b border-base-content/5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/20" />
            <input
              type="text"
              placeholder={`${activeTab.startsWith('books') ? 'Kitap adı veya yazar...' : 'Ara...'}`}
              className="h-12 w-full rounded-2xl border border-base-content/10 bg-base-content/5 pl-12 pr-4 text-sm font-bold outline-none transition focus:border-primary/30"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPageNumber(1);
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFiltersOpen((v) => !v)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-base-content/10 bg-base-100/5 text-base-content/40 transition hover:bg-base-content/10"
              title="Filtreleri Ac/Kapat"
            >
              <Filter className="h-5 w-5" />
            </button>
            <button
              onClick={() => {
                const next = !isFilterSubscribed;
                setIsFilterSubscribed(next);
                if (typeof window !== "undefined") {
                  if (next) {
                    window.localStorage.setItem("management:compliance:follow", JSON.stringify({ activeTab, searchQuery, visibilityFilter, pageSize }));
                  } else {
                    window.localStorage.removeItem("management:compliance:follow");
                  }
                }
                toast.success(next ? "Filtre takibi acildi." : "Filtre takibi kapatildi.");
              }}
              className={`flex h-12 items-center rounded-2xl border px-3 text-[10px] font-black uppercase tracking-widest ${
                isFilterSubscribed ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : "border-base-content/10 bg-base-100/5 text-base-content/40"
              }`}
              title="Filtre bazli takip"
            >
              Takip
            </button>

            {(activeTab === "books-translated" || (!activeTab.startsWith("books") && activeTab !== "reviews-editor-choice")) && (
              <button
                onClick={() => {
                  if (activeTab === "books-translated") {
                    router.push("/author/new");
                  } else {
                    handleAdd();
                  }
                }}
                className="flex h-12 items-center gap-2 rounded-2xl bg-primary px-6 text-xs font-black uppercase tracking-widest text-primary-content shadow-lg shadow-primary/20 transition hover:scale-105 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Yeni Ekle</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab-Specific Views */}
        <div className="p-6">
          {isFiltersOpen && (
            <div className="mb-4 flex items-center justify-between rounded-2xl border border-base-content/10 bg-base-content/5 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold text-base-content/60 mr-2">Filtre Paneli</p>
                {activeTab.startsWith("books") && (
                  <>
                    <select
                      className="h-9 rounded-lg border border-base-content/15 bg-base-100 px-2 text-xs font-bold"
                      value={visibilityFilter}
                      onChange={(e) => {
                        setVisibilityFilter(e.target.value as "all" | "visible" | "hidden");
                        setPageNumber(1);
                      }}
                    >
                      <option value="all">Gorunurluk: Tum</option>
                      <option value="visible">Gorunurluk: Aktif</option>
                      <option value="hidden">Gorunurluk: Gizli</option>
                    </select>
                    <select
                      className="h-9 rounded-lg border border-base-content/15 bg-base-100 px-2 text-xs font-bold"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number.parseInt(e.target.value, 10));
                        setPageNumber(1);
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </>
                )}
              </div>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setVisibilityFilter("all");
                  setPageSize(25);
                  setPageNumber(1);
                  setIsFiltersOpen(false);
                }}
                className="rounded-lg border border-base-content/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-base-content/50 hover:bg-base-content/10"
              >
                Temizle
              </button>
            </div>
          )}
          {loadError && (
            <div className="mb-4 rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-xs font-bold text-error">
              {loadError}
            </div>
          )}
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              {activeTab.startsWith("books") && (
                <BookManagementView
                  books={!Array.isArray(data) ? data?.items || [] : []}
                  pageNumber={!Array.isArray(data) ? data?.pageNumber || pageNumber : pageNumber}
                  totalPages={!Array.isArray(data) ? data?.totalPages || 1 : 1}
                  totalCount={!Array.isArray(data) ? data?.totalCount || 0 : 0}
                  hasNextPage={!Array.isArray(data) ? Boolean(data?.hasNextPage) : false}
                  hasPreviousPage={!Array.isArray(data) ? Boolean(data?.hasPreviousPage) : false}
                  onPageChange={(nextPage) => setPageNumber(nextPage)}
                  onBulkAction={handleBulkAction}
                  canModerateContent={canModerateContent}
                  canDeleteBooks={canDeleteBooks}
                  onToggleVisibility={handleToggleVisibility}
                  onToggleEditorChoice={handleToggleEditorChoice}
                  onDelete={handleDelete}
                  onAssign={(book) => setAssigningBook(book)}
                  onReviewSocial={(book) => setReviewingBook(book)}
                  onEdit={(book) => {
                    router.push(`/author/${book.slug}/edit`);
                  }}
                />
              )}
              {(activeTab === "categories" || activeTab === "tags") && (
                <SimpleListingView
                  activeTab={activeTab}
                  items={!Array.isArray(data) ? (activeTab === "categories" ? data?.categories : data?.tags) : []}
                  onDelete={handleDelete}
                  isAdding={isAdding}
                  setIsAdding={setIsAdding}
                />
              )}
              {activeTab === "quotes" && (
                <SimpleListingView
                  activeTab={activeTab}
                  items={Array.isArray(data) ? data as ListingItem[] : []}
                  onDelete={handleDelete}
                  isAdding={isAdding}
                  setIsAdding={setIsAdding}
                />
              )}
              {activeTab === "faq" && (
                <SimpleListingView
                  activeTab={activeTab}
                  items={Array.isArray(data) ? data as ListingItem[] : []}
                  onDelete={handleDelete}
                  isAdding={isAdding}
                  setIsAdding={setIsAdding}
                />
              )}
              {activeTab === "reviews-editor-choice" && (
                <FeaturedReviewsView
                  reviews={Array.isArray(data) ? data as FeaturedReview[] : []}
                  onToggleEditorChoice={handleToggleEditorChoiceFromTab}
                />
              )}
            </>
          )}
        </div>
      </div>

      {assigningBook && (
        <AssignMembersModal
          book={assigningBook}
          onClose={() => setAssigningBook(null)}
        />
      )}

      {reviewingBook && (
        <SocialActivityModal
          book={reviewingBook}
          onClose={() => setReviewingBook(null)}
        />
      )}
    </div>
  );
}

function BookManagementView({
  books,
  pageNumber,
  totalPages,
  totalCount,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  onBulkAction,
  canModerateContent,
  canDeleteBooks,
  onToggleVisibility,
  onToggleEditorChoice,
  onEdit,
  onAssign,
  onReviewSocial,
  onDelete
}: {
  books: ComplianceBook[],
  pageNumber: number,
  totalPages: number,
  totalCount: number,
  hasNextPage: boolean,
  hasPreviousPage: boolean,
  onPageChange: (page: number) => void,
  onBulkAction: (action: "hide" | "show" | "editorOn" | "editorOff" | "delete", books: ComplianceBook[]) => Promise<void>,
  canModerateContent: boolean,
  canDeleteBooks: boolean,
  onToggleVisibility: (id: string, hidden: boolean) => void,
  onToggleEditorChoice: (id: string, current: boolean) => void,
  onEdit: (book: ComplianceBook) => void,
  onAssign: (book: ComplianceBook) => void,
  onReviewSocial: (book: ComplianceBook) => void,
  onDelete: (id: string) => void
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [auditBook, setAuditBook] = useState<ComplianceBook | null>(null);
  const [sortMode, setSortMode] = useState<"createdAt" | "priority">("createdAt");
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const booksToRender = React.useMemo(() => {
    const cloned = [...books];
    if (sortMode === "priority") {
      return cloned.sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));
    }
    return cloned.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [books, sortMode]);
  const getPriorityMeta = (score: number) => {
    if (score >= 75) return { label: "Kritik", className: "bg-red-500/15 text-red-600 border-red-500/30" };
    if (score >= 50) return { label: "Yuksek", className: "bg-orange-500/15 text-orange-600 border-orange-500/30" };
    if (score >= 25) return { label: "Orta", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" };
    return { label: "Dusuk", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" };
  };
  const selectedBooks = books.filter((b) => selectedIds.includes(b.id));
  const allSelected = booksToRender.length > 0 && selectedIds.length === booksToRender.length;
  const resolvedActiveRowId = activeRowId && booksToRender.some((b) => b.id === activeRowId)
    ? activeRowId
    : (booksToRender[0]?.id ?? null);
  const activeIndex = booksToRender.findIndex((b) => b.id === resolvedActiveRowId);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (!booksToRender.length) return;
      const idx = activeIndex >= 0 ? activeIndex : 0;
      const current = booksToRender[idx];
      if (e.key === "j") setActiveRowId(booksToRender[Math.min(idx + 1, booksToRender.length - 1)].id);
      if (e.key === "k") setActiveRowId(booksToRender[Math.max(idx - 1, 0)].id);
      if (e.key === "e") onEdit(current);
      if (e.key === "h") onToggleVisibility(current.id, current.isHidden);
      if (e.key === "s") onToggleEditorChoice(current.id, current.isEditorChoice);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, booksToRender, onEdit, onToggleEditorChoice, onToggleVisibility]);

  if (!books || books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-30">
        <Book className="h-12 w-12 mb-4" />
        <p className="font-bold uppercase tracking-widest text-xs">Aranan kriterlere uygun kitap bulunamadi</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-base-content/10 bg-base-content/5 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-xs font-bold text-base-content/60">
          Toplam {totalCount.toLocaleString("tr-TR")} kitap
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => router.push("/management/audit")}
            className="h-8 rounded-lg border border-base-content/15 px-3 text-[10px] font-black uppercase tracking-widest"
            title="Tum denetim kayitlarini ac"
          >
            Audit Kayitlari
          </button>
          <button
            onClick={() => setSelectedIds(allSelected ? [] : booksToRender.map((b) => b.id))}
            className="h-8 rounded-lg border border-base-content/15 px-3 text-[10px] font-black uppercase tracking-widest"
          >
            {allSelected ? "Secimi Kaldir" : "Tumunu Sec"}
          </button>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as "createdAt" | "priority")}
            className="h-8 rounded-lg border border-base-content/15 bg-base-100 px-2 text-[10px] font-black uppercase tracking-widest"
          >
            <option value="createdAt">Sirala: En Yeni</option>
            <option value="priority">Sirala: Oncelik Skoru</option>
          </select>
          {canModerateContent && (
            <>
              <button
                disabled={selectedBooks.length === 0}
                onClick={async () => {
                  await onBulkAction("hide", selectedBooks);
                  setSelectedIds([]);
                }}
                className="h-8 rounded-lg border border-base-content/15 px-3 text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
              >
                Toplu Gizle
              </button>
              <button
                disabled={selectedBooks.length === 0}
                onClick={async () => {
                  await onBulkAction("show", selectedBooks);
                  setSelectedIds([]);
                }}
                className="h-8 rounded-lg border border-base-content/15 px-3 text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
              >
                Toplu Goster
              </button>
              <button
                disabled={selectedBooks.length === 0}
                onClick={async () => {
                  await onBulkAction("editorOn", selectedBooks);
                  setSelectedIds([]);
                }}
                className="h-8 rounded-lg border border-base-content/15 px-3 text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
              >
                Toplu One Cikar
              </button>
            </>
          )}
          {canDeleteBooks && (
            <button
              disabled={selectedBooks.length === 0}
              onClick={async () => {
                await onBulkAction("delete", selectedBooks);
                setSelectedIds([]);
              }}
              className="h-8 rounded-lg border border-error/20 px-3 text-[10px] font-black uppercase tracking-widest text-error disabled:opacity-40"
            >
              Toplu Sil
            </button>
          )}
          <button
            disabled={!hasPreviousPage}
            onClick={() => onPageChange(Math.max(1, pageNumber - 1))}
            className="h-8 rounded-lg border border-base-content/15 px-3 text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
          >
            Onceki
          </button>
          <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40">
            Sayfa {pageNumber} / {Math.max(1, totalPages)}
          </span>
          <button
            disabled={!hasNextPage}
            onClick={() => onPageChange(pageNumber + 1)}
            className="h-8 rounded-lg border border-base-content/15 px-3 text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
          >
            Sonraki
          </button>
        </div>
      </div>
      <div className="space-y-3 lg:hidden">
        {booksToRender.map((book) => (
          <div key={`mobile-${book.id}`} onClick={() => setActiveRowId(book.id)} className={`rounded-2xl border p-3 ${activeRowId === book.id ? "border-primary/40 bg-primary/5" : "border-base-content/10 bg-base-100/40"}`}>
            <div className="flex items-center gap-3">
              <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-base-content/5 border border-base-content/5">
                {book.coverImageUrl ? (
                  <Image src={resolveMediaUrl(book.coverImageUrl)} alt={book.title} width={80} height={120} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center"><Book className="h-5 w-5 text-base-content/20" /></div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-base-content/80">{book.title}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-base-content/40">{book.authorName}</p>
                <p className="mt-1 text-[10px] font-bold text-base-content/40">{book.viewCount?.toLocaleString("tr-TR")} izlenme</p>
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${getPriorityMeta(book.priorityScore ?? 0).className}`}>{getPriorityMeta(book.priorityScore ?? 0).label}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => onEdit(book)} className="rounded-lg border border-base-content/15 px-2 py-1 text-[10px] font-black">Duzenle</button>
              <button onClick={() => onReviewSocial(book)} className="rounded-lg border border-base-content/15 px-2 py-1 text-[10px] font-black">Etkilesim</button>
              {canModerateContent && <button onClick={() => onToggleVisibility(book.id, book.isHidden)} className="rounded-lg border border-base-content/15 px-2 py-1 text-[10px] font-black">{book.isHidden ? "Goster" : "Gizle"}</button>}
              {canModerateContent && <button onClick={() => onToggleEditorChoice(book.id, book.isEditorChoice)} className="rounded-lg border border-base-content/15 px-2 py-1 text-[10px] font-black">Editor</button>}
              {canDeleteBooks && <button onClick={() => onDelete(book.id)} className="rounded-lg border border-error/30 px-2 py-1 text-[10px] font-black text-error">Sil</button>}
            </div>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto lg:block">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-base-content/5 text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30">
            <th className="pb-4 pl-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => setSelectedIds(allSelected ? [] : booksToRender.map((b) => b.id))}
              />
            </th>
            <th className="pb-4 pl-4">Kitap Bilgisi</th>
            <th className="pb-4">Durum</th>
            <th className="pb-4">Istatistik</th>
            <th className="pb-4">Oncelik</th>
            <th className="pb-4 text-right pr-4">Islemler</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-base-content/5">
          {booksToRender.map((book) => (
            <tr key={book.id} onClick={() => setActiveRowId(book.id)} className={`group transition hover:bg-base-content/2 ${activeRowId === book.id ? "bg-primary/5" : ""}`}>
              <td className="py-4 pl-2">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(book.id)}
                  onChange={() =>
                    setSelectedIds((prev) =>
                      prev.includes(book.id) ? prev.filter((id) => id !== book.id) : [...prev, book.id]
                    )
                  }
                />
              </td>
              <td className="py-4 pl-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-base-content/5 border border-base-content/5 shadow-sm">
                    {book.coverImageUrl ? (
                      <Image
                        src={resolveMediaUrl(book.coverImageUrl)}
                        alt={book.title}
                        width={96}
                        height={128}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Book className="h-6 w-6 text-base-content/10" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-black italic text-base-content/80 group-hover:text-primary transition truncate max-w-[240px]" title={book.title}>
                      {book.title}
                    </div>
                    <div className="text-[10px] font-bold text-base-content/40 uppercase tracking-widest mt-0.5" title="Asıl Yazar / Çeviri Kaynağı">
                      {book.authorName}
                    </div>
                  </div>
                </div>
              </td>
              <td className="py-4">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => onToggleVisibility(book.id, book.isHidden)}
                    className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase transition hover:scale-105 ${book.isHidden ? 'text-red-500/60' : 'text-green-500/60'}`}
                  >
                    {book.isHidden ? <AlertCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                    {book.isHidden ? 'Gizli' : 'Aktif'}
                  </button>
                  {book.isEditorChoice && (
                    <span className="text-[9px] font-bold text-yellow-500/60 uppercase">Editorun Secimi</span>
                  )}
                </div>
              </td>
              <td className="py-4">
                <div className="text-xs font-black text-base-content/60">{book.viewCount?.toLocaleString("tr-TR")} Izlenme</div>
                <div className="mt-1 flex flex-col gap-0.5">
                  <div className="text-[9px] font-bold text-base-content/25 uppercase tracking-widest">Tip: {book.type === "Original" ? "Özgün" : "Çeviri"}</div>
                  <div className="text-[9px] font-bold text-base-content/25 uppercase tracking-widest">Tarih: {new Date(book.createdAt).toLocaleDateString("tr-TR")}</div>
                </div>
              </td>
              <td className="py-4">
                <div className="flex items-center gap-2">
                  <div className="text-xs font-black text-base-content/70">{book.priorityScore ?? 0}/100</div>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                      getPriorityMeta(book.priorityScore ?? 0).className
                    }`}
                  >
                    {getPriorityMeta(book.priorityScore ?? 0).label}
                  </span>
                </div>
                <div className="mt-1 text-[9px] font-bold text-base-content/35 line-clamp-2" title={(book.prioritySignals || []).join(", ")}>
                  {(book.prioritySignals || []).slice(0, 2).join(" • ") || "-"}
                </div>
              </td>
              <td className="py-4 pr-4">
                <div className="flex items-center justify-end gap-2">
                  {canModerateContent && (
                    <>
                      <button
                        onClick={() => onToggleVisibility(book.id, book.isHidden)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${book.isHidden ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'}`}
                        title={book.isHidden ? "Goster" : "Gizle"}
                      >
                        {book.isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => onToggleEditorChoice(book.id, book.isEditorChoice)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${book.isEditorChoice ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20' : 'bg-base-content/5 text-base-content/40 hover:bg-yellow-500/10 hover:text-yellow-500'}`}
                        title={book.isEditorChoice ? "Editorun Seciminden Kaldir" : "Editorun Secimi Yap"}
                      >
                        <Star className={`h-4 w-4 ${book.isEditorChoice ? 'fill-current' : ''}`} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => onReviewSocial(book)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-base-content/5 text-base-content/40 hover:bg-primary/20 hover:text-primary transition"
                    title="Etkileşimleri İncele"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                  {book.type === "Translation" && (
                    <button
                      onClick={() => onAssign(book)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-base-content/5 text-base-content/40 hover:bg-primary/20 hover:text-primary transition"
                      title="Yazar Ata"
                    >
                      <UserPlus className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(book)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-base-content/5 text-base-content/40 hover:bg-yellow-500/10 hover:text-yellow-500 transition"
                    title="Duzenle"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setAuditBook(book)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-base-content/5 text-base-content/40 hover:bg-info/20 hover:text-info transition"
                    title="Bu kitap icin son islemler"
                  >
                    <Clock className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => router.push(`/management/audit?search=${encodeURIComponent(book.title)}`)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-base-content/5 text-base-content/40 hover:bg-info/20 hover:text-info transition"
                    title="Bu kitap icin audit"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                  {canDeleteBooks && (
                    <button
                      onClick={() => onDelete(book.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-base-content/5 text-base-content/40 hover:bg-red-500/10 hover:text-red-500 transition"
                      title="Sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {auditBook && (
        <BookAuditModal
          book={auditBook}
          onClose={() => setAuditBook(null)}
        />
      )}
    </div>
  );
}

function BookAuditModal({ book, onClose }: { book: ComplianceBook; onClose: () => void }) {
  type BookAuditLog = {
    id: string;
    action: string;
    module: string;
    state: number;
    createdAt: string;
    userId?: string;
    endpoint?: string;
    method?: string;
    primaryKeys?: string;
  };
  const [logs, setLogs] = useState<BookAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          take: "10",
          entityName: "Book",
          primaryKeys: book.id,
        });
        const res = await fetch(`/api/management/audit-logs?${params.toString()}`);
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.isSuccess) {
          setError(json?.message || "Audit kayitlari alinamadi.");
          return;
        }
        setLogs(Array.isArray(json.data) ? json.data : []);
      } catch {
        setError("Audit kayitlari alinirken baglanti hatasi olustu.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [book.id]);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-base-300/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-[2rem] border border-base-content/10 bg-base-100 p-6 shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 h-9 w-9 rounded-xl bg-base-content/5 text-base-content/40 hover:bg-base-content/10">
          <X className="mx-auto h-4 w-4" />
        </button>
        <h3 className="text-lg font-black uppercase tracking-wider text-base-content/80">Son Audit Islemleri</h3>
        <p className="mt-1 text-xs font-bold text-base-content/50">{book.title}</p>
        <div className="mt-4 space-y-2 max-h-[55vh] overflow-y-auto pr-1">
          {loading && <p className="text-xs font-bold text-base-content/40">Yukleniyor...</p>}
          {!loading && error && <p className="text-xs font-bold text-error">{error}</p>}
          {!loading && !error && logs.length === 0 && (
            <p className="text-xs font-bold text-base-content/40">Bu kitap icin audit kaydi bulunamadi.</p>
          )}
          {!loading && !error && logs.map((log) => (
            <div key={log.id} className="rounded-xl border border-base-content/10 bg-base-content/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-black text-base-content/80">{log.action}</div>
                <div className="text-[10px] font-bold text-base-content/40">{new Date(log.createdAt).toLocaleString("tr-TR")}</div>
              </div>
              <div className="mt-1 text-[10px] font-bold text-base-content/50">
                Modul: {log.module} | Durum: {log.state} | Kullanici: {log.userId ? `...${log.userId.slice(-6)}` : "Sistem"}
              </div>
              <div className="text-[10px] font-bold text-base-content/40">
                {log.method || "-"} {log.endpoint || "-"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SimpleListingView({
  activeTab,
  items,
  onDelete,
  isAdding,
  setIsAdding
}: {
  activeTab: ContentTab,
  items: ListingItem[] | null | undefined,
  onDelete: (id: string) => void,
  isAdding: boolean,
  setIsAdding: (val: boolean) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<ListingEditData>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // File upload handler
  async function handleIconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("File", file);

      const res = await fetch("/api/management/media/upload/icon", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (result.isSuccess) {
        setEditData({ ...editData, iconUrl: result.data });
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(id?: string) {
    if ((activeTab === "categories" || activeTab === "tags") && !editData.name) return;
    if (activeTab === "quotes" && !editData.content) return;
    if (activeTab === "faq" && !editData.question) return;

    setIsSaving(true);
    try {
      const endpoint = id
        ? `/api/management/compliance/${activeTab}/${id}`
        : `/api/management/compliance/${activeTab}`;

      const res = await fetch(endpoint, {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });

      if (res.ok) {
        setIsAdding(false);
        setEditingId(null);
        window.location.reload();
      }
    } catch (err) {
      console.error("Submit error:", err);
    } finally {
      setIsSaving(false);
    }
  }

  const hasIcon = activeTab === "categories";

  const renderFormRow = (id?: string) => (
    <tr className="border-b border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-2 duration-300">
      {hasIcon && (
        <td className="py-4 pl-6 w-20">
          <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-base-100 flex items-center justify-center border-2 border-dashed border-primary/20 hover:border-primary/50 transition cursor-pointer group/upload shadow-inner">
            {editData.iconUrl ? (
              <Image src={editData.iconUrl} alt="" width={64} height={64} className="h-full w-full object-cover" />
            ) : (
              <Plus className="h-5 w-5 text-primary/30 group-hover/upload:text-primary transition" />
            )}
            {isUploading && (
              <div className="absolute inset-0 bg-base-100/60 backdrop-blur-sm flex items-center justify-center">
                <span className="h-5 w-5 animate-spin border-2 border-primary border-t-transparent rounded-full" />
              </div>
            )}
            <input
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer"
              accept="image/*"
              onChange={handleIconUpload}
              disabled={isUploading}
            />
          </div>
        </td>
      )}

      <td className={`py-4 px-4 ${hasIcon ? '' : 'pl-6'}`}>
        <div className="flex flex-col gap-2">
          {activeTab === "faq" ? (
            <input
              autoFocus
              type="text"
              placeholder="Soru metni..."
              className="h-11 w-full rounded-xl border border-primary/20 bg-base-100 px-4 text-sm font-bold outline-none focus:border-primary shadow-sm"
              value={editData.question || ""}
              onChange={(e) => setEditData({ ...editData, question: e.target.value })}
            />
          ) : activeTab === "quotes" ? (
            <textarea
              autoFocus
              placeholder="Özlü söz içeriği..."
              className="min-h-[100px] w-full rounded-xl border border-primary/20 bg-base-100 p-4 text-sm font-bold outline-none focus:border-primary resize-none shadow-sm"
              value={editData.content || ""}
              onChange={(e) => setEditData({ ...editData, content: e.target.value })}
            />
          ) : (
            <>
              <input
                autoFocus
                type="text"
                placeholder="Başlık/İsim..."
                className="h-11 w-full rounded-xl border border-primary/20 bg-base-100 px-4 text-sm font-bold outline-none focus:border-primary shadow-sm"
                value={editData.name || ""}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
              <div className="text-[10px] font-black text-primary/40 uppercase tracking-widest pl-1">
                SLUG: {editData.name?.toLocaleLowerCase('tr-TR').replace(/ /g, "-").replace(/[^a-z0-9-]/g, "") || "..."}
              </div>
            </>
          )}
        </div>
      </td>

      <td className="py-4 px-4">
        <div className="flex flex-col gap-2">
          {activeTab === "categories" ? (
            <textarea
              placeholder="Kategori açıklaması (opsiyonel)..."
              className="min-h-[80px] w-full rounded-xl border border-primary/20 bg-base-100 p-4 text-sm font-bold outline-none focus:border-primary resize-none shadow-sm"
              value={editData.description || ""}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            />
          ) : activeTab === "faq" ? (
            <textarea
              placeholder="Detaylı cevap metni..."
              className="min-h-[100px] w-full rounded-xl border border-primary/20 bg-base-100 p-4 text-sm font-bold outline-none focus:border-primary resize-none shadow-sm"
              value={editData.answer || ""}
              onChange={(e) => setEditData({ ...editData, answer: e.target.value })}
            />
          ) : activeTab === "quotes" ? (
            <input
              type="text"
              placeholder="Yazar/Kaynak ismi..."
              className="h-11 w-full rounded-xl border border-primary/20 bg-base-100 px-4 text-sm font-bold outline-none focus:border-primary shadow-sm"
              value={editData.authorName || ""}
              onChange={(e) => setEditData({ ...editData, authorName: e.target.value })}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-base-content/10 bg-base-content/5 p-4 text-[10px] font-black uppercase tracking-widest text-base-content/20 text-center">
              Etiket Parametreleri Otomatik
            </div>
          )}
        </div>
      </td>

      <td className="py-4 pr-6 text-right w-32">
        <div className="flex justify-end gap-2">
          <button
            disabled={isSaving}
            onClick={() => handleSubmit(id)}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-content shadow-lg shadow-primary/20 transition hover:scale-105 active:scale-95 disabled:opacity-50"
            title="Kaydet"
          >
            {isSaving ? (
              <span className="h-5 w-5 animate-spin border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Check className="h-6 w-6" />
            )}
          </button>
          <button
            onClick={() => { setIsAdding(false); setEditingId(null); setEditData({}); }}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-base-content/5 text-base-content/40 hover:bg-error hover:text-white transition group shadow-sm"
            title="İptal"
          >
            <X className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="overflow-hidden rounded-4xl border border-base-content/5 bg-base-100/30 backdrop-blur-md shadow-xl">
      <div className="space-y-3 p-4 md:hidden">
        {isAdding && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 text-xs font-bold text-primary">
            Yeni kayit formu masaustu tablo alaninda acilir. Daha rahat duzenleme icin tableti/yatay ekrani tercih edin.
          </div>
        )}
        {items && Array.isArray(items) && items.map((item) => (
          <div key={`mobile-${item.id}`} className="rounded-2xl border border-base-content/10 bg-base-100/60 p-3">
            <div className="text-sm font-black text-base-content/80">{item.name || item.question || item.content}</div>
            <div className="mt-1 text-[11px] font-semibold text-base-content/45">{item.description || item.authorName || item.answer || "---"}</div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => { setEditingId(item.id); setEditData(item); }}
                className="rounded-lg border border-base-content/15 px-2 py-1 text-[10px] font-black uppercase"
              >
                Duzenle
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="rounded-lg border border-error/25 px-2 py-1 text-[10px] font-black uppercase text-error"
              >
                Sil
              </button>
            </div>
          </div>
        ))}
        {(!items || items.length === 0) && !isAdding && (
          <div className="rounded-2xl border border-base-content/10 bg-base-100/60 p-6 text-center text-xs font-black uppercase tracking-widest text-base-content/35">
            Kayit bulunamadi
          </div>
        )}
      </div>
      <div className="hidden md:block">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-base-content/5 bg-base-content/3">
            {hasIcon && (
              <th className="py-5 pl-6 w-20 text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30 italic">Ikon</th>
            )}
            <th className={`py-5 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30 italic ${!hasIcon ? 'pl-6' : ''}`}>
              {activeTab === "quotes" ? "Özlü Söz / İçerik" : activeTab === "faq" ? "Soru" : "Başlık / İsim"}
            </th>
            <th className="py-5 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30 italic">
              {activeTab === "categories" ? "Kategori Açıklaması" : activeTab === "quotes" ? "Yazar / Kaynak" : activeTab === "faq" ? "Cevap Metni" : "Sistem Bilgisi"}
            </th>
            <th className="py-5 pr-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30 italic w-32">Eylemler</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-base-content/5">
          {isAdding && renderFormRow()}

          {items && Array.isArray(items) && items.map((item) => (
            editingId === item.id ? (
              <React.Fragment key={item.id}>{renderFormRow(item.id)}</React.Fragment>
            ) : (
              <tr key={item.id} className="group hover:bg-primary/3 transition-colors duration-300">
                {hasIcon && (
                  <td className="py-5 pl-6">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-base-100 border border-base-content/5 flex items-center justify-center p-0.5 shadow-sm group-hover:shadow-md transition-shadow">
                      {item.iconUrl ? (
                        <Image src={item.iconUrl} alt={item.name || ""} width={64} height={64} className="h-full w-full object-contain rounded-xl" />
                      ) : (
                        <Layers className="h-5 w-5 text-base-content/10" />
                      )}
                    </div>
                  </td>
                )}
                <td className={`py-5 px-4 ${!hasIcon ? 'pl-6' : ''}`}>
                  <div className="font-black italic text-base-content/80 group-hover:text-primary transition text-base">
                    {item.name || item.question || item.content}
                  </div>
                  {item.slug && (
                    <div className="text-[10px] font-bold text-base-content/20 uppercase tracking-widest mt-1 opacity-60 group-hover:opacity-100 transition">
                      {item.slug}
                    </div>
                  )}
                </td>
                <td className="py-5 px-4">
                  <div className="text-xs font-medium text-base-content/40 line-clamp-2 max-w-sm italic leading-relaxed opacity-70 group-hover:opacity-100 transition">
                    {item.description || item.authorName || item.answer || "---"}
                  </div>
                </td>
                <td className="py-5 pr-6 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                    <button
                      onClick={() => { setEditingId(item.id); setEditData(item); }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-base-100 border border-base-content/5 text-base-content/40 hover:bg-yellow-500/10 hover:text-yellow-600 hover:border-yellow-500/20 transition-all shadow-sm"
                      title="Düzenle"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-base-100 border border-base-content/5 text-base-content/40 hover:bg-error/10 hover:text-error hover:border-error/20 transition-all shadow-sm"
                      title="Sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          ))}

          {(!items || items.length === 0) && !isAdding && (
            <tr>
              <td colSpan={hasIcon ? 4 : 3} className="py-24 text-center">
                <div className="flex flex-col items-center justify-center opacity-20">
                  <Layers className="h-16 w-16 mb-4 animate-slow-pulse" />
                  <p className="text-xs font-black uppercase tracking-[0.4em]">Henüz Kayıt Bulunamadı</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
function AssignMembersModal({ book, onClose }: { book: ComplianceBook, onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [assignedMembers, setAssignedMembers] = useState<AssignedMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const visibleSearchResults = query.length < 3 ? [] : searchResults;

  useEffect(() => {
    // Fetch current members
    async function fetchMembers() {
      try {
        const res = await fetch(`/api/management/compliance/books/${book.id}/members`);
        const json = await res.json();
        if (json.isSuccess) {
          setAssignedMembers(json.data.map((m: AssignedMember) => ({
            userId: m.userId,
            displayName: m.displayName,
            role: m.role
          })));
        }
      } catch (err) {
        console.error("Fetch members error:", err);
      }
    }
    fetchMembers();
  }, [book.id]);

  useEffect(() => {
    if (query.length < 3) {
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/users?query=${query}`);
        const json = await res.json();
        setSearchResults(json.data?.items || []);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  async function handleAssign(user: UserSearchResult) {
    if (assignedMembers.some(m => m.userId === user.userId)) return;
    setAssignedMembers([...assignedMembers, { userId: user.userId, displayName: user.displayName, role: "Translator" }]);
  }

  async function handleRemove(userId: string) {
    setAssignedMembers(assignedMembers.filter(m => m.userId !== userId));
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/management/compliance/books/${book.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ members: assignedMembers })
      });
      if (res.ok) {
        toast.success("Atamalar kaydedildi.");
        onClose();
      } else {
        const payload = await res.json().catch(() => null);
        toast.error(payload?.message || `Atama kaydedilemedi (${res.status}).`);
      }
    } catch (err) {
      console.error("Save assignment error:", err);
      toast.error("Atama kaydedilirken baglanti hatasi olustu.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-base-300/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-[2.5rem] border border-base-content/10 bg-base-100 p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute right-6 top-6 h-10 w-10 flex items-center justify-center rounded-xl bg-base-content/5 text-base-content/40 hover:bg-base-content/10">
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6">
          <h3 className="text-2xl font-black uppercase italic tracking-tight text-base-content/80">Yazar Ata</h3>
          <p className="text-xs font-bold text-base-content/20 uppercase tracking-widest mt-1">{book.title}</p>
        </div>

        <div className="space-y-6">
          {/* Active Members */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30 opacity-60">Atanmış Yazarlar</p>
            <div className="flex flex-wrap gap-2">
              {assignedMembers.map(m => (
                <div key={m.userId} className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3 py-1.5 pr-1 text-xs font-bold text-primary animate-in fade-in scale-95 duration-200">
                  <span>{m.displayName}</span>
                  <button onClick={() => handleRemove(m.userId)} className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-primary/20 transition">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {assignedMembers.length === 0 && <p className="text-xs font-medium text-base-content/25 italic">Henüz atanmış yazar yok.</p>}
            </div>
          </div>

          {/* Search */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30 opacity-60">Yeni Yazar Ekle</p>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/20" />
              <input
                type="text"
                placeholder="Yazar adı veya e-posta..."
                className="h-12 w-full rounded-2xl border border-base-content/10 bg-base-content/5 pl-12 pr-4 text-sm font-bold outline-none focus:border-primary/30"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Search Results */}
          <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {isLoading && <div className="text-center py-4 text-xs font-bold animate-pulse text-primary/40">Aranıyor...</div>}
            {visibleSearchResults.map(user => (
              <button
                key={user.id}
                onClick={() => handleAssign(user)}
                className="flex w-full items-center justify-between rounded-2xl border border-base-content/5 bg-base-content/2 p-3 transition hover:bg-primary/10 hover:border-primary/20 group"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-full bg-base-content/5 flex items-center justify-center text-[10px] font-black">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-base-content/80 group-hover:text-primary transition">{user.displayName}</div>
                    <div className="text-[10px] font-medium text-base-content/20">{user.email}</div>
                  </div>
                </div>
                <Plus className="h-4 w-4 text-base-content/20 group-hover:text-primary transition" />
              </button>
            ))}
          </div>

          <button
            disabled={isSaving}
            onClick={handleSave}
            className="h-14 w-full rounded-2xl bg-primary text-xs font-black uppercase italic tracking-[0.2em] text-primary-content shadow-xl shadow-primary/20 transition hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {isSaving ? "Kaydediliyor..." : "Atamaları Tamamla"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FeaturedReviewsView({
  reviews,
  onToggleEditorChoice,
}: {
  reviews: FeaturedReview[],
  onToggleEditorChoice: (id: string, current: boolean) => void,
}) {
  const scopeHint = "Bu alan sadece inceleme (review) kayitlarini kapsar. Diger yorum tipleri Etkilesim Denetimi modalindan yonetilir.";

  if (!reviews || reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 opacity-20">
        <MessageSquare className="h-16 w-16 mb-4 text-primary" />
        <p className="text-xs font-black uppercase tracking-[0.4em]">Henüz Öne Çıkarılan Yorum Bulunmuyor</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-base-content/10 bg-base-content/5 px-3 py-2 text-[11px] font-semibold text-base-content/60">
        {scopeHint}
      </div>
      <div className="space-y-3 md:hidden">
        {reviews.map((review) => (
          <div key={`mobile-review-${review.id}`} className="rounded-2xl border border-base-content/10 bg-base-100/60 p-3">
            <div className="text-sm font-black text-base-content/80">{review.userName || "Anonim"}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-primary">{review.bookTitle || "-"}</div>
            <p className="mt-2 text-xs text-base-content/65 line-clamp-3">&quot;{review.content}&quot;</p>
            <div className="mt-2 flex items-center justify-between">
              <div className="text-xs font-black text-yellow-600">★ {review.rating?.toFixed(1) || "-"}</div>
              <button
                onClick={() => onToggleEditorChoice(review.id, true)}
                className="rounded-lg bg-yellow-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-600"
              >
                Kaldir
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-base-content/5 text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30">
            <th className="pb-4 pl-4">Kullanıcı & Kitap</th>
            <th className="pb-4">İçerik</th>
            <th className="pb-4">Puan</th>
            <th className="pb-4 text-right pr-4">İşlem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-base-content/5">
          {reviews.map((review) => (
            <tr key={review.id} className="group hover:bg-base-content/2 transition">
              <td className="py-5 pl-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-black text-primary border border-primary/10">
                    {(review.userName || "U").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-base-content/80">{review.userName || "Anonim"}</div>
                    <div className="text-[10px] font-bold text-primary uppercase tracking-widest">{review.bookTitle}</div>
                  </div>
                </div>
              </td>
              <td className="py-5">
                <p className="text-sm italic text-base-content/60 max-w-md line-clamp-2 leading-relaxed">
                  &quot;{review.content}&quot;
                </p>
              </td>
              <td className="py-5">
                <div className="flex items-center gap-1.5 text-yellow-500">
                  <Star className="h-3 w-3 fill-current" />
                  <span className="text-xs font-black">{review.rating?.toFixed(1)}</span>
                </div>
              </td>
              <td className="py-5 pr-4 text-right">
                <button
                  onClick={() => onToggleEditorChoice(review.id, true)}
                  className="h-9 px-4 rounded-xl bg-yellow-500/10 text-yellow-500 text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500 hover:text-white transition-all shadow-sm"
                  title="Öne Çıkarmayı Kaldır"
                >
                  Kaldır
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}


function SocialActivityModal({ book, onClose }: { book: ComplianceBook; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"reviews" | "comments" | "inline">("reviews");
  const [activity, setActivity] = useState<SocialActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [contentIdFilter, setContentIdFilter] = useState("");
  const [spoilerFilter, setSpoilerFilter] = useState<"all" | "true" | "false">("all");
  const [hiddenFilter, setHiddenFilter] = useState<"all" | "true" | "false">("all");

  const buildActivityUrl = React.useCallback(() => {
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("keyword", keyword.trim());
    if (userIdFilter.trim()) params.set("userId", userIdFilter.trim());
    if (contentIdFilter.trim()) params.set("contentId", contentIdFilter.trim());
    if (spoilerFilter !== "all") params.set("isSpoiler", spoilerFilter);
    if (hiddenFilter !== "all") params.set("isHidden", hiddenFilter);
    params.set("t", String(Date.now()));
    return `/api/social/admin/books/${book.id}/activity?${params.toString()}`;
  }, [book.id, contentIdFilter, hiddenFilter, keyword, spoilerFilter, userIdFilter]);

  useEffect(() => {
    async function fetchActivity() {
      setIsLoading(true);
      setActivity(null);
      setErrorMsg(null);
      try {
        const res = await fetch(buildActivityUrl());
        const json = await res.json();
        
        // Esnek kontrol: Veri json.data icinde de olabilir, dogrudan json icinde de olabilir
        const isSuccess = json && (json.isSuccess === true || json.IsSuccess === true);
        const data = json ? (json.data || json.Data || json) : null;

        // Eger reviews, chapterComments veya inlineComments alanlarindan biri varsa veriyi kabul et
        const hasData = data && (data.reviews || data.Reviews || data.chapterComments || data.ChapterComments || data.inlineComments || data.InlineComments);

        if (isSuccess && hasData) {
          setActivity(data);
        } else if (isSuccess && !hasData) {
          setErrorMsg("Bu kitap icin henuz herhangi bir etkilesim (yorum/inceleme) bulunmuyor.");
          console.log("No activity found for this book:", json);
        } else {
          setErrorMsg(json?.message || json?.Message || "Sunucu hata mesaji dondurmedi.");
          console.error("API Error Result:", json);
        }
      } catch (err) {
        setErrorMsg("Sunucuya baglanirken bir hata olustu.");
        console.error("Fetch activity error:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchActivity();
  }, [book.id, buildActivityUrl]);

  async function handleToggleReviewEditorChoice(id: string, currentStatus: boolean) {
    try {
      const res = await fetch(`/api/social/admin/reviews/${id}/editor-choice`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isEditorChoice: !currentStatus }),
      });
      if (res.ok) {
        setActivity((prev) => {
          const next = { ...prev };
          next.reviews = (next.reviews || []).map((item) =>
            item.id === id ? { ...item, isEditorChoice: !currentStatus } : item
          );
          return next;
        });
      } else {
        const payload = await res.json().catch(() => null);
        toast.error(payload?.message || `Editor secimi guncellenemedi (${res.status}).`);
      }
    } catch (err) {
      console.error("Toggle review editor choice error:", err);
      toast.error("Editor secimi guncellenirken baglanti hatasi olustu.");
    }
  }

  const handleModerate = async (id: string, action: number) => {
    try {
      const res = await fetch("/api/social/admin/moderate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action })
      });
      const json = await res.json();
      if (json.isSuccess) {
        toast.success(json.message);
        // Refresh activity
        if (book) {
          const res = await fetch(buildActivityUrl());
          const data = await res.json();
          if (data.isSuccess) setActivity(data.data);
        }
      } else {
        toast.error(json?.message || "Islem basarisiz.");
      }
    } catch {
      toast.error("İşlem başarısız.");
    }
  };

  function renderItem(item: SocialActivityItem, type: string, isReply = false) {
    return (
      <div
        key={item.id}
        className={`transition rounded-2xl border p-4 ${item.isHidden
          ? "border-error/20 bg-error/5 opacity-60"
          : "border-base-content/5 bg-base-content/2 hover:border-primary/20"
          } ${isReply ? "mt-2 ml-8 border-l-2 border-primary/20" : ""}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-base-content/10 text-[8px] font-black">
                {(item.userName || "U").charAt(0).toUpperCase()}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40">
                {item.userName || "Anonim"}
              </span>
              {item.isSpoiler && (
                <span className="badge badge-error badge-xs font-black text-[8px] uppercase tracking-tighter">SPOILER</span>
              )}
              {(item.rating ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-black text-warning">
                  <Star className="ml-2 h-3 w-3 fill-current" /> {(item.rating ?? 0).toFixed(1)}
                </span>
              )}
              <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-base-content/20">
                <Clock className="h-3 w-3" /> {new Date(item.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p
              className={`text-xs leading-relaxed text-base-content/80 whitespace-pre-wrap break-words ${item.isSpoiler ? "blur-[2px] hover:blur-0 transition-all cursor-help" : ""}`}
              title={item.isSpoiler ? "Spoiler içeriği görmek için üzerine gelin" : ""}
            >
              {item.content || ""}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleModerate(item.id, item.isHidden ? 1 : 0)}
                className={`btn btn-xs rounded-lg font-black uppercase tracking-widest h-8 px-3 ${item.isHidden ? "btn-success text-white" : "btn-error btn-outline"}`}
              >
                {item.isHidden ? "Göster" : "Gizle"}
              </button>
  
              {!isReply && type !== "review" && (
                <button
                  onClick={() => handleModerate(item.id, 4)}
                  className="btn btn-xs btn-error rounded-lg font-black uppercase tracking-widest h-8 px-3"
                >
                  Konuşmayı Gizle
                </button>
              )}
  
              <button
                onClick={() => handleModerate(item.id, item.isSpoiler ? 3 : 2)}
                className={`btn btn-xs rounded-lg font-black uppercase tracking-widest h-8 px-3 ${item.isSpoiler ? "bg-yellow-600 text-white" : "bg-base-content/5 text-base-content/40"}`}
              >
                {item.isSpoiler ? "Spoiler Kaldır" : "Spoiler Yap"}
              </button>
  
              {type === "review" && (
                <button
                  onClick={() => handleToggleReviewEditorChoice(item.id, !!item.isEditorChoice)}
                  className={`btn btn-xs rounded-lg font-black uppercase tracking-widest border-none h-8 px-3 ${item.isEditorChoice ? "bg-yellow-500 text-white hover:bg-yellow-600" : "bg-base-content/5 text-base-content/40 hover:bg-yellow-500/20 hover:text-yellow-600"
                    }`}
                >
                  <Star className={`h-3 w-3 ${item.isEditorChoice ? 'fill-current' : ''}`} />
                  {item.isEditorChoice ? "Öne Çıkarıldı" : "Öne Çıkar"}
                </button>
              )}
              
              <div className="italic flex items-center gap-1 text-[10px] font-bold text-base-content/30 ml-auto">
                <ThumbsUp className="h-3 w-3" /> {item.likeCount || 0}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderList(items: SocialActivityItem[], type: string) {
    const topLevel = (items || []).filter(i => !i.parentId);
    const replies = (items || []).filter(i => i.parentId);

    return (
      <div className="mt-4 space-y-4">
        {topLevel.map((item) => (
          <div key={item.id} className="space-y-2">
            {renderItem(item, type)}
            {/* Yanıtlar */}
            {replies.filter(r => r.parentId === item.id).map(reply => renderItem(reply, type, true))}
          </div>
        ))}
        {items.length === 0 && (
          <div className="flex h-32 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-base-content/10 text-[10px] font-black uppercase tracking-widest text-base-content/20">
            <MessageSquare className="mb-2 h-6 w-6" />
            Kayıt Bulunmuyor
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-base-300/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-[80vh] w-full max-w-2xl animate-in zoom-in-95 flex flex-col rounded-[2.5rem] border border-base-content/10 bg-base-100 shadow-2xl duration-300">
        <div className="border-b border-base-content/5 p-8">
          <button
            onClick={onClose}
            className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-xl bg-base-content/5 text-base-content/40 transition hover:bg-base-content/10"
          >
            <X className="h-5 w-5" />
          </button>
          <h3 className="text-2xl font-black uppercase italic tracking-tight text-base-content/80">
            Etkileşim Denetimi
          </h3>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-base-content/20">
            {book.title}
          </p>

          <div className="mt-6 flex gap-2">
            {([
              { 
                id: "reviews", 
                label: `İnceleme & Yorum (${(activity?.reviews?.length || 0) + (activity?.bookComments?.length || 0)})` 
              },
              { id: "comments", label: `Bölüm Yorumları (${activity?.chapterComments?.length || 0})` },
              { id: "inline", label: `Satır Yorumları (${activity?.inlineComments?.length || 0})` },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`transition-all rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest ${activeTab === tab.id
                  ? "bg-primary text-primary-content shadow-lg"
                  : "bg-base-content/5 text-base-content/40 hover:bg-base-content/10"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Kelime ara..."
              className="h-10 rounded-xl border border-base-content/10 bg-base-content/5 px-3 text-xs font-bold outline-none focus:border-primary/30"
            />
            <input
              type="text"
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
              placeholder="UserId (GUID)"
              className="h-10 rounded-xl border border-base-content/10 bg-base-content/5 px-3 text-xs font-bold outline-none focus:border-primary/30"
            />
            <input
              type="text"
              value={contentIdFilter}
              onChange={(e) => setContentIdFilter(e.target.value)}
              placeholder="ContentId (GUID)"
              className="h-10 rounded-xl border border-base-content/10 bg-base-content/5 px-3 text-xs font-bold outline-none focus:border-primary/30"
            />
            <select
              value={spoilerFilter}
              onChange={(e) => setSpoilerFilter(e.target.value as "all" | "true" | "false")}
              className="h-10 rounded-xl border border-base-content/10 bg-base-content/5 px-3 text-xs font-bold outline-none focus:border-primary/30"
            >
              <option value="all">Spoiler: Tum</option>
              <option value="true">Spoiler: Evet</option>
              <option value="false">Spoiler: Hayir</option>
            </select>
            <select
              value={hiddenFilter}
              onChange={(e) => setHiddenFilter(e.target.value as "all" | "true" | "false")}
              className="h-10 rounded-xl border border-base-content/10 bg-base-content/5 px-3 text-xs font-bold outline-none focus:border-primary/30"
            >
              <option value="all">Gizli: Tum</option>
              <option value="true">Gizli: Evet</option>
              <option value="false">Gizli: Hayir</option>
            </select>
          </div>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto p-8 pt-0">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <span className="loading loading-spinner text-primary"></span>
            </div>
          ) : activity ? (
            <>
              {activeTab === "reviews" && renderList([
                ...(activity?.reviews || []),
                ...(activity?.bookComments || [])
              ].sort((a, b) => {
                const dateA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
              }), "review")}
              {activeTab === "comments" && renderList(activity?.chapterComments || [], "comment")}
              {activeTab === "inline" && renderList(activity?.inlineComments || [], "inline")}
            </>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center opacity-40">
              <ShieldAlert className="h-10 w-10 mb-2" />
              <p className="text-xs font-black uppercase tracking-widest">
                {errorMsg || "Veriler Yüklenemedi"}
              </p>
              <button
                onClick={() => {
                  setErrorMsg(null);
                  setIsLoading(true);
                  fetch(`/api/social/admin/books/${book.id}/activity?t=${Date.now()}`)
                    .then((res) => res.json())
                    .then((json) => {
                      if (json?.isSuccess && json?.data) setActivity(json.data);
                      else setErrorMsg(json?.message || "Veriler yuklenemedi.");
                    })
                    .catch(() => setErrorMsg("Sunucuya baglanirken bir hata olustu."))
                    .finally(() => setIsLoading(false));
                }}
                className="mt-4 text-[10px] underline font-bold"
              >
                Tekrar Dene
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
