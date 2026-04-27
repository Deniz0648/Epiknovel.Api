import React, { useState, useEffect, useMemo } from "react";
import { useComments, CommentItem as CommentItemType } from "@/hooks/useComments";
import { CommentItem } from "./CommentItem";
import { CommentInput } from "./CommentInput";
import { MessageSquare, RefreshCw, ChevronUp, X, AlertTriangle, Flag } from "lucide-react";
import { connectHub } from "@/lib/signalr-client";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

// --- Report Modal ---
interface ReportModalProps {
  comment: CommentItemType;
  onClose: () => void;
  onSubmit: (reason: number, description: string) => Promise<void>;
}

const REASONS = [
  { id: 1, label: "Spam / Gereksiz", icon: "🚫" },
  { id: 2, label: "Taciz / Rahatsız Edici", icon: "⚠️" },
  { id: 3, label: "Spoiler (Sürpriz Bozan)", icon: "🤫" },
  { id: 4, label: "Uygunsuz İçerik", icon: "🔞" },
  { id: 5, label: "Telif Hakkı İhlali", icon: "⚖️" },
  { id: 99, label: "Diğer", icon: "📝" },
];

function ReportModal({ comment, onClose, onSubmit }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (selectedReason === null) {
      toast.error("Lütfen bir neden seçin.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(selectedReason, description);
      onClose();
    } catch (err) {
      // toast handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-base-100 border border-base-content/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-error/10 text-error">
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-xl font-black tracking-tight">Yorumu Bildir</h3>
            </div>
            <button 
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-base-content/5 text-base-content/40 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="bg-base-200/50 rounded-2xl p-4 mb-6 border border-base-content/5">
            <p className="text-xs font-bold text-base-content/40 uppercase tracking-widest mb-2">Seçilen Yorum</p>
            <p className="text-sm font-medium line-clamp-2 italic">"{comment.content.replace(/<[^>]*>/g, '')}"</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-6">
            {REASONS.map((reason) => (
              <button
                key={reason.id}
                onClick={() => setSelectedReason(reason.id)}
                className={clsx(
                  "flex items-center gap-2 p-3 rounded-2xl text-left text-xs font-bold transition-all border",
                  selectedReason === reason.id 
                    ? "bg-primary border-primary text-primary-content shadow-lg shadow-primary/20" 
                    : "bg-base-200/50 border-transparent hover:border-base-content/10"
                )}
              >
                <span>{reason.icon}</span>
                {reason.label}
              </button>
            ))}
          </div>

          <div className="mb-6">
            <label className="text-[10px] font-black uppercase tracking-widest text-base-content/40 ml-1 mb-1.5 block">
              Ek Açıklama (Opsiyonel)
            </label>
            <textarea
              className="textarea textarea-bordered w-full rounded-2xl bg-base-200/50 focus:bg-base-100 transition-all font-medium text-sm"
              rows={3}
              placeholder="Neden bildirdiğinizi kısaca açıklayabilirsiniz..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <button 
            disabled={isSubmitting || selectedReason === null}
            onClick={handleSubmit}
            className="btn btn-error w-full rounded-2xl font-black uppercase tracking-widest h-14"
          >
            {isSubmitting ? <span className="loading loading-spinner" /> : "Şikayet Et"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface CommentSectionProps {
  bookId?: string;
  chapterId?: string;
  paragraphId?: string;
  authorName?: string;
  title?: string;
  className?: string;
  hideList?: boolean;
  onCommentAdded?: (paragraphId?: string) => void;
}

export function CommentSection({ 
  bookId, 
  chapterId, 
  paragraphId, 
  authorName,
  title = "Yorumlar",
  className,
  hideList = false,
  onCommentAdded
}: CommentSectionProps) {
  const { 
    comments, 
    totalCount, 
    isLoading, 
    hasMore, 
    loadMore, 
    addComment, 
    updateComment,
    deleteComment,
    toggleLike, 
    reportComment,
    revealSpoiler,
    isRevealingMap,
    isSubmitting,
    loadComments,
    loadReplies
  } = useComments({ 
    bookId, 
    chapterId, 
    paragraphId, 
    pageSize: 15,
    sortBy: "newest" 
  });
  
  const { profile } = useAuth();

  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [reportingComment, setReportingComment] = useState<CommentItemType | null>(null);
  const [newCommentsCount, setNewCommentsCount] = useState(0);

  // SignalR Integration
  useEffect(() => {
    const hub = connectHub("/hubs/notifications", {
      onInvocation: (msg) => {
        if (msg.target === "NewCommentArrived") {
          const payload = msg.args[0] as any;
          // Check if it belongs to current scope
          const isMatching = 
            (bookId && payload.bookId === bookId) || 
            (chapterId && payload.chapterId === chapterId) ||
            (paragraphId && payload.paragraphId === paragraphId);

          if (isMatching) {
            // Eğer yorumu yapan kişi mevcut kullanıcı ise (Kendi yorumum)
            if (profile && payload.userId === profile.userId) {
              loadComments(1, true); // Listeyi anında yenile
            } else {
              setNewCommentsCount((prev: number) => prev + 1);
            }
          }
        }
      }
    });

    return () => hub.dispose();
  }, [bookId, chapterId, paragraphId]);

  const participants = useMemo(() => {
    const names = comments.map((c: CommentItemType) => c.authorInfo?.displayName).filter(Boolean) as string[];
    return Array.from(new Set(names));
  }, [comments]);

  const handleRefresh = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setNewCommentsCount(0);
    // State-based reload
    loadComments(1, true);
  };

  const handleReplySubmit = async (content: string, isSpoiler: boolean) => {
    if (!activeReplyId) return;
    try {
      await addComment(content, isSpoiler, activeReplyId);
      onCommentAdded?.(paragraphId);
      setActiveReplyId(null);
      loadComments(1, true); 
    } catch (err) {}
  };

  return (
    <div className="flex flex-col gap-6">
      <AnimatePresence>
        {reportingComment && (
          <ReportModal 
            comment={reportingComment} 
            onClose={() => setReportingComment(null)}
            onSubmit={async (reason, desc) => {
              await reportComment(reportingComment.id, reason, desc);
              setReportingComment(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      {!hideList && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">{title}</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-base-content/40">
                {totalCount} Toplam Yorum
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      {profile ? (
        <CommentInput 
          onSubmit={async (content, isSpoiler) => {
            await addComment(content, isSpoiler);
            onCommentAdded?.(paragraphId);
          }}
          isSubmitting={isSubmitting}
          authorName={authorName}
          participants={participants}
          placeholder={paragraphId ? "Bu satır hakkında ne düşünüyorsun?" : "Dünyaya düşüncelerini anlat..."}
        />
      ) : (
        <div className="bg-base-200/50 border border-base-content/5 rounded-2xl p-6 text-center">
           <p className="text-sm font-bold text-base-content/60 mb-3">Yorum yapabilmek için giriş yapmalısınız.</p>
           <button 
             onClick={() => window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`}
             className="btn btn-primary btn-sm rounded-xl px-6"
           >
             Giriş Yap
           </button>
        </div>
      )}

      {/* List / Content Section */}
      {!hideList && (
        <>
          {/* New Comments Toast/Alert */}
          <AnimatePresence>
            {newCommentsCount > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="sticky top-20 z-20 flex justify-center"
              >
                <button 
                  onClick={handleRefresh}
                  className="btn btn-primary btn-sm rounded-full bg-primary shadow-xl shadow-primary/30 flex items-center gap-2 px-6 py-2 h-10"
                >
                  <RefreshCw size={14} className="animate-spin-slow" />
                  <span className="text-xs font-bold">{newCommentsCount} Yeni Yorum Var</span>
                  <ChevronUp size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* List */}
          <div className="flex flex-col gap-4">
            {comments.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-base-content/5">
                  <MessageSquare size={32} />
                </div>
                <h4 className="text-lg font-black">Henüz yorum yok</h4>
                <p className="text-xs font-bold">İlk yorumu sen yaparak tartışmayı başlat!</p>
              </div>
            ) : (
              comments.map((comment: CommentItemType) => (
                <div key={comment.id} className={clsx("flex flex-col", (!!chapterId || !!paragraphId) ? "gap-0" : "gap-3")}>
                  <CommentItem 
                    comment={comment} 
                    onLike={toggleLike}
                    onReply={(c) => {
                      if (!profile) {
                        toast.error("Yanıt vermek için giriş yapmalısınız.");
                        return;
                      }
                      setActiveReplyId(activeReplyId === c.id ? null : c.id);
                    }}
                    onReport={(c) => {
                      if (!profile) {
                        toast.error("Şikayet etmek için giriş yapmalısınız.");
                        return;
                      }
                      setReportingComment(c);
                    }}
                    onReveal={revealSpoiler}
                    onReplySubmit={handleReplySubmit}
                    onUpdate={updateComment}
                    onDelete={deleteComment}
                    onLoadReplies={loadReplies}
                    activeReplyId={activeReplyId}
                    isRevealing={isRevealingMap[comment.id]}
                    isSubmitting={isSubmitting}
                    compact={!!chapterId || !!paragraphId}
                  />
                </div>
              ))
            )}

            {hasMore && (
              <div className="mt-4 flex justify-center">
                <button 
                  onClick={loadMore}
                  disabled={isLoading}
                  className={clsx(
                    "btn btn-ghost btn-sm rounded-full px-8 border border-base-content/10",
                    isLoading && "loading"
                  )}
                >
                  Daha Fazla Göster
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
