"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  ImagePlus, 
  ChevronLeft, 
  LoaderCircle,
  ArrowLeft,
  Check,
  AlertCircle
} from "lucide-react";
import { showToast } from "@/lib/toast";
import { uploadMedia } from "@/lib/auth";

interface TranslatedBookFormProps {
  bookId?: string | null;
}

const BOOK_STATUS_OPTIONS = [
  { label: "Taslak", value: 0 },
  { label: "Devam Ediyor", value: 1 },
  { label: "Tamamlandi", value: 2 },
  { label: "Ara Verildi", value: 3 },
  { label: "Iptal Edildi", value: 4 },
] as const;

const CONTENT_RATING_OPTIONS = [
  { label: "Genel Izleyici (G)", value: 0 },
  { label: "13+ (PG-13)", value: 1 },
  { label: "18+ (R)", value: 2 },
] as const;

export default function TranslatedBookForm({ bookId }: TranslatedBookFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState("");
  const [originalAuthor, setOriginalAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState(1);
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState("");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [allCats, setAllCats] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCoverUploading, setIsCoverUploading] = useState(false);

  const computedSlug = useMemo(() => {
    if (!title.trim()) return "";
    return title
      .toLowerCase()
      .trim()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9\s-]/g, " ")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }, [title]);

  const parsedTags = useMemo(() => {
    return tags
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, [tags]);

  useEffect(() => {
    async function loadData() {
      try {
        const metaRes = await fetch("/api/management/compliance/metadata");
        const metaJson = await metaRes.json();
        setAllCats(metaJson.data?.categories || []);

        if (bookId) {
          const bookRes = await fetch(`/api/management/compliance/books/${bookId}`);
          const bookJson = await bookRes.json();
          const b = bookJson.data;
          if (b) {
            setTitle(b.title);
            setOriginalAuthor(b.originalAuthorName || "");
            setDescription(b.description || "");
            setCoverImageUrl(b.coverImageUrl || null);
            setCoverPreviewUrl(b.coverImageUrl || null);
            setStatus(b.status);
            setRating(b.contentRating);
            setSelectedCats(b.categoryIds || []);
            setTags((b.tags || []).join(", "));
          }
        }
      } catch (err) {
        console.error("Load error:", err);
        showToast({ title: "Hata", description: "Veriler yüklenemedi.", tone: "error" });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [bookId]);

  async function handleCoverUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      showToast({ title: "Geçersiz dosya", description: "Lütfen bir resim dosyası seçin.", tone: "error" });
      return;
    }

    setIsCoverUploading(true);
    const previewUrl = URL.createObjectURL(file);
    setCoverPreviewUrl(previewUrl);

    try {
      const result = await uploadMedia(file, { category: "covers", width: 600, height: 900 });
      setCoverImageUrl(result.url);
      showToast({ title: "Başarılı", description: "Kapak fotoğrafı yüklendi.", tone: "success" });
    } catch (err) {
      showToast({ title: "Hata", description: "Kapak yüklenemedi.", tone: "error" });
      setCoverPreviewUrl(coverImageUrl);
    } finally {
      setIsCoverUploading(false);
    }
  }

  async function handleSave() {
    if (!title.trim() || !description.trim() || selectedCats.length === 0) {
      showToast({ title: "Eksik Bilgi", description: "Başlık, özet ve en az bir kategori zorunludur.", tone: "error" });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const url = bookId 
        ? `/api/management/compliance/books/${bookId}` 
        : "/api/management/compliance/books/translated";
      
      const res = await fetch(url, {
        method: bookId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: bookId,
          title,
          description,
          coverImageUrl,
          status,
          contentRating: rating,
          originalAuthorName: originalAuthor,
          categoryIds: selectedCats,
          tags: parsedTags
        })
      });
      
      if (res.ok) {
        showToast({ title: "Başarılı", description: bookId ? "Eser güncellendi." : "Eser oluşturuldu.", tone: "success" });
        router.push("/management/compliance?tab=books-translated");
        router.refresh();
      } else {
        const error = await res.json();
        showToast({ title: "Hata", description: error.message || "İşlem başarısız.", tone: "error" });
      }
    } catch (err) {
      console.error("Save error:", err);
      showToast({ title: "Hata", description: "Beklenmeyen bir hata oluştu.", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen flex-col gap-8 pb-12 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header Section */}
      <section className="space-y-4">
        <nav className="flex items-center gap-2 text-xs font-semibold text-base-content/40">
          <button onClick={() => router.push("/management/compliance")} className="transition-colors hover:text-primary">Yönetim Paneli</button>
          <span className="opacity-20">-</span>
          <button onClick={() => router.push("/management/compliance?tab=books-translated")} className="transition-colors hover:text-primary">Ceviri Eserler</button>
          <span className="opacity-20">-</span>
          <span className="text-base-content/80 font-bold">{bookId ? "Düzenle" : "Yeni Ekle"}</span>
        </nav>

        <button 
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-base-content/60 hover:text-primary transition-all group"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Geri Dön
        </button>

        <div className="flex flex-col gap-2">
          <h1 className="text-[clamp(2.5rem,6vw,4rem)] font-black leading-[0.9] tracking-tighter italic uppercase text-base-content/90">
            {bookId ? "Eseri Guncelle" : "Ceviri Eser Tanimla"}
          </h1>
          <p className="text-base font-medium text-base-content/40 max-w-2xl">
            Platformdaki çeviri kütüphanesi için tüm detayları eksiksiz doldurun. Bu eser yönetici onayı sonrası yayına hazır hale gelecektir.
          </p>
        </div>
      </section>

      {/* Main Form Section - Layout taken from author/new */}
      <section className="glass-frame grid gap-6 rounded-[2.5rem] border border-base-content/10 bg-gradient-to-br from-base-100/60 via-base-100/40 to-primary/5 p-6 lg:grid-cols-[280px_minmax(0,1fr)_300px]">
        
        {/* Left Column: Media & Status */}
        <aside className="space-y-6 rounded-[2rem] border border-base-content/5 bg-base-100/30 p-5 backdrop-blur-md">
          <div>
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30 italic ml-1">Kapak Gorseli</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex aspect-[2/3] w-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-base-content/10 bg-base-100/20 px-4 text-center transition-all hover:border-primary/40 hover:bg-base-100/40 overflow-hidden shadow-inner"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCoverUpload(file);
                }}
              />
              
              {coverPreviewUrl ? (
                <div className="absolute inset-0">
                  <Image
                    src={coverPreviewUrl}
                    alt="Cover"
                    fill
                    className={`object-cover transition-all duration-500 ${isCoverUploading ? "scale-105 blur-sm grayscale" : "group-hover:scale-105"}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end text-left opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs font-black uppercase tracking-widest text-white/90">Gorseli Degistir</p>
                    <p className="text-[10px] text-white/60 font-medium">PNG, JPG veya WEBP</p>
                  </div>
                  {isCoverUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                       <LoaderCircle className="h-10 w-10 animate-spin text-white" />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-lg shadow-primary/10 transition-transform group-hover:scale-110">
                    <ImagePlus className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-base-content/60">Resim Secin</p>
                    <p className="mt-1 text-[10px] font-bold text-base-content/30 italic">2:3 Oran, Maks 5MB</p>
                  </div>
                </>
              )}
            </button>
          </div>

          <div className="space-y-4 pt-4 border-t border-base-content/5">
            <label className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30 italic ml-1">Yayin Durumu</span>
              <select 
                value={status} 
                onChange={(e) => setStatus(Number(e.target.value))}
                className="h-14 w-full rounded-2xl border border-base-content/10 bg-base-100/50 px-4 text-xs font-black uppercase tracking-widest outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/5"
              >
                {BOOK_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30 italic ml-1">Yas Siniri</span>
              <select 
                value={rating} 
                onChange={(e) => setRating(Number(e.target.value))}
                className="h-14 w-full rounded-2xl border border-base-content/10 bg-base-100/50 px-4 text-xs font-black uppercase tracking-widest outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/5"
              >
                {CONTENT_RATING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </div>
        </aside>

        {/* Center Column: Details */}
        <section className="space-y-6 rounded-[2rem] border border-base-content/5 bg-base-100/40 p-6 shadow-xl backdrop-blur-md lg:p-8">
           <div className="flex flex-col gap-6">
              <div className="grid gap-6 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30 italic ml-1">Kitap Basligi</span>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Eserin Orijinal veya Turkce Ismi"
                    className="h-16 w-full rounded-2xl border border-base-content/10 bg-base-100 px-6 text-sm font-black shadow-inner outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/5 placeholder:font-bold placeholder:text-base-content/10"
                  />
                </label>

                <label className="flex flex-col gap-2 opacity-60">
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30 italic ml-1">Slug (Otomatik)</span>
                   <div className="h-16 w-full flex items-center rounded-2xl border border-base-content/10 bg-base-content/5 px-6 text-xs font-bold text-base-content/40 tracking-wider truncate">
                      epiknovel.com/book/{computedSlug || "..."}
                   </div>
                </label>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30 italic ml-1">Orijinal Yazar</span>
                <input 
                  type="text" 
                  value={originalAuthor} 
                  onChange={(e) => setOriginalAuthor(e.target.value)}
                  placeholder="Eserin Gercek Yazari"
                  className="h-16 w-full rounded-2xl border border-base-content/10 bg-base-100 px-6 text-sm font-black shadow-inner outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/5 placeholder:font-bold placeholder:text-base-content/10"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30 italic ml-1">Ozet ve Aciklama</span>
                <textarea 
                  rows={8}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Okuyuculari etkileyecek profesyonel bir aciklama girin..."
                  className="w-full min-h-[200px] rounded-3xl border border-base-content/10 bg-base-100 p-6 text-sm font-bold leading-relaxed shadow-inner outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/5 placeholder:font-bold placeholder:text-base-content/10"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30 italic ml-1">Etiketler</span>
                <input 
                  type="text" 
                  value={tags} 
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="fantastik, macera, aksiyon (virgul ile ayirin)"
                  className="h-16 w-full rounded-2xl border border-base-content/10 bg-base-100 px-6 text-sm font-black shadow-inner outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/5 placeholder:font-bold placeholder:text-base-content/10"
                />
              </label>
           </div>
        </section>

        {/* Right Column: Taxonomy & Submit */}
        <aside className="flex flex-col gap-6">
           <div className="flex-1 rounded-[2rem] border border-base-content/5 bg-base-100/30 p-6 shadow-lg backdrop-blur-md">
              <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30 italic ml-1">Kategoriler</p>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {allCats.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCats(prev => prev.includes(cat.id) ? prev.filter(x => x !== cat.id) : [...prev, cat.id])
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-left transition-all duration-300 ${
                      selectedCats.includes(cat.id) 
                        ? "border-primary/40 bg-primary/10 text-primary shadow-lg shadow-primary/5" 
                        : "border-base-content/5 bg-base-100/50 text-base-content/40 hover:border-primary/20 hover:bg-base-100/80 hover:text-base-content/80"
                    }`}
                  >
                    <span className="text-[11px] font-black uppercase tracking-widest">{cat.name}</span>
                    {selectedCats.includes(cat.id) && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
           </div>

           <div className="rounded-[2rem] border border-base-content/5 bg-base-100/30 p-6 shadow-xl backdrop-blur-md">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className="group relative flex h-20 w-full items-center justify-center overflow-hidden rounded-[1.5rem] bg-primary text-xs font-black uppercase tracking-[0.2em] text-primary-content shadow-2xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-3">
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                    <span>Kaydediliyor</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span>{bookId ? "Degisiklikleri Onayla" : "Eseri Sisteme Aktar"}</span>
                  </div>
                )}
                
                {/* Visual Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>
              <p className="mt-4 text-center text-[10px] font-bold text-base-content/20 uppercase tracking-widest px-4 italic leading-relaxed">
                YUKARIDAKI TUM BILGILERIN DOGRULUGUNDAN SORUMLUSUNUZ.
              </p>
           </div>
        </aside>

      </section>
    </div>
  );
}
