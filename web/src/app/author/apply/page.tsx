"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronRight, 
  ChevronLeft, 
  Zap, 
  BookOpen, 
  PenTool, 
  ShieldCheck, 
  CheckCircle2,
  AlertCircle,
  Clock
} from "lucide-react";
import { TiptapEditor, TiptapEditorRef } from "@/components/editor/TiptapEditor";
import { apiRequest } from "@/lib/api";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { LegalDocumentModal } from "@/components/legal/legal-document-modal";

const steps = [
  { id: "experience", title: "Deneyim", icon: PenTool },
  { id: "genres", title: "Türler", icon: BookOpen },
  { id: "sample", title: "Örnek Metin", icon: Zap },
  { id: "terms", title: "Onay", icon: ShieldCheck },
];

export default function AuthorApplyPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [experience, setExperience] = useState("");
  const [plannedWork, setPlannedWork] = useState("");
  const [sampleContent, setSampleContent] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingApplication, setPendingApplication] = useState<any>(null);
  const [legalSlug, setLegalSlug] = useState<string | null>(null);
  
  const editorRef = useRef<TiptapEditorRef>(null);
  const router = useRouter();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await apiRequest("/author/apply", { method: "GET" });
        if ((res as any).isSuccess && (res as any).data) {
          setPendingApplication((res as any).data);
        }
      } catch (e) {
        console.error("Status check failed", e);
      } finally {
        setIsLoading(false);
      }
    };
    checkStatus();
  }, []);

  const handleNext = () => {
    // Validasyon Kontrolleri
    if (currentStep === 0) {
      if (experience.trim().length < 20) {
        toast.error({ description: "Lütfen yazarlık deneyiminizi biraz daha detaylı açıklayın (En az 20 karakter)." });
        return;
      }
    }

    if (currentStep === 1) {
      if (plannedWork.trim().length < 20) {
        toast.error({ description: "Planladığınız eserler hakkında biraz bilgi verin (En az 20 karakter)." });
        return;
      }
    }

    if (currentStep === 2) {
      // HTML etiketlerini temizleyip gerçek karakter sayısına bakıyoruz
      const plainText = sampleContent.replace(/<[^>]*>/g, '').trim();
      if (plainText.length < 20) {
        toast.error({ description: "Lütfen stilinizi yansıtan en az 20 karakterlik bir örnek metin girin." });
        return;
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async () => {
    if (!termsAccepted) {
      toast.error({ description: "Lütfen şartları onaylayın." });
      return;
    }

    const plainText = sampleContent.replace(/<[^>]*>/g, '').trim();
    
    if (plainText.length < 20) {
        toast.error({ description: "Lütfen stilinizi yansıtan en az 20 karakterlik bir örnek metin paylaşın." });
        return;
    }

    setIsSubmitting(true);
    try {
      // Birleştirilmiş veri
      const finalPlannedWork = plannedWork;

      const res = await apiRequest("/author/apply", {
        method: "POST",
        body: JSON.stringify({
          sampleContent,
          experience,
          plannedWork: finalPlannedWork,
        }),
      });

      if ((res as any).isSuccess) {
        toast.success({ description: "Başvurunuz başarıyla alındı! Ekibimiz en kısa sürede inceleyecektir." });
        router.push("/profile");
      }
    } catch (e: any) {
      toast.error({ description: e.message || "Başvuru sırasında bir hata oluştu." });
    } finally {
      setIsSubmitting(false);
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (pendingApplication) {
    return (
      <div className="min-h-screen pt-24 pb-20 px-4 sm:px-8 flex flex-col items-center justify-center">
        <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl w-full glass-island rounded-[40px] p-12 text-center relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-8 opacity-5">
                <Clock className="w-64 h-64 text-primary" />
            </div>
            
            <div className="w-24 h-24 bg-primary/10 rounded-[32px] flex items-center justify-center mx-auto mb-8">
                <Clock className="w-12 h-12 text-primary animate-pulse" />
            </div>

            <h1 className="text-3xl font-black mb-4 uppercase tracking-tighter transition-all">Başvurunuz <span className="text-primary italic">İnceleniyor</span></h1>
            <p className="text-base-content/60 text-lg mb-8">
                Hali hazırda bekleyen bir yazarlık başvurunuz bulunmaktadır. Editör ekibimiz örnek metninizi ve deneyimlerinizi titizlikle inceliyor.
            </p>

            <div className="bg-base-200/50 rounded-3xl p-6 mb-8 text-left border border-base-content/5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-success" />
                    </div>
                    <div>
                        <p className="text-xs text-base-content/40 font-bold uppercase tracking-wider">Başvuru Tarihi</p>
                        <p className="font-bold">{new Date(pendingApplication.createdAt).toLocaleDateString("tr-TR", { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                        <p className="text-xs text-base-content/40 font-bold uppercase tracking-wider">Mevcut Durum</p>
                        <p className="font-bold">Editör İncelemesinde</p>
                    </div>
                </div>
            </div>

            <button 
                onClick={() => router.push("/")}
                className="btn btn-primary btn-wide rounded-2xl font-black"
            >
                Ana Sayfaya Dön
            </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-black tracking-tight text-base-content mb-4"
          >
            EpikYazar <span className="text-primary italic">Ailesine Katıl</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-base-content/60"
          >
            Hayal gücünü milyonlarla buluşturmak için ilk adımı at.
          </motion.p>
        </div>

        {/* Stepper Progress */}
        <div className="glass-island rounded-3xl p-6 mb-8 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-primary/10 -translate-y-1/2 z-0 hidden sm:block" />
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center">
                <div 
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                    isActive ? "bg-primary text-primary-content shadow-lg shadow-primary/30" : 
                    isCompleted ? "bg-success text-success-content" : 
                    "bg-base-200 text-base-content/40"
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                </div>
                <span className={`mt-2 text-xs font-bold uppercase tracking-widest hidden sm:block ${
                  isActive ? "text-primary" : "text-base-content/40"
                }`}>
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Form Content */}
        <div className="glass-island rounded-[32px] p-8 sm:p-12 mb-8 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="min-h-[400px]"
            >
              {currentStep === 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <PenTool className="text-primary w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black">Yazarlık Geçmişiniz</h2>
                        <p className="text-base-content/60 text-sm">Daha önceki deneyimlerinizden bahsedin.</p>
                    </div>
                  </div>

                  <div className="form-control w-full flex flex-col gap-2">
                    <label className="label pb-0">
                      <span className="label-text font-bold text-lg">
                        Deneyiminiz ve Kullandığınız Platformlar
                        <span className="text-error ml-1">*</span>
                      </span>
                    </label>
                    <textarea 
                      className="textarea textarea-bordered min-h-[250px] rounded-2xl text-lg p-4 bg-base-200/50 focus:bg-base-100 transition-colors w-full"
                      placeholder="Daha önce Wattpad, Inkitt, WebNovel gibi platformlarda yazdınız mı? Veya basılmış bir eseriniz var mı? Lütfen kısaca özetleyin..."
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center">
                        <BookOpen className="text-secondary w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black">Planladığınız Eserler</h2>
                        <p className="text-base-content/60 text-sm">Epiknovel'deki gelecek projelerinizden bahsedin.</p>
                    </div>
                  </div>


                  <div className="form-control w-full flex flex-col gap-2">
                    <label className="label pb-0">
                      <span className="label-text font-bold text-lg">
                        Üretmek İstediğiniz Eserler Hakkında Bilgi
                        <span className="text-error ml-1">*</span>
                      </span>
                    </label>
                    <textarea 
                      className="textarea textarea-bordered min-h-[150px] rounded-2xl text-lg p-4 bg-base-200/50 focus:bg-base-100 transition-colors w-full"
                      placeholder="Epiknovel üzerinde ne tür bir hikaye kurgulamayı düşünüyorsunuz? Serinin genel atmosferinden bahsedin..."
                      value={plannedWork}
                      onChange={(e) => setPlannedWork(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                        <Zap className="text-accent w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black">Örnek Roman Metni</h2>
                        <p className="text-base-content/60 text-sm">Yazım stilinizi göstermek için en az 1-2 paragraf örnek paylaşın.</p>
                    </div>
                  </div>

                  <div className="min-h-[500px]">
                     <TiptapEditor 
                       initialContent={sampleContent}
                       onChange={(html) => setSampleContent(html)}
                       placeholder="Hikayenizin ilk sahnelerini buraya dökün..."
                       minHeight="450px"
                       isSimple={true}
                     />
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center">
                        <ShieldCheck className="text-success w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black">Son Onaylar</h2>
                        <p className="text-base-content/60 text-sm">Başvurunuzu tamamlamak için şartları kabul edin.</p>
                    </div>
                  </div>

                  <div className="bg-base-200/50 rounded-3xl p-6 border border-base-content/5">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-warning" />
                        Başvuru Bilgilendirmesi
                    </h3>
                    <ul className="space-y-3 text-sm text-base-content/70">
                        <li>• Başvurunuz editör ekibimiz tarafından incelenecektir.</li>
                        <li>• İnceleme süreci yoğunluğa bağlı olarak 3-7 iş günü sürebilir.</li>
                        <li>• Onay durumunda profilinize "Yazar" rozeti eklenecek ve yazar paneline erişiminiz açılacaktır.</li>
                        <li>• Paylaştığınız örnek metnin özgün olması zorunludur. Alıntı veya çalıntı durumunda platformdan süresiz uzaklaştırılabilirsiniz.</li>
                    </ul>
                  </div>

                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-4">
                      <input 
                        type="checkbox" 
                        className="checkbox checkbox-primary rounded-lg" 
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                      />
                      <span className="label-text font-semibold">
                        Epiknovel <button type="button" onClick={() => setLegalSlug("author-terms")} className="text-primary hover:underline">Yazarlık Şartlarını</button> ve <button type="button" onClick={() => setLegalSlug("copyright-policy")} className="text-primary hover:underline">Telif Politikalarını</button> okudum, kabul ediyorum.
                      </span>
                    </label>
                  </div>

                  <div className="p-8 border-2 border-dashed border-primary/20 rounded-3xl text-center bg-primary/5">
                        <p className="text-primary font-black uppercase tracking-tighter text-xl">Her şey hazır!</p>
                        <p className="text-sm text-primary/60 mt-1">Başvurunu göndererek Epiknovel dünyasına adımını atabilirsin.</p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer Buttons */}
          <div className="mt-12 flex justify-between items-center pt-8 border-t border-base-content/10">
            <button
                type="button"
                onClick={handleBack}
                disabled={currentStep === 0 || isSubmitting}
                className={`btn btn-ghost rounded-2xl gap-2 font-bold ${currentStep === 0 ? 'invisible' : ''}`}
            >
                <ChevronLeft className="w-5 h-5" /> Geri
            </button>

            {currentStep < steps.length - 1 ? (
                <button
                    type="button"
                    onClick={handleNext}
                    className="btn btn-primary rounded-2xl px-8 gap-2 font-black shadow-xl shadow-primary/25"
                >
                    Devam Et <ChevronRight className="w-5 h-5" />
                </button>
            ) : (
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !termsAccepted}
                    className="btn btn-primary rounded-2xl px-12 gap-2 font-black shadow-xl shadow-primary/25"
                >
                   {isSubmitting ? <span className="loading loading-spinner"></span> : "Başvuruyu Gönder"}
                </button>
            )}
          </div>
        </div>
      </div>
      <LegalDocumentModal 
        slug={legalSlug || ""} 
        isOpen={!!legalSlug} 
        onClose={() => setLegalSlug(null)} 
      />
    </div>
  );
}
