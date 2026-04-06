"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  Flag,
  Heart,
  Loader2,
  Lock,
  LockOpen,
  MessageSquareMore,
  MessageCircle,
  Search,
  Share2,
  Send,
  X,
} from "lucide-react";

type ChapterSort = "newest" | "oldest";
type PageSize = 20 | 50 | 100 | 200;

import Link from "next/link";
import { useParams } from "next/navigation";

export type BookChapterItem = {
  id: string;
  slug: string;
  number: number;
  title: string;
  publishLabel: string;
  dateLabel: string;
  readCount: number;
  isPremium: boolean;
};

export type BookCommentItem = {
  id: string;
  author: string;
  handle?: string;
  timeLabel?: string;
  likes: number;
  rating: number;
  body: string;
  replies?: BookCommentReplyItem[];
};

export type BookCommentReplyItem = {
  id: string;
  author: string;
  handle?: string;
  timeLabel?: string;
  body: string;
  likes: number;
  replies?: BookCommentReplyItem[];
};

type BookDetailPanelsProps = {
  chapters: BookChapterItem[];
  comments: BookCommentItem[];
  totalChaptersCount: number;
  activeFilters: {
    query: string;
    sort: ChapterSort;
    pageSize: PageSize;
    page: number;
  };
  onFiltersChange: (filters: { query: string; sort: ChapterSort; pageSize: PageSize; page: number }) => void;
  isLoadingChapters?: boolean;
};

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 5];
  }

  if (currentPage >= totalPages - 2) {
    return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
}

