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
  Users
} from "lucide-react";

type ContentTab = "books-original" | "books-translated" | "categories" | "tags" | "quotes" | "faq";

export default function CompliancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<ContentTab>("books-original");
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [assigningBook, setAssigningBook] = useState<any | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Sync tab with URL
  useEffect(() => {
    const tabParam = searchParams.get("tab") as ContentTab;
    if (tabParam && ["books-original", "books-translated", "categories", "tags", "quotes", "faq"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const tabs = [
    { id: "books-original", label: "Ozgun Kitaplar", icon: Book },
    { id: "books-translated", label: "Ceviri Eserler", icon: Book },
    { id: "categories", label: "Kategoriler", icon: Layers },
    { id: "tags", label: "Etiketler", icon: TagIcon },
    { id: "quotes", label: "Ozlu Sozler", icon: QuoteIcon },
    { id: "faq", label: "SSS", icon: HelpCircle },
  ];

  React.useEffect(() => {
    setData(null); // Clear previous data to prevent type mismatch during tab switch
    setIsAdding(false); // Reset adding state on tab switch
    setIsLoading(true);

    async function fetchData() {
      try {
        let endpoint = "";
        if (activeTab.startsWith("books")) {
          const type = activeTab === "books-original" ? "Original" : "Translation";
          endpoint = `/api/management/compliance/books?type=${type}&search=${searchQuery}`;
        } else if (activeTab === "categories" || activeTab === "tags") {
          endpoint = `/api/management/compliance/metadata`;
        } else {
          endpoint = `/api/management/compliance/${activeTab}`;
        }

        const res = await fetch(endpoint);
        const json = await res.json();

        // Handle Result<T> structure safely
        const actualData = json.data !== undefined ? json.data : json;
        setData(actualData);
      } catch (err) {
        console.error("Fetch error:", err);
        setData([]); // Set empty array on error to prevent .map crash
      } finally {
        setIsLoading(false);
      }
    }

    const timer = setTimeout(fetchData, 300); // Debounce
    return () => clearTimeout(timer);
  }, [activeTab, searchQuery]);

  async function handleToggleVisibility(bookId: string, currentHidden: boolean) {
    try {
      const res = await fetch(`/api/management/compliance/books/${bookId}/visibility`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, isVisible: currentHidden }), // Toggle logic
      });
      if (res.ok) {
        // Refresh data
        window.location.reload();
      }
    } catch (err) {
      console.error("Visibility toggle error:", err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu ogeyi silmek istediginizden emin misiniz?")) return;

    try {
      const endpoint = activeTab.startsWith("books")
        ? `/api/management/compliance/books/${id}` // If delete exists
        : `/api/management/compliance/${activeTab}/${id}`;

      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) window.location.reload();
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

            {(activeTab === "books-translated" || !activeTab.startsWith("books")) && (
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
                  onDelete={handleDelete}
                  onAssign={(book) => setAssigningBook(book)}
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
    </div>
  );
}

function BookManagementView({
  books,
  onToggleVisibility,
  onDelete,
  onAssign,
  onEdit
}: {
  books: any[],
  onToggleVisibility: (id: string, hidden: boolean) => void,
  onDelete: (id: string) => void,
  onAssign: (book: any) => void,
  onEdit: (book: any) => void
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
            <tr key={book.id} className="group transition hover:bg-base-content/[0.02]">
              <td className="py-4 pl-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-12 overflow-hidden rounded-lg bg-base-content/5 flex items-center justify-center">
                    <Book className="h-6 w-6 text-base-content/10" />
                  </div>
                  <div>
                    <div className="font-black italic text-base-content/80 group-hover:text-primary transition">{book.title}</div>
                    <div className="text-[10px] font-bold text-base-content/30 uppercase tracking-widest">{book.authorName}</div>
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
                <div className="text-xs font-black text-base-content/60">{book.viewCount?.toLocaleString()} Izlenme</div>
                <div className="text-[10px] font-medium text-base-content/20 uppercase tracking-widest">Tip: {book.type}</div>
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

  const renderFormRow = (id?: string) => (
    <tr className="border-b border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Icon Column */}
      <td className="py-3 pl-4 w-16">
        {activeTab === "categories" && (
          <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-base-content/10 flex items-center justify-center border border-dashed border-base-content/20 hover:border-primary/50 transition cursor-pointer group/upload">
            {editData.iconUrl ? (
              <img src={editData.iconUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Plus className="h-4 w-4 text-base-content/20 group-hover/upload:text-primary transition" />
            )}
            {isUploading && (
              <div className="absolute inset-0 bg-base-100/60 backdrop-blur-sm flex items-center justify-center">
                <span className="h-4 w-4 animate-spin border-2 border-primary border-t-transparent rounded-full" />
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
        )}
      </td>

      {/* Primary Column */}
      <td className="py-3 px-4 min-w-[200px]">
        {(activeTab === "categories" || activeTab === "tags") && (
          <div className="flex flex-col gap-1">
            <input
              autoFocus
              type="text"
              placeholder="Isim..."
              className="h-10 w-full rounded-xl border border-primary/20 bg-base-100 px-4 text-xs font-bold outline-none focus:border-primary ring-offset-4 ring-primary/5 focus:ring-4"
              value={editData.name || ""}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            />
            <div className="text-[9px] font-black text-primary/40 uppercase tracking-widest pl-1">
              URL: {editData.name?.toLocaleLowerCase('tr-TR').replace(/ /g, "-") || "..."}
            </div>
          </div>
        )}
        {activeTab === "quotes" && (
          <textarea
            autoFocus
            placeholder="Ozlu Soz..."
            className="min-h-[80px] w-full rounded-xl border border-primary/20 bg-base-100 p-4 text-xs font-bold outline-none focus:border-primary resize-none"
            value={editData.content || ""}
            onChange={(e) => setEditData({ ...editData, content: e.target.value })}
          />
        )}
        {activeTab === "faq" && (
          <input
            autoFocus
            type="text"
            placeholder="Soru..."
            className="h-10 w-full rounded-xl border border-primary/20 bg-base-100 px-4 text-xs font-bold outline-none focus:border-primary"
            value={editData.question || ""}
            onChange={(e) => setEditData({ ...editData, question: e.target.value })}
          />
        )}
      </td>

      {/* Secondary Column */}
      <td className="py-3 px-4">
        <div className="flex flex-col gap-2">
          {activeTab === "categories" && (
            <>
              <input
                type="text"
                placeholder="Kisa Aciklama..."
                className="h-10 w-full rounded-xl border border-primary/20 bg-base-100 px-4 text-xs font-bold outline-none focus:border-primary"
                value={editData.description || ""}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              />
              <input
                type="text"
                placeholder="Manuel Icon URL..."
                className="h-8 w-full rounded-lg border border-base-content/10 bg-base-100 px-3 text-[10px] font-bold outline-none focus:border-primary/40"
                value={editData.iconUrl || ""}
                onChange={(e) => setEditData({ ...editData, iconUrl: e.target.value })}
              />
            </>
          )}
          {activeTab === "quotes" && (
            <input
              type="text"
              placeholder="Yazar Ismi..."
              className="h-10 w-full rounded-xl border border-primary/20 bg-base-100 px-3 text-xs font-bold outline-none focus:border-primary"
              value={editData.authorName || ""}
              onChange={(e) => setEditData({ ...editData, authorName: e.target.value })}
            />
          )}
          {activeTab === "faq" && (
            <textarea
              placeholder="Detayli Cevap..."
              className="min-h-[80px] w-full rounded-xl border border-primary/20 bg-base-100 p-4 text-xs font-bold outline-none focus:border-primary resize-none"
              value={editData.answer || ""}
              onChange={(e) => setEditData({ ...editData, answer: e.target.value })}
            />
          )}
          {activeTab === "tags" && <span className="text-[10px] font-black uppercase text-base-content/20 italic tracking-widest pl-2">Etiket parametreleri otomatik yonetilir</span>}
        </div>
      </td>

      {/* Actions Column */}
      <td className="py-3 pr-4 text-right">
        <div className="flex justify-end gap-2 px-2">
          <button
            disabled={isSaving}
            onClick={() => handleSubmit(id)}
            className="group flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-content shadow-lg shadow-primary/20 transition hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <span className="h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Check className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={() => { setIsAdding(false); setEditingId(null); setEditData({}); }}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-base-content/5 text-base-content/40 hover:bg-red-500 hover:text-white transition group"
          >
            <X className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="overflow-hidden rounded-[2rem] border border-base-content/5 bg-base-100/30 backdrop-blur-md">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-base-content/5 bg-base-content/5">
            <th className="py-5 pl-4 w-16 text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30 italic">Ikon</th>
            <th className="py-5 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30 italic">
              {activeTab === "quotes" ? "Soz / Icerik" : activeTab === "faq" ? "Soru" : "Baslik"}
            </th>
            <th className="py-5 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30 italic">
              {activeTab === "quotes" ? "Atif / Yazar" : activeTab === "faq" ? "Cevap" : "Aciklama / Detay"}
            </th>
            <th className="py-5 pr-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30 italic">Yonetim</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-base-content/5">
          {isAdding && renderFormRow()}

          {items && Array.isArray(items) && items.map((item) => (
            editingId === item.id ? (
              <React.Fragment key={item.id}>{renderFormRow(item.id)}</React.Fragment>
            ) : (
              <tr key={item.id} className="group hover:bg-base-content/5 transition duration-300">
                <td className="py-5 pl-4">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-base-content/5 border border-base-content/5 flex items-center justify-center p-0.5">
                    {item.iconUrl ? (
                      <img src={item.iconUrl} alt={item.name} className="h-full w-full object-contain rounded-lg" />
                    ) : (
                      <Layers className="h-4 w-4 text-base-content/10" />
                    )}
                  </div>
                </td>
                <td className="py-5 px-4">
                  <div className="font-bold text-sm text-base-content/80 group-hover:text-primary transition line-clamp-1">
                    {item.name || item.question || item.content}
                  </div>
                  {(item.slug) && (
                    <div className="text-[10px] font-black italic text-base-content/15 uppercase tracking-widest mt-0.5 group-hover:text-primary/40 transition">
                      {item.slug}
                    </div>
                  )}
                </td>
                <td className="py-5 px-4">
                  <div className="text-[11px] font-bold text-base-content/40 line-clamp-2 max-w-sm italic leading-relaxed opacity-60 group-hover:opacity-100 transition">
                    {item.description || item.authorName || item.answer || "---"}
                  </div>
                </td>
                <td className="py-5 pr-6 text-right">
                  <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition duration-300 translate-x-2 group-hover:translate-x-0">
                    <button
                      onClick={() => { setEditingId(item.id); setEditData(item); }}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-base-content/5 text-base-content/40 hover:bg-yellow-500/10 hover:text-yellow-500 transition-all shadow-sm"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-base-content/5 text-base-content/40 hover:bg-red-500/10 hover:text-red-500 transition-all shadow-sm"
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
              <td colSpan={4} className="py-16 text-center">
                <div className="flex flex-col items-center justify-center opacity-10">
                  <Layers className="h-12 w-12 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">Kayit Bulunamadi</p>
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                className="flex w-full items-center justify-between rounded-2xl border border-base-content/5 bg-base-content/[0.02] p-3 transition hover:bg-primary/10 hover:border-primary/20 group"
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