"use client";

import { useEffect, useState } from "react";
import { 
  Bell, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  Pin, 
  Trash2, 
  Edit3, 
  Eye, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Save,
  X,
  Image as ImageIcon
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { showToast } from "@/lib/toast";

type Announcement = {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  isActive: boolean;
  isPinned: boolean;
  publishedAt?: string;
  expiresAt?: string;
  createdAt: string;
};

export default function AnnouncementsManagementPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  // Form State
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [publishedAt, setPublishedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setIsLoading(true);
      const res = await apiRequest<{ items: Announcement[] }>("/management/infrastructure/announcements");
      setAnnouncements(res?.items || []);
    } catch (err) {
      showToast({ title: "Hata", description: "Duyurular yüklenemedi.", tone: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item: Announcement) => {
    setSelectedId(item.id);
    setTitle(item.title);
    setContent(item.content);
    setImageUrl(item.imageUrl || "");
    setIsPinned(item.isPinned);
    setIsActive(item.isActive);
    setPublishedAt(item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 16) : "");
    setExpiresAt(item.expiresAt ? new Date(item.expiresAt).toISOString().slice(0, 16) : "");
    setShowEditor(true);
    setActiveTab("edit");
  };

  const handleCreate = () => {
    setSelectedId(null);
    setTitle("");
    setContent("");
    setImageUrl("");
    setIsPinned(false);
    setIsActive(true);
    setPublishedAt(new Date().toISOString().slice(0, 16));
    setExpiresAt("");
    setShowEditor(true);
    setActiveTab("edit");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu duyuruyu silmek istediğinize emin misiniz?")) return;

    try {
      await apiRequest(`/infrastructure/announcements/${id}`, { method: "DELETE" });
      showToast({ title: "Başarılı", description: "Duyuru silindi.", tone: "success" });
      loadAnnouncements();
    } catch (err: any) {
      showToast({ title: "Hata", description: err.message || "Silinemedi.", tone: "error" });
    }
  };

  const handleSave = async () => {
    if (!title || !content) {
      showToast({ title: "Uyarı", description: "Lütfen başlık ve içeriği doldurun.", tone: "error" });
      return;
    }

    try {
      setIsSaving(true);
      const url = selectedId ? `/infrastructure/announcements/${selectedId}` : "/infrastructure/announcements";
      const method = selectedId ? "PATCH" : "POST";
      
      const body: any = {
        title,
        content,
        imageUrl: imageUrl || null,
        isPinned,
        isActive,
        publishedAt: publishedAt || null,
        expiresAt: expiresAt || null
      };

      await apiRequest(url, {
        method,
        body: JSON.stringify(body)
      });

      showToast({ title: "Başarılı", description: "Duyuru kaydedildi.", tone: "success" });
      setShowEditor(false);
      loadAnnouncements();
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
              <Bell className="h-7 w-7 text-primary" />
            </div>
            Duyuru Yönetimi
          </h1>
          <p className="text-base-content/60 mt-1 ml-14">Sistem genelindeki duyuruları ve bildirimleri yönetin.</p>
        </div>
        {!showEditor && (
          <button onClick={handleCreate} className="btn btn-primary rounded-2xl gap-2 shadow-lg shadow-primary/20 h-12 px-6">
            <Plus className="h-5 w-5" />
            Yeni Duyuru Yayınla
          </button>
        )}
      </div>

      {showEditor ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="glass-frame p-0 overflow-hidden">
            {/* Header */}
            <div className="p-6 sm:p-8 border-b border-base-content/10 flex justify-between items-center bg-base-content/2">
              <div className="flex items-center gap-4">
                <button onClick={() => setShowEditor(false)} className="btn btn-ghost btn-sm btn-circle">
                  <X className="h-5 w-5" />
                </button>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">
                    {selectedId ? "DUYURU DÜZENLE" : "YENİ DUYURU"}
                  </div>
                  <h3 className="text-2xl font-black tracking-tight">{title || "Başlıksız Duyuru"}</h3>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowEditor(false)} className="btn btn-ghost rounded-xl font-bold">Vazgeç</button>
                <button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="btn btn-primary rounded-xl h-11 px-8 shadow-lg shadow-primary/20 font-black"
                >
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                  YAYINLA / GÜNCELLE
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sol Taraf: Form */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-base-content/40 flex items-center gap-2">
                      <Edit3 className="h-3.5 w-3.5" />
                      İÇERİK BİLGİLERİ
                    </h4>
                    <div className="space-y-4 p-6 bg-base-content/5 rounded-2xl border border-base-content/5">
                      <div className="form-control w-full">
                        <label className="label py-1 text-[10px] font-bold text-base-content/50 uppercase tracking-widest">Duyuru Başlığı</label>
                        <input 
                          type="text" 
                          placeholder="Örn: Yeni Bölüm Yayında!" 
                          className="input input-bordered w-full rounded-xl bg-base-100 border-base-content/10 focus:border-primary font-bold"
                          value={title}
                          onChange={e => setTitle(e.target.value)}
                        />
                      </div>
                      <div className="form-control w-full">
                        <label className="label py-1 text-[10px] font-bold text-base-content/50 uppercase tracking-widest">Görsel URL (Opsiyonel)</label>
                        <div className="relative">
                          <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-30" />
                          <input 
                            type="text" 
                            placeholder="https://..." 
                            className="input input-bordered w-full rounded-xl bg-base-100 border-base-content/10 focus:border-primary font-bold pl-12"
                            value={imageUrl}
                            onChange={e => setImageUrl(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-widest text-base-content/40">DUYURU METNİ</h4>
                      <div className="tabs tabs-boxed bg-base-content/5 rounded-xl p-1 gap-1">
                        <button 
                          className={`tab tab-sm rounded-lg font-bold transition-all ${activeTab === "edit" ? "tab-active bg-primary text-primary-content" : ""}`}
                          onClick={() => setActiveTab("edit")}
                        >
                          Editör
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
                      <textarea 
                        className="textarea textarea-bordered rounded-2xl min-h-[300px] w-full bg-base-100 border-base-content/10 focus:border-primary font-medium text-sm leading-relaxed p-6 resize-y"
                        placeholder="Duyuru içeriğini buraya yazın..."
                        value={content}
                        onChange={e => setContent(e.target.value)}
                      ></textarea>
                    ) : (
                      <div className="p-8 bg-base-100 border border-base-content/10 rounded-2xl min-h-[300px] prose max-w-none prose-sm sm:prose-base overflow-auto">
                        <div dangerouslySetInnerHTML={{ __html: content || "<p class='opacity-40 italic'>Duyuru içeriği boş...</p>" }} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Sağ Taraf: Ayarlar */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-base-content/40 flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      YAYIN AYARLARI
                    </h4>
                    <div className="p-6 bg-base-content/5 rounded-2xl border border-base-content/5 space-y-6">
                      <div className="form-control">
                        <label className="label py-1 text-[10px] font-bold text-base-content/50 uppercase tracking-widest">Yayınlanma Tarihi</label>
                        <input 
                          type="datetime-local" 
                          className="input input-bordered rounded-xl bg-base-100 border-base-content/10 font-bold text-xs"
                          value={publishedAt}
                          onChange={e => setPublishedAt(e.target.value)}
                        />
                        <p className="text-[10px] opacity-40 mt-2 italic font-medium">Boş bırakılırsa hemen yayınlanır.</p>
                      </div>

                      <div className="form-control">
                        <label className="label py-1 text-[10px] font-bold text-base-content/50 uppercase tracking-widest">Bitiş Tarihi (Opsiyonel)</label>
                        <input 
                          type="datetime-local" 
                          className="input input-bordered rounded-xl bg-base-100 border-base-content/10 font-bold text-xs"
                          value={expiresAt}
                          onChange={e => setExpiresAt(e.target.value)}
                        />
                      </div>

                      <div className="divider opacity-5 my-2"></div>

                      <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            className="checkbox checkbox-primary rounded-lg checkbox-sm"
                            checked={isPinned}
                            onChange={e => setIsPinned(e.target.checked)}
                          />
                          <span className="text-sm font-bold opacity-70 group-hover:opacity-100 transition-opacity">En Üste Sabitle</span>
                          <Pin className={`h-3.5 w-3.5 ml-auto transition-colors ${isPinned ? "text-primary" : "opacity-20"}`} />
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            className="checkbox checkbox-primary rounded-lg checkbox-sm"
                            checked={isActive}
                            onChange={e => setIsActive(e.target.checked)}
                          />
                          <span className="text-sm font-bold opacity-70 group-hover:opacity-100 transition-opacity">Aktif / Yayında</span>
                          <CheckCircle2 className={`h-3.5 w-3.5 ml-auto transition-colors ${isActive ? "text-success" : "opacity-20"}`} />
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {imageUrl && (
                    <div className="space-y-4">
                       <h4 className="text-xs font-black uppercase tracking-widest text-base-content/40 flex items-center gap-2">
                        <ImageIcon className="h-3.5 w-3.5" />
                        GÖRSEL ÖNİZLEME
                      </h4>
                      <div className="aspect-video rounded-2xl overflow-hidden border border-base-content/10 bg-base-content/5">
                        <img src={imageUrl} alt="Duyuru Görseli" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {isLoading ? (
            <div className="glass-frame p-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-black uppercase tracking-widest opacity-40">Duyurular Yükleniyor...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="glass-frame p-20 flex flex-col items-center justify-center gap-6 opacity-40 text-center">
              <Bell className="h-20 w-20" />
              <div>
                <h3 className="text-xl font-black">Henüz Duyuru Yok</h3>
                <p className="mt-2 text-sm max-w-xs">Yeni bir duyuru oluşturarak kullanıcılara bildirimde bulunabilirsiniz.</p>
              </div>
              <button onClick={handleCreate} className="btn btn-outline btn-primary rounded-xl px-8">İlk Duyuruyu Oluştur</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {announcements.map(item => {
                const isPublished = !item.publishedAt || new Date(item.publishedAt) <= new Date();
                return (
                  <div key={item.id} className="glass-frame p-0 overflow-hidden flex flex-col group hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-1 border-base-content/5">
                    {item.imageUrl && (
                      <div className="h-40 overflow-hidden relative">
                        <img src={item.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        {item.isPinned && (
                          <div className="absolute top-4 left-4 bg-primary text-primary-content px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[10px] font-black shadow-lg">
                            <Pin className="h-3 w-3" />
                            SABİTLENMİŞ
                          </div>
                        )}
                        {!isPublished && (
                          <div className="absolute top-4 right-4 bg-amber-500 text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[10px] font-black shadow-lg">
                            <Clock className="h-3 w-3" />
                            İLERİ TARİHLİ
                          </div>
                        )}
                      </div>
                    )}
                    <div className="p-6 flex-1 flex flex-col">
                      {!item.imageUrl && item.isPinned && (
                         <div className="mb-4 text-primary flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
                            <Pin className="h-3 w-3" />
                            SABİTLENMİŞ DUYURU
                         </div>
                      )}
                      <h4 className="text-lg font-black tracking-tight mb-2 line-clamp-1">{item.title}</h4>
                      <p className="text-sm text-base-content/60 line-clamp-2 mb-6 flex-1">{item.content.replace(/<[^>]*>/g, '')}</p>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-base-content/5 mt-auto">
                        <div className="flex items-center gap-2 text-[10px] font-bold opacity-40">
                          <Calendar className="h-3 w-3" />
                          {new Date(item.publishedAt || item.createdAt).toLocaleDateString("tr-TR")}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleDelete(item.id)} className="btn btn-ghost btn-xs btn-square text-error hover:bg-error/10">
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleEdit(item)} className="btn btn-ghost btn-xs btn-square hover:bg-primary/10 hover:text-primary">
                            <Edit3 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