export function BookDetailPanels({ 
  chapters, 
  comments, 
  totalChaptersCount, 
  activeFilters, 
  onFiltersChange,
  isLoadingChapters 
}: BookDetailPanelsProps) {
  const [commentDraft, setCommentDraft] = useState("");
  const [likedCommentMap, setLikedCommentMap] = useState<Record<string, boolean>>({});
  const [openReportId, setOpenReportId] = useState<string | null>(null);
  const [reportDraftMap, setReportDraftMap] = useState<Record<string, string>>({});
  const [commentPage, setCommentPage] = useState(1);
  const commentsPageSize = 4;

  const totalPages = Math.max(1, Math.ceil(totalChaptersCount / activeFilters.pageSize));
  const currentPage = activeFilters.page;
  const pageNumbers = getVisiblePages(currentPage, totalPages);
  
  const totalCommentPages = Math.max(1, Math.ceil(comments.length / commentsPageSize));
  const currentCommentPage = Math.min(commentPage, totalCommentPages);
  const commentStart = (currentCommentPage - 1) * commentsPageSize;
  const visibleComments = comments.slice(commentStart, commentStart + commentsPageSize);
  const commentPageNumbers = getVisiblePages(currentCommentPage, totalCommentPages);

  const updateFilters = (updates: Partial<typeof activeFilters>) => {
    onFiltersChange({ ...activeFilters, ...updates });
  };

  const renderReplies = (replies: BookCommentReplyItem[], depth = 1) => {
    return (
      <div className="space-y-2.5 border-l border-base-content/15 pl-3">
        {replies.map((reply) => (
          <div
            key={reply.id}
            className={`rounded-xl border border-base-content/10 bg-base-100/20 px-3 py-2.5 ${
              depth >= 3 ? "text-[13px]" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary/18 text-[11px] font-black text-secondary">
                  {reply.author.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold">{reply.author}</p>
                  <p className="text-[11px] text-base-content/55">
                    {reply.handle ?? "@okur"} • {reply.timeLabel ?? "Az once"}
                  </p>
                </div>
              </div>
              <p className="text-[11px] font-semibold text-base-content/55">{reply.likes} begeni</p>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-base-content/75">{reply.body}</p>

            {reply.replies && reply.replies.length > 0 ? (
              <div className="mt-2.5">{renderReplies(reply.replies, depth + 1)}</div>
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  const params = useParams<{ bookSlug: string }>();
  const bookSlug = params?.bookSlug;

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <article className="glass-frame flex min-h-[42rem] flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black leading-tight">Bolumler</h2>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-base-content/55">
              Toplam {chapters.length.toLocaleString("tr-TR")} bolum
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-base-content/12 bg-base-100/16 p-2.5 sm:p-3">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
            <label className="form-control w-full">
              <div className="label pb-1">
                <span className="label-text text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/55">
                  Arama
                </span>
              </div>
              <span className="input input-bordered flex h-11 items-center gap-2 rounded-xl border-base-content/18 bg-base-100/30">
                <Search className="h-4 w-4 text-base-content/55" />
                <input
                  type="text"
                  placeholder="Bolum ara..."
                  value={activeFilters.query}
                  onChange={(event) => {
                    updateFilters({ query: event.target.value, page: 1 });
                  }}
                  className="w-full bg-transparent text-sm"
                />
              </span>
            </label>

            <label className="form-control w-full">
              <div className="label pb-1">
                <span className="label-text text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/55">
                  Siralama
                </span>
              </div>
              <select
                className="select select-bordered h-11 rounded-xl border-base-content/18 bg-base-100/30 text-sm"
                value={activeFilters.sort}
                onChange={(event) => {
                  updateFilters({ sort: event.target.value as ChapterSort, page: 1 });
                }}
              >
                <option value="newest">En yeni</option>
                <option value="oldest">En eski</option>
              </select>
            </label>

            <label className="form-control w-full">
              <div className="label pb-1">
                <span className="label-text text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/55">
                  Sayfa Basina
                </span>
              </div>
              <select
                className="select select-bordered h-11 rounded-xl border-base-content/18 bg-base-100/30 text-sm"
                value={activeFilters.pageSize}
                onChange={(event) => {
                  updateFilters({ pageSize: Number(event.target.value) as PageSize, page: 1 });
                }}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </label>

            <div className="form-control w-full">
              <div className="label pb-1">
                <span className="label-text text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/55">
                  Toplam Sonuc
                </span>
              </div>
              <div className="flex h-11 items-center rounded-xl border border-base-content/14 bg-base-100/22 px-3 text-sm font-semibold text-base-content/80">
                {totalChaptersCount.toLocaleString("tr-TR")} bolum
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-2.5 relative">
          {isLoadingChapters && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-base-100/30 backdrop-blur-[1px] rounded-2xl">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {chapters.length === 0 ? (
            <div className="rounded-xl border border-dashed border-base-content/20 bg-base-100/12 p-6 text-center text-sm text-base-content/60">
              Aramana uygun bolum bulunamadi.
            </div>
          ) : (
            chapters.map((chapter) => (
              <Link
                key={chapter.id}
                href={`/read/${bookSlug}/${chapter.slug}`}
                className="group block w-full rounded-2xl border border-base-content/12 bg-base-100/22 p-3.5 text-left transition hover:-translate-y-0.5 hover:border-primary/45 hover:bg-base-100/30"
              >
                <div className="flex items-start justify-between gap-3.5">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-base-content/14 bg-base-100/34 text-lg font-black text-primary">
                      {chapter.number}
                    </span>
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-[1.05rem] font-extrabold leading-tight">
                        Bolum {chapter.number}: {chapter.title}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-base-content/55">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {chapter.dateLabel}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          {chapter.readCount.toLocaleString("tr-TR")}
                        </span>
                        <span>{chapter.publishLabel}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`hidden items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-black tracking-[0.08em] sm:inline-flex ${
                        chapter.isPremium
                          ? "border-warning/35 bg-warning/10 text-warning"
                          : "border-success/35 bg-success/10 text-success"
                      }`}
                    >
                      {chapter.isPremium ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
                      {chapter.isPremium ? "UCRETLI" : "UCRETSIZ"}
                    </span>
                    <span className="rounded-full border border-base-content/16 bg-base-100/30 px-3 py-1 text-xs font-bold text-base-content/75 transition group-hover:border-primary/45 group-hover:text-primary">
                      Oku
                    </span>
                    <span
                      className={`inline-flex align-middle sm:hidden ${
                        chapter.isPremium ? "text-warning" : "text-success"
                      }`}
                      aria-label={chapter.isPremium ? "Ucretli bolum" : "Ucretsiz bolum"}
                      title={chapter.isPremium ? "Ucretli bolum" : "Ucretsiz bolum"}
                    >
                      {chapter.isPremium ? (
                        <Lock className="h-3.5 w-3.5" />
                      ) : (
                        <LockOpen className="h-3.5 w-3.5" />
                      )}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-base-content/12 pt-3">
          <p className="text-xs font-semibold text-base-content/60">
            {totalChaptersCount === 0
              ? "Sonuc yok"
              : `${(currentPage - 1) * activeFilters.pageSize + 1}-${Math.min(currentPage * activeFilters.pageSize, totalChaptersCount)} / ${totalChaptersCount}`}
          </p>
          <div className="join">
            <button
              type="button"
              className="btn btn-sm join-item rounded-l-full border-base-content/20 bg-base-100/28"
              onClick={() => updateFilters({ page: Math.max(1, currentPage - 1) })}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={`btn btn-sm join-item border-base-content/20 ${
                  pageNumber === currentPage
                    ? "btn-primary"
                    : "bg-base-100/28 text-base-content/80 hover:bg-base-100/40"
                }`}
                onClick={() => updateFilters({ page: pageNumber })}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              className="btn btn-sm join-item rounded-r-full border-base-content/20 bg-base-100/28"
              onClick={() => updateFilters({ page: Math.min(totalPages, currentPage + 1) })}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </article>

      <article className="glass-frame flex min-h-[42rem] flex-col gap-3.5 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <MessageSquareMore className="h-5 w-5 text-secondary" />
          <h2 className="text-xl font-black leading-tight">Yorumlar</h2>
        </div>

        <div className="rounded-xl border border-base-content/14 bg-base-100/20 p-3.5">
          <p className="mb-2 text-sm font-bold">Yorum ekle</p>
          <textarea
            value={commentDraft}
            onChange={(event) => setCommentDraft(event.target.value)}
            maxLength={5000}
            rows={4}
            placeholder="Dusunceni yaz..."
            className="w-full resize-y rounded-xl border border-base-content/16 bg-base-100/28 px-3 py-2 text-sm outline-none transition focus:border-primary/60"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-base-content/60">{commentDraft.length}/5000</p>
            <button
              type="button"
              className="btn btn-sm btn-primary rounded-full px-4"
              disabled={commentDraft.trim().length === 0}
            >
              <Send className="h-4 w-4" />
              Gonder
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          {visibleComments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-2xl border border-base-content/12 bg-base-100/18 p-3.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-black text-primary">
                    {comment.author.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{comment.author}</p>
                    <p className="text-xs text-base-content/58">
                      {comment.handle ?? "@okuyucu"} • {comment.timeLabel ?? "Az once"}
                    </p>
                  </div>
                </div>
                <p className="text-xs font-semibold text-base-content/60">Kitap Incelemesi</p>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs font-semibold">
                <span className="text-warning">{comment.rating.toFixed(1)} / 5.0</span>
                <span className="text-base-content/60">
                  {comment.likes + (likedCommentMap[comment.id] ? 1 : 0)} begeni
                </span>
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-base-content/80">{comment.body}</p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={`btn btn-xs rounded-full px-3 ${
                    likedCommentMap[comment.id]
                      ? "btn-primary"
                      : "border border-base-content/20 bg-base-100/28 text-base-content/75"
                  }`}
                  onClick={() =>
                    setLikedCommentMap((prev) => ({
                      ...prev,
                      [comment.id]: !prev[comment.id],
                    }))
                  }
                >
                  <Heart className={`h-3.5 w-3.5 ${likedCommentMap[comment.id] ? "fill-current" : ""}`} />
                  Begen
                </button>
                <button
                  type="button"
                  className="btn btn-xs rounded-full border border-base-content/20 bg-base-100/28 px-3 text-base-content/75"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Yanitla
                </button>
                <button
                  type="button"
                  className="btn btn-xs rounded-full border border-base-content/20 bg-base-100/28 px-3 text-base-content/75"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Paylas
                </button>

                <button
                  type="button"
                  className={`btn btn-xs rounded-full border px-3 ${
                    openReportId === comment.id
                      ? "border-error/45 bg-error/12 text-error"
                      : "border-base-content/20 bg-base-100/28 text-base-content/75"
                  }`}
                  onClick={() => setOpenReportId((prev) => (prev === comment.id ? null : comment.id))}
                >
                  <Flag className="h-3.5 w-3.5" />
                  Sikayet Et
                </button>
              </div>

              {openReportId === comment.id ? (
                <div className="mt-2.5 rounded-xl border border-error/25 bg-error/5 p-2.5">
                  <input
                    type="text"
                    value={reportDraftMap[comment.id] ?? ""}
                    onChange={(event) =>
                      setReportDraftMap((prev) => ({
                        ...prev,
                        [comment.id]: event.target.value,
                      }))
                    }
                    maxLength={240}
                    placeholder="Sikayet nedeni..."
                    className="input input-bordered h-9 w-full border-error/30 bg-base-100/35 text-sm"
                  />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-base-content/60">
                      {(reportDraftMap[comment.id] ?? "").length}/240
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        className="btn btn-xs rounded-full border border-base-content/20 bg-base-100/28"
                        onClick={() => setOpenReportId(null)}
                      >
                        <X className="h-3.5 w-3.5" />
                        Iptal
                      </button>
                      <button
                        type="button"
                        className="btn btn-xs btn-error rounded-full"
                        disabled={(reportDraftMap[comment.id] ?? "").trim().length === 0}
                        onClick={() => {
                          setReportDraftMap((prev) => ({ ...prev, [comment.id]: "" }));
                          setOpenReportId(null);
                        }}
                      >
                        Gonder
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {comment.replies && comment.replies.length > 0 ? (
                <div className="mt-3">{renderReplies(comment.replies)}</div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-base-content/12 pt-3">
          <p className="text-xs font-semibold text-base-content/60">
            {comments.length === 0
              ? "Yorum yok"
              : `${commentStart + 1}-${Math.min(commentStart + commentsPageSize, comments.length)} / ${comments.length}`}
          </p>
          <div className="join">
            <button
              type="button"
              className="btn btn-sm join-item rounded-l-full border-base-content/20 bg-base-100/28"
              onClick={() => setCommentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentCommentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {commentPageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={`btn btn-sm join-item border-base-content/20 ${
                  pageNumber === currentCommentPage
                    ? "btn-primary"
                    : "bg-base-100/28 text-base-content/80 hover:bg-base-100/40"
                }`}
                onClick={() => setCommentPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              className="btn btn-sm join-item rounded-r-full border-base-content/20 bg-base-100/28"
              onClick={() => setCommentPage((prev) => Math.min(totalCommentPages, prev + 1))}
              disabled={currentCommentPage === totalCommentPages}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </article>
    </section>
  );
}
