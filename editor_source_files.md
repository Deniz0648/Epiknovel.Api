# Editör Sayfası Kodları

Aşağıda **EpikNovel** projesinde kullanılan, bölüm oluşturma ve düzenleme işlemlerini gerçekleştiren gelişmiş **Tiptap** editörünün tüm kodlarını bulabilirsiniz. Başka bir projede aynı yapıyı kurmak için bu dosyaları ilgili dizinlere kopyalayabilirsiniz.

## 1. EditChapterForm.tsx
Bölüm oluşturma ve editleme formunu barındıran üst (wrapper) bileşen.

```tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { createChapter, updateChapter, deleteChapter } from "../actions"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Save, ChevronLeft, Type, Zap, Trash2, AlertCircle, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { TiptapEditor, TiptapEditorRef, ParagraphData } from "./editor"
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

    const data = {
      title: formData.get("title"),
      content: content,
      paragraphs: paragraphs.map(p => ({
        id: p.id,
        order: p.order,
        content: p.content
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
          const finalSlug = slug || result?.chapterId
          const finalBookSlug = bookSlug || bookId
          setCreatedChapterUrl(`${baseUrl}/books/${finalBookSlug}/${finalSlug}`)
          setShowShareModal(true)

          toast.success("Bölüm başarıyla yayınlandı!")
          window.sessionStorage.setItem('pendingRedirect', `/write/${bookId}`)
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
      <form onSubmit={onSubmit} className="flex flex-col min-h-[80vh] gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-base-100 p-4 rounded-3xl border border-base-200 sticky top-[64px] z-[20] shadow-sm">
          <div className="flex items-center gap-4">
            <Link href={`/write/${bookId}`} className="btn btn-ghost btn-circle">
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
                    await deleteChapter(bookId, chapterId)
                    router.push(`/write/${bookId}`)
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
                stickyOffset="top-[149px]"
              />
            </div>
          </div>

          <div className="space-y-6 lg:sticky lg:top-[149px] lg:self-start">
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
```

---

## 2. editor/TiptapEditor.tsx
Zengin metin editörünü oluşturan çekirdek bileşen.

