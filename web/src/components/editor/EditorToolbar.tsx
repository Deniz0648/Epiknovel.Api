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
