import { Paragraph } from '@tiptap/extension-paragraph'
import { v4 as uuidv4 } from 'uuid'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import { GripVertical } from 'lucide-react'

// Render for the paragraph node
function ParagraphNodeView() {
  return (
    <NodeViewWrapper className="group relative">
      {/* 
        data-drag-handle: TipTap/ProseMirror understands this attribute 
        and allows dragging the node from this specific handle.
        contentEditable="false": Prevents typing inside the grip icon.
      */}
      <div
        contentEditable={false}
        data-drag-handle
        className="absolute -left-8 top-[0.1rem] opacity-10 group-hover:opacity-40 group-focus-within:opacity-40 transition-opacity cursor-grab active:cursor-grabbing p-1"
      >
        <GripVertical className="h-4 w-4 text-base-content" />
      </div>

      {/* The actual paragraph content goes here */}
      {/* @ts-expect-error NodeViewContent type restriction bypass */}
      <NodeViewContent as="p" className="m-0" />
    </NodeViewWrapper>
  )
}

export const TrackedParagraph = Paragraph.extend({
  // Mark the node as draggable for ProseMirror
  draggable: true,

  addAttributes() {
    return {
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

  // Tell TipTap to render our custom React component as the NodeView
  addNodeView() {
    return ReactNodeViewRenderer(ParagraphNodeView)
  },

  // Ensures IDs are unique on paste & generation
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('tracked-paragraph'),
        appendTransaction: (transactions, oldState, newState) => {
          if (!transactions.some(tr => tr.docChanged)) return null;

          const tr = newState.tr;
          let modified = false;
          const ids = new Set<string>();

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
