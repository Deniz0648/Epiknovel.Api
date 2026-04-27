import { useState, useCallback, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/api";
import { toast } from "@/lib/toast";

export interface CommentUser {
  id: string;
  displayName: string;
  userSlug: string;
  avatarUrl?: string;
  isAuthor: boolean;
}

export interface CommentItem {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  isSpoiler: boolean;
  isPinned: boolean;
  isEdited: boolean;
  isAuthorComment: boolean;
  likeCount: number;
  replyCount: number;
  isLikedByCurrentUser: boolean;
  canEdit: boolean;
  canPin: boolean;
  canDelete: boolean;
  authorInfo: CommentUser;
  topReplies: CommentItem[];
  paragraphId?: string;
  contentToken?: string;
}

export interface CommentListResult {
  items: CommentItem[];
  totalCount: number;
}

interface UseCommentsOptions {
  bookId?: string;
  chapterId?: string;
  paragraphId?: string;
  pageSize?: number;
  sortBy?: "newest" | "top" | "oldest";
}

export function useComments(options: UseCommentsOptions) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [isRevealingMap, setIsRevealingMap] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const loadComments = useCallback(async (pageNum: number, isReset = false) => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: pageNum.toString(),
        pageSize: (options.pageSize || 20).toString(),
        sortBy: options.sortBy || "newest",
        includeSpoilers: "false", // We reveal them individually
      });

      if (options.bookId) query.append("bookId", options.bookId);
      if (options.chapterId) query.append("chapterId", options.chapterId);
      if (options.paragraphId) query.append("paragraphId", options.paragraphId);

      const result = await apiRequest<CommentListResult>(`/social/comments?${query.toString()}`);
      
      if (!result) {
        throw new Error("Sunucudan boş yanıt döndü.");
      }

      const items = result.items || [];
      setComments(prev => isReset ? items : [...prev, ...items]);
      setTotalCount(result.totalCount || 0);
      setHasMore(items.length >= (options.pageSize || 20));
      setPage(pageNum);
    } catch (err: any) {
      toast.error(err.message || "Yorumlar yüklenirken bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  }, [options.bookId, options.chapterId, options.paragraphId, options.pageSize, options.sortBy]);

  // Reset and load when filters change
  useEffect(() => {
    loadComments(1, true);
  }, [options.bookId, options.chapterId, options.paragraphId, options.sortBy]);

  const loadMore = () => {
    if (!isLoading && hasMore) {
      loadComments(page + 1);
    }
  };

  const addComment = async (content: string, isSpoiler: boolean, parentId?: string) => {
    setIsSubmitting(true);
    try {
      const result = await apiRequest<string>("/social/comments", {
        method: "POST",
        body: JSON.stringify({
          bookId: options.bookId,
          chapterId: options.chapterId,
          paragraphId: options.paragraphId,
          parentCommentId: parentId,
          content,
          isSpoiler
        })
      });

      toast.success("Yorumunuz başarıyla eklendi.");
      return result;
    } catch (err: any) {
      toast.error(err.message || "Yorum eklenirken bir hata oluştu.");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLike = async (commentId: string) => {
    // Optimistic Update
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          isLikedByCurrentUser: !c.isLikedByCurrentUser,
          likeCount: c.isLikedByCurrentUser ? c.likeCount - 1 : c.likeCount + 1
        };
      }
      return c;
    }));

    try {
      await apiRequest(`/social/comments/${commentId}/like`, { method: "POST" });
    } catch (err: any) {
      // Rollback after small delay
      setTimeout(() => {
        setComments(prev => prev.map(c => {
          if (c.id === commentId) {
            return {
              ...c,
              isLikedByCurrentUser: !c.isLikedByCurrentUser,
              likeCount: c.isLikedByCurrentUser ? c.likeCount - 1 : c.likeCount + 1
            };
          }
          return c;
        }));
        toast.error(err.message || "İşlem başarısız oldu.");
      }, 500);
    }
  };

  const reportComment = async (commentId: string, reason: number, description?: string) => {
    try {
      await apiRequest(`/social/comments/${commentId}/report`, {
        method: "POST",
        body: JSON.stringify({ reason, description })
      });
      toast.success("Bildiriminiz alındı, teşekkürler.");
    } catch (err: any) {
      toast.error(err.message || "Bildirim gönderilemedi.");
    }
  };
  const revealSpoiler = async (commentId: string, token: string) => {
    setIsRevealingMap(prev => ({ ...prev, [commentId]: true }));
    try {
      const result = await apiRequest<{ content: string }>(`/social/comments/${commentId}/reveal`, {
        method: "POST",
        body: JSON.stringify({ token })
      });
      
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return { ...c, content: result.content, isSpoiler: false };
        }
        return c;
      }));
    } catch (err: any) {
      toast.error(err.message || "İçerik gösterilemedi.");
    } finally {
      setIsRevealingMap(prev => ({ ...prev, [commentId]: false }));
    }
  };

  const updateComment = async (commentId: string, content: string) => {
    setIsSubmitting(true);
    try {
      await apiRequest(`/social/comments/${commentId}`, {
        method: "PUT",
        body: JSON.stringify({ content })
      });
      
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return { ...c, content, isEdited: true };
        }
        return c;
      }));
      
      toast.success("Yorumunuz güncellendi.");
    } catch (err: any) {
      toast.error(err.message || "Yorum güncellenemedi.");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      await apiRequest(`/social/comments/${commentId}`, { method: "DELETE" });
      
      setComments(prev => prev.filter(c => c.id !== commentId));
      setTotalCount(prev => prev - 1);
      
      toast.success("Yorum silindi.");
    } catch (err: any) {
      toast.error(err.message || "Yorum silinemedi.");
    }
  };

  const loadReplies = async (parentCommentId: string) => {
    try {
      const query = new URLSearchParams({
        parentCommentId,
        page: "1",
        pageSize: "100",
        sortBy: "oldest"
      });
      const result = await apiRequest<CommentListResult>(`/social/comments?${query.toString()}`);
      
      setComments(prev => prev.map(c => {
        if (c.id === parentCommentId) {
          return { ...c, topReplies: result.items || [] };
        }
        return c;
      }));
    } catch (err: any) {
      toast.error("Yanıtlar yüklenirken bir hata oluştu.");
    }
  };

  return {
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
  };
}
