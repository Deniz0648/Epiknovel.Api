"use client";

import React, { useEffect, useState } from "react";
import { X, Loader2, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/api";

interface LegalDocumentModalProps {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
}

export function LegalDocumentModal({ slug, isOpen, onClose }: LegalDocumentModalProps) {
  const [content, setContent] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && slug) {
      loadDocument();
    }
  }, [isOpen, slug]);

  const loadDocument = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Public endpoint for latest document
      const res = await apiRequest<{ title: string; content: string }>(`/compliance/legal/${slug}`);
      setContent(res.content);
      setTitle(res.title);
    } catch (err: any) {
      setError("Belge yüklenirken bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-base-300/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-base-100 rounded-[2.5rem] shadow-2xl flex flex-col border border-base-content/5 animate-in zoom-in-95 duration-300 overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-base-content/5 flex items-center justify-between shrink-0 bg-base-content/2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black tracking-tight">{title || "Yasal Bilgilendirme"}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-base-content/10 transition-colors"
          >
            <X className="h-5 w-5 opacity-40" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4 opacity-40">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-xs font-black uppercase tracking-widest italic">Belge Getiriliyor...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center space-y-4">
              <div className="text-error font-bold">{error}</div>
              <button
                onClick={loadDocument}
                className="btn btn-sm btn-ghost underline font-black"
              >
                Tekrar Dene
              </button>
            </div>
          ) : (
            <div
              className="prose max-w-none prose-headings:font-black prose-p:leading-relaxed prose-a:text-primary"
              dangerouslySetInnerHTML={{ __html: content || "" }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-base-content/5 bg-base-content/2 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="btn btn-primary rounded-xl px-8 font-black uppercase tracking-widest text-[11px]"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
}
