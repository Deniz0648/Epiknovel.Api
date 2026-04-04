"use client";

import Image from "next/image";
import Link from "next/link";
import { ImagePlus, ChevronLeft, LoaderCircle, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, use } from "react";
import { ApiError } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { 
    getMyBookBySlug, 
    updateBook, 
    deleteBook,
    getBookCategories, 
    getBookTags, 
    uploadMedia, 
    type BookCategoryItem, 
    type BookTagItem,
    type MyBookListItem
} from "@/lib/auth";

import { showToast } from "@/lib/toast";

const BOOK_STATUS_OPTIONS = [
  { label: "Taslak", value: 0, internal: "Draft" },
  { label: "Devam Ediyor", value: 1, internal: "Ongoing" },
  { label: "Tamamlandi", value: 2, internal: "Completed" },
  { label: "Ara Verildi", value: 3, internal: "Hiatus" },
  { label: "Iptal Edildi", value: 4, internal: "Cancelled" },
] as const;

const BOOK_TYPE_OPTIONS = [
  { label: "Orijinal Eser", value: 0, internal: "Original" },
  { label: "Çeviri Eser", value: 1, internal: "Translation" },
] as const;

const CONTENT_RATING_OPTIONS = [
  { label: "Genel Izleyici (G)", value: 0, internal: "General" },
  { label: "13+ (PG-13)", value: 1, internal: "Teen" },
  { label: "18+ (R)", value: 2, internal: "Mature" },
] as const;

