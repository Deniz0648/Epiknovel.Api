"use client";

import Link from "next/link";
import { 
  ChevronLeft, 
  Save, 
  Eye, 
  EyeOff, 
  Zap,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link2,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Minus,
  Undo,
  Redo,
  GripVertical
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { useRouter } from "next/navigation";

export default function NewChapterPage() {
  const params = useParams<{ bookSlug: string }>();
  const bookSlug = params?.bookSlug ?? "";

  const [title, setTitle] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [status, setStatus] = useState("Draft");
  const [isFree, setIsFree] = useState(true);
  const [order, setOrder] = useState(1);
  const [price, setPrice] = useState(0);
  const [editorData, setEditorData] = useState<any>(null);
  const [wordCount, setWordCount] = useState(0);
  const [bookId, setBookId] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const bookResponse = await fetch(`/api/books/${bookSlug}`);
        const bookData = await bookResponse.json();
        if (bookData.isSuccess && isMounted) {
          setBookId(bookData.data.id);
        }

        const chaptersResponse = await fetch(`/api/books/${bookSlug}/chapters?IncludeDrafts=true`);
        const chaptersData = await chaptersResponse.json();
        
        if (chaptersData.isSuccess && isMounted) {
          // Calculate the next order
          const chapters = chaptersData.data?.chapters || chaptersData.data?.items || chaptersData.data || [];
          if (Array.isArray(chapters) && chapters.length > 0) {
            const maxOrder = Math.max(...chapters.map((c: any) => c.order || 0));
            setOrder(maxOrder + 1);
          } else {
            setOrder(1);
          }
        }
      } catch (err) {
        console.error("Failed to load initial book data", err);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [bookSlug]);
  
  // Basic Turkish to English character conversion for slug, then clean up non-alphanumeric
  const slug = title
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  // Convert JSON to DTO on save (Mockup function for now)
  const mapEditorJsonToDto = (json: any) => {
    if (!json || !json.content) return [];

    const renderTipTapTextNode = (node: any): string => {
      if (node.type === "text") {
        let text = node.text || "";
        if (node.marks) {
          for (const mark of node.marks) {
            if (mark.type === "bold") text = `<strong>${text}</strong>`;
            if (mark.type === "italic") text = `<em>${text}</em>`;
            if (mark.type === "strike") text = `<s>${text}</s>`;
          }
        }
        return text;
      }
      if (node.type === "hardBreak") return "<br>";
      return "";
    };
    
    return json.content.map((node: any) => {
      const type = node.type === "heading" ? node.attrs?.level : 0; 
      const content = node.content ? node.content.map(renderTipTapTextNode).join("") : "";

      return {
        id: node.attrs?.id || crypto.randomUUID(), 
        content: content,
        type: type
      };
    });
  };

  const handleSave = async () => {
    if (!bookId) return alert("Kitap bilgisi yüklenemedi.");
    const dtoList = mapEditorJsonToDto(editorData);

    const payload = {
      bookId: bookId,
      title: title,
      order: order, 
      isFree: isFree,
      price: price,
      isTitleSpoiler: isSpoiler,
      status: status === "Draft" ? 0 : status === "Published" ? 1 : 2,
      lines: dtoList
    };

    try {
      const response = await fetch("/api/books/chapters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      if (result.isSuccess) {
        router.push(`/author/${bookSlug}/chapters/${result.data?.slug || slug}/edit`);
      } else {
        alert("Hata: " + result.message);
      }
    } catch (err) {
      alert("Bir ağ hatası oluştu.");
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="site-shell mx-auto flex flex-col gap-6 px-4 pb-12 pt-28 sm:px-8 sm:pt-32 max-w-[1600px]">
        
        {/* Chapter Top Toolbar Area */}
        <section className="glass-frame flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-4 sm:px-6">
          <div className="flex flex-1 items-center gap-6 w-full">
            <Link href={`/author/${bookSlug}`} className="btn btn-circle btn-sm btn-ghost hover:bg-base-content/10" title="Geri Dön">
              <ChevronLeft className="h-5 w-5 text-base-content/70" />
            </Link>
            
            <div className="flex flex-col flex-1">
              <input
                type="text"
                placeholder="Bölüm Başlığı"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent text-2xl font-black text-base-content placeholder:text-base-content/20 focus:outline-none focus:ring-0"
              />
              <div className="flex items-center gap-4 mt-1 text-[10px] font-bold text-base-content/40 uppercase tracking-widest">
                <span className="flex items-center gap-1">
                  <span className="text-base-content/25 uppercase">T</span>
                  <span>{wordCount} KELİME</span>
                </span>
                {slug && (
                  <span className="flex items-center gap-1">
                    <span className="text-base-content/25 normal-case">slug:</span> 
                    <span className="lowercase truncate max-w-[200px] sm:max-w-xs normal-case tracking-normal font-medium">{slug}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
            <select 
              className="select select-sm rounded-full bg-base-100/30 border-base-content/20 text-base-content/90 hover:border-base-content/40 focus:border-base-content/50 w-32 font-semibold" 
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="Draft" className="bg-base-200">Taslak</option>
              <option value="Published" className="bg-base-200">Yayında</option>
            </select>
            
            <button 
              onClick={() => setIsSpoiler(!isSpoiler)}
              className={`btn btn-circle btn-sm btn-ghost border-base-content/20 bg-base-100/30 hover:bg-base-content/10 ${isSpoiler ? 'text-error border-error/50 bg-error/10' : 'text-base-content/50'}`}
              title={isSpoiler ? 'Spoiler Açık' : 'Spoiler Yok'}
            >
              {isSpoiler ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>

            <button onClick={handleSave} className="btn btn-sm btn-primary rounded-full px-6 font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-transform">
              <Save className="h-4 w-4" />
              Kaydet
            </button>
          </div>
        </section>

        {/* Main Content Area */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Editor Area */}
          <section className="glass-frame flex-1 flex flex-col min-h-[600px] overflow-hidden bg-base-100/10">
            <RichTextEditor 
              placeholder="Burası senin dünyan. Hikayeni yazmaya başla..."
              onChange={(json, count) => {
                setEditorData(json);
                setWordCount(count);
              }}
            />
          </section>

          {/* Right Sidebar */}
          <aside className="w-full lg:w-[320px] flex flex-col gap-4">
            
            <div className="glass-frame p-6 flex flex-col gap-6">
               <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-base-content/60">
                 <Zap className="h-4 w-4" />
                 BÖLÜM AYARLARI
               </h3>

               <div className="flex flex-col gap-2">
                 <label className="text-xs font-bold text-base-content/50">Bölüm Sırası</label>
                 <input 
                   type="number" 
                   value={order}
                   onChange={e => setOrder(Number(e.target.value))}
                   className="input input-sm input-bordered bg-base-100/30 text-base-content focus:border-base-content/30 transition-colors w-full rounded-md"
                 />
               </div>

               <div className="flex items-center gap-3 py-1">
                 <input 
                    type="checkbox" 
                    checked={isFree}
                    onChange={(e) => setIsFree(e.target.checked)}
                    className="checkbox checkbox-sm checkbox-primary rounded bg-base-100/30 border-base-content/30" 
                 />
                 <label className="text-xs font-black uppercase tracking-widest text-base-content/80 cursor-pointer" onClick={() => setIsFree(!isFree)}>
                   ÜCRETSİZ BÖLÜM
                 </label>
               </div>

               <div className={`flex flex-col gap-2 transition-opacity duration-300 ${isFree ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                 <label className="text-xs font-bold text-base-content/50">Fiyat (Jeton)</label>
                 <input 
                   type="number" 
                   value={price}
                   onChange={e => setPrice(Number(e.target.value))}
                   className="input input-sm input-bordered bg-base-100/30 text-base-content focus:border-base-content/30 transition-colors w-full rounded-md"
                 />
                 <p className="text-[10px] text-base-content/40 font-medium">Kilitliyse kaç jeton gereksin?</p>
               </div>
            </div>

            <div className="glass-frame bg-info/20 border-info/30 p-5 text-info-content shadow-lg shadow-info/10 mt-2">
              <p className="text-xs font-medium leading-relaxed">
                <span className="font-black">İpucu:</span> Her paragraf benzersiz bir ID ile takip edilir. Yorumlar paragrafları sıra değişse bile doğru şekilde takip eder.
              </p>
            </div>

          </aside>

        </div>
      </div>
    </main>
  );
}
