"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Search, X, Loader2, Book, User, ArrowRight, CornerDownLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";
import { getHeaderOverlayEventName, type HeaderOverlayName } from "@/lib/header-overlays";

type SearchResult = {
  results: Array<{
    id: string;
    referenceId: string;
    type: number; // 0=Book, 1=User, 2=Category, 3=Tag
    title: string;
    description: string;
    slug: string;
    imageUrl?: string | null;
  }>;
};

export function SearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult["results"]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Handle global shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Sync with HeaderOverlay events
  useEffect(() => {
    const handleOverlayOpen = (event: Event) => {
      const customEvent = event as CustomEvent<HeaderOverlayName>;
      if (customEvent.detail === "search") {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    window.addEventListener(getHeaderOverlayEventName(), handleOverlayOpen);
    return () => window.removeEventListener(getHeaderOverlayEventName(), handleOverlayOpen);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Handle Search API
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await apiRequest<SearchResult>(`/search?q=${encodeURIComponent(query)}&size=10`);
        setResults(data.results);
        setSelectedIndex(-1);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleNavigate = (item: SearchResult["results"][number]) => {
    if (item.type === 0) { // Book
      router.push(`/Books/${item.slug}`);
    } else if (item.type === 1) { // User/Author
      router.push(`/profile/${item.slug}`); // Or wherever the profile page is
    } else {
      router.push(`/Books?search=${encodeURIComponent(item.title)}`);
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      handleNavigate(results[selectedIndex]);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-[100] bg-base-300/40 backdrop-blur-md"
          />

          {/* Modal Container */}
          <div 
            className="fixed inset-0 z-[101] flex items-start justify-center p-4 pt-[10vh] sm:p-6 sm:pt-[15vh]"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="glass-frame w-full max-w-2xl overflow-hidden bg-base-100/95 shadow-2xl"
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search Input Area */}
              <div className="relative flex items-center border-b border-base-content/10 px-4 py-4 sm:px-6">
                <Search className="h-5 w-5 shrink-0 text-base-content/40" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Kitap, yazar veya kategori ara..."
                  className="w-full bg-transparent px-4 text-base font-semibold outline-none placeholder:text-base-content/30 sm:text-lg"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : query ? (
                    <button
                      onClick={() => setQuery("")}
                      className="rounded-full p-1 transition hover:bg-base-content/10"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : (
                    <kbd className="hidden h-5 min-w-8 items-center justify-center rounded border border-base-content/18 bg-base-100/50 px-1 text-[10px] font-black text-base-content/42 shadow-sm sm:flex">
                      ESC
                    </kbd>
                  )}
                </div>
              </div>

              {/* Results Area */}
              <div className="overlay-scroll-region max-h-[60vh] overflow-y-auto p-2">
                {query.length > 0 && results.length === 0 && !isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 rounded-full bg-base-200/50 p-4">
                      <Search className="h-8 w-8 text-base-content/20" />
                    </div>
                    <p className="text-sm font-bold text-base-content/60">Sonuç bulunamadı</p>
                    <p className="mt-1 text-xs text-base-content/40">Farklı bir anahtar kelime deneyin.</p>
                  </div>
                ) : results.length > 0 ? (
                  <div className="space-y-1">
                    <p className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-base-content/30">
                      Sonuçlar ({results.length})
                    </p>
                    {results.map((item, index) => (
                      <button
                        key={`${item.type}-${item.id}`}
                        onMouseEnter={() => setSelectedIndex(index)}
                        onClick={() => handleNavigate(item)}
                        className={`group flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left transition-all ${
                          index === selectedIndex
                            ? "bg-primary text-primary-content shadow-lg shadow-primary/20"
                            : "hover:bg-base-content/5"
                        }`}
                      >
                        <div className={`relative h-12 w-9 shrink-0 overflow-hidden shadow-sm ${item.type === 1 ? "rounded-full" : "rounded-md bg-base-300"}`}>
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              {item.type === 1 ? (
                                <User className="h-5 w-5 opacity-20" />
                              ) : (
                                <Book className="h-4 w-4 opacity-20" />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className={`truncate text-sm font-bold sm:text-base ${
                              index === selectedIndex ? "text-primary-content" : "text-base-content/90"
                            }`}>
                              {item.title}
                            </h4>
                            <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase ${
                              index === selectedIndex 
                                ? "bg-primary-content/20 text-primary-content" 
                                : "bg-base-content/10 text-base-content/50"
                            }`}>
                              {item.type === 0 ? "Kitap" : item.type === 1 ? "Yazar" : item.type === 2 ? "Kategori" : "Etiket"}
                            </span>
                          </div>
                          <p className={`line-clamp-1 text-xs ${
                             index === selectedIndex ? "text-primary-content/70" : "text-base-content/40"
                          }`}>
                            {item.description || "Açıklama bulunmuyor."}
                          </p>
                        </div>
                        <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                          {index === selectedIndex ? (
                            <CornerDownLeft className="h-4 w-4 text-primary-content/60" />
                          ) : (
                            <ArrowRight className="h-4 w-4 text-primary-content" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : !query ? (
                  <div className="p-4 sm:p-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                       <div className="rounded-2xl border border-base-content/5 bg-base-200/30 p-4">
                         <h5 className="text-xs font-black uppercase tracking-wider text-base-content/40">Hızlı Aramalar</h5>
                         <div className="mt-3 flex flex-wrap gap-2">
                           {["Aksiyon", "Romantik", "Fantastik", "Macera"].map(tag => (
                             <button 
                                key={tag} 
                                onClick={() => setQuery(tag)}
                                className="rounded-full bg-base-100 px-3 py-1.5 text-xs font-bold text-base-content/60 border border-base-content/10 hover:border-primary/40 hover:text-primary transition-all"
                              >
                               {tag}
                             </button>
                           ))}
                         </div>
                       </div>
                       <div className="rounded-2xl border border-base-content/5 bg-base-200/30 p-4">
                         <h5 className="text-xs font-black uppercase tracking-wider text-base-content/40">İpucu</h5>
                         <p className="mt-2 text-xs leading-relaxed text-base-content/50">
                           Kitap ismini veya yazar adını yazarak hızlıca bulabilirsiniz.
                         </p>
                       </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-base-content/5 bg-base-200/30 px-4 py-3 sm:px-6">
                 <div className="flex items-center gap-4">
                   <div className="hidden items-center gap-1.5 sm:flex">
                     <kbd className="flex h-5 w-5 items-center justify-center rounded border border-base-content/18 bg-base-100/50 text-[10px] font-black text-base-content/42 shadow-sm">
                       ↑
                     </kbd>
                     <kbd className="flex h-5 w-5 items-center justify-center rounded border border-base-content/18 bg-base-100/50 text-[10px] font-black text-base-content/42 shadow-sm">
                       ↓
                     </kbd>
                     <span className="text-[10px] font-black uppercase tracking-wider text-base-content/28">Gezin</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                     <kbd className="flex h-5 min-w-[3rem] items-center justify-center rounded border border-base-content/18 bg-base-100/50 px-1.5 text-[10px] font-black text-base-content/42 shadow-sm">
                       ENTER
                     </kbd>
                     <span className="text-[10px] font-black uppercase tracking-wider text-base-content/28">Seç</span>
                   </div>
                 </div>
                 <div className="hidden items-center gap-2 grayscale brightness-150 opacity-15 sm:flex">
                    <span className="text-[10px] font-black tracking-tighter text-base-content uppercase italic">Epiknovel Search</span>
                 </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
