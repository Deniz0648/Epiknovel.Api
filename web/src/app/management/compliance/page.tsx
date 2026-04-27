"use client";

import React, { useState, useEffect } from "react";
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
  MoreVertical,
  Edit2,
  Trash2,
  X,
  Globe,
  Check,
  UserPlus,
  Users,
  MessageSquare,
  Clock,
  ThumbsUp,
  AlertOctagon,
  Flag,
  ShieldAlert,
  Loader2,
  Save as SaveIcon,
  Star
} from "lucide-react";
import { resolveMediaUrl } from "@/lib/api";
import { toast } from "sonner";

type ContentTab = "books-original" | "books-translated" | "books-editor-choice" | "reviews-editor-choice" | "categories" | "tags" | "quotes" | "faq" | "moderation";

export default function CompliancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<ContentTab>("books-original");
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [assigningBook, setAssigningBook] = useState<any | null>(null);
  const [reviewingBook, setReviewingBook] = useState<any | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Sync tab with URL
  useEffect(() => {
    const tabParam = searchParams.get("tab") as ContentTab;
    if (tabParam && ["books-original", "books-translated", "books-editor-choice", "categories", "tags", "quotes", "faq", "moderation"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const tabs = [
    { id: "books-original", label: "Ozgun Kitaplar", icon: Book },
    { id: "books-translated", label: "Ceviri Eserler", icon: Book },
    { id: "books-editor-choice", label: "Editorun Secimi", icon: Star },
    { id: "reviews-editor-choice", label: "One Cikan Yorumlar", icon: MessageSquare },
    { id: "categories", label: "Kategoriler", icon: Layers },
    { id: "tags", label: "Etiketler", icon: TagIcon },
    { id: "quotes", label: "Ozlu Sozler", icon: QuoteIcon },
    { id: "faq", label: "SSS", icon: HelpCircle },
  ];

  const fetchData = React.useCallback(async () => {
    setData(null);
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

        endpoint = `/api/management/compliance/books?search=${searchQuery}`;
        if (type) endpoint += `&type=${type}`;
        if (isEditorChoice) endpoint += `&isEditorChoice=${isEditorChoice}`;
      } else if (activeTab === "categories" || activeTab === "tags") {
        endpoint = `/api/management/compliance/metadata`;
      } else if (activeTab === "reviews-editor-choice") {
        endpoint = `/api/social/reviews?isEditorChoice=true&size=50`;
      } else {
        endpoint = `/api/management/compliance/${activeTab}`;
      }

      const res = await fetch(endpoint);
      if (!res.ok) {
        console.error(`Fetch error: ${res.status} ${res.statusText}`);
        setData(activeTab.startsWith("books") ? { items: [] } : []);
        return;
      }

      const json = await res.json();

      // Handle Result<T> structure safely
      if (json && typeof json === 'object' && 'isSuccess' in json) {
        if (json.isSuccess) {
          setData(json.data);
        } else {
          console.error("API Error:", json.message);
          setData(activeTab.startsWith("books") ? { items: [] } : []);
        }
      } else {
        // Fallback for direct data or unexpected structures
        setData(Array.isArray(json) ? json : (activeTab.startsWith("books") ? { items: [] } : []));
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setData(activeTab.startsWith("books") ? { items: [] } : []); // Set safe default on error
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, searchQuery]);

  React.useEffect(() => {
    const timer = setTimeout(fetchData, 300); // Debounce
    return () => clearTimeout(timer);
  }, [fetchData]);

  async function handleToggleVisibility(bookId: string, currentHidden: boolean) {
    try {
      const res = await fetch(`/api/management/compliance/books/${bookId}/visibility`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, isVisible: currentHidden }), // Toggle logic
      });
      if (res.ok) {
        // Refresh data
        fetchData();
      }
    } catch (err) {
      console.error("Visibility toggle error:", err);
    }
  }

  async function handleToggleEditorChoice(bookId: string, currentStatus: boolean) {
    try {
      const res = await fetch(`/api/management/compliance/books/${bookId}/editor-choice`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, isEditorChoice: !currentStatus }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Editor choice toggle error:", err);
    }
  }

  async function handleToggleEditorChoiceFromTab(reviewId: string, currentStatus: boolean) {
    try {
      const res = await fetch(`/api/social/admin/reviews/${reviewId}/editor-choice`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reviewId, isEditorChoice: !currentStatus }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Review Editor choice toggle error:", err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu ogeyi silmek istediginizden emin misiniz?")) return;

    try {
      const endpoint = activeTab.startsWith("books")
        ? `/api/management/compliance/books/${id}` // If delete exists
        : `/api/management/compliance/${activeTab}/${id}`;

      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (err) {
      console.error("Delete error:", err);
    }
  }

  function handleAdd() {
    setIsAdding(true);
  }

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tight text-base-content/80">
            Icerik Denetimi
          </h1>
          <p className="text-sm font-medium text-base-content/40 mt-1">
            Platformdaki tum iceriklerin (kitap, kategori, sss) yonetim ve denetim merkezi.
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto rounded-2xl bg-base-content/5 p-1 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as ContentTab);
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
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-base-content/10 bg-base-100/5 text-base-content/40 transition hover:bg-base-content/10">
              <Filter className="h-5 w-5" />
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
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              {activeTab.startsWith("books") && (
                <BookManagementView
                  books={data?.items || []}
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
                  items={activeTab === "categories" ? data?.categories : data?.tags}
                  onDelete={handleDelete}
                  isAdding={isAdding}
                  setIsAdding={setIsAdding}
                />
              )}
              {activeTab === "quotes" && (
                <SimpleListingView
                  activeTab={activeTab}
                  items={data}
                  onDelete={handleDelete}
                  isAdding={isAdding}
                  setIsAdding={setIsAdding}
                />
              )}
              {activeTab === "faq" && (
                <SimpleListingView
                  activeTab={activeTab}
                  items={data}
                  onDelete={handleDelete}
                  isAdding={isAdding}
                  setIsAdding={setIsAdding}
                />
              )}
              {activeTab === "reviews-editor-choice" && (
                <FeaturedReviewsView
                  reviews={Array.isArray(data) ? data : []}
                  onToggleEditorChoice={handleToggleEditorChoiceFromTab}
                  onRefresh={() => fetchData()}
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
  onToggleVisibility,
  onToggleEditorChoice,
  onEdit,
  onAssign,
  onReviewSocial,
  onDelete
}: {
  books: any[],
  onToggleVisibility: (id: string, hidden: boolean) => void,
  onToggleEditorChoice: (id: string, current: boolean) => void,
  onEdit: (book: any) => void,
  onAssign: (book: any) => void,
  onReviewSocial: (book: any) => void,
  onDelete: (id: string) => void
}) {
  if (!books || books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-30">
        <Book className="h-12 w-12 mb-4" />
        <p className="font-bold uppercase tracking-widest text-xs">Aranan kriterlere uygun kitap bulunamadi</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-base-content/5 text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30">
            <th className="pb-4 pl-4">Kitap Bilgisi</th>
            <th className="pb-4">Durum</th>
            <th className="pb-4">Istatistik</th>
            <th className="pb-4 text-right pr-4">Islemler</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-base-content/5">
          {books.map((book) => (
            <tr key={book.id} className="group transition hover:bg-base-content/2">
              <td className="py-4 pl-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-base-content/5 border border-base-content/5 shadow-sm">
                    {book.coverImageUrl ? (
                      <img
                        src={resolveMediaUrl(book.coverImageUrl)}
                        alt={book.title}
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
              <td className="py-4 pr-4">
                <div className="flex items-center justify-end gap-2">
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
                    onClick={() => onDelete(book.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-base-content/5 text-base-content/40 hover:bg-red-500/10 hover:text-red-500 transition"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
  items: any[] | null,
  onDelete: (id: string) => void,
  isAdding: boolean,
  setIsAdding: (val: boolean) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
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
              <img src={editData.iconUrl} alt="" className="h-full w-full object-cover" />
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
                        <img src={item.iconUrl} alt={item.name} className="h-full w-full object-contain rounded-xl" />
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
  );
}
function AssignMembersModal({ book, onClose }: { book: any, onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [assignedMembers, setAssignedMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Fetch current members
    async function fetchMembers() {
      try {
        const res = await fetch(`/api/management/compliance/books/${book.id}/members`);
        const json = await res.json();
        if (json.isSuccess) {
          setAssignedMembers(json.data.map((m: any) => ({
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
      setSearchResults([]);
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

  async function handleAssign(user: any) {
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
        onClose();
      }
    } catch (err) {
      console.error("Save assignment error:", err);
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
            {searchResults.map(user => (
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
  onRefresh
}: {
  reviews: any[],
  onToggleEditorChoice: (id: string, current: boolean) => void,
  onRefresh: () => void
}) {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 opacity-20">
        <MessageSquare className="h-16 w-16 mb-4 text-primary" />
        <p className="text-xs font-black uppercase tracking-[0.4em]">Henüz Öne Çıkarılan Yorum Bulunmuyor</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
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
                  "{review.content}"
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
  );
}


function SocialActivityModal({ book, onClose }: { book: any; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"reviews" | "comments" | "inline">("reviews");
  const [activity, setActivity] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivity() {
      setIsLoading(true);
      setActivity(null);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/social/admin/books/${book.id}/activity?t=${Date.now()}`);
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
  }, [book.id]);

  async function handleToggleHide(type: string, id: string, currentHidden: boolean) {
    try {
      const res = await fetch(`/api/social/admin/content/visibility`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type, isHidden: !currentHidden }),
      });
      if (res.ok) {
        setActivity((prev: any) => {
          const next = { ...prev };
          const listName =
            type === "review"
              ? "reviews"
              : type === "comment"
                ? "chapterComments"
                : "inlineComments";
          next[listName] = next[listName].map((item: any) =>
            item.id === id ? { ...item, isHidden: !currentHidden } : item
          );
          return next;
        });
      }
    } catch (err) {
      console.error("Toggle social visibility error:", err);
    }
  }

  async function handleToggleReviewEditorChoice(id: string, currentStatus: boolean) {
    try {
      const res = await fetch(`/api/social/admin/reviews/${id}/editor-choice`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isEditorChoice: !currentStatus }),
      });
      if (res.ok) {
        setActivity((prev: any) => {
          const next = { ...prev };
          next.reviews = (next.reviews || []).map((item: any) =>
            item.id === id ? { ...item, isEditorChoice: !currentStatus } : item
          );
          return next;
        });
      }
    } catch (err) {
      console.error("Toggle review editor choice error:", err);
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
          const res = await fetch(`/api/social/admin/books/${book.id}/activity`);
          const data = await res.json();
          if (data.isSuccess) setActivity(data.data);
        }
      }
    } catch (err) {
      toast.error("İşlem başarısız.");
    }
  };

  function renderItem(item: any, type: string, isReply = false) {
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
              {item.rating > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-black text-warning">
                  <Star className="ml-2 h-3 w-3 fill-current" /> {item.rating.toFixed(1)}
                </span>
              )}
              <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-base-content/20">
                <Clock className="h-3 w-3" /> {new Date(item.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div
              className={`text-xs leading-relaxed text-base-content/80 prose prose-sm prose-invert max-w-none prose-p:my-0.5 prose-strong:text-white ${item.isSpoiler ? "blur-[2px] hover:blur-0 transition-all cursor-help" : ""}`}
              title={item.isSpoiler ? "Spoiler içeriği görmek için üzerine gelin" : ""}
              dangerouslySetInnerHTML={{
                __html: item.content
                  ?.replace(/&lt;/g, '<')
                  ?.replace(/&gt;/g, '>')
                  ?.replace(/&quot;/g, '"')
                  ?.replace(/&#39;/g, "'")
                  ?.replace(/&amp;/g, '&') || ""
              }}
            />
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
                  onClick={() => handleToggleReviewEditorChoice(item.id, item.isEditorChoice)}
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

  function renderList(items: any[], type: string) {
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
            {[
              { 
                id: "reviews", 
                label: `İnceleme & Yorum (${(activity?.reviews?.length || activity?.Reviews?.length || 0) + (activity?.bookComments?.length || activity?.BookComments?.length || 0)})` 
              },
              { id: "comments", label: `Bölüm Yorumları (${activity?.chapterComments?.length || activity?.ChapterComments?.length || 0})` },
              { id: "inline", label: `Satır Yorumları (${activity?.inlineComments?.length || activity?.InlineComments?.length || 0})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`transition-all rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest ${activeTab === tab.id
                  ? "bg-primary text-primary-content shadow-lg"
                  : "bg-base-content/5 text-base-content/40 hover:bg-base-content/10"
                  }`}
              >
                {tab.label}
              </button>
            ))}
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
                ...(activity?.reviews || activity?.Reviews || []),
                ...(activity?.bookComments || activity?.BookComments || [])
              ].sort((a, b) => {
                const dateA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
              }), "review")}
              {activeTab === "comments" && renderList(activity?.chapterComments || activity?.ChapterComments || [], "comment")}
              {activeTab === "inline" && renderList(activity?.inlineComments || activity?.InlineComments || [], "inline")}
            </>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center opacity-40">
              <ShieldAlert className="h-10 w-10 mb-2" />
              <p className="text-xs font-black uppercase tracking-widest">
                {errorMsg || "Veriler Yüklenemedi"}
              </p>
              <button onClick={() => window.location.reload()} className="mt-4 text-[10px] underline font-bold">Sayfayı Yenile</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}