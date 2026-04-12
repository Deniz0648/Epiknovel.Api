"use client";

import Link from "next/link";
import { useState } from "react";
import { Home, Send, AlertCircle, MessageCircle, Lightbulb, HelpCircle, ChevronRight, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/toast";

type Category = "Şikayet" | "İstek" | "Öneri" | "Diğer";

export default function NewSupportTicketPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<Category>("Şikayet");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title || !description) {
      showToast({ title: "Hata", description: "Lütfen tüm alanları doldurun.", tone: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest("/management/support/tickets", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          category: selectedCategory
        })
      });

      showToast({ title: "Başarılı", description: "Destek talebiniz oluşturuldu.", tone: "success" });
      router.push("/support");
    } catch (err) {
      console.error("Talep olusturulurken hata:", err);
      showToast({ title: "Hata", description: "Talep oluşturulurken bir hata oluştu.", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    { id: "Şikayet" as Category, icon: AlertCircle, label: "Şikayet", color: "text-error", bg: "bg-error/10", border: "border-error/20", desc: "Hatalar, ihlaller veya mağduriyet durumları" },
    { id: "İstek" as Category, icon: MessageCircle, label: "İstek", color: "text-info", bg: "bg-info/10", border: "border-info/20", desc: "Kategori eksikliği, özellik talepleri vb." },
    { id: "Öneri" as Category, icon: Lightbulb, label: "Öneri", color: "text-success", bg: "bg-success/10", border: "border-success/20", desc: "Platformu iyileştirmeye yönelik her türlü fikir" },
    { id: "Diğer" as Category, icon: HelpCircle, label: "Diğer", color: "text-base-content/60", bg: "bg-base-content/5", border: "border-base-content/10", desc: "Diğer konular hakkında destek talepleri" },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="site-shell mx-auto flex flex-col gap-6 px-4 pb-12 pt-28 sm:px-8 sm:pt-32">
        <section className="glass-frame space-y-7 p-6 sm:p-10">
          {/* Breadcrumb */}
          <div className="breadcrumbs text-xs font-semibold text-base-content/50">
            <ul>
              <li>
                <Link href="/" className="hover:text-primary transition-colors flex items-center">
                  <Home className="w-3.5 h-3.5 mr-1.5" /> Ana Sayfa
                </Link>
              </li>
              <li>
                <Link href="/support" className="hover:text-primary transition-colors">Destek Merkezi</Link>
              </li>
              <li className="text-base-content/40">Yeni Talep</li>
            </ul>
          </div>

          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black text-base-content sm:text-3xl">Yeni Destek Talebi</h1>
            <p className="text-sm font-medium text-base-content/50">Platform ekibimize mesajınızı iletin.</p>
          </div>

          <div className="mx-auto max-w-4xl space-y-6 pt-4">
            {/* Category Selection */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-base-content/40 ml-1">Konu Kategorisi</label>
              <div className="grid gap-3 sm:grid-cols-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-start gap-4 rounded-2xl border p-4 text-left transition-all ${
                      selectedCategory === cat.id
                        ? `${cat.border} ${cat.bg} shadow-md`
                        : "border-base-content/10 bg-base-100/20 hover:border-base-content/20"
                    }`}
                  >
                    <div className={`mt-1 h-5 w-5 shrink-0 ${cat.color}`}>
                      <cat.icon className="h-full w-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-bold ${selectedCategory === cat.id ? "text-base-content" : "text-base-content/80"}`}>{cat.label}</p>
                      <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-base-content/40">{cat.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Title Input */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-base-content/40 ml-1">Başlık</label>
              <input
                type="text"
                placeholder="Kısaca konuyu özetleyin..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-2xl border border-base-content/10 bg-base-100/32 px-5 py-4 text-sm font-medium focus:border-primary/50 focus:outline-none transition-colors"
                disabled={isSubmitting}
              />
            </div>

            {/* Message Input */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-base-content/40 ml-1">Mesajınız</label>
              <textarea
                placeholder="Detaylı bir şekilde açıklayın..."
                rows={8}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full resize-none rounded-2xl border border-base-content/10 bg-base-100/32 px-5 py-4 text-sm font-medium focus:border-primary/50 focus:outline-none transition-colors"
                disabled={isSubmitting}
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="btn btn-primary h-14 w-full rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Talebi Gönder
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