```tsx
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import DropCursor from '@tiptap/extension-dropcursor'
import { CustomParagraph, CustomHeading, CustomBlockquote, CustomCodeBlock, CustomBulletList, CustomOrderedList, CustomListItem, BlockUUIDManager } from './ParagraphWithUUID'
import Underline from '@tiptap/extension-underline'
import { EditorToolbar } from './EditorToolbar'
import { useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { DOMSerializer } from '@tiptap/pm/model'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import './tiptap-editor.css'

export interface ParagraphData {
    id: string
    order: number
    content: string
}

export interface TiptapEditorRef {
    getHTML: () => string
    getParagraphs: () => ParagraphData[]
    getTextContent: () => string
}

interface TiptapEditorProps {
    initialContent?: string
    initialParagraphs?: ParagraphData[]
    onChange?: (html: string) => void
    onWordCountChange?: (count: number) => void
    placeholder?: string
    stickyOffset?: string
}

export const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(
    ({ initialContent, initialParagraphs, onChange, onWordCountChange, placeholder, stickyOffset = "top-16" }, ref) => {
        const getInitialHTML = useCallback(() => {
            if (initialParagraphs && initialParagraphs.length > 0) {
                return initialParagraphs
                    .sort((a, b) => a.order - b.order)
                    .map(p => p.content)
                    .join('')
            }
            if (initialContent) {
                if (initialContent.includes('<p>') || initialContent.includes('<h') || initialContent.includes('<blockquote') || initialContent.includes('<pre')) {
                    return initialContent
                }
                return initialContent
                    .split('\n')
                    .map(line => line.trim() ? `<p>${line}</p>` : '<p><br></p>')
                    .join('')
            }
            return '<p></p>'
        }, [initialContent, initialParagraphs])

        const editor = useEditor({
            extensions: [
                StarterKit.configure({
                    paragraph: false,
                    heading: false,
                    blockquote: false,
                    codeBlock: false,
                    bulletList: false,
                    orderedList: false,
                    listItem: false,
                    dropcursor: false,
                    underline: false,
                    link: false,
                }),
                CustomParagraph,
                CustomHeading,
                CustomBlockquote,
                CustomCodeBlock,
                CustomBulletList,
                CustomOrderedList,
                CustomListItem,
                Underline,
                BlockUUIDManager,
                DropCursor.configure({
                    width: 2,
                    color: 'oklch(var(--p))',
                    class: 'drop-cursor',
                }),
                TextAlign.configure({
                    types: ['heading', 'paragraph'],
                }),
                Link.configure({
                    openOnClick: false,
                    HTMLAttributes: {
                        class: 'text-primary underline'
                    }
                }),
            ],
            content: getInitialHTML(),
            editorProps: {
                attributes: {
                    class: 'tiptap-editor-content prose prose-lg max-w-none prose-headings:font-serif prose-headings:font-bold prose-a:text-primary focus:outline-none min-h-[500px] p-6 pl-12', 
                },
            },
            onUpdate: ({ editor }) => {
                const html = editor.getHTML()
                onChange?.(html)
                const text = editor.getText()
                const wordCount = text.trim().split(/\s+/).filter(w => w).length
                onWordCountChange?.(wordCount)
            },
        })

        useImperativeHandle(ref, () => ({
            getHTML: () => editor?.getHTML() || '',
            getTextContent: () => editor?.getText() || '',
            getParagraphs: () => {
                if (!editor) return []
                const paragraphs: ParagraphData[] = []
                let order = 0
                const serializer = DOMSerializer.fromSchema(editor.schema)

                editor.state.doc.forEach((node, offset) => {
                    const type = node.type.name
                    if (['paragraph', 'heading', 'blockquote', 'codeBlock', 'bulletList', 'orderedList'].includes(type) || node.isBlock) {
                        let uuid = node.attrs.uuid
                        const dom = serializer.serializeNode(node)
                        const tmp = document.createElement('div')
                        tmp.appendChild(dom)
                        let html = tmp.innerHTML

                        if (html === '<p></p>') {
                            html = '<p><br></p>'
                        }

                        if (!uuid) {
                            const match = html.match(/data-uuid="([^"]+)"/)
                            uuid = match ? match[1] : uuidv4()
                        }

                        paragraphs.push({
                            id: uuid,
                            order: order++,
                            content: html,
                        })
                    }
                })

                return paragraphs
            },
        }), [editor])

        useEffect(() => {
            if (editor && !editor.isDestroyed) {
                const currentHTML = editor.getHTML()
                const newHTML = getInitialHTML()

                if (currentHTML !== newHTML && !editor.isFocused) {
                    editor.commands.setContent(newHTML)
                }
            }
        }, [editor, getInitialHTML])

        if (!editor) {
            return (
                <div className="w-full min-h-[600px] flex items-center justify-center bg-base-100 rounded-3xl border border-base-200">
                    <span className="loading loading-spinner loading-lg"></span>
                </div>
            )
        }

        return (
            <div className="tiptap-editor-wrapper w-full mb-4 border border-base-200 rounded-3xl bg-base-100 relative shadow-sm overflow-visible">
                <div className={`sticky ${stickyOffset} z-30 bg-base-100 border-b border-base-200 rounded-t-3xl transition-shadow duration-300 shadow-sm`}>
                    <EditorToolbar editor={editor} />
                </div>
                <div className="relative bg-base-100 rounded-b-[32px]">
                    <EditorContent editor={editor} />
                    {editor.isEmpty && placeholder && (
                        <div className="absolute top-6 left-12 text-gray-400 pointer-events-none font-serif text-lg">
                            {placeholder}
                        </div>
                    )}
                </div>
            </div>
        )
    }
)

TiptapEditor.displayName = 'TiptapEditor'

export default TiptapEditor
```

