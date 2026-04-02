"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import HardBreak from "@tiptap/extension-hard-break";
import { EditorToolbar } from "./EditorToolbar";
import { TrackedParagraph } from "./extensions/TrackedParagraph";
import { TrackedHeading } from "./extensions/TrackedHeading";

interface RichTextEditorProps {
  initialContent?: any;
  onChange?: (json: any, textCount: number) => void;
  placeholder?: string;
}

export function RichTextEditor({ initialContent, onChange, placeholder = "Burası senin dünyan. Hikayeni yazmaya başla..." }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable default paragraph so our TrackedParagraph takes over
        paragraph: false,
        heading: false, // We will use TrackedHeading instead
        dropcursor: {
          color: '#3b82f6', // Tailwind blue-500
          width: 3,
        },
      }),
      HardBreak.extend({
        addKeyboardShortcuts() {
          return {
            'Mod-Enter': () => this.editor.commands.setHardBreak(),
            'Shift-Enter': () => this.editor.commands.setHardBreak(),
            'Alt-Enter': () => this.editor.commands.setHardBreak(),
          }
        },
      }),
      TrackedParagraph,
      TrackedHeading,
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount.configure({
        limit: null, // No limit, just count words
      })
    ],
    content: initialContent || '',
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-p:text-base-content/70 prose-p:font-serif prose-p:text-lg prose-p:leading-relaxed outline-none min-h-full max-w-none focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getJSON(), editor.storage.characterCount.words());
      }
    },
  });

  return (
    <div className="flex flex-col h-full relative">
      {/* Reusable Toolbar */}
      <EditorToolbar editor={editor} />

      {/* Editor Main Canvas */}
      <div className="flex-1 p-6 sm:pl-10 relative group cursor-text h-full overflow-y-auto">
        
        {/* The TipTap component */}
        <EditorContent editor={editor} className="h-full w-full" />
      </div>
      
      {/* Custom Global CSS overrides for the editor */}
      <style jsx global>{`
        /* Her paragraf arasina bosluk (Shift+Enter br oldugu icin etkilenmez) */
        .tiptap p, .tiptap .react-renderer {
          margin-bottom: 1.5em !important; 
        }

        .tiptap h1, .tiptap h2, .tiptap h3 {
          margin-top: 2rem !important;
          margin-bottom: 1.5rem !important;
          line-height: 1.2 !important;
        }
        
        /* NodeViewWrapper layout adjustments */
        .tiptap .react-renderer {
          position: relative;
        }

        /* Placeholder styling */
        .tiptap p.is-editor-empty:first-child::before {
          color: color-mix(in srgb, currentColor 30%, transparent);
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
