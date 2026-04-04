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
    type: number
}

export interface TiptapEditorRef {
    getHTML: () => string
    getParagraphs: () => ParagraphData[]
    getWordCount: () => number
}

interface TiptapEditorProps {
    initialContent?: string
    initialParagraphs?: ParagraphData[]
    onChange?: (html: string) => void
    onWordCountChange?: (count: number) => void
    placeholder?: string
    stickyOffset?: string
    isSimple?: boolean
    minHeight?: string
}

export const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(
    ({ initialContent, initialParagraphs, onChange, onWordCountChange, placeholder, stickyOffset = "top-16", isSimple = false, minHeight = "500px" }, ref) => {
        const getInitialHTML = useCallback(() => {
            if (initialParagraphs && initialParagraphs.length > 0) {
                return initialParagraphs
                    .sort((a, b) => a.order - b.order)
                    .map(p => {
                        // Inject data-uuid into the tag if it exists
                        if (p.content.includes('>')) {
                            const tagEndIndex = p.content.indexOf('>')
                            const firstTag = p.content.substring(0, tagEndIndex)
                            // Skip if already has uuid
                            if (firstTag.includes('data-uuid')) return p.content
                            
                            return p.content.substring(0, tagEndIndex) + ` data-uuid="${p.id}"` + p.content.substring(tagEndIndex)
                        }
                        return `<p data-uuid="${p.id}">${p.content}</p>`
                    })
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
                    paragraph: isSimple ? undefined : false,
                    heading: isSimple ? undefined : false,
                    blockquote: isSimple ? undefined : false,
                    codeBlock: isSimple ? undefined : false,
                    bulletList: isSimple ? undefined : false,
                    orderedList: isSimple ? undefined : false,
                    listItem: isSimple ? undefined : false,
                    dropcursor: false,
                    underline: false,
                    link: false,
                }),
                ...(!isSimple ? [
                    CustomParagraph,
                    CustomHeading,
                    CustomBlockquote,
                    CustomCodeBlock,
                    CustomBulletList,
                    CustomOrderedList,
                    CustomListItem,
                    BlockUUIDManager,
                    DropCursor.configure({
                        width: 4,
                        color: 'oklch(var(--p))',
                        class: 'drop-cursor',
                    }),
                ] : []),
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
                    class: `tiptap-editor-content prose prose-lg max-w-none prose-headings:font-serif prose-headings:font-bold prose-a:text-primary focus:outline-none p-6 ${isSimple ? 'pl-6' : 'pl-12'}`, 
                    style: `min-height: ${minHeight}`,
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
            getWordCount: () => {
                const text = editor?.getText() || ''
                return text.trim().split(/\s+/).filter(w => !!w).length
            },
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
                            type: 0 // Default to Text (ParagraphType.Text)
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
            <div className={`tiptap-editor-wrapper w-full mb-4 border border-base-200 rounded-3xl bg-base-100 relative shadow-sm overflow-visible ${isSimple ? 'simple-mode' : ''}`}>
                <div className={`sticky ${stickyOffset} z-30 bg-base-100 border-b border-base-200 rounded-t-3xl transition-shadow duration-300 shadow-sm`}>
                    <EditorToolbar editor={editor} isSimple={isSimple} />
                </div>
                <div className="relative bg-base-100 rounded-b-[32px]">
                    <EditorContent editor={editor} />
                    {editor.isEmpty && placeholder && (
                        <div className={`absolute top-6 ${isSimple ? 'left-6' : 'left-12'} text-gray-400 pointer-events-none font-serif text-lg`}>
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
