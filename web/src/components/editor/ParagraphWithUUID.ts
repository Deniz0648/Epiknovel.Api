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