---

## 3. editor/EditorToolbar.tsx
Tiptap düzenleyici için üst kısmında yer alan, formatting vb. eylemleri içeren menü.

```tsx
'use client'

import { useState, useCallback } from 'react'
import { Editor } from '@tiptap/react'
import {
    Bold, Italic, Strikethrough, List, ListOrdered, Heading1, Heading2,
    Heading3, Quote, SquareCode, Undo, Redo, Minus, AlignLeft,
    AlignCenter, AlignRight, AlignJustify, Underline as UnderlineIcon,
    Link as LinkIcon, X, Check
} from 'lucide-react'

interface EditorToolbarProps {
    editor: Editor
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
    const [linkUrl, setLinkUrl] = useState('')
    const [linkText, setLinkText] = useState('')

    if (!editor) return null

    const openLinkDialog = () => {
        const { from, to } = editor.state.selection
        const selectedText = editor.state.doc.textBetween(from, to, ' ')
        const previousUrl = editor.getAttributes('link').href || ''

        setLinkUrl(previousUrl)
        setLinkText(selectedText)
        setIsLinkDialogOpen(true)
    }

    const insertLink = useCallback(() => {
        if (!linkUrl) {
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
        } else {
            const { from, to } = editor.state.selection
            const isTextSelected = from !== to

            if (linkText && (!isTextSelected || linkText !== editor.state.doc.textBetween(from, to, ' '))) {
                editor.chain().focus().insertContent(`<a href="${linkUrl}">${linkText}</a>`).run()
            } else {
                editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run()
            }
        }
        setIsLinkDialogOpen(false)
        setLinkUrl('')
        setLinkText('')
    }, [editor, linkUrl, linkText])

    const ToolbarButton = ({ onClick, isActive, disabled, children, title }: any) => (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`p-2 text-gray-500 rounded cursor-pointer hover:text-gray-900 hover:bg-gray-100 ${isActive ? 'bg-gray-200 text-gray-900' : ''}`}
        >
            {children}
        </button>
    )

    const ToolbarDivider = () => (
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
    )

    return (
        <div className="flex flex-col border-b border-base-200 bg-base-100/95 backdrop-blur-md rounded-t-3xl">
            <div className="flex flex-wrap items-center gap-1 px-4 py-3">
                <div className="flex items-center gap-1">
                    <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Kalın (Ctrl+B)">
                        <Bold size={18} />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="İtalik (Ctrl+I)">
                        <Italic size={18} />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Altı Çizili (Ctrl+U)">
                        <UnderlineIcon size={18} />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Üstü Çizili">
                        <Strikethrough size={18} />
                    </ToolbarButton>
                    <ToolbarButton onClick={openLinkDialog} isActive={editor.isActive('link')} title="Bağlantı Ekle">
                        <LinkIcon size={18} />
                    </ToolbarButton>
                </div>

                <ToolbarDivider />

                <div className="flex items-center gap-1">
                    <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="Başlık 1">
                        <Heading1 size={18} />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Başlık 2">
                        <Heading2 size={18} />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="Başlık 3">
                        <Heading3 size={18} />
                    </ToolbarButton>
                </div>

                <ToolbarDivider />

                <div className="flex items-center gap-1">
                    <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Madde İşaretli Liste">
                        <List size={18} />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Numaralı Liste">
                        <ListOrdered size={18} />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Alıntı">
                        <Quote size={18} />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} title="Kod Bloğu">
                        <SquareCode size={18} />
                    </ToolbarButton>
                </div>

                <ToolbarDivider />

                <div className="flex items-center gap-1">
                    <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="Sola Hizala">
                        <AlignLeft size={18} />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="Ortala">
                        <AlignCenter size={18} />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="Sağa Hizala">
                        <AlignRight size={18} />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} title="İki Yana Yasla">
                        <AlignJustify size={18} />
                    </ToolbarButton>
                </div>

                <ToolbarDivider />

                <div className="flex items-center gap-1">
                    <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Yatay Çizgi">
                        <Minus size={18} />
                    </ToolbarButton>
                </div>

                <ToolbarDivider />

                <div className="flex items-center gap-1">
                    <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Geri Al (Ctrl+Z)">
                        <Undo size={18} />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Yinele (Ctrl+Y)">
                        <Redo size={18} />
                    </ToolbarButton>
                </div>
            </div>

            {isLinkDialogOpen && (
                <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-base-200/50 border-t border-base-200 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
                        <label htmlFor="linkText" className="text-xs font-bold opacity-50 uppercase min-w-[60px]">Metin:</label>
                        <input
                            id="linkText"
                            name="linkText"
                            type="text"
                            placeholder="Görüntülenecek metin"
                            className="input input-sm input-bordered rounded-lg flex-grow sm:w-40 bg-base-100"
                            value={linkText}
                            onChange={(e) => setLinkText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && insertLink()}
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
                        <label htmlFor="linkUrl" className="text-xs font-bold opacity-50 uppercase min-w-[60px]">Link (URL):</label>
                        <input
                            id="linkUrl"
                            name="linkUrl"
                            type="text"
                            placeholder="https://example.com"
                            className="input input-sm input-bordered rounded-lg flex-grow sm:w-64 bg-base-100"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && insertLink()}
                            autoFocus
                        />
                    </div>
                    <div className="flex items-center gap-1 ml-auto">
                        <button onClick={insertLink} className="btn btn-sm btn-primary btn-square rounded-lg" title="Onayla">
                            <Check size={16} />
                        </button>
                        <button onClick={() => setIsLinkDialogOpen(false)} className="btn btn-sm btn-ghost btn-square rounded-lg" title="İptal">
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default EditorToolbar
```

