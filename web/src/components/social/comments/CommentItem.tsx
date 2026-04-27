import React, { useState, useMemo } from "react";
import { 
  Heart, 
  MessageCircle, 
  MoreHorizontal, 
  Pin, 
  Flag, 
  Edit2, 
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  AlertTriangle,
  X
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { toMediaProxyUrl } from "@/lib/media";
import { motion, AnimatePresence } from "framer-motion";
import { CommentItem as CommentItemType } from "@/hooks/useComments";
import { clsx } from "clsx";
import { CommentInput } from "./CommentInput";

interface CommentItemProps {
  comment: CommentItemType;
  onLike: (id: string) => void;
  onReply: (comment: CommentItemType) => void;
  onReveal: (id: string, token: string) => void;
  onReport: (comment: CommentItemType) => void;
  onReplySubmit: (content: string, isSpoiler: boolean) => Promise<void>;
  onUpdate: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isRevealing?: boolean;
  isSubmitting: boolean;
  activeReplyId?: string | null;
  isChild?: boolean;
  compact?: boolean;
  onLoadReplies?: (commentId: string) => Promise<void>;
}

export function CommentItem({ 
  comment, 
  onLike, 
  onReply, 
  onReveal,
  onReport,
  onReplySubmit,
  onUpdate,
  onDelete,
  onLoadReplies,
  isRevealing,
  isSubmitting,
  activeReplyId,
  isChild = false,
  compact = false
}: CommentItemProps) {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);

  // Client-side double check for 30 min window
  const canEditTimeWise = useMemo(() => {
    if (!comment.canEdit) return false;
    const createdAt = new Date(comment.createdAt).getTime();
    const now = Date.now();
    return (now - createdAt) < (30 * 60 * 1000);
  }, [comment.canEdit, comment.createdAt]);

  const handleReveal = () => {
    const token = (comment as any).contentToken;
    if (token) {
      onReveal(comment.id, token);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setShowActions(false);
  };

  const handleDelete = async () => {
    if (window.confirm("Bu yorumu silmek istediğinize emin misiniz?")) {
      await onDelete(comment.id);
      setShowActions(false);
    }
  };

  const handleShowMore = async () => {
    if (!showAllReplies && onLoadReplies) {
      setIsLoadingReplies(true);
      await onLoadReplies(comment.id);
      setIsLoadingReplies(false);
    }
    setShowAllReplies(!showAllReplies);
  };

  return (
    <div 
      id={`comment-${comment.id}`}
      className={clsx(
      "group relative flex flex-col gap-2 transition-all duration-300",
      isChild ? "mt-2 pl-4 border-l-2 border-base-content/5" : compact ? "py-3 border-b border-base-content/5" : "bg-base-100/40 p-4 border border-base-content/5 hover:border-primary/20 shadow-sm rounded-2xl",
      comment.isPinned && !compact && "ring-1 ring-primary/30 bg-primary/5"
    )}>
      {/* Upper Meta: Pinned status */}
      {comment.isPinned && (
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary mb-1">
          <Pin size={12} className="fill-current" /> Sabitlendi
        </div>
      )}

      {/* Header: User Info */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={clsx(
            "relative shrink-0 overflow-hidden rounded-xl ring-1 ring-base-content/10 bg-base-300",
            compact ? "h-8 w-8" : "h-9 w-9"
          )}>
            {comment.authorInfo?.avatarUrl ? (
              <img 
                src={toMediaProxyUrl(comment.authorInfo.avatarUrl) || ''} 
                alt={comment.authorInfo.displayName} 
                className="h-full w-full object-cover" 
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-black text-primary">
                {comment.authorInfo?.displayName?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className={clsx("font-bold leading-none", compact ? "text-[13px]" : "text-sm")}>{comment.authorInfo?.displayName}</span>
              {comment.isAuthorComment && (
                <span className="rounded bg-primary/10 px-1 py-0.5 text-[9px] font-black text-primary uppercase">Yazar</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-base-content/20 mt-0.5 uppercase tracking-tighter">
              <span>@{comment.authorInfo?.userSlug}</span>
              <span>•</span>
              <span title={new Date(comment.createdAt).toLocaleString("tr-TR")}>
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: tr })}
              </span>
              {comment.isEdited && (
                <span className="flex items-center gap-0.5 text-primary/50 cursor-help" title="Bu yorum düzenlendi">
                  <Edit2 size={10} /> Düzenlendi
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Dropdown */}
        <div className="relative flex items-center">
          <button 
            onClick={() => setShowActions(!showActions)}
            className={clsx(
              "btn btn-ghost btn-xs btn-circle transition-all",
              showActions 
                ? "bg-base-content/10 text-primary" 
                : (comment.canEdit || comment.canDelete)
                  ? "text-base-content/40 hover:text-primary opacity-100 lg:opacity-40 lg:hover:opacity-100"
                  : "opacity-0 group-hover:opacity-100 text-base-content/40 hover:text-primary"
            )}
          >
            <MoreHorizontal size={14} />
          </button>
          
          <AnimatePresence>
            {showActions && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowActions(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute right-0 top-full mt-2 z-30 w-44 bg-base-100 border border-base-content/10 rounded-2xl p-1.5 shadow-2xl"
                >
                  {canEditTimeWise && (
                    <button 
                      onClick={handleEdit}
                      className="flex w-full items-center gap-2.5 p-2.5 rounded-xl hover:bg-primary/10 text-primary transition-colors text-[11px] font-black uppercase tracking-widest"
                    >
                      <Edit2 size={14} /> Düzenle
                    </button>
                  )}
                  {comment.canDelete && (
                    <button 
                      onClick={handleDelete}
                      className="flex w-full items-center gap-2.5 p-2.5 rounded-xl hover:bg-error/10 text-error transition-colors text-[11px] font-black uppercase tracking-widest"
                    >
                      <Trash2 size={14} /> Sil
                    </button>
                  )}
                  <button 
                    onClick={() => { onReport(comment); setShowActions(false); }}
                    className="flex w-full items-center gap-2.5 p-2.5 rounded-xl hover:bg-base-content/5 text-base-content/50 transition-colors text-[11px] font-bold uppercase tracking-widest"
                  >
                    <Flag size={14} /> Bildir
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      <div className="relative mt-1">
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div 
               key="editing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="bg-base-200/50 rounded-2xl p-2 border border-primary/20"
            >
               <CommentInput 
                 onSubmit={async (content) => {
                   await onUpdate(comment.id, content);
                   setIsEditing(false);
                 }}
                 isSubmitting={isSubmitting}
                 initialContent={comment.content}
                 onCancel={() => setIsEditing(false)}
                 placeholder="Yorumunu düzenle..."
                 autoFocus
               />
            </motion.div>
          ) : comment.isSpoiler ? (
            <motion.div 
              key="spoiler"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="relative overflow-hidden rounded-2xl bg-base-300/40 p-4 border border-base-content/5 backdrop-blur-sm"
            >
              <div className="flex flex-col items-center justify-center gap-3 py-2 text-center">
                <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center text-warning">
                  <Eye size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold">Bu yorum spoiler içeriyor!</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-base-content/30">HİKAYE DETAYI GİZLENDİ</p>
                </div>
                <button 
                  onClick={handleReveal}
                  disabled={isRevealing}
                  className="btn btn-warning btn-xs rounded-full px-6 h-9 font-black uppercase tracking-widest text-[10px]"
                >
                  {isRevealing ? <Loader2 size={14} className="animate-spin" /> : "İçeriği Göster"}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="content"
              initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-sm font-medium leading-relaxed text-base-content/90 prose-sm prose-p:my-1 px-1"
              dangerouslySetInnerHTML={{ __html: comment.content }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Actions Bar */}
      {!isEditing && (
        <div className="mt-2 flex items-center gap-4">
          <button 
            onClick={() => onLike(comment.id)}
            className={clsx(
              "flex items-center gap-1.5 text-[11px] font-black uppercase tracking-tighter transition-all duration-300 px-2 py-1 rounded-full",
              comment.isLikedByCurrentUser 
                ? "bg-rose-500/10 text-rose-500 scale-105" 
                : "text-base-content/40 hover:bg-rose-500/5 hover:text-rose-500/80 hover:scale-105"
            )}
          >
            <motion.div
              animate={{ scale: comment.isLikedByCurrentUser ? [1, 1.3, 1.05] : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Heart 
                size={16} 
                fill={comment.isLikedByCurrentUser ? "currentColor" : "none"}
                className={clsx(
                  "transition-all duration-300",
                  comment.isLikedByCurrentUser ? "text-rose-500 fill-rose-500" : ""
                )} 
              />
            </motion.div>
            <span>{comment.likeCount > 0 ? comment.likeCount : "Beğen"}</span>
          </button>

          <button 
            onClick={() => onReply(comment)}
            className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-tighter text-base-content/40 transition-all hover:text-primary hover:scale-105 active:scale-95 px-2 py-1 rounded-full hover:bg-primary/5"
          >
            <MessageCircle size={16} />
            <span>{comment.replyCount > 0 ? comment.replyCount : "Yanıtla"}</span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            {/* Show if author? */}
          </div>
        </div>
      )}

      {/* Inline Reply Input */}
      <AnimatePresence>
        {activeReplyId === comment.id && !isEditing && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="overflow-hidden bg-base-200/30 rounded-2xl p-2 border border-base-content/5"
          >
            <CommentInput 
              onSubmit={onReplySubmit}
              isSubmitting={isSubmitting}
              initialContent={isChild ? `<span data-type="mention" class="text-primary font-bold decoration-primary/30 underline decoration-2 underline-offset-4" data-id="${comment.authorInfo?.userSlug}">@${comment.authorInfo?.userSlug}</span> ` : ""}
              placeholder={`@${comment.authorInfo?.displayName} kullanıcısına yanıt ver...`}
              autoFocus
              onCancel={() => onReply(comment)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions & Replies Loading Button */}
      {!isEditing && (
        <div className="mt-2 flex flex-col items-start ml-2">
          {comment.replyCount > 2 && (
            <button 
              onClick={handleShowMore}
              disabled={isLoadingReplies}
              className="flex items-center gap-1.5 text-[11px] font-black text-primary/60 hover:text-primary transition-colors uppercase tracking-wider mt-1 px-1"
            >
              {isLoadingReplies ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : showAllReplies ? (
                <><ChevronUp size={14} /> Yanıtları Gizle</>
              ) : (
                <><ChevronDown size={14} /> Tüm Yanıtları Gör ({comment.replyCount})</>
              )}
            </button>
          )}
        </div>
      )}

      {/* Recursive Replies Rendering */}
      {!isChild && comment.topReplies?.length > 0 && !isEditing && (
        <div className="mt-3 space-y-3">
          {(showAllReplies ? comment.topReplies : comment.topReplies.slice(0, 2)).map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onLike={onLike}
              onReply={onReply}
              onReveal={onReveal}
              onReport={onReport}
              onReplySubmit={onReplySubmit}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onLoadReplies={onLoadReplies}
              isSubmitting={isSubmitting}
              activeReplyId={activeReplyId}
              isChild 
              compact={compact}
            />
          ))}
        </div>
      )}
    </div>
  );
}
