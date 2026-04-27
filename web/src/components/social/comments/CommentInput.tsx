import React, { useState } from "react";
import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import tippy, { Instance } from "tippy.js";
import { Send, AlertCircle, Loader2 } from "lucide-react";
import { MentionList } from "./MentionList";
import { clsx } from "clsx";

interface CommentInputProps {
  onSubmit: (content: string, isSpoiler: boolean) => Promise<void>;
  placeholder?: string;
  initialContent?: string;
  authorName?: string;
  participants?: string[];
  isSubmitting?: boolean;
  autoFocus?: boolean;
  onCancel?: () => void;
}

export function CommentInput({ 
  onSubmit, 
  placeholder = "Düşüncelerini paylaş...", 
  initialContent = "",
  authorName,
  participants = [],
  isSubmitting = false,
  autoFocus = false,
  onCancel
}: CommentInputProps) {
  const [isSpoiler, setIsSpoiler] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: "text-primary font-bold decoration-primary/30 underline decoration-2 underline-offset-4",
        },
        suggestion: {
          items: ({ query }) => {
            const all = [authorName, ...participants].filter(Boolean) as string[];
            const unique = Array.from(new Set(all));
            return unique
              .filter(item => item.toLowerCase().startsWith(query.toLowerCase()))
              .slice(0, 5);
          },
          render: () => {
            let component: ReactRenderer<any>;
            let popup: Instance[];

            return {
              onStart: (props) => {
                component = new ReactRenderer(MentionList, {
                  props,
                  editor: props.editor,
                });

                if (!props.clientRect) {
                  return;
                }

                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect as any,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'top-start',
                });
              },

              onUpdate(props) {
                component.updateProps(props);

                if (!props.clientRect) {
                  return;
                }

                popup[0].setProps({
                  getReferenceClientRect: props.clientRect as any,
                });
              },

              onKeyDown(props) {
                if (props.event.key === 'Escape') {
                  popup[0].hide();
                  return true;
                }

                return (component.ref as any)?.onKeyDown(props);
              },

              onExit() {
                popup[0].destroy();
                component.destroy();
              },
            };
          },
        },
      }),
    ],
    content: initialContent,
    autofocus: autoFocus ? "end" : false,
    onUpdate: ({ editor }) => {
      // Force a re-render to update the button's disabled state
      setIsEmpty(editor.isEmpty);
    },
  });

  const [isEmpty, setIsEmpty] = useState(editor?.isEmpty ?? true);

  const handleSubmit = async () => {
    if (!editor || editor.isEmpty || isSubmitting) return;
    
    await onSubmit(editor.getHTML(), isSpoiler);
    editor.commands.clearContent();
    setIsSpoiler(false);
    setIsEmpty(true);
  };

  return (
    <div className="flex flex-col gap-3">
      <div 
        className={clsx(
          "relative rounded-2xl border bg-base-100 transition-all duration-300",
          "focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/5",
          "border-base-content/10 overflow-hidden cursor-text"
        )}
        onClick={() => editor?.commands.focus()}
      >
        <EditorContent 
          editor={editor} 
          className="min-h-[100px] p-4 text-sm outline-none prose-sm max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:border-none [&_.ProseMirror]:ring-0 [&_.ProseMirror]:p-0" 
        />
        
        <div className="flex items-center justify-between border-t border-base-content/5 bg-base-200/30 p-2.5">
          <button 
            type="button"
            onClick={() => setIsSpoiler(!isSpoiler)}
            className={clsx(
              "flex items-center gap-2 rounded-xl px-3 py-1.5 transition-all",
              isSpoiler ? "bg-warning/10 text-warning" : "text-base-content/40 hover:bg-base-content/5"
            )}
          >
            <AlertCircle size={14} className={isSpoiler ? "animate-pulse" : ""} />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isSpoiler ? "SPOİLER İÇERİYOR" : "SPOİLER MI?"}
            </span>
          </button>

          <div className="flex items-center gap-2">
            {onCancel && (
              <button 
                onClick={onCancel}
                className="btn btn-ghost btn-sm rounded-xl px-4 text-base-content/40 hover:text-base-content"
              >
                VAZGEÇ
              </button>
            )}
            <button 
              onClick={handleSubmit}
              disabled={!editor || isEmpty || isSubmitting}
              className="btn btn-primary btn-sm rounded-xl px-4 shadow-lg shadow-primary/20"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              GÖNDER
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