---

## 4. editor/ParagraphWithUUID.ts
Her paragrafta sürükle-bırak desteği ve yorumlar için benzersiz UUID sağlayan Tiptap eklentisi.

```typescript
import { Extension, mergeAttributes } from '@tiptap/core'
import Paragraph from '@tiptap/extension-paragraph'
import Heading from '@tiptap/extension-heading'
import Blockquote from '@tiptap/extension-blockquote'
import CodeBlock from '@tiptap/extension-code-block'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import { v4 as uuidv4 } from 'uuid'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { DraggableBlock } from './DraggableBlock'

export const CustomParagraph = Paragraph.extend({
    draggable: true,
    addNodeView() {
        return ReactNodeViewRenderer(DraggableBlock)
    },
    renderHTML({ HTMLAttributes }) {
        return ['p', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { class: 'text-lg leading-relaxed mb-4 min-h-[1.5em]' }), 0]
    },
    addAttributes() {
        return {
            ...this.parent?.(),
            uuid: {
                default: null,
                parseHTML: element => element.getAttribute('data-uuid') || uuidv4(),
                renderHTML: attributes => {
                    return {
                        'data-uuid': attributes.uuid || uuidv4(),
                    }
                },
            },
        }
    },
})

export const CustomHeading = Heading.extend({
    draggable: true,
    addNodeView() {
        return ReactNodeViewRenderer(DraggableBlock)
    },
    renderHTML({ node, HTMLAttributes }) {
        const hasLevel = this.options.levels.includes(node.attrs.level)
        const level = hasLevel ? node.attrs.level : this.options.levels[0]

        let classes = 'font-bold'
        if (level === 1) classes = 'text-4xl mt-8 mb-4 font-black'
        else if (level === 2) classes = 'text-2xl font-semibold mt-6 mb-3'
        else if (level === 3) classes = 'text-xl font-semibold mt-5 mb-2'

        return [`h${level}`, mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { class: classes }), 0]
    },
    addAttributes() {
        return { ...this.parent?.(), uuid: { default: null, parseHTML: element => element.getAttribute('data-uuid') || uuidv4(), renderHTML: attributes => ({ 'data-uuid': attributes.uuid || uuidv4() }) } }
    },
})

export const CustomBlockquote = Blockquote.extend({
    draggable: true,
    addNodeView() { return ReactNodeViewRenderer(DraggableBlock) },
    renderHTML({ HTMLAttributes }) { return ['blockquote', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { class: 'text-lg italic border-l-4 border-base-300 pl-4 my-4 opacity-80' }), 0] },
    addAttributes() { return { ...this.parent?.(), uuid: { default: null, parseHTML: element => element.getAttribute('data-uuid') || uuidv4(), renderHTML: attributes => ({ 'data-uuid': attributes.uuid || uuidv4() }) } } },
})

export const CustomCodeBlock = CodeBlock.extend({
    draggable: true,
    addNodeView() { return ReactNodeViewRenderer(DraggableBlock) },
    renderHTML({ HTMLAttributes }) { return ['pre', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { class: 'font-mono text-sm bg-base-200 p-4 rounded-lg my-4 overflow-x-auto' }), ['code', {}, 0]] },
    addAttributes() { return { ...this.parent?.(), uuid: { default: null, parseHTML: element => element.getAttribute('data-uuid') || uuidv4(), renderHTML: attributes => ({ 'data-uuid': attributes.uuid || uuidv4() }) } } },
})

export const CustomBulletList = BulletList.extend({
    draggable: true,
    addNodeView() { return ReactNodeViewRenderer(DraggableBlock) },
    addAttributes() { return { ...this.parent?.(), uuid: { default: null, parseHTML: element => element.getAttribute('data-uuid') || uuidv4(), renderHTML: attributes => ({ 'data-uuid': attributes.uuid || uuidv4() }) } } },
})

export const CustomOrderedList = OrderedList.extend({
    draggable: true,
    addNodeView() { return ReactNodeViewRenderer(DraggableBlock) },
    addAttributes() { return { ...this.parent?.(), uuid: { default: null, parseHTML: element => element.getAttribute('data-uuid') || uuidv4(), renderHTML: attributes => ({ 'data-uuid': attributes.uuid || uuidv4() }) } } },
})

export const CustomListItem = ListItem.extend({
    addAttributes() { return { ...this.parent?.(), uuid: { default: null, parseHTML: element => element.getAttribute('data-uuid') || uuidv4(), renderHTML: attributes => ({ 'data-uuid': attributes.uuid || uuidv4() }) } } },
})

export const BlockUUIDManager = Extension.create({
    name: 'blockUUIDManager',

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('blockUUIDManager'),
                appendTransaction: (transactions, oldState, newState) => {
                    const { tr } = newState
                    let modified = false
                    const seenUuids = new Set<string>()

                    newState.doc.descendants((node, pos) => {
                        if (['paragraph', 'heading', 'blockquote', 'codeBlock', 'bulletList', 'orderedList', 'listItem'].includes(node.type.name)) {
                            const uuid = node.attrs.uuid

                            if (!uuid || seenUuids.has(uuid)) {
                                tr.setNodeMarkup(pos, undefined, {
                                    ...node.attrs,
                                    uuid: uuidv4(),
                                })
                                modified = true
                            } else {
                                seenUuids.add(uuid)
                            }
                        }
                    })

                    return modified ? tr : null
                },
            }),
        ]
    },
})
```

