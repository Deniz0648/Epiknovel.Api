"use client";

import React, { useState, useEffect } from "react";
import {
  Globe,
  Coins,
  CreditCard,
  Mail,
  FileText,
  Layout,
  Gift,
  Save,
  Loader2,
  Shield,
  Zap,
  Server,
  HardDrive,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  type LucideIcon
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { toast } from "@/lib/toast";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TipTapLink from '@tiptap/extension-link';
import UnderlineExt from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';

import { useRouter, useSearchParams, usePathname } from "next/navigation";

type EmailTemplate = {
  id: string;
  name: string;
  key: string;
  subject: string;
  body: string;
  variables: string;
  isActive: boolean;
};

type SettingItem = {
  key: string;
  value: string;
  description: string;
};

type TabType = 'site' | 'economy' | 'pos' | 'smtp' | 'content' | 'templates' | 'rewards' | 'tools';

type ToolbarButtonProps = {
  onClick: () => void;
  isActive?: boolean;
  icon: LucideIcon;
  title?: string;
};

function ToolbarButton({ onClick, isActive = false, icon: Icon, title }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-primary text-primary-content' : 'hover:bg-base-content/10 text-base-content/60'}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

const HARDCODED_TEMPLATES = [
  { key: "WelcomeEmail", name: "Hoş Geldin", variables: "{{DisplayName}}, {{SiteName}}, {{LoginLink}}" },
  { key: "EmailVerification", name: "E-Posta Doğrulama", variables: "{{DisplayName}}, {{ConfirmLink}}" },
  { key: "EmailChange", name: "E-Posta Değiştirme", variables: "{{DisplayName}}, {{EmailChangeLink}}" },
  { key: "PasswordReset", name: "Şifre Sıfırlama", variables: "{{DisplayName}}, {{ResetLink}}" },
  { key: "NewChapterEmail", name: "Yeni Bölüm Bildirimi", variables: "{{DisplayName}}, {{BookTitle}}, {{ChapterTitle}}, {{BookLink}}" },
  { key: "NewReviewEmail", name: "Yeni İnceleme Bildirimi", variables: "{{DisplayName}}, {{ReviewerName}}, {{BookTitle}}, {{ReviewLink}}" },
  { key: "NewCommentEmail", name: "Yeni Yorum Bildirimi", variables: "{{DisplayName}}, {{CommenterName}}, {{ContentTitle}}, {{CommentLink}}" },
  { key: "NewFollower", name: "Yeni Takipçi Bildirimi", variables: "{{DisplayName}}, {{FollowerName}}, {{ProfileLink}}" },
  { key: "SupportResponse", name: "Destek Yanıtı", variables: "{{DisplayName}}, {{TicketId}}, {{ResponseContent}}" },
  { key: "InvoiceCreatedEmail", name: "Fatura Bildirimi", variables: "{{DisplayName}}, {{InvoiceId}}, {{Amount}}, {{InvoiceLink}}" },
  { key: "OrderConfirmation", name: "Sipariş Onayı", variables: "{{DisplayName}}, {{OrderId}}, {{Items}}" },
  { key: "AuthorApplicationApprovedEmail", name: "Yazar Onay", variables: "{{DisplayName}}" },
  { key: "AuthorApplicationRejectedEmail", name: "Yazar Red", variables: "{{DisplayName}}" },
  { key: "PaidAuthorApplicationApprovedEmail", name: "Ücretli Yazar Onay", variables: "{{DisplayName}}" },
  { key: "PaidAuthorApplicationRejectedEmail", name: "Ücretli Yazar Red", variables: "{{DisplayName}}" },
];

// --- Alt Bileşenler (Focus Hatasını Önlemek İçin Dışarı Taşındı) ---
const InputField = ({ label, value, onChange, placeholder, type = "text", description }: { label: string, value: string, onChange: (val: string) => void, placeholder: string, type?: string, description?: string }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-black uppercase tracking-widest text-base-content/40 ml-1">{label}</label>
        {description && (
          <div className="group relative">
            <AlertCircle className="h-3.5 w-3.5 text-base-content/20 cursor-help" />
            <div className="absolute bottom-full right-0 mb-2 invisible group-hover:visible w-48 p-2 rounded-lg bg-base-content text-base-100 text-[10px] font-bold z-20 shadow-xl">
              {description}
            </div>
          </div>
        )}
      </div>
      <div className="relative">
        <input
          type={isPassword && !showPassword ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-12 rounded-xl bg-base-content/5 border border-base-content/10 px-4 text-sm font-bold focus:border-primary/40 focus:ring-4 focus:ring-primary/10 outline-none transition"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/30 hover:text-base-content/60"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
};

const ToggleField = ({ label, isChecked, onToggle, description }: { label: string, isChecked: boolean, onToggle: () => void, description: string }) => {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-base-content/5 border border-base-content/10 transition-all hover:bg-base-content/8">
      <div className="flex flex-col gap-0.5">
        <label className="text-[11px] font-black uppercase tracking-widest text-base-content/60">{label}</label>
        <p className="text-[10px] font-bold text-base-content/40 leading-tight">{description}</p>
      </div>
      <button
        onClick={onToggle}
        className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-300 ${isChecked ? "bg-primary" : "bg-base-content/20"}`}
      >
        <div className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform duration-300 ${isChecked ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
};

const AdvancedTemplateEditor = ({ template, onUpdate, onSave, isSaving }: { template: EmailTemplate, onUpdate: (subject: string, body: string) => void, onSave: () => void, isSaving: boolean }) => {
  const varList = template.variables.split(',').map((v: string) => v.trim());

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExt,
      TipTapLink.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: "E-posta içeriğini buraya yazın..." }),
    ],
    content: template.body || '',
    onUpdate: ({ editor }) => {
      onUpdate(template.subject, editor.getHTML());
    },
  }, [template.id]);

  useEffect(() => {
    if (editor && !editor.isFocused && template.body !== editor.getHTML()) {
      editor.commands.setContent(template.body || '');
    }
  }, [template.body, editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-base-content/5 pb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Layout className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-black text-primary">{template.name}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {varList.map((v: string) => (
            <span key={v} className="px-3 py-1 rounded-xl bg-base-content/5 border border-base-content/10 text-base-content/60 text-[10px] font-black tracking-tight">{v}</span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-base-content/40 ml-1">E-Posta Konusu</label>
        <div className="relative group">
          <input
            type="text"
            value={template.subject || ""}
            onChange={(e) => onUpdate(e.target.value, template.body)}
            className="w-full h-14 rounded-2xl bg-base-content/5 border border-base-content/10 px-6 text-sm font-bold focus:border-primary/40 focus:ring-8 focus:ring-primary/5 outline-none transition group-hover:bg-base-content/8"
            placeholder="Mail başlığını giriniz..."
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 group-hover:opacity-40 transition">
            <Save className="h-4 w-4" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 ml-1">
          <label className="text-[11px] font-black uppercase tracking-[0.2em] text-base-content/40">E-Posta İçeriği (HTML)</label>
          <span className="text-[9px] font-bold text-base-content/20 italic">Zengin metin editörü kullanılıyor</span>
        </div>

        <div className="rounded-[2.5rem] bg-base-content/5 border border-base-content/10 overflow-hidden focus-within:border-primary/40 focus-within:ring-8 focus-within:ring-primary/5 transition">
          <div className="flex flex-wrap items-center gap-1 p-2 border-b border-base-content/5 bg-base-content/2">
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} icon={Bold} title="Kalın" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} icon={Italic} title="İtalik" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} icon={Underline} title="Altı Çizili" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} icon={Strikethrough} title="Üstü Çizili" />
            <div className="w-px h-4 bg-base-content/10 mx-1" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} icon={Heading1} />
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} icon={Heading2} />
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} icon={Heading3} />
            <div className="w-px h-4 bg-base-content/10 mx-1" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} icon={List} />
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} icon={ListOrdered} />
            <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} icon={Quote} />
            <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} icon={Minus} />
            <div className="w-px h-4 bg-base-content/10 mx-1" />
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} icon={AlignLeft} />
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} icon={AlignCenter} />
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} icon={AlignRight} />
            <div className="w-px h-4 bg-base-content/10 mx-1" />
            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} icon={Undo} />
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} icon={Redo} />
          </div>

          <div className="p-8 min-h-[400px]">
            <EditorContent editor={editor} className="prose prose-invert max-w-none min-h-[350px] outline-none" />
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-3 rounded-2xl bg-primary px-8 py-4 text-sm font-black text-primary-content shadow-2xl shadow-primary/40 transition hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Şablonu Güncelle
        </button>
      </div>
    </div>
  );
};

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentTab = (searchParams.get('tab') as TabType) || 'site';

  const [activeTab, _setActiveTab] = useState<TabType>(currentTab);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>(HARDCODED_TEMPLATES[0].key);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});

  const setActiveTab = (tab: TabType) => {
    _setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (activeTab !== currentTab) {
      _setActiveTab(currentTab);
    }
  }, [activeTab, currentTab]);

  useEffect(() => {
    fetchSettings();
    if (activeTab === 'templates') {
      fetchTemplates();
    }
  }, [activeTab]);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<SettingItem[]>('/management/settings');

      const mapped: Record<string, string> = {};
      data.forEach(s => {
        mapped[s.key] = s.value;
      });
      setLocalSettings(mapped);
    } catch {
      toast.error({ description: "Ayarlar yüklenemedi." });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const data = await apiRequest<{ items: EmailTemplate[] }>('/management/system/emails/templates');
      setEmailTemplates(data.items);
    } catch {
      toast.error({ description: "Şablonlar yüklenemedi." });
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async (keys: string[]) => {
    setIsSaving(true);
    try {
      const payload = keys.map(k => ({
        key: k,
        value: localSettings[k] || ""
      }));

      await apiRequest<boolean>('/management/settings/batch', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      toast.success({ description: "Ayarlar başarıyla kaydedildi." });
      fetchSettings();
    } catch {
      toast.error({ description: "Kaydetme işlemi başarısız." });
    } finally {
      setIsSaving(false);
    }
  };

  const saveTemplate = async () => {
    const hardcoded = HARDCODED_TEMPLATES.find(t => t.key === selectedTemplateKey);
    if (!hardcoded) return;

    const existing = emailTemplates.find(t => t.key === selectedTemplateKey);
    
    setIsSaving(true);
    try {
      if (existing?.id) {
        await apiRequest<boolean>(`/management/system/emails/templates/${existing.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            id: existing.id,
            subject: existing.subject,
            body: existing.body
          })
        });
      } else {
        // Create new
        await apiRequest<boolean>(`/management/system/emails/templates`, {
          method: 'POST',
          body: JSON.stringify({
            key: selectedTemplateKey,
            name: hardcoded.name,
            subject: existing?.subject || "",
            body: existing?.body || "",
            variables: hardcoded.variables,
            isActive: true
          })
        });
      }

      toast.success({ description: "Şablon başarıyla güncellendi." });
      fetchTemplates();
    } catch {
      toast.error({ description: "Şablon kaydedilemedi." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTemplateUpdate = (subject: string, body: string) => {
    setEmailTemplates(prev => {
      const exists = prev.some(t => t.key === selectedTemplateKey);
      if (exists) {
        return prev.map(t => t.key === selectedTemplateKey ? { ...t, subject, body } : t);
      } else {
        // Add a temporary local template
        const hardcoded = HARDCODED_TEMPLATES.find(t => t.key === selectedTemplateKey)!;
        return [...prev, {
          id: "",
          key: selectedTemplateKey,
          name: hardcoded.name,
          subject,
          body,
          variables: hardcoded.variables,
          isActive: true
        }];
      }
    });
  };

  const renderSectionHeader = (title: string, desc: string, icon: LucideIcon) => (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
          {React.createElement(icon, { className: "h-6 w-6" })}
        </div>
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="text-sm font-medium text-base-content/50">{desc}</p>
        </div>
      </div>
      <button
        onClick={() => {
          const keys = Object.keys(localSettings).filter(k => k.startsWith(activeTab.toUpperCase()));
          saveSettings(keys);
        }}
        disabled={isSaving}
        className="flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-black text-primary-content shadow-lg shadow-primary/25 transition hover:opacity-90 active:scale-95 disabled:opacity-50"
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Değişiklikleri Kaydet
      </button>
    </div>
  );

  const TABS = [
    { id: 'site', label: 'Site Ayarı', icon: Globe, desc: 'Platform kimliği, meta veriler ve global görünüm.' },
    { id: 'economy', label: 'Ekonomi', icon: Coins, desc: 'Jeton oranları, komisyon ve para çekme limitleri.' },
    { id: 'pos', label: 'Sanal POS', icon: CreditCard, desc: 'Iyzico ve ödeme sistemi yapılandırması.' },
    { id: 'smtp', label: 'SMTP / Mail', icon: Mail, desc: 'E-posta gönderim protokolü ve sunucu ayarları.' },
    { id: 'content', label: 'İçerik', icon: FileText, desc: 'Okuma ekranı ve kütüphane kısıtlamaları.' },
    { id: 'templates', label: 'Şablonlar', icon: Layout, desc: 'Sistem tarafından gönderilen dinamik mailler.' },
    { id: 'rewards', label: 'Ödüller', icon: Gift, desc: 'Sadakat programları ve kullanıcı bonusları.' },
    { id: 'tools', label: 'Araçlar', icon: Server, desc: 'Sistem araçları ve bakım işlemleri.' },
  ];

  return (
    <div className="space-y-8 pb-20 pt-4">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-6">
          <div className="glass-island inline-flex p-1.5 rounded-[2.2rem] gap-1 overflow-x-auto no-scrollbar max-w-full">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2.5 rounded-[1.8rem] px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${isActive
                    ? "bg-primary text-primary-content shadow-xl shadow-primary/20"
                    : "text-base-content/40 hover:bg-base-content/5 hover:text-base-content/70"
                    }`}
                >
                  <tab.icon className={`h-4 w-4 ${isActive ? "" : "opacity-40"}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0">
          <div className="glass-island rounded-[3rem] p-8 md:p-12 relative overflow-hidden">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-40">
                <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
                <p className="mt-4 text-xs font-black uppercase tracking-widest opacity-30">Veriler Hazırlanıyor</p>
              </div>
            ) : (
              <>
                {activeTab === 'site' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {renderSectionHeader("Site Ayarları", "Platformun temel kimlik bilgileri.", Globe)}
                    <div className="grid gap-6 md:grid-cols-2">
                      <InputField label="Site Başlığı" value={localSettings["SITE_Name"] || ""} onChange={(v) => handleInputChange("SITE_Name", v)} placeholder="Epiknovel" description="Tarayıcı sekmesinde görünen başlık." />
                      <InputField label="Site Sloganı" value={localSettings["SITE_Slogan"] || ""} onChange={(v) => handleInputChange("SITE_Slogan", v)} placeholder="En Epik Hikayeler Burada" />
                      <InputField label="Site Logosu (URL)" value={localSettings["SITE_LogoUrl"] || ""} onChange={(v) => handleInputChange("SITE_LogoUrl", v)} placeholder="/images/logo.png" description="Sitenin sol üstünde görünen ana logo." />
                      <InputField label="Favicon (URL)" value={localSettings["SITE_FaviconUrl"] || ""} onChange={(v) => handleInputChange("SITE_FaviconUrl", v)} placeholder="/favicon.ico" description="Tarayıcı sekmesindeki ikon." />
                      <InputField label="Site URL" value={localSettings["SITE_Url"] || ""} onChange={(v) => handleInputChange("SITE_Url", v)} placeholder="https://epiknovel.com" description="Mail şablonlarında kullanılan ana site adresi." />
                      <InputField label="Destek E-Postası" value={localSettings["SITE_SupportEmail"] || ""} onChange={(v) => handleInputChange("SITE_SupportEmail", v)} placeholder="destek@epiknovel.com" />
                      <InputField label="Bakım Modu" value={localSettings["SITE_MaintenanceMode"] || ""} onChange={(v) => handleInputChange("SITE_MaintenanceMode", v)} placeholder="false" description="'true' yazılırsa site bakıma alınır." />
                      <div className="md:col-span-2">
                        <InputField label="Analiz Kodu (GTAG/GTM)" value={localSettings["SITE_AnalyticsId"] || ""} onChange={(v) => handleInputChange("SITE_AnalyticsId", v)} placeholder="G-XXXXXXXXXX" />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'economy' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {renderSectionHeader("Ekonomi Ayarları", "Platformun finansal dengesi buradan kurulur.", Coins)}
                    <div className="grid gap-6 md:grid-cols-2">
                      <InputField label="Yazar Komisyon Oranı (%)" value={localSettings["ECONOMY_AuthorSharePercentage"] || ""} onChange={(v) => handleInputChange("ECONOMY_AuthorSharePercentage", v)} placeholder="70" description="Yazara ödenecek yüzde (0-100)." />
                      <InputField label="Minimum Çekim Tutarı (TL)" value={localSettings["ECONOMY_MinWithdrawal"] || ""} onChange={(v) => handleInputChange("ECONOMY_MinWithdrawal", v)} placeholder="100" />
                      <InputField label="Bölüm Başına Minimum Jeton" value={localSettings["ECONOMY_MinChapterPrice"] || ""} onChange={(v) => handleInputChange("ECONOMY_MinChapterPrice", v)} placeholder="5" />
                      <InputField label="Bölüm Başına Maksimum Jeton" value={localSettings["ECONOMY_MaxChapterPrice"] || ""} onChange={(v) => handleInputChange("ECONOMY_MaxChapterPrice", v)} placeholder="100" />
                      <InputField label="Jeton Karşılığı (1 Adet / TL)" value={localSettings["ECONOMY_CoinToCurrencyRate"] || ""} onChange={(v) => handleInputChange("ECONOMY_CoinToCurrencyRate", v)} placeholder="0.25" description="1 adet jetonun yazara kazandırdığı net TL karşılığı." />
                    </div>
                  </div>
                )}

                {activeTab === 'pos' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {renderSectionHeader("Sanal POS Ayarları", "Iyzico entegrasyonu ve ödeme parametreleri.", CreditCard)}
                    <div className="grid gap-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <InputField label="Iyzico API Key" value={localSettings["POS_Iyzico_ApiKey"] || ""} onChange={(v) => handleInputChange("POS_Iyzico_ApiKey", v)} type="password" placeholder="api_key_..." />
                        <InputField label="Iyzico Secret Key" value={localSettings["POS_Iyzico_SecretKey"] || ""} onChange={(v) => handleInputChange("POS_Iyzico_SecretKey", v)} type="password" placeholder="secret_key_..." />
                      </div>
                      <InputField label="Iyzico Base URL" value={localSettings["POS_Iyzico_BaseUrl"] || ""} onChange={(v) => handleInputChange("POS_Iyzico_BaseUrl", v)} placeholder="https://api.iyzipay.com" />
                    </div>
                  </div>
                )}

                {activeTab === 'smtp' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {renderSectionHeader("SMTP Ayarları", "Sistem maillerini gönderen sunucu yapılandırması.", Mail)}
                    <div className="grid gap-6 md:grid-cols-2">
                      <InputField label="SMTP Host" value={localSettings["SMTP_Host"] || ""} onChange={(v) => handleInputChange("SMTP_Host", v)} placeholder="smtp.gmail.com" />
                      <InputField label="SMTP Port" value={localSettings["SMTP_Port"] || ""} onChange={(v) => handleInputChange("SMTP_Port", v)} placeholder="587" />
                      <InputField label="Gönderen Adı" value={localSettings["SMTP_SenderName"] || ""} onChange={(v) => handleInputChange("SMTP_SenderName", v)} placeholder="Epiknovel" />
                      <InputField label="Gönderen E-Posta" value={localSettings["SMTP_SenderEmail"] || ""} onChange={(v) => handleInputChange("SMTP_SenderEmail", v)} placeholder="noreply@epiknovel.com" />
                      <InputField label="SMTP Kullanıcı" value={localSettings["SMTP_User"] || ""} onChange={(v) => handleInputChange("SMTP_User", v)} placeholder="username" />
                      <InputField label="SMTP Şifre" value={localSettings["SMTP_Password"] || ""} onChange={(v) => handleInputChange("SMTP_Password", v)} type="password" placeholder="password" />
                    </div>
                  </div>
                )}

                {activeTab === 'content' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {renderSectionHeader("İçerik Ayarları", "Platformun ana servis yönetimi.", FileText)}
                    <div className="grid gap-6">
                      <div className="grid gap-4 mt-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Gelişmiş Servis Kontrolleri</h4>
                        <div className="grid gap-4 md:grid-cols-2">
                          <ToggleField label="Kitap Oluşturma" isChecked={localSettings["CONTENT_AllowNewBooks"] === "true"} onToggle={() => handleInputChange("CONTENT_AllowNewBooks", localSettings["CONTENT_AllowNewBooks"] === "true" ? "false" : "true")} description="Yeni kitap (çeviri hariç) oluşturulmasını açar/kapatır." />
                          <ToggleField label="Ücretli Bölümler" isChecked={localSettings["CONTENT_AllowPaidChapters"] === "true"} onToggle={() => handleInputChange("CONTENT_AllowPaidChapters", localSettings["CONTENT_AllowPaidChapters"] === "true" ? "false" : "true")} description="Ücretli bölüm oluşturulmasını site genelinde yönetir." />
                          <ToggleField label="Cüzdan ve Satın Alım" isChecked={localSettings["CONTENT_EnableWallet"] === "true"} onToggle={() => handleInputChange("CONTENT_EnableWallet", localSettings["CONTENT_EnableWallet"] === "true" ? "false" : "true")} description="Cüzdan işlemlerini ve paket alımlarını kapatır." />
                          <ToggleField label="Yazarlık Başvurusu" isChecked={localSettings["CONTENT_AllowAuthorApplications"] === "true"} onToggle={() => handleInputChange("CONTENT_AllowAuthorApplications", localSettings["CONTENT_AllowAuthorApplications"] === "true" ? "false" : "true")} description="Yazarlık başvuru formunu aktif veya pasif yapar." />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'templates' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-8">
                    <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-4xl bg-base-content/5 border border-base-content/10 w-fit">
                      {HARDCODED_TEMPLATES.map((tpl) => {
                        const isMActive = selectedTemplateKey === tpl.key;
                        return (
                          <button
                            key={tpl.key}
                            onClick={() => setSelectedTemplateKey(tpl.key)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${isMActive ? "bg-primary text-primary-content shadow-lg shadow-primary/20 scale-105" : "text-base-content/40 hover:bg-base-content/5 hover:text-base-content/60"}`}
                          >
                            {tpl.name}
                          </button>
                        );
                      })}
                    </div>
                    {selectedTemplateKey && (
                      <div className="glass-island rounded-[3.5rem] p-10 bg-base-content/2">
                        {(() => {
                          const hardcoded = HARDCODED_TEMPLATES.find(t => t.key === selectedTemplateKey)!;
                          const template = emailTemplates.find(t => t.key === selectedTemplateKey) || {
                            id: "",
                            key: selectedTemplateKey,
                            name: hardcoded.name,
                            subject: "",
                            body: "",
                            variables: hardcoded.variables,
                            isActive: true
                          };
                          return (
                            <AdvancedTemplateEditor
                              template={template}
                              onUpdate={handleTemplateUpdate}
                              onSave={saveTemplate}
                              isSaving={isSaving}
                            />
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'rewards' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {renderSectionHeader("Ödül Sistemi", "Kullanıcı etkileşimini artıracak ödüller.", Gift)}
                    <div className="grid gap-6">
                      <div className="p-1 max-w-md">
                        <ToggleField label="Ödül Sistmini Etkinleştir" isChecked={localSettings["REWARDS_EnableRewards"] === "true"} onToggle={() => handleInputChange("REWARDS_EnableRewards", localSettings["REWARDS_EnableRewards"] === "true" ? "false" : "true")} description="Site genelinde tüm ödül ve puan kazanım süreçlerini açar veya kapatır." />
                      </div>
                      <div className="grid gap-6 md:grid-cols-2 mt-4">
                        <InputField label="Günlük Giriş Ödülü (Jeton)" value={localSettings["REWARDS_DailyLoginReward"] || ""} onChange={(v) => handleInputChange("REWARDS_DailyLoginReward", v)} placeholder="5" />
                        <InputField label="Referans Ödülü (Jeton)" value={localSettings["REWARDS_ReferralReward"] || ""} onChange={(v) => handleInputChange("REWARDS_ReferralReward", v)} placeholder="50" />
                        <InputField label="İlk Kayıt Bonusu (Jeton)" value={localSettings["REWARDS_FirstRegistrationBonus"] || ""} onChange={(v) => handleInputChange("REWARDS_FirstRegistrationBonus", v)} placeholder="100" />
                        <InputField label="Yorum Yazma Ödülü (Jeton)" value={localSettings["REWARDS_CommentReward"] || ""} onChange={(v) => handleInputChange("REWARDS_CommentReward", v)} placeholder="2" />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'tools' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {renderSectionHeader("Sistem Araçları", "Veritabanı ve performans bakım işlemleri.", Server)}
                    
                    <div className="grid gap-8 max-w-4xl">
                      <div className="glass-island rounded-[2.5rem] p-8 border-primary/10 bg-primary/5">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                              <RefreshCw className="h-6 w-6" />
                            </div>
                            <div>
                              <h3 className="text-lg font-black">Arama İndeksini Yeniden Oluştur</h3>
                              <p className="text-xs font-bold text-base-content/50 mt-1">Sistemdeki tüm kitapları ve yazarları tekrar tarayıp arama motoruna kaydeder.</p>
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              setIsSaving(true);
                              try {
                                const res = await apiRequest<{ totalIndexed: number }>('/search/rebuild', { method: 'POST' });
                                toast.success({ description: `${res.totalIndexed} öğe başarıyla yeniden indekslendi.` });
                              } catch {
                                toast.error({ description: "Arama indeksi oluşturulamadı." });
                              } finally {
                                setIsSaving(false);
                              }
                            }}
                            disabled={isSaving}
                            className="btn btn-primary rounded-2xl px-8 h-14 font-black gap-2 shadow-xl shadow-primary/20"
                          >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                            Hemen Başlat
                          </button>
                        </div>
                      </div>

                      <div className="glass-island rounded-[2.5rem] p-8 opacity-40 grayscale pointer-events-none">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-base-content/10 flex items-center justify-center">
                            <Trash2 className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="text-lg font-black">Önbelleği Temizle (Yakında)</h3>
                            <p className="text-xs font-bold text-base-content/50 mt-1">Tüm Redis ve CDN önbelleğini sıfırlar.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="absolute top-0 right-0 p-12 opacity-[0.01] pointer-events-none select-none">
              <HardDrive className="h-96 w-96 -mr-20 -mt-20" />
            </div>
          </div>
        </div>
      </div>
      <div className="glass-island rounded-[2.5rem] p-6 bg-linear-to-br from-primary/5 via-transparent to-transparent border-primary/5 max-w-3xl mt-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Sistem Durumu</h4>
            <p className="text-xs font-bold text-base-content/50 leading-relaxed mt-1">
              Değişikliklerin çoğu gerçek zamanlı olarak tüm sunuculara yansıtılır. Kritik ayarları değiştirirken dikkatli olun.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
