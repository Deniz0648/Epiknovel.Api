"use client";

import { useEffect, useState } from "react";
import { 
  FileText, 
  Plus, 
  History, 
  CheckCircle2, 
  Clock, 
  Save, 
  Eye, 
  ChevronRight,
  AlertCircle,
  Loader2
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { showToast } from "@/lib/toast";

import { LEGAL_TEMPLATES } from "./templates";

type LegalDocumentSummary = {
  id: string;
  title: string;
  slug: string;
  latestVersion: string;
  lastPublishedAt: string | null;
  hasDraft: boolean;
};

type LegalVersion = {
  id: string;
  versionNumber: string;
  content: string;
  changeNote: string;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
};

export default function LegalManagementPage() {
  const [documents, setDocuments] = useState<LegalDocumentSummary[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<LegalDocumentSummary | null>(null);
  const [history, setHistory] = useState<LegalVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [versionNumber, setVersionNumber] = useState("1.0");
  const [changeNote, setChangeNote] = useState("");
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [showEditor, setShowEditor] = useState(false);

  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const res = await apiRequest<LegalDocumentSummary[]>("/management/compliance/legal");
      setDocuments(res || []);
    } catch (err) {
      showToast({ title: "Hata", description: "Belgeler yüklenemedi.", tone: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistory = async (docSlug: string) => {
    try {
      setIsHistoryLoading(true);
      const res = await apiRequest<LegalVersion[]>(`/management/compliance/legal/${docSlug}/history`);
      setHistory(res || []);
    } catch (err) {
      showToast({ title: "Hata", description: "Geçmiş yüklenemedi.", tone: "error" });
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleSelectDoc = (doc: LegalDocumentSummary) => {
    setSelectedDoc(doc);
    setTitle(doc.title);
    setSlug(doc.slug);
    setContent("");
    setVersionNumber("");
    setChangeNote("");
    setShowEditor(false);
    setActiveTab("edit");
    loadHistory(doc.slug);
  };

  const handleCreateNew = () => {
    setSelectedDoc(null);
    setTitle("");
    setSlug("");
    setContent("");
    setVersionNumber("1.0");
    setChangeNote("İlk sürüm");
    setHistory([]);
    setShowEditor(true);
    setActiveTab("edit");
  };

  const handleSeedTemplates = async () => {
    if (!confirm("Sistemde bulunmayan şablonlar eklenecektir. Emin misiniz?")) return;
    
    setIsLoading(true);
    let count = 0;
    try {
      for (const template of LEGAL_TEMPLATES) {
        // Check if exists
        const exists = documents.some(d => d.slug === template.slug);
        if (exists) continue;

        await apiRequest("/management/compliance/legal", {
          method: "POST",
          body: JSON.stringify({
            ...template,
            versionNumber: "1.0",
            publishImmediately: true
          })
        });
        count++;
      }
      showToast({ title: "Başarılı", description: `${count} yeni şablon eklendi.`, tone: "success" });
      loadDocuments();
    } catch (err: any) {
      showToast({ title: "Hata", description: err.message || "Bazı şablonlar eklenemedi.", tone: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title || !slug || !content || !versionNumber) {
      showToast({ title: "Uyarı", description: "Lütfen tüm alanları doldurun.", tone: "error" });
      return;
    }

    try {
      setIsSaving(true);
      await apiRequest("/management/compliance/legal", {
        method: "POST",
        body: JSON.stringify({
          id: selectedDoc?.id,
          title,
          slug,
          content,
          versionNumber,
          changeNote,
          publishImmediately
        })
      });

      showToast({ title: "Başarılı", description: "Belge kaydedildi.", tone: "success" });
      setShowEditor(false);
      loadDocuments();
      if (slug) loadHistory(slug);
    } catch (err: any) {
      showToast({ title: "Hata", description: err.message || "Kaydedilemedi.", tone: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-base-content flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-2xl">
              <FileText className="h-7 w-7 text-primary" />
            </div>
            Resmi Belgeler & Sözleşmeler
          </h1>
          <p className="text-base-content/60 mt-1 ml-14">Sitenin yasal metinlerini ve versiyonlarını yönetin.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleSeedTemplates} 
            disabled={isLoading}
            className="btn btn-outline btn-primary rounded-2xl gap-2 h-12 px-6"
          >
            <History className="h-5 w-5" />
            Varsayılan Şablonları Yükle
          </button>
          <button onClick={handleCreateNew} className="btn btn-primary rounded-2xl gap-2 shadow-lg shadow-primary/20 h-12 px-6">
            <Plus className="h-5 w-5" />
            Yeni Belge Oluştur
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sol Liste */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-frame p-4">
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-base-content/40">MEVCUT BELGELER</h2>
              <span className="badge badge-sm badge-ghost opacity-40 font-black">{documents.length}</span>
            </div>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12 opacity-30 italic text-sm">Henüz belge eklenmemiş.</div>
            ) : (
              <div className="space-y-2">
                {documents.map(doc => (
                  <button 
                    key={doc.id}
                    onClick={() => handleSelectDoc(doc)}
                    className={`w-full text-left p-4 rounded-2xl transition-all duration-300 flex items-center justify-between group ${
                      selectedDoc?.id === doc.id 
                        ? "bg-primary text-primary-content shadow-xl shadow-primary/25 translate-x-1" 
                        : "hover:bg-base-content/5 bg-base-100/50 border border-base-content/5"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold truncate">{doc.title}</div>
                      <div className={`text-[10px] mt-1 font-semibold flex items-center gap-2 ${selectedDoc?.id === doc.id ? "opacity-80" : "opacity-40"}`}>
                        <span className="bg-base-content/10 px-1.5 py-0.5 rounded uppercase">{doc.slug}</span>
                        <span>•</span>
                        <span>v{doc.latestVersion}</span>
                      </div>
                    </div>
                    <ChevronRight className={`h-4 w-4 transition-transform ${selectedDoc?.id === doc.id ? "translate-x-1" : "opacity-20 group-hover:opacity-100 group-hover:translate-x-1"}`} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sağ Detay / Editör */}
        <div className="lg:col-span-8">
          {showEditor || (selectedDoc && !isHistoryLoading) ? (
            <div className="space-y-6">
              <div className="glass-frame p-0 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="p-6 sm:p-8 border-b border-base-content/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-base-content/2">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">
                      {showEditor ? "DÜZENLEME MODU" : "BELGE GÖRÜNÜMÜ"}
                    </div>
                    <h3 className="text-2xl font-black tracking-tight">
                      {showEditor ? (selectedDoc ? `v${versionNumber} Hazırlanıyor` : "Yeni Belge") : selectedDoc?.title}
                    </h3>
                  </div>
                  {!showEditor && (
                    <button onClick={() => setShowEditor(true)} className="btn btn-primary btn-sm rounded-xl gap-2 h-10 px-4 shadow-lg shadow-primary/20">
                      <Plus className="h-4 w-4" />
                      Yeni Versiyon Oluştur
                    </button>
                  )}
                </div>

                {showEditor ? (
                  <div className="p-6 sm:p-8 space-y-8">
                    {/* Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Genel Bilgiler Section */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-base-content/40 flex items-center gap-2">
                          <AlertCircle className="h-3.5 w-3.5" />
                          GENEL BİLGİLER
                        </h4>
                        <div className="space-y-4 p-5 bg-base-content/5 rounded-2xl border border-base-content/5">
                          <div className="form-control w-full">
                            <label className="label py-1 text-[10px] font-bold text-base-content/50 uppercase tracking-widest">Belge Başlığı</label>
                            <input 
                              type="text" 
                              placeholder="Örn: Kullanım Koşulları" 
                              className="input input-bordered w-full rounded-xl bg-base-100 border-base-content/10 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold"
                              value={title}
                              onChange={e => setTitle(e.target.value)}
                            />
                          </div>
                          <div className="form-control w-full">
                            <label className="label py-1 text-[10px] font-bold text-base-content/50 uppercase tracking-widest">URL Tanımı (Slug)</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold opacity-30">/compliance/legal/</span>
                              <input 
                                type="text" 
                                placeholder="terms-of-service" 
                                className="input input-bordered w-full rounded-xl bg-base-100 border-base-content/10 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold pl-32"
                                value={slug}
                                onChange={e => setSlug(e.target.value)}
                                disabled={!!selectedDoc}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Versiyon Bilgileri Section */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-base-content/40 flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5" />
                          VERSİYON DETAYLARI
                        </h4>
                        <div className="space-y-4 p-5 bg-base-content/5 rounded-2xl border border-base-content/5">
                          <div className="form-control w-full">
                            <label className="label py-1 text-[10px] font-bold text-base-content/50 uppercase tracking-widest">Versiyon No</label>
                            <input 
                              type="text" 
                              placeholder="Örn: 1.0.2" 
                              className="input input-bordered w-full rounded-xl bg-base-100 border-base-content/10 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold"
                              value={versionNumber}
                              onChange={e => setVersionNumber(e.target.value)}
                            />
                          </div>
                          <div className="form-control w-full">
                            <label className="label py-1 text-[10px] font-bold text-base-content/50 uppercase tracking-widest">Değişiklik Notu</label>
                            <input 
                              type="text" 
                              placeholder="Kısaca ne değişti?" 
                              className="input input-bordered w-full rounded-xl bg-base-100 border-base-content/10 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold"
                              value={changeNote}
                              onChange={e => setChangeNote(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content Section with Tabs */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-widest text-base-content/40">BELGE İÇERİĞİ</h4>
                        <div className="tabs tabs-boxed bg-base-content/5 rounded-xl p-1 gap-1">
                          <button 
                            className={`tab tab-sm rounded-lg font-bold transition-all ${activeTab === "edit" ? "tab-active bg-primary text-primary-content" : ""}`}
                            onClick={() => setActiveTab("edit")}
                          >
                            Düzenle
                          </button>
                          <button 
                            className={`tab tab-sm rounded-lg font-bold transition-all ${activeTab === "preview" ? "tab-active bg-primary text-primary-content" : ""}`}
                            onClick={() => setActiveTab("preview")}
                          >
                            Önizleme
                          </button>
                        </div>
                      </div>

                      {activeTab === "edit" ? (
                        <div className="form-control w-full">
                          <textarea 
                            className="textarea textarea-bordered rounded-2xl min-h-[400px] bg-base-100 border-base-content/10 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-mono text-sm leading-relaxed p-6 resize-y"
                            placeholder="Belge metnini buraya yazın (HTML veya Markdown desteklenir)..."
                            value={content}
                            onChange={e => setContent(e.target.value)}
                          ></textarea>
                        </div>
                      ) : (
                        <div className="p-8 bg-base-100 border border-base-content/10 rounded-2xl min-h-[400px] prose max-w-none prose-sm sm:prose-base overflow-auto prose-headings:font-black prose-p:leading-relaxed prose-a:text-primary">
                          <div dangerouslySetInnerHTML={{ __html: content || "<p class='opacity-40 italic'>İçerik boş...</p>" }} />
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-6 pt-8 border-t border-base-content/10">
                      <div className="flex items-center gap-4 bg-base-content/5 px-6 py-3 rounded-2xl border border-base-content/5">
                        <input 
                          type="checkbox" 
                          className="checkbox checkbox-primary rounded-lg checkbox-sm" 
                          id="publishNow"
                          checked={publishImmediately}
                          onChange={e => setPublishImmediately(e.target.checked)}
                        />
                        <label htmlFor="publishNow" className="text-sm font-black cursor-pointer select-none">Bu versiyonu hemen yayına al</label>
                      </div>
                      <div className="flex gap-4">
                        <button onClick={() => setShowEditor(false)} className="btn btn-ghost rounded-2xl h-12 px-6 font-bold">Vazgeç</button>
                        <button 
                          onClick={handleSave} 
                          disabled={isSaving}
                          className="btn btn-primary rounded-2xl h-12 px-10 shadow-xl shadow-primary/25 font-black text-lg"
                        >
                          {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                          KAYDET VE YAYINLA
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-4 bg-base-content/5 rounded-2xl border border-base-content/5">
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">DURUM</div>
                        <div className="flex items-center gap-2 font-bold text-success">
                          <CheckCircle2 className="h-4 w-4" />
                          Aktif / Yayında
                        </div>
                      </div>
                      <div className="p-4 bg-base-content/5 rounded-2xl border border-base-content/5">
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">GÜNCEL VERSİYON</div>
                        <div className="font-bold text-lg">v{selectedDoc?.latestVersion}</div>
                      </div>
                      <div className="p-4 bg-base-content/5 rounded-2xl border border-base-content/5">
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">SON YAYIN</div>
                        <div className="font-bold">{selectedDoc?.lastPublishedAt ? new Date(selectedDoc.lastPublishedAt).toLocaleDateString("tr-TR") : "-"}</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-base-content/40 mb-4 flex items-center gap-2">
                        <History className="h-4 w-4" />
                        VERSİYON GEÇMİŞİ
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="table w-full">
                          <thead>
                            <tr className="border-b border-base-content/10">
                              <th className="bg-transparent text-[10px] font-black uppercase tracking-widest opacity-40">Versiyon</th>
                              <th className="bg-transparent text-[10px] font-black uppercase tracking-widest opacity-40">Tarih</th>
                              <th className="bg-transparent text-[10px] font-black uppercase tracking-widest opacity-40">Değişiklik Notu</th>
                              <th className="bg-transparent text-[10px] font-black uppercase tracking-widest opacity-40">Durum</th>
                              <th className="bg-transparent text-[10px] font-black uppercase tracking-widest opacity-40">İşlem</th>
                            </tr>
                          </thead>
                          <tbody>
                            {history.map(v => (
                              <tr key={v.id} className="hover:bg-base-content/5 border-b border-base-content/5 transition-colors group">
                                <td className="font-bold">v{v.versionNumber}</td>
                                <td className="text-sm opacity-60">{new Date(v.createdAt).toLocaleDateString("tr-TR")}</td>
                                <td className="text-sm min-w-[200px]">{v.changeNote || "-"}</td>
                                <td>
                                  {v.isPublished ? (
                                    <span className="badge badge-success badge-sm badge-soft font-bold">YAYINDA</span>
                                  ) : (
                                    <span className="badge badge-ghost badge-sm font-bold opacity-50">TASLAK</span>
                                  )}
                                </td>
                                <td>
                                  <button 
                                    className="btn btn-ghost btn-xs rounded-lg hover:bg-primary/20 hover:text-primary transition-all opacity-0 group-hover:opacity-100"
                                    onClick={() => {
                                      setVersionNumber(v.versionNumber);
                                      setContent(v.content);
                                      setChangeNote(v.changeNote);
                                      setShowEditor(true);
                                    }}
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    Görüntüle / Düzenle
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-30 animate-pulse">
              <div className="bg-base-content/10 p-8 rounded-full mb-6">
                <FileText className="h-16 w-16" />
              </div>
              <h3 className="text-2xl font-black tracking-tight">Belge Seçin</h3>
              <p className="max-w-xs mt-2">Detayları görmek ve versiyonları yönetmek için soldan bir belge seçin veya yeni bir tane oluşturun.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