---

## 5. editor/DraggableBlock.tsx
Sürükle bırak ikonunu (.drag-handle) barındıran yardımcı bileşen.

```tsx
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import { GripVertical } from 'lucide-react'
import React from 'react'

export const DraggableBlock = (props: any) => {
    const isHeading = props.node.type.name === 'heading'
    const isBlockquote = props.node.type.name === 'blockquote'
    const isCodeBlock = props.node.type.name === 'codeBlock'
    const isBulletList = props.node.type.name === 'bulletList'
    const isOrderedList = props.node.type.name === 'orderedList'
    const level = props.node.attrs.level

    let contentClass = 'text-lg leading-relaxed mb-4 min-h-[1.5em]'
    let Tag: any = 'div'

    if (isHeading) {
        if (level === 1) contentClass = 'text-4xl font-bold mt-8 mb-4'
        else if (level === 2) contentClass = 'text-2xl font-semibold mt-6 mb-3'
        else if (level === 3) contentClass = 'text-xl font-semibold mt-5 mb-2'
    } else if (isBlockquote) {
        contentClass = 'text-lg italic border-l-4 border-base-300 pl-4 my-4 opacity-80'
    } else if (isCodeBlock) {
        contentClass = 'font-mono text-sm bg-base-200 p-4 rounded-lg my-4 overflow-x-auto'
    } else if (isBulletList) {
        contentClass = 'list-disc pl-6 mb-4'
        Tag = 'ul'
    } else if (isOrderedList) {
        contentClass = 'list-decimal pl-6 mb-4'
        Tag = 'ol'
    }

    return (
        <NodeViewWrapper className="draggable-item flex items-start gap-2 relative group -ml-12 pl-2" data-node-type={props.node.type.name}>
            <div
                className="drag-handle opacity-50 hover:opacity-100 transition-opacity p-1 cursor-grab active:cursor-grabbing text-base-content/40 hover:text-base-content hover:bg-base-200 rounded mt-1.5"
                contentEditable={false}
                draggable="true"
                data-drag-handle
            >
                <GripVertical size={18} />
            </div>
            <NodeViewContent
                as={Tag}
                className={`flex-1 min-w-0 ${contentClass}`}
                style={{ textAlign: props.node.attrs.textAlign }}
            />
        </NodeViewWrapper>
    )
}
```

