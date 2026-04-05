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
        <NodeViewWrapper 
            className="draggable-item flex items-start gap-4 relative group -ml-14 pl-14 pr-4 py-3 rounded-2xl transition-all duration-200 hover:bg-base-100/50 hover:shadow-sm border border-transparent hover:border-base-content/5 mb-1" 
            data-node-type={props.node.type.name}
        >
            <div
                className="drag-handle flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-base-200/50 text-base-content/20 cursor-grab active:cursor-grabbing hover:bg-primary/15 hover:text-primary transition-all duration-200 absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                contentEditable={false}
                draggable="true"
                data-drag-handle
            >
                <GripVertical size={18} />
            </div>
            <NodeViewContent
                as={Tag}
                className={`flex-1 min-w-0 ${contentClass} !mb-0`} 
                style={{ textAlign: props.node.attrs.textAlign }}
            />
        </NodeViewWrapper>
    )
}
