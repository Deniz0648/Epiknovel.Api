"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { GripVertical, Save, LoaderCircle } from "lucide-react";
import { showToast } from "@/lib/toast";

interface Chapter {
  id: string;
  title: string;
  order: number;
  status: number;
  wordCount: number;
  isFree: boolean;
  price: number;
  slug: string;
}

interface ChapterReorderListProps {
  bookId: string;
  bookSlug: string;
  initialChapters: Chapter[];
  onOrderSaved?: () => void;
}

export function ChapterReorderList({ bookId, bookSlug, initialChapters, onOrderSaved }: ChapterReorderListProps) {
  const [items, setItems] = useState<Chapter[]>(initialChapters);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // initialChapters değiştiğinde (yazar yeni bölüm eklediğinde vs) state'i güncelle
    setItems(initialChapters);
  }, [initialChapters]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    setItems(newItems);
    setHasChanges(true);
  };

  const saveOrder = async () => {
    try {
      setIsSaving(true);
      const chapterIds = items.map((c) => c.id);

      const response = await fetch(`/api/books/${bookId}/chapters/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, chapterIds }),
      });

      const result = await response.json();

      if (result.isSuccess) {
        showToast({
          title: "Başarılı",
          description: "Bölüm sıralaması kaydedildi.",
          tone: "success",
        });
        setHasChanges(false);
        if (onOrderSaved) onOrderSaved();
      } else {
        showToast({
          title: "Hata",
          description: result.message || "Sıralama kaydedilemedi.",
          tone: "error",
        });
      }
    } catch (error) {
      showToast({
        title: "Sistem Hatası",
        description: "Sıralama işlemi sırasında bir hata oluştu.",
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2 mb-2">
        <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Görsel Düzenleyici</span>
            <p className="text-[11px] text-base-content/60 italic">Sıralamayı değiştirmek için bölümleri tutun ve kaydırın.</p>
        </div>
        {hasChanges && (
          <button
            onClick={saveOrder}
            disabled={isSaving}
            className="btn btn-primary btn-sm rounded-xl px-4 shadow-lg shadow-primary/20 animate-in fade-in zoom-in"
          >
            {isSaving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Sıralamayı Kaydet
          </button>
        )}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="chapters-list">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="flex flex-col gap-2"
            >
              {items.map((chapter, index) => (
                <Draggable key={chapter.id} draggableId={chapter.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`glass-frame flex items-center justify-between gap-4 p-4 transition-all ${
                        snapshot.isDragging ? "z-50 shadow-2xl scale-[1.02] border-primary/40 bg-base-100/80" : "hover:bg-base-100/40"
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div
                          {...provided.dragHandleProps}
                          className="flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-xl bg-base-100/50 text-base-content/30 cursor-grab active:cursor-grabbing hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <GripVertical className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="font-bold text-base-content/90 truncate max-w-[200px] sm:max-w-md">
                            {chapter.title}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="badge badge-outline border-base-content/10 text-[9px] font-black uppercase tracking-widest text-base-content/40 h-5">
                               {index + 1}. Sıra
                            </div>
                            <span className="text-base-content/30 text-[10px]">|</span>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${
                              chapter.status === 0 ? "text-warning" : 
                              chapter.status === 1 ? "text-success" : 
                              "text-info"
                            }`}>
                              {chapter.status === 0 ? "Taslak" : chapter.status === 1 ? "Yayında" : "Zamanlandı"}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="hidden sm:flex flex-col items-end opacity-40 mr-2">
                            <span className="text-[9px] font-black uppercase tracking-widest">{chapter.wordCount} Kelime</span>
                            <span className="text-[9px] font-bold">{chapter.isFree ? "Ücretsiz" : "Ücretli"}</span>
                        </div>
                        <a 
                          href={`/author/${bookSlug}/chapters/${chapter.slug}/edit`}
                          className="btn btn-ghost btn-sm btn-square rounded-xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                           <FileText size={16} className="text-primary/60" />
                        </a>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

import { FileText } from "lucide-react";
