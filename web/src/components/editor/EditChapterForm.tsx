"use client"

import { useState, useEffect, useRef } from "react"
import { createChapter, updateChapter, deleteChapter } from "@/app/author/[bookSlug]/chapters/actions"
import { useRouter } from "next/navigation"
import { showToast } from "@/lib/toast"
import { Save, ChevronLeft, Type, Zap, Trash2, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { TiptapEditor, TiptapEditorRef, ParagraphData } from "./TiptapEditor"
import { usePublicSettings } from "@/components/providers/realtime-provider"
import { useAuth } from "@/components/providers/auth-provider"
import { slugify } from "@/lib/utils"
import { ShareModal } from "@/components/ui/ShareModal"
import "./tiptap-editor.css"

interface EditChapterFormProps {
  bookId: string
  chapterId?: string
  initialData?: {
    title?: string
    content?: string
    paragraphs?: ParagraphData[]
    order?: number
    status?: number
    publishedAt?: string
    scheduledPublishDate?: string
    isFree?: boolean
    price?: number
    slug?: string
    isTitleSpoiler?: boolean
  }
  nextOrder: number
  bookTitle?: string
  bookType?: number
  bookSlug?: string
}

export function EditChapterForm({ bookId, chapterId, initialData, nextOrder, bookTitle, bookType, bookSlug }: EditChapterFormProps) {
  const { profile } = useAuth()
  const { isEnableEconomy: siteEconomyEnabled } = usePublicSettings()
  
  const authorHasPaidPermission = profile?.permissions?.publishPaidChapters === true
  const canSetPrice = siteEconomyEnabled && authorHasPaidPermission

  const [loading, setLoading] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [enableEconomy, setEnableEconomy] = useState(canSetPrice)
  const [isScheduled, setIsScheduled] = useState(initialData?.status === 2)
  const [publishDate, setPublishDate] = useState<string>(() => {
    // 🕒 LOCAL TIME FORMATTER: UTC'den Yerel Saate Dönüştür
    let dateSource = initialData?.scheduledPublishDate || initialData?.publishedAt
    if (dateSource && typeof dateSource === 'string') {
      // API 'Z' koymamışsa bile biz bunun UTC olduğunu bildiğimiz için zorluyoruz
      if (!dateSource.endsWith('Z') && !dateSource.includes('+')) {
        dateSource += 'Z';
      }
      const d = new Date(dateSource)
      if (!isNaN(d.getTime())) {
        // Yerel saat dilimine göre ISO formatında çıktı al (YYYY-MM-DDTHH:mm)
        const localISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
        return localISO
      }
    }
    return ""
  })
  const [status, setStatus] = useState<number>(initialData?.status ?? 1)
  const [slug, setSlug] = useState(initialData?.slug || "")
  const [isManualSlug, setIsManualSlug] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [isTitleSpoiler, setIsTitleSpoiler] = useState(initialData?.isTitleSpoiler || false)
  const [createdChapterUrl, setCreatedChapterUrl] = useState("")
  const router = useRouter()
  const editorRef = useRef<TiptapEditorRef>(null)

  useEffect(() => {
    setEnableEconomy(canSetPrice)
  }, [canSetPrice])

  useEffect(() => {
    if (initialData?.content) {
      const count = initialData.content.trim().split(/\s+/).filter(w => w).length
      setWordCount(count)
    }
  }, [initialData])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    const paragraphs = editorRef.current?.getParagraphs() || []
    const content = editorRef.current?.getHTML() || ""

    const statusValue = parseInt(formData.get("status") as string)
    const finalStatus = isScheduled ? 2 : statusValue

    const data: any = {
      title: formData.get("title"),
      content: content,
      lines: paragraphs.map(p => ({
        id: p.id,
        order: p.order,
        content: p.content,
        type: p.type
      })),
      order: parseInt(formData.get("order") as string) || (initialData?.order ?? nextOrder),
      status: finalStatus,
      slug: slug,
      isFree: !enableEconomy || formData.get("isFree") === "true",
      price: enableEconomy ? parseInt(formData.get("price") as string || "0") : 0,
      isTitleSpoiler: isTitleSpoiler,
      // 🕒 TIMEZONE FIX: Yerel saati UTC'ye çevirerek gönder
      scheduledPublishDate: isScheduled && publishDate ? new Date(publishDate).toISOString() : null
    }

    // 🛡️ Debug Log: Form Submission State
    console.log('Submitting Form:', { chapterId, isEdit: !!chapterId });

    try {
      if (chapterId) {
        // UPDATE MODE
        const res = await updateChapter(bookSlug || "", chapterId, data)
        if (res.error) {
          showToast({ title: "Hata", description: res.error, tone: "error" })
        } else {
          showToast({ title: "Başarılı", description: "Bölüm başarıyla güncellendi.", tone: "success" })
          setTimeout(() => {
            router.push(`/author/${bookSlug}`)
          }, 1000)
        }
      } else {
        // CREATE MODE
        const res = await createChapter(bookSlug || "", bookId, data)
        if (res.error) {
          showToast({ title: "Hata", description: res.error, tone: "error" })
        } else {
          showToast({ title: "Başarılı", description: "Bölüm başarıyla oluşturuldu.", tone: "success" })
          if (res.slug) {
            setCreatedChapterUrl(`/read/${bookSlug}/${res.slug}`)
            setShowShareModal(true)
          } else {
            router.push(`/author/${bookSlug}`)
          }
        }
      }
    } catch (err: any) {
      showToast({ title: "Sistem Hatası", description: "İşlem sırasında beklenmedik bir hata oluştu.", tone: "error" })
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Generate slug if not manual
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isManualSlug) {
      setSlug(slugify(e.target.value))
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="flex flex-col min-h-[80vh] gap-6 author-page-animate">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-base-100 p-4 rounded-3xl border border-base-200 sticky top-[84px] z-[50] shadow-sm">
          <div className="flex items-center gap-4">
            <Link href={`/author/${bookSlug}`} className="btn btn-ghost btn-circle">
              <ChevronLeft />
            </Link>
            <div>
              <label htmlFor="title" className="sr-only">Bölüm Başlığı</label>
              <input
                id="title"
                type="text"
                name="title"
                placeholder="Bölüm Başlığı"
                className="bg-transparent border-none text-xl font-serif font-bold text-base-content focus:outline-none focus:ring-0 w-full md:w-96"
                defaultValue={initialData?.title}
                onChange={(e) => {
                  handleTitleChange(e)
                }}
                required
              />
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-2 text-[10px] opacity-40 font-bold uppercase tracking-widest">
                  <Type size={12} /> {wordCount} Kelime
                </div>
                <div className="divider divider-horizontal mx-0 h-3 opacity-20"></div>
                <div className="flex items-center gap-1 group">
                  <label htmlFor="chapter-slug-input" className="text-[10px] opacity-30 font-mono">slug:</label>
                  <input
                    id="chapter-slug-input"
                    type="text"
                    value={slug}
                    disabled={!!chapterId}
                    onChange={(e) => {
                      setSlug(e.target.value)
                      setIsManualSlug(true)
                    }}
                    className={`bg-transparent border-none text-[10px] font-mono text-base-content/50 focus:outline-none focus:ring-0 w-48 transition-colors ${chapterId ? 'cursor-not-allowed opacity-50' : 'hover:text-primary'}`}
                    placeholder="bölüm-slug"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setIsTitleSpoiler(!isTitleSpoiler)}
              className={`btn btn-sm btn-square ${isTitleSpoiler ? 'btn-warning' : 'btn-ghost opacity-40 hover:opacity-100'} rounded-xl`}
              title={isTitleSpoiler ? "Başlık Spoiler: GİZLİ" : "Başlık Spoiler: GÖRÜNÜR"}
            >
              {isTitleSpoiler ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary btn-sm flex-1 md:flex-none rounded-xl px-6 shadow-lg shadow-primary/20">
              {loading ? <span className="loading loading-spinner loading-xs"></span> : <><Save size={16} /> {chapterId ? "Güncelle" : "Yayınla"}</>}
            </button>
            {chapterId && (
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-square text-error"
                title="Bölümü Sil"
                onClick={async () => {
                  if (confirm("Bu bölümü silmek istediğinize emin misiniz?")) {
                    setLoading(true)
                    const res = await deleteChapter(bookSlug || "", chapterId)
                    if (res.success) {
                      showToast({ title: "Başarılı", description: "Bölüm silindi.", tone: "success" })
                      router.push(`/author/${bookSlug}`)
                    } else {
                      showToast({ title: "Hata", description: res.error || "Bölüm silinemedi.", tone: "error" })
                      setLoading(false)
                    }
                  }
                }}
                disabled={loading}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
          <div className="lg:col-span-3">
            <div className="mt-4">
              <TiptapEditor
                ref={editorRef}
                initialContent={initialData?.content}
                initialParagraphs={initialData?.paragraphs}
                onWordCountChange={setWordCount}
                placeholder="Burası senin dünyan. Hikayeni yazmaya başla..."
                stickyOffset="top-[180px]"
              />
            </div>
          </div>

          <div className="space-y-6 lg:sticky lg:top-[180px] lg:self-start">
            <div className="card bg-base-100 border border-base-200 shadow-sm rounded-3xl">
              <div className="card-body p-6">
                <h3 className="card-title text-sm font-bold opacity-60 flex items-center gap-2">
                  <Zap size={16} /> BÖLÜM AYARLARI
                </h3>
                <div className="form-control">
                  <label htmlFor="chapter-order" className="label">
                    <span className="label-text font-bold">Bölüm Sırası</span>
                  </label>
                  <input
                    id="chapter-order"
                    type="number"
                    name="order"
                    className="input input-bordered input-sm rounded-lg"
                    defaultValue={initialData?.order ?? nextOrder}
                    required
                  />
                </div>
                
                <div className="space-y-4 mt-4 pt-4 border-t border-base-200">
                  <div className="form-control">
                    <label htmlFor="is-scheduled-checkbox" className="label cursor-pointer justify-start gap-3">
                      <input
                        id="is-scheduled-checkbox"
                        type="checkbox"
                        className="checkbox checkbox-sm checkbox-secondary"
                        checked={isScheduled}
                        onChange={(e) => setIsScheduled(e.target.checked)}
                      />
                      <span className="label-text font-bold uppercase text-xs tracking-wider">İleri Tarihte Yayınla</span>
                    </label>
                  </div>
                  {isScheduled ? (
                    <div className="form-control animate-in fade-in slide-in-from-top-2 duration-300">
                      <label htmlFor="publish-date" className="label">
                        <span className="label-text font-bold">Yayın Tarihi</span>
                      </label>
                      <input
                        id="publish-date"
                        type="datetime-local"
                        className="input input-bordered input-sm rounded-lg"
                        value={publishDate}
                        onChange={(e) => setPublishDate(e.target.value)}
                        required={isScheduled}
                      />
                    </div>
                  ) : (
                    <div className="form-control">
                      <label htmlFor="status" className="label">
                        <span className="label-text font-bold">Yayın Durumu</span>
                      </label>
                      <select
                        id="status"
                        name="status"
                        className="select select-sm select-bordered rounded-lg w-full"
                        value={status}
                        onChange={(e) => setStatus(parseInt(e.target.value))}
                      >
                        <option value={1}>Yayında</option>
                        <option value={0}>Taslak</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className={`mt-6 pt-6 border-t border-base-200 space-y-4 transition-all duration-300 ${!enableEconomy ? 'grayscale opacity-60' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold opacity-60 flex items-center gap-2">
                       <Zap size={16} className="text-warning" /> EKONOMİ
                    </span>
                    {!enableEconomy && (
                      <div className="badge badge-error badge-xs py-2 px-2 text-[10px]">
                        {!siteEconomyEnabled ? "Site Kapalı" : "Yetki Yok"}
                      </div>
                    )}
                  </div>

                  <div className="form-control">
                    <label htmlFor="is-free-checkbox" className="label cursor-pointer justify-start gap-3">
                      <input
                        id="is-free-checkbox"
                        type="checkbox"
                        name="isFree"
                        value="true"
                        className="checkbox checkbox-sm checkbox-primary"
                        defaultChecked={initialData?.isFree ?? true}
                        disabled={!enableEconomy}
                      />
                      <span className="label-text font-bold uppercase text-xs tracking-wider">Ücretsiz Bölüm</span>
                    </label>
                  </div>
                  <div className="form-control">
                    <label htmlFor="chapter-price" className="label">
                      <span className="label-text font-bold">Fiyat (Jeton)</span>
                    </label>
                    <div className="relative">
                      <input
                        id="chapter-price"
                        type="number"
                        name="price"
                        className="input input-bordered input-sm rounded-lg w-full pr-10"
                        placeholder="0"
                        defaultValue={initialData?.price ?? 0}
                        disabled={!enableEconomy}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <Zap size={12} className="text-warning" />
                      </div>
                    </div>
                  </div>
                  {!enableEconomy && (
                    <div className="bg-error/10 p-2 rounded-lg border border-error/20">
                      <p className="text-[10px] text-error leading-relaxed">
                        {!siteEconomyEnabled 
                          ? "Platform genelinde ücretli içerikler şu an devre dışı." 
                          : "Ücretli içerik yayınlamak için 'Cüzdan Sistemi' yetkiniz yok."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="alert alert-info shadow-sm rounded-3xl text-xs font-medium">
              <div>
                <strong>İpucu:</strong> Her paragraf benzersiz bir ID ile takip edilir. Yorumlar paragrafları sıra değişse bile doğru şekilde takip eder.
              </div>
            </div>
          </div>
        </div>
      </form>
      <ShareModal
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false)
          router.push(`/author/${bookSlug}`)
        }}
        title="Yeni Bölüm Yayında!"
        text={`${bookTitle || 'Kitabıma'} yeni bir bölüm ekledim! Okumak isterseniz aşağıdaki bağlantıya tıklayabilirsiniz.`}
        url={createdChapterUrl}
      />
    </>
  )

}
