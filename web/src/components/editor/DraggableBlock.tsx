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