---

## 6. editor/tiptap-editor.css
CSS Dosyası. Sürükle bırak göstergelerini vs. stillendiren dosya. Projenizde Global CSS'te de yükleyebilirsiniz.

```css
.tiptap-editor-wrapper {
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: visible;
}

.tiptap-editor-wrapper::before {
    content: '';
    position: absolute;
    left: 48px;
    top: 72px;
    bottom: 24px;
    width: 2px;
    background-color: oklch(var(--b2));
    z-index: 0;
    pointer-events: none;
}

.tiptap-editor-content {
    font-size: var(--reader-font-size, 1.125rem);
    line-height: var(--reader-line-height, 1.8);
}

.tiptap-editor-content p,
.tiptap-editor-content li,
.tiptap-editor-content blockquote {
    font-size: inherit !important;
    line-height: inherit !important;
}

.tiptap-editor-content:focus { outline: none; }

.drag-handle {
    width: 24px;
    height: 24px;
    cursor: grab;
    background-color: oklch(var(--bc) / 0.3);
    mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='9' cy='12' r='1'/%3E%3Ccircle cx='9' cy='5' r='1'/%3E%3Ccircle cx='9' cy='19' r='1'/%3E%3Ccircle cx='15' cy='12' r='1'/%3E%3Ccircle cx='15' cy='5' r='1'/%3E%3Ccircle cx='15' cy='19' r='1'/%3E%3C/svg%3E");
    mask-repeat: no-repeat;
    mask-position: center;
    border-radius: 4px;
    transition: background-color 0.2s;
    z-index: 50;
}

.drag-handle:hover {
    background-color: oklch(var(--p));
    cursor: grabbing;
}

.tiptap-editor-content .drop-cursor {
    background-color: oklch(var(--p));
    width: 2px;
    transition: all 0.2s;
}

[data-node-type="bulletList"] [data-node-type="paragraph"] .drag-handle,
[data-node-type="orderedList"] [data-node-type="paragraph"] .drag-handle,
[data-node-type="blockquote"] [data-node-type="paragraph"] .drag-handle {
    display: none;
}

[data-node-type="bulletList"] [data-node-type="paragraph"].draggable-item,
[data-node-type="orderedList"] [data-node-type="paragraph"].draggable-item,
[data-node-type="blockquote"] [data-node-type="paragraph"].draggable-item {
    margin-left: 0;
    padding-left: 0;
}

.tiptap-editor-content ul { list-style-type: disc; padding-left: 1.5em; }
.tiptap-editor-content ol { list-style-type: decimal; padding-left: 1.5em; }

.tiptap-editor-content ul li::marker,
.tiptap-editor-content ol li::marker { color: oklch(var(--bc)); }

.tiptap-editor-content li p { margin-top: 0.25em; margin-bottom: 0.25em; }
```

