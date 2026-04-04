"use client";

import Image from "next/image";
import Link from "next/link";
import { ImagePlus, ChevronLeft, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { canCreateBook, createBook, getBookCategories, getBookTags, uploadMedia, type BookCategoryItem, type BookTagItem } from "@/lib/auth";
import { showToast } from "@/lib/toast";

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

const BOOK_TYPE_OPTIONS = [
  { label: "Orijinal Eser", value: 0 },
  { label: "Çeviri Eser", value: 1 },
] as const;

export default function NewAuthorBookPage() {
  const { profile, isLoading } = useAuth();
  const router = useRouter();
  const canAccess = canCreateBook(profile);
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
  const [isMetadataLoading, setIsMetadataLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    if (isLoading) return;
    if (!profile) {
      router.replace("/login");
      return;
    }
    if (!canCreateBook(profile)) {
      router.replace("/");
    }
  }, [isLoading, profile, router]);

  useEffect(() => {
    let cancelled = false;

    async function loadMetadata() {
      if (!canAccess) {
        setIsMetadataLoading(false);
        return;
      }

      setIsMetadataLoading(true);
      setLoadError(null);

      try {
        const [categoriesData, tagsData] = await Promise.all([getBookCategories(), getBookTags()]);
        if (cancelled) {
          return;
        }

        setCategories(categoriesData.categories);
        setTagSuggestions(tagsData.tags);
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (error instanceof ApiError) {
          setLoadError(error.message);
        } else {
          setLoadError("Kategori ve etiketler yuklenemedi.");
        }
      } finally {
        if (!cancelled) {
          setIsMetadataLoading(false);
        }
      }
    }

    void loadMetadata();

    return () => {
      cancelled = true;
    };
  }, [canAccess]);

  async function handleCreateBook() {
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
      const result = await createBook({
        title: title.trim(),
        description: description.trim(),
        coverImageUrl,
        status,
        contentRating,
        type: profile?.permissions?.adminAccess ? bookType : 0,
        originalAuthorName: profile?.permissions?.adminAccess ? originalAuthorName : null,
        categoryIds: selectedCategories,
        tags: parsedTags,
      });

      showToast({
        title: "Kitap olusturuldu",
        description: result.message,
        tone: "success",
      });

      router.push(`/Books/${result.slug}`);
    } catch (error) {
      if (error instanceof ApiError) {
        showToast({
          title: "Kitap olusturulamadi",
          description: error.message,
          tone: "error",
        });
      } else {
        showToast({
          title: "Kitap olusturulamadi",
          description: "Beklenmeyen bir hata olustu.",
          tone: "error",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCoverUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      showToast({
        title: "Gecersiz dosya",
        description: "Kapak gorseli icin bir resim dosyasi secmelisiniz.",
        tone: "error",
      });
      return;
    }

    setIsCoverUploading(true);

    const nextPreviewUrl = URL.createObjectURL(file);
    setCoverPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return nextPreviewUrl;
    });

    try {
      const uploadResult = await uploadMedia(file, {
        category: "covers",
        width: 600,
        height: 900,
      });

      setCoverImageUrl(uploadResult.url);
      showToast({
        title: "Kapak yuklendi",
        description: "Kapak gorseli 2:3 oraninda optimize edildi.",
        tone: "success",
      });
    } catch (error) {
      setCoverImageUrl(null);

      if (error instanceof ApiError) {
        showToast({
          title: "Kapak yuklenemedi",
          description: error.message,
          tone: "error",
        });
      } else {
        showToast({
          title: "Kapak yuklenemedi",
          description: "Beklenmeyen bir hata olustu.",
          tone: "error",
        });
      }
    } finally {
      setIsCoverUploading(false);
    }
  }

  return (
    <main className="relative overflow-hidden">
      <div className="site-shell mx-auto flex min-h-screen flex-col gap-6 px-4 pb-8 pt-28 sm:px-8 sm:pb-12 sm:pt-32">
        {!isLoading && !profile ? (
          <section className="glass-frame rounded-2xl border border-error/30 bg-error/10 p-4 text-sm font-semibold text-error">
            Bu alana erismek icin once giris yapmalisiniz.
          </section>
        ) : null}
        {!isLoading && profile && !canAccess ? (
          <section className="glass-frame rounded-2xl border border-error/30 bg-error/10 p-4 text-sm font-semibold text-error">
            Bu alan sadece yazar veya yonetici rollerine aciktir.
          </section>
        ) : null}
        {canAccess && loadError ? (
          <section className="glass-frame rounded-2xl border border-error/30 bg-error/10 p-4 text-sm font-semibold text-error">
            {loadError}
          </section>
        ) : null}

        <section className="space-y-3">
          <nav className="flex items-center gap-2 text-xs font-semibold text-base-content/60">
            <Link href="/" className="transition-colors hover:text-primary">
              Anasayfa
            </Link>
            <span className="opacity-40">-</span>
            <Link href="/author" className="transition-colors hover:text-primary">
              Yazar Paneli
            </Link>
            <span className="opacity-40">-</span>
            <span className="text-base-content/90">Yeni Kitap</span>
          </nav>

          <Link href="/author" className="inline-flex items-center gap-1 text-sm font-semibold text-base-content/65 hover:text-primary">
            <ChevronLeft className="h-4 w-4" />
            Yazar Paneline Don
          </Link>
          <h1 className="text-[clamp(2rem,5vw,3.2rem)] font-black leading-[1] tracking-tight">Yeni Hikayene Basla</h1>
          <p className="text-sm text-base-content/65">
            Hayal gucunu kagida dokme zamani geldi. Kitap detaylarini doldur ve ilk bolumunu yazmaya hazirlan.
          </p>
        </section>

        {canAccess ? (
          <section className="glass-frame grid gap-5 rounded-[2rem] border border-base-content/12 bg-gradient-to-br from-base-100/40 via-base-100/26 to-primary/8 p-5 lg:grid-cols-[260px_minmax(0,1fr)_280px]">
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
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleCoverUpload(file);
                  }
                  event.target.value = "";
                }}
              />
              {coverPreviewUrl ? (
                <div className="relative h-full w-full overflow-hidden rounded-2xl">
                  <Image
                    src={coverPreviewUrl}
                    alt="Kapak onizleme"
                    fill
                    className={`object-cover transition ${isCoverUploading ? "scale-[1.02] opacity-70" : ""}`}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent px-4 pb-4 pt-10 text-left text-white">
                    <p className="text-sm font-black">Kapak hazir</p>
                    <p className="mt-1 text-xs text-white/72">
                      {isCoverUploading ? "Yukleniyor..." : "Tekrar tiklayip degistirebilirsiniz"}
                    </p>
                  </div>
                  {isCoverUploading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/22">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-base-100/84 text-primary shadow-xl">
                        <LoaderCircle className="h-5 w-5 animate-spin" />
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-base-100/35 text-primary">
                    {isCoverUploading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                  </span>
                  <div>
                    <p className="text-sm font-extrabold">Resim Secin veya Surukleyin</p>
                    <p className="mt-1 text-xs text-base-content/56">PNG, JPG, GIF, WEBP</p>
                  </div>
                </>
              )}
            </button>
            <p className="mt-2 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/42">
              2:3 oran, onerilen 600x900
            </p>

            <div className="mt-4 space-y-3">
              <label className="flex flex-col gap-1.5">
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
              </label>
            </div>
          </aside>

          <section className="rounded-3xl border border-base-content/10 bg-base-100/18 p-4">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-base-content/50">Genel Bilgiler</p>
            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                <label className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-xs font-black uppercase tracking-[0.1em] text-base-content/52">Baslik</span>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Hikayenizin Buyuleyici Basligi"
                    className="input input-bordered h-12 w-full rounded-xl border-base-content/12 bg-base-100/20"
                  />
                </label>

                <label className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-xs font-black uppercase tracking-[0.1em] text-base-content/52">URL Uzantisi (Slug) - Otomatik</span>
                  <input
                    type="text"
                    readOnly
                    value={computedSlug ? `epiknovel.com/book/${computedSlug}` : ""}
                    placeholder="epiknovel.com/book/kitap-adiniz"
                    className="input input-bordered h-12 w-full rounded-xl border-base-content/12 bg-base-100/16 text-base-content/65"
                  />
                </label>
              </div>

              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-xs font-black uppercase tracking-[0.1em] text-base-content/52">Hakkinda / Ozet</span>
                <textarea
                  rows={11}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Hikayenizin kalbini okuyuculara acin..."
                  className="textarea textarea-bordered min-h-[18rem] w-full rounded-xl border-base-content/12 bg-base-100/20"
                />
              </label>

              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-xs font-black uppercase tracking-[0.1em] text-base-content/52">Anahtar Kelimeler / Etiketler</span>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="fantastik, macera, intikam (virgulle ayirin)"
                  className="input input-bordered h-12 w-full rounded-xl border-base-content/12 bg-base-100/20"
                />
                {tagSuggestions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {tagSuggestions.slice(0, 18).map((tagItem) => {
                      const alreadySelected = parsedTags.some(
                        (item) => item.toLocaleLowerCase("tr-TR") === tagItem.name.toLocaleLowerCase("tr-TR"),
                      );

                      return (
                        <button
                          key={tagItem.id}
                          type="button"
                          onClick={() => {
                            if (alreadySelected) {
                              return;
                            }

                            setTags((current) => (current.trim() ? `${current}, ${tagItem.name}` : tagItem.name));
                          }}
                          className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                            alreadySelected
                              ? "bg-primary/12 text-primary"
                              : "bg-base-100/35 text-base-content/68 hover:text-primary"
                          }`}
                        >
                          #{tagItem.name}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </label>
            </div>
          </section>

          <aside className="flex flex-col rounded-3xl border border-base-content/10 bg-base-100/18 p-4">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-base-content/50">Kategoriler</p>
            {isMetadataLoading ? (
              <div className="rounded-2xl border border-base-content/12 bg-base-100/16 px-4 py-8 text-center text-sm font-semibold text-base-content/55">
                Kategoriler yukleniyor...
              </div>
            ) : (
              <div className="flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar leading-none">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-bold transition ${
                    selectedCategories.includes(category.id)
                      ? "border-primary/45 bg-primary/14 text-primary"
                      : "border-base-content/12 bg-base-100/16 text-base-content/82 hover:border-primary/30"
                  }`}
                >
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px]">
                    {selectedCategories.includes(category.id) ? "•" : ""}
                  </span>
                  {category.name}
                </button>
              ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleCreateBook()}
              disabled={isSubmitting || isMetadataLoading}
              className="btn btn-primary mt-6 h-12 w-full rounded-2xl text-base font-black tracking-wide shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 active:scale-95"
            >
              {isSubmitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : "YOLCULUGA BASLA"}
            </button>
          </aside>
          </section>
        ) : null}
      </div>
    </main>
  );
}
