"use client";

import Link from "next/link";
import { 
  ChevronLeft, 
  Save, 
  Eye, 
  EyeOff, 
  Zap,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { RichTextEditor } from "@/components/editor/RichTextEditor";

export default function EditChapterPage() {
  const params = useParams<{ bookSlug: string, chapterSlug: string }>();
  const router = useRouter();
  const bookSlug = params?.bookSlug ?? "";
  const chapterSlug = params?.chapterSlug ?? "";

  const [chapterId, setChapterId] = useState<string>("");

  const [title, setTitle] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [status, setStatus] = useState("Draft");
  const [isFree, setIsFree] = useState(true);
  const [editorData, setEditorData] = useState<any>(null);
  const [initialContent, setInitialContent] = useState<any>(null);
  const [wordCount, setWordCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [order, setOrder] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);

  // Initialize data (mock API call)
  useEffect(() => {
    if (!chapterSlug) return;

    let isMounted = true;
    
    const loadChapter = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/books/chapters/${chapterSlug}`);
        const result = await response.json();
        
        if (result.isSuccess && result.data && isMounted) {
          const chapter = result.data;
          setTitle(chapter.title || "");
          setStatus(chapter.status === 0 ? "Draft" : chapter.status === 1 ? "Published" : "Scheduled");
          setIsSpoiler(chapter.isTitleSpoiler || false);
          setIsFree(chapter.isFree !== false); // default to true if undefined
          setOrder(chapter.order || 1);
          setPrice(chapter.price || 0);
          setChapterId(chapter.id); 
          
          // The backend gives us a list of Dto lines (ParagraphDto)
          const lines = chapter.paragraphs || [];

          const tipTapJson = {
             type: "doc",
             content: lines.map((line: any) => ({
                // We use heading node for type > 0, paragraph for 0
                type: line.type === "Text" || line.type === 0 || line.type === "0" ? "paragraph" : "heading",
                attrs: { 
                    id: line.id,
                    level: line.type === "Text" || line.type === 0 || line.type === "0" ? undefined : parseInt((line.type || "1").toString().replace(/\D/g, "")) || 1
                },
                content: line.content ? [{ type: "text", text: line.content }] : []
             }))
          };

          setInitialContent(tipTapJson);
          setEditorData(tipTapJson);
        } else if (isMounted) {
           console.error("Failed to load chapter:", result.message);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    loadChapter();
    return () => { isMounted = false; };
  }, [chapterSlug]);

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

  // Convert JSON to DTO on update (sync mode)
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
      const type = node.type === "heading" ? node.attrs.level : 0; 
      const content = node.content ? node.content.map(renderTipTapTextNode).join("") : "";

      return {
        id: node.attrs?.id || crypto.randomUUID(), // Always ensure an ID exists to prevent DbUpdateException
        content: content,
        type: type
      };
    });
  };

  const handleUpdate = async () => {
    const dtoList = mapEditorJsonToDto(editorData);
    
    // As per the Data.cs in update endpoint, we actually need ChapterId. 
    // And to call PATCH we might need to send it to the generalized PATCH /api/books/chapters 
    // Wait, the API receives ChapterId in the body! We'll just pass chapterId if we have it, 
    // but the URL gives us chapterSlug.
    // Let's assume we can fetch the chapter by slug and get the ChapterId to update.
    
    // For now, let's just make the PATCH request where the parameter chapterId can be the Slug
    // if the backend proxy handles it, or we need to send the actual ID.
    // Assuming chapterId is what we have:
    const payload = {
        chapterId: chapterId,
        title: title,
        order: order,
        isFree: isFree,
        price: price,
        isTitleSpoiler: isSpoiler,
        status: status === "Draft" ? 0 : status === "Published" ? 1 : 2,
        lines: dtoList
    };

    console.log("Updating chapter with payload:", payload);
    try {
      const response = await fetch("/api/books/chapters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.isSuccess) {
        alert("Bölüm güncellendi!");
      } else {
        const errorMsgs = result.errors ? "\n" + Object.values(result.errors).flat().join("\n") : "";
        alert("Hata: " + result.message + errorMsgs);
      }
    } catch (err) {
      alert("Ağ hatası.");
    }
  };

  if (isLoading) {
    return (
      <main className="relative min-h-screen overflow-hidden flex items-center justify-center">
        <span className="loading loading-ring loading-lg text-primary"></span>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="site-shell mx-auto flex flex-col gap-6 px-4 pb-12 pt-28 sm:px-8 sm:pt-32 max-w-[1600px]">
        
        {/* Chapter Top Toolbar Area */}
        <section className="glass-frame flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-4 sm:px-6">
          <div className="flex flex-1 items-center gap-6 w-full">
            <Link href={`/author/${bookSlug}`} className="btn btn-circle btn-sm btn-ghost hover:bg-base-content/10" title="İptal ve Geri Dön">
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

            <button onClick={handleUpdate} className="btn btn-sm btn-primary rounded-full px-6 font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-transform">
              <Save className="h-4 w-4" />
              Güncelle
            </button>
          </div>
        </section>

        {/* Main Content Area */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Editor Area */}
          <section className="glass-frame flex-1 flex flex-col min-h-[600px] overflow-hidden bg-base-100/10">
            {initialContent && (
              <RichTextEditor 
                initialContent={initialContent}
                placeholder="Hikayeye bir şeyler ekle..."
                onChange={(json, count) => {
                  setEditorData(json);
                  setWordCount(count);
                }}
              />
            )}
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
                   onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
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
                 <span className="font-black">Güncelleme:</span> Eski satırları editlediğinizde ID'ler korunur ve <span className="font-bold underline">yorumlar kaybolmaz</span>. Yeni açılan paragraflar ise sisteme otomatik olarak yeni bir ID ile kaydedilir.
               </p>
            </div>

          </aside>

        </div>
      </div>
    </main>
  );
}
