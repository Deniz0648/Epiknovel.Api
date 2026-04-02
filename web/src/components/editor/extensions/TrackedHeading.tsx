import React from 'react'
import { Heading } from '@tiptap/extension-heading'
import { v4 as uuidv4 } from 'uuid'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import { GripVertical } from 'lucide-react'

// Render for the heading node
function HeadingNodeView(props: any) {
  // Extract the level from TipTap attributes
  const level = props.node.attrs.level || 1;

  return (
    <NodeViewWrapper className="group relative">
      <div
        contentEditable={false}
        data-drag-handle
        className="absolute -left-8 top-[0.4rem] opacity-10 group-hover:opacity-40 group-focus-within:opacity-40 transition-opacity cursor-grab active:cursor-grabbing p-1"
      >
        <GripVertical className="h-4 w-4 text-base-content" />
      </div>

      {level === 1 && (
        // @ts-expect-error TipTap NodeViewContent types might not include heading tags but it works perfectly at runtime
        <NodeViewContent as="h1" className="m-0 text-4xl font-black tracking-tight text-base-content leading-tight" />
      )}
      {level === 2 && (
        // @ts-expect-error
        <NodeViewContent as="h2" className="m-0 text-3xl font-bold tracking-tight text-base-content leading-snug" />
      )}
      {level === 3 && (
        // @ts-expect-error
        <NodeViewContent as="h3" className="m-0 text-2xl font-bold text-base-content leading-snug" />
      )}
      {level > 3 && (
        // @ts-expect-error
        <NodeViewContent as="h4" className="m-0 text-xl font-bold text-base-content" />
      )}
    </NodeViewWrapper>
  )
}

export const TrackedHeading = Heading.extend({
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => {
          if (!attributes.id) {
            return {}
          }
          return {
            'data-id': attributes.id,
          }
        },
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(HeadingNodeView)
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('tracked-heading'),
        appendTransaction: (transactions, oldState, newState) => {
          if (!transactions.some(tr => tr.docChanged)) return null;

          const tr = newState.tr;
          let modified = false;
          const ids = new Set<string>();

          // We must check existing IDs across ALL nodes to avoid conflict.
          // Since TrackedParagraph generates IDs too, we shouldn't strictly duplicate IDs anyway.
          
          newState.doc.descendants((node, pos) => {
            if (node.isBlock) {
              const id = node.attrs.id;

              if (id) {
                if (ids.has(id)) {
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    id: uuidv4(),
                  });
                  modified = true;
                } else {
                  ids.add(id);
                }
              } else if (node.type.name === this.name) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  id: uuidv4(),
                });
                modified = true;
              }
            }
          });

          return modified ? tr : null;
        },
      }),
    ]
  },
})