export default function EditBookPage({ params }: { params: Promise<{ bookSlug: string }> }) {
  const { bookSlug } = use(params);
  const { profile, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [book, setBook] = useState<MyBookListItem | null>(null);
  const [categories, setCategories] = useState<BookCategoryItem[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<BookTagItem[]>([]);
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<number>(0);
  const [contentRating, setContentRating] = useState<number>(0);
  const [bookType, setBookType] = useState<number>(0);
  const [originalAuthorName, setOriginalAuthorName] = useState("");
  
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const parsedTags = useMemo(() => {
    return tags
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item, index, array) => array.findIndex((other) => other.toLocaleLowerCase("tr-TR") === item.toLocaleLowerCase("tr-TR")) === index);
  }, [tags]);

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [coverPreviewUrl]);

  function toggleCategory(category: string) {
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((x) => x !== category) : [...current, category],
    );
  }

  useEffect(() => {
    async function loadData() {
      if (isAuthLoading) return;
      if (!profile) {
        router.replace("/login");
        return;
      }

      setIsInitialLoading(true);
      setLoadError(null);

      try {
        const [bookData, categoriesData, tagsData] = await Promise.all([
          getMyBookBySlug(bookSlug),
          getBookCategories(),
          getBookTags()
        ]);

        if (bookData.authorId !== profile.userId && !profile.permissions?.adminAccess) {
            router.replace("/author");
            return;
        }

        setBook(bookData);
        setTitle(bookData.title);
        setDescription(bookData.description);
        setCoverImageUrl(bookData.coverImageUrl || null);
        setCoverPreviewUrl(bookData.coverImageUrl || null);
        setTags(bookData.tags.join(", "));
        
        const currentStatus = BOOK_STATUS_OPTIONS.find(opt => opt.internal === bookData.status)?.value ?? 0;
        const currentRating = CONTENT_RATING_OPTIONS.find(opt => opt.internal === bookData.contentRating)?.value ?? 0;
        const currentType = typeof bookData.type === 'string' 
            ? (bookData.type === 'Translation' ? 1 : 0) 
            : bookData.type;
        
        setStatus(currentStatus);
        setContentRating(currentRating);
        setBookType(currentType);
        setOriginalAuthorName(bookData.originalAuthorName || "");
        setSelectedCategories(bookData.categories.map(c => (c as any).id || c));

        setCategories(categoriesData.categories);
        setTagSuggestions(tagsData.tags);
      } catch (error) {
        if (error instanceof ApiError) {
          setLoadError(error.message);
        } else {
          setLoadError("Kitap bilgileri yuklenemedi.");
        }
      } finally {
        setIsInitialLoading(false);
      }
    }

    loadData();
  }, [bookSlug, isAuthLoading, profile, router]);

  async function handleDeleteBook() {
    if (!book) return;
    
    if (!confirm("Bu kitabı çöp kutusuna taşımak istediğinizden emin misiniz? Bu işlem geri alınabilir ancak kitap yayından kaldırılacaktır.")) {
        return;
    }

    setIsDeleting(true);

    try {
      await deleteBook(book.id);
      showToast({
        title: "Cop kutusuna tasindi",
        description: "Kitabiniz basariyla arsivlendi.",
        tone: "success",
      });
      router.push("/author");
    } catch (error) {
      if (error instanceof ApiError) {
        showToast({ title: "Islem basarisiz", description: error.message, tone: "error" });
      }
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleUpdateBook() {
    if (!book) return;
    
    if (!title.trim() || !description.trim()) {
      showToast({
        title: "Zorunlu alanlar eksik",
        description: "Baslik ve ozet alanlarini doldurmalisiniz.",
        tone: "error",
      });
      return;
    }

    if (selectedCategories.length === 0) {
      showToast({
        title: "Kategori secilmedi",
        description: "En az bir kategori secmelisiniz.",
        tone: "error",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateBook(book.id, {
        title: title.trim(),
        description: description.trim(),
        coverImageUrl,
        status,
        contentRating,
        type: bookType,
        originalAuthorName: originalAuthorName,
        categoryIds: selectedCategories,
        tags: parsedTags,
      });

      showToast({
        title: "Kitap guncellendi",
        description: result.message,
        tone: "success",
      });

      router.push(`/author/${bookSlug}`);

    } catch (error) {
      if (error instanceof ApiError) {
        showToast({
          title: "Guncelleme basarisiz",
          description: error.message,
          tone: "error",
        });
      } else {
        showToast({
          title: "Bir hata olustu",
          description: "Beklenmeyen bir hata olustu.",
          tone: "error",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCoverUpload(file: File) {
    setIsCoverUploading(true);
    const nextPreviewUrl = URL.createObjectURL(file);
    setCoverPreviewUrl(nextPreviewUrl);

    try {
      const uploadResult = await uploadMedia(file, {
        category: "covers",
        width: 600,
        height: 900,
      });

      setCoverImageUrl(uploadResult.url);
      showToast({
        title: "Kapak yuklendi",
        description: "Yeni kapak gorseli optimize edildi.",
        tone: "success",
      });
    } catch (error) {
      if (error instanceof ApiError) {
        showToast({ title: "Kapak yuklenemedi", description: error.message, tone: "error" });
      }
    } finally {
      setIsCoverUploading(false);
    }
  }

  if (isInitialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-20">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="relative overflow-hidden">
      <div className="site-shell mx-auto flex min-h-screen flex-col gap-6 px-4 pb-8 pt-28 sm:px-8 sm:pb-12 sm:pt-32">
        <section className="space-y-3">
          <nav className="flex items-center gap-2 text-xs font-semibold text-base-content/60">
            <Link href="/" className="transition-colors hover:text-primary">Anasayfa</Link>
            <span className="opacity-40">-</span>
            <Link href="/author" className="transition-colors hover:text-primary">Yazar Paneli</Link>
            <span className="opacity-40">-</span>
            <Link href={`/author/${bookSlug}`} className="transition-colors hover:text-primary">{book?.title || "Kitap"}</Link>
            <span className="opacity-40">-</span>
            <span className="text-base-content/90">Duzenle</span>
          </nav>

          <Link href={`/author/${bookSlug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-base-content/65 hover:text-primary">
            <ChevronLeft className="h-4 w-4" />
            Geri Don
          </Link>
          <h1 className="text-[clamp(2rem,5vw,3.2rem)] font-black leading-[1] tracking-tight">Hikayeni Duzenle</h1>
          <p className="text-sm text-base-content/65">
            Dunyani sekillendirmeye devam et. Degisiklikleri yap ve okuyucularina en guncel deneyimi sun.
          </p>
        </section>

        {loadError ? (
           <section className="glass-frame rounded-2xl border border-error/30 bg-error/10 p-4 text-sm font-semibold text-error">
             {loadError}
           </section>
        ) : (
          <>
            <section className="glass-frame grid gap-5 rounded-[2rem] border border-base-content/12 bg-gradient-to-br from-base-100/40 via-base-100/26 to-primary/8 p-5 lg:grid-cols-[260px_minmax(0,1fr)_280px]">
              {/* Sol Sutun */}
              <aside className="rounded-3xl border border-base-content/10 bg-base-100/18 p-4">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-base-content/50">Kapak Gorseli</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative flex aspect-[2/3] w-[240px] mx-auto lg:w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-base-content/25 bg-base-100/12 px-4 text-center transition hover:border-primary/45 hover:bg-base-100/20"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleCoverUpload(e.target.files[0])}
                  />
                  {coverPreviewUrl || coverImageUrl ? (
                    <div className="relative h-full w-full overflow-hidden rounded-2xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={resolveMediaUrl(coverPreviewUrl || coverImageUrl || "")} alt="Kapak" className="h-full w-full object-cover" />
                      {isCoverUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                          <LoaderCircle className="animate-spin" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-base-100/35 text-primary">
                        {isCoverUploading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                      </span>
                      <div>
                        <p className="text-sm font-extrabold">Resim Secin veya Surukleyin</p>
                      </div>
                    </>
                  )}
                </button>

                <div className="mt-4 space-y-3">
                  <p className="mb-4 text-xs font-black uppercase tracking-[0.14em] text-base-content/50">Yayin Durumu</p>
                  <select 
                    value={status} 
                    onChange={(e) => setStatus(Number(e.target.value))} 
                    className="select select-bordered h-12 w-full rounded-xl border-base-content/15 bg-base-100/85 text-sm font-bold shadow-sm"
                  >
                    {BOOK_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>

                  <p className="mb-4 mt-6 text-xs font-black uppercase tracking-[0.14em] text-base-content/50">Hedef Kitle</p>
                  <select 
                    value={contentRating} 
                    onChange={(e) => setContentRating(Number(e.target.value))} 
                    className="select select-bordered h-12 w-full rounded-xl border-base-content/15 bg-base-100/85 text-sm font-bold shadow-sm"
                  >
                    {CONTENT_RATING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </aside>

              {/* Orta Sutun */}
              <section className="rounded-3xl border border-base-content/10 bg-base-100/18 p-4">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-base-content/50">Genel Bilgiler</p>
                <div className="space-y-4">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                    <label className="flex min-w-0 flex-col gap-1.5">
                      <span className="text-xs font-black uppercase tracking-[0.1em] text-base-content/52">Baslik</span>
                      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Kitap basligini giriniz..." className="input input-bordered h-12 w-full rounded-xl border-base-content/12 bg-base-100/20 font-bold" />
                    </label>
                    <label className="flex min-w-0 flex-col gap-1.5">
                      <span className="text-xs font-black uppercase tracking-[0.1em] text-base-content/52">URL Uzantisi (Slug) - Sabit</span>
                      <input type="text" readOnly value={`epiknovel.com/book/${bookSlug}`} className="input input-bordered h-12 w-full rounded-xl border-base-content/12 bg-base-100/16 text-base-content/65" />
                    </label>
                  </div>

                  <label className="flex min-w-0 flex-col gap-1.5">
                    <p className="text-xs font-black uppercase tracking-[0.1em] text-base-content/52">Hakkinda / Ozet</p>
                    <textarea rows={11} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Hikaye ozeti..." className="textarea textarea-bordered min-h-[18rem] w-full rounded-xl border-base-content/12 bg-base-100/20 p-4 text-base leading-relaxed" />
                  </label>

                  <label className="flex min-w-0 flex-col gap-1.5">
                    <p className="mb-1 text-xs font-black uppercase tracking-[0.1em] text-base-content/52">Anahtar Kelimeler / Etiketler</p>
                    <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="virgul ile ayirarak yazin" className="input input-bordered h-12 w-full rounded-xl border-base-content/12 bg-base-100/20 font-medium" />
                  </label>

                  {/* Eser Tipi Yonetimi (Sadece Admin) */}
                  {profile?.permissions?.adminAccess && (
                    <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20">
                      <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-black uppercase tracking-[0.1em] text-primary/70">Yonetici: Eser Tipi</span>
                        <select 
                          value={bookType} 
                          onChange={(e) => setBookType(Number(e.target.value))} 
                          className="select select-bordered h-12 w-full rounded-xl border-primary/30 bg-base-100 font-bold"
                        >
                          {BOOK_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </label>
                    </div>
                  )}

                  {/* Orijinal Yazar Bilgisi (Ceviri eseri ise her zaman gorunur) */}
                  {bookType === 1 && (
                    <div className={`p-5 rounded-2xl border ${profile?.permissions?.adminAccess ? 'bg-primary/5 border-primary/20' : 'bg-base-100/35 border-base-content/10'}`}>
                      <label className="flex flex-col gap-1.5">
                        <span className={`text-xs font-black uppercase tracking-[0.1em] ${profile?.permissions?.adminAccess ? 'text-primary/70' : 'text-base-content/52'}`}>
                          {profile?.permissions?.adminAccess ? "Yonetici: Orijinal Yazar" : "Orijinal Yazar Adi"}
                        </span>
                        <input 
                          type="text" 
                          value={originalAuthorName} 
                          onChange={(e) => setOriginalAuthorName(e.target.value)} 
                          placeholder="Orijinal yazar adini girin..." 
                          className={`input input-bordered h-12 w-full rounded-xl font-extrabold bg-base-100 ${profile?.permissions?.adminAccess ? 'border-primary/30' : 'border-base-content/12'}`}
                        />
                      </label>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {tagSuggestions.slice(0, 18).map(t => (
                      <button key={t.id} type="button" onClick={() => setTags(c => c ? `${c}, ${t.name}` : t.name)} className="rounded-full bg-base-100/35 px-3 py-1.5 text-xs font-bold transition hover:text-primary">
                        #{t.name}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* Sag Sutun */}
              <aside className="flex flex-col rounded-3xl border border-base-content/10 bg-base-100/18 p-4">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-base-content/50">Kategoriler</p>
                <div className="flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar leading-none">
                  {categories.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCategory(c.id)}
                      className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                        selectedCategories.includes(c.id) ? "border-primary/45 bg-primary/14 text-primary" : "border-base-content/12 bg-base-100/16 text-base-content/82 hover:border-primary/30"
                      }`}
                    >
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px]">
                        {selectedCategories.includes(c.id) ? "•" : ""}
                      </span>
                      {c.name}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleUpdateBook}
                  disabled={isSubmitting}
                  className="btn btn-primary mt-6 h-12 w-full rounded-2xl text-base font-black tracking-wide shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 active:scale-95"
                >
                  {isSubmitting ? <LoaderCircle className="animate-spin" /> : <><Save className="h-4 w-4" /> KAYDET</>}
                </button>
              </aside>
            </section>

            <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-[2rem] border border-error/18 bg-error/5 p-6 sm:flex-row">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-error/12 text-error">
                  <Trash2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-lg font-black text-error/90 leading-tight">Tehlikeli Bölge</p>
                  <p className="mt-1 text-sm font-medium text-base-content/55">
                    Kitabı ve tüm bağlı bölümlerini çöp kutusuna taşır. Bu içerik yayından kaldırılacaktır.
                  </p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleDeleteBook}
                disabled={isDeleting}
                className="btn btn-error min-w-[200px] h-12 rounded-2xl font-black text-base shadow-lg shadow-error/15 transition-all hover:-translate-y-0.5 active:scale-95"
              >
                {isDeleting ? <LoaderCircle className="animate-spin" /> : "Kitabı Çöpe Taşı"}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
