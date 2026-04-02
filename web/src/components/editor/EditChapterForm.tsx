"use client"

import { useState, useEffect, useRef } from "react"
import { createChapter, updateChapter, deleteChapter } from "@/app/author/[bookSlug]/chapters/actions"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Save, ChevronLeft, Type, Zap, Trash2, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { TiptapEditor, TiptapEditorRef, ParagraphData } from "./TiptapEditor"
import { getApiUrl } from "@/lib/config"
import { slugify } from "@/lib/utils"
import { ShareModal } from "@/components/ui/ShareModal"

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
  const [loading, setLoading] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [enableEconomy, setEnableEconomy] = useState(true)
  const [isScheduled, setIsScheduled] = useState(initialData?.status === 2)
  const [publishDate, setPublishDate] = useState<string>(() => {
    if (initialData?.publishedAt) {
      const d = new Date(initialData.publishedAt)
      if (!isNaN(d.getTime())) {
        return d.toISOString().slice(0, 16)
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
    async function fetchSettings() {
      try {
        const apiUrl = getApiUrl()
        const res = await fetch(`${apiUrl}/Settings/public`)
        if (res.ok) {
          const settings = await res.json()
          if (settings["Economy_EnableWalletSystem"] === "false" || settings["Economy_EnablePurchasing"] === "false") {
            setEnableEconomy(false)
          }
        }
      } catch (e) {
        console.error("Settings fetch error:", e)
      }
    }

    fetchSettings()

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
      order: parseInt(formData.get("order") as string),
      status: finalStatus,
      slug: slug,
      publishedAt: isScheduled ? new Date(publishDate).toISOString() : null,
      isFree: !enableEconomy || formData.get("isFree") === "true",
      price: enableEconomy ? parseInt(formData.get("price") as string || "0") : 0,
      isTitleSpoiler: isTitleSpoiler
    }

    try {
      if (chapterId) {
        const result = await updateChapter(bookId, chapterId, data)
        if (result?.error) toast.error(result.error)
        else {
          toast.success("Bölüm kaydedildi")
          router.refresh()
        }
      } else {
        const result = await createChapter(bookId, data)
        if (result?.error) toast.error(result.error)
        else {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
          const finalSlug = slug || result?.slug || result?.chapterId
          const finalBookSlug = bookSlug || bookId
          setCreatedChapterUrl(`${baseUrl}/books/${finalBookSlug}/${finalSlug}`)
          setShowShareModal(true)

          toast.success("Bölüm başarıyla yayınlandı!")
          window.sessionStorage.setItem('pendingRedirect', `/author/${bookId}`)
        }
      }
    } catch (err: unknown) {
      const error = err as Error
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="flex flex-col min-h-screen gap-6 pt-24 sm:pt-28 pb-12 px-4 max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-base-100 p-4 rounded-3xl border border-base-200 sticky top-24 z-[20] shadow-sm">
          <div className="flex items-center gap-4">
            <Link href={`/author/${bookSlug || bookId}`} className="btn btn-ghost btn-circle">
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
                  if (!isManualSlug && !chapterId) {
                    setSlug(slugify(e.target.value))
                  }
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
                      setSlug(slugify(e.target.value))
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
            <label htmlFor="status" className="sr-only">Yayın Durumu</label>
            <select
              id="status"
              name="status"
              className="select select-sm select-bordered rounded-xl"
              value={status}
              onChange={(e) => setStatus(parseInt(e.target.value))}
            >
              <option value={0}>Taslak</option>
              <option value={1}>Yayında</option>
            </select>
            <button
              type="button"
              onClick={() => setIsTitleSpoiler(!isTitleSpoiler)}
              className={`btn btn-sm btn-square ${isTitleSpoiler ? 'btn-warning' : 'btn-ghost opacity-40 hover:opacity-100'} rounded-xl`}
              title={isTitleSpoiler ? "Başlık Spoiler: GİZLİ" : "Başlık Spoiler: GÖRÜNÜR"}
            >
              {isTitleSpoiler ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary btn-sm flex-1 md:flex-none rounded-xl px-6 shadow-lg shadow-primary/20">
              {loading ? <span className="loading loading-spinner loading-xs"></span> : <><Save size={16} /> Kaydet</>}
            </button>
            {chapterId && (
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-square text-error"
                title="Bölümü Sil"
                onClick={async () => {
                  if (confirm("Bu bölümü silmek istediğinize emin misiniz?")) {
                    setLoading(true)
                    await deleteChapter(bookSlug || bookId, chapterId)
                    router.push(`/author/${bookSlug || bookId}`)
                    toast.success("Bölüm silindi")
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
                stickyOffset="top-36"
              />
            </div>
          </div>

          <div className="space-y-6 lg:sticky lg:top-36 lg:self-start">
            <div className="card bg-base-100 border border-base-200 shadow-sm">
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
                {status === 0 && (
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
                    {isScheduled && (
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
                    )}
                  </div>
                )}
                {enableEconomy && (
                  <>
                    <div className="form-control mt-4">
                      <label htmlFor="is-free-checkbox" className="label cursor-pointer justify-start gap-3">
                        <input
                          id="is-free-checkbox"
                          type="checkbox"
                          name="isFree"
                          value="true"
                          className="checkbox checkbox-sm checkbox-primary"
                          defaultChecked={initialData?.isFree ?? true}
                        />
                        <span className="label-text font-bold uppercase text-xs tracking-wider">Ücretsiz Bölüm</span>
                      </label>
                    </div>
                    <div className="form-control mt-2">
                      <label htmlFor="chapter-price" className="label">
                        <span className="label-text font-bold">Fiyat (Jeton)</span>
                      </label>
                      <input
                        id="chapter-price"
                        type="number"
                        name="price"
                        className="input input-bordered input-sm rounded-lg"
                        placeholder="0"
                        defaultValue={initialData?.price ?? 0}
                      />
                      <div className="label">
                        <span className="label-text-alt text-base-content/40">Kilitliyse kaç jeton gereksin?</span>
                      </div>
                    </div>
                  </>
                )}
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
          const redirectUrl = window.sessionStorage.getItem('pendingRedirect')
          if (redirectUrl) {
            window.sessionStorage.removeItem('pendingRedirect')
            router.push(redirectUrl)
          }
        }}
        title="Yeni Bölüm Yayında!"
        text={`${bookTitle || 'Kitabıma'} yeni bir bölüm ekledim! Okumak isterseniz aşağıdaki bağlantıya tıklayabilirsiniz.`}
        url={createdChapterUrl}
      />
    </>
  )
}