---

## 7. Sayfalara Örnek (Create & Edit Sayfaları)

**Yeni Bölüm Oluşturma Sayfası Örneği:** (`app/write/[bookId]/chapters/new/page.tsx`)

```tsx
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { EditChapterForm } from "@/features/write/components/EditChapterForm"
import { getApiUrl } from "@/lib/config"

export const metadata = {
  title: "Yeni Bölüm Yaz | EpikNovel",
}

export default async function NewChapterPage({ params }: { params: Promise<{ bookId: string }> }) {
  const session = await auth() as { user: { id: string }, accessToken: string } | null
  if (!session?.user) redirect("/login")

  const { bookId } = await params
  const apiUrl = getApiUrl()

  let nextOrder = 1
  let bookTitle = ""
  let bookType = 0
  let bookSlug = ""
  try {
    const bookRes = await fetch(`${apiUrl}/Books/${bookId}`, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    })
    if (bookRes.ok) {
      const bookData = await bookRes.json()
      bookTitle = bookData.title
      bookType = bookData.type
      bookSlug = bookData.slug
    }

    const res = await fetch(`${apiUrl}/Books/${bookId}/Chapters?pageSize=10000`, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    })
    if (res.ok) {
      const data = await res.json()
      const chapters = data.items || []
      if (chapters.length > 0) {
        nextOrder = Math.max(...chapters.map((c: { order: number }) => c.order)) + 1
      }
    }
  } catch (err) {
    console.error("Order calculation error:", err)
  }

  return (
    <div className="min-h-screen bg-base-200 py-12">
      <div className="container mx-auto px-4 md:px-8">
        <EditChapterForm bookId={bookId} nextOrder={nextOrder} bookTitle={bookTitle} bookType={bookType} bookSlug={bookSlug} />
      </div>
    </div>
  )
}
```

**Mevcut Bölümü Düzenleme Sayfası Örneği:** (`app/write/[bookId]/chapters/[chapterId]/page.tsx`) (Varsayılan içerik için EditChapterForm'a initialData dolduruluyor)

```tsx
import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { EditChapterForm } from "@/features/write/components/EditChapterForm"
import { getApiUrl } from "@/lib/config"

export const metadata = {
  title: "Bölüm Düzenle | EpikNovel",
}

export default async function EditChapterPage({ params }: { params: Promise<{ bookId: string, chapterId: string }> }) {
  const session = await auth() as { user: { id: string }, accessToken: string } | null
  if (!session?.user) redirect("/login")

  const { bookId, chapterId } = await params
  const apiUrl = getApiUrl()

  // Kitap ve Bölüm bilgilerini fetch edin
  const chapterRes = await fetch(`${apiUrl}/Books/${bookId}/Chapters/${chapterId}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: 'no-store'
  })

  if (!chapterRes.ok) {
    if (chapterRes.status === 404) notFound()
    throw new Error("Bölüm yüklenemedi")
  }

  const chapterData = await chapterRes.json()

  return (
    <div className="min-h-screen bg-base-200 py-12">
      <div className="container mx-auto px-4 md:px-8">
        <EditChapterForm 
            bookId={bookId} 
            chapterId={chapterId} 
            initialData={chapterData} 
            nextOrder={chapterData.order} 
        />
      </div>
    </div>
  )
}
```
