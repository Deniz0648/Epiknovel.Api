using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Interfaces.Books;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Social.Features.Comments.Queries.GetCommentList;

public class GetCommentListHandler(
    SocialDbContext dbContext, 
    IUserProvider userProvider,
    IEncryptionService encryptionService) : IRequestHandler<GetCommentListQuery, Result<CommentListResponse>>
{
    public async Task<Result<CommentListResponse>> Handle(GetCommentListQuery request, CancellationToken ct)
    {
        try
        {
            IQueryable<Comment> query = dbContext.Comments
                .AsNoTracking()
                .Where(c => !c.IsDeleted && !c.IsHidden);

            if (request.ParentCommentId.HasValue)
            {
                query = query.Where(c => c.ParentCommentId == request.ParentCommentId.Value);
            }
            else
            {
                query = query.Where(c => c.ParentCommentId == null);

                // 🔍 Filtreler
                if (request.BookId != null) query = query.Where(c => c.BookId == request.BookId);
                
                if (request.ChapterId != null) 
                {
                    query = query.Where(c => c.ChapterId == request.ChapterId);
                    
                    if (string.IsNullOrEmpty(request.ParagraphId))
                    {
                        query = query.Where(c => string.IsNullOrEmpty(c.ParagraphId));
                    }
                    else
                    {
                        query = query.Where(c => c.ParagraphId == request.ParagraphId);
                    }
                }
                else if (request.BookId != null)
                {
                    // Kitap geneli (İnceleme) yorumları: Hem Bölüm ID'si hem Paragraf ID'si null olanlar.
                    query = query.Where(c => c.ChapterId == null && string.IsNullOrEmpty(c.ParagraphId));
                }
            }

            // 🔢 Toplam Sayı (Pagination için)
            var totalCount = await query.CountAsync(ct);

            // 📐 Sıralama
            query = request.SortBy switch
            {
                "Top" => query.OrderByDescending(c => c.LikeCount).ThenByDescending(c => c.CreatedAt),
                "Oldest" => query.OrderBy(c => c.CreatedAt),
                _ => query.OrderByDescending(c => c.IsPinned).ThenByDescending(c => c.CreatedAt) // Default Newest + Pinned
            };

            // 1. Ana yorumları (Parents) getir
            var parents = await query
                .Skip((request.Page - 1) * request.Size)
                .Take(request.Size)
                .Select(c => new CommentItemResponse
                {
                    Id = c.Id,
                    UserId = c.UserId,
                    Content = c.Content,
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt,
                    LikeCount = c.LikeCount,
                    ReplyCount = c.ReplyCount,
                    IsSpoiler = c.IsSpoiler,
                    IsPinned = c.IsPinned,
                    IsAuthorComment = c.IsAuthorComment,
                    IsEdited = c.IsEdited,
                    ParagraphId = c.ParagraphId
                })
                .ToListAsync(ct);

            if (parents.Count == 0) return Result<CommentListResponse>.Success(new CommentListResponse([], totalCount));

            // 🚀 BATCH FETCH: User Details & Likes
            var allCommentIds = parents.Select(p => p.Id).ToList();

            // Top Replies Fetch (Limited to 2 per parent)
            var topRepliesRaw = new List<Comment>();
            if (!request.ParentCommentId.HasValue)
            {
                topRepliesRaw = await dbContext.Comments
                    .AsNoTracking()
                    .Where(c => c.ParentCommentId != null && allCommentIds.Contains(c.ParentCommentId.Value) && !c.IsDeleted && !c.IsHidden)
                    .OrderByDescending(c => c.LikeCount)
                    .ToListAsync(ct);
            }

            var topRepliesMap = topRepliesRaw
                .GroupBy(r => r.ParentCommentId)
                .ToDictionary(g => g.Key!.Value, g => g.Take(2).ToList());

            var allUserIdsInScope = parents.Select(p => p.UserId)
                .Concat(topRepliesRaw.Select(r => r.UserId))
                .Distinct()
                .ToList();

            var displayNames = await userProvider.GetDisplayNamesByUserIdsAsync(allUserIdsInScope, ct);
            var slugs = await userProvider.GetSlugsByUserIdsAsync(allUserIdsInScope, ct);
            var avatars = await userProvider.GetAvatarsByUserIdsAsync(allUserIdsInScope, ct);
            
            // Like Status check
            var likedCommentIds = new HashSet<Guid>();
            if (request.CurrentUserId.HasValue)
            {
                var allIdsToCheck = allCommentIds.Concat(topRepliesRaw.Select(r => r.Id)).ToList();
                likedCommentIds = (await dbContext.CommentLikes
                    .Where(l => l.UserId == request.CurrentUserId.Value && allIdsToCheck.Contains(l.CommentId))
                    .Select(l => l.CommentId)
                    .ToListAsync(ct)).ToHashSet();
            }

            // Mapping & Privacy logic
            foreach (var p in parents)
            {
                MapCommonFields(p, displayNames, slugs, avatars, likedCommentIds, request.CurrentUserId);
                ApplySpoilerLogic(p, request.IncludeSpoilers);

                if (topRepliesMap.TryGetValue(p.Id, out var replies))
                {
                    foreach (var r in replies)
                    {
                        var replyDto = new CommentItemResponse
                        {
                            Id = r.Id,
                            UserId = r.UserId,
                            Content = r.Content,
                            CreatedAt = r.CreatedAt,
                            LikeCount = r.LikeCount,
                            IsSpoiler = r.IsSpoiler,
                            IsAuthorComment = r.IsAuthorComment,
                            ParagraphId = r.ParagraphId
                        };
                        MapCommonFields(replyDto, displayNames, slugs, avatars, likedCommentIds, request.CurrentUserId);
                        ApplySpoilerLogic(replyDto, request.IncludeSpoilers);
                        p.TopReplies.Add(replyDto);
                    }
                }
            }

            return Result<CommentListResponse>.Success(new CommentListResponse(parents, totalCount));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ERROR] GetCommentListHandler: {ex.Message}");
            if (ex.InnerException != null) Console.WriteLine($"[INNER] {ex.InnerException.Message}");
            return Result<CommentListResponse>.Failure("Yorumlar listelenirken sunucu hatası oluştu.");
        }
    }

    private void MapCommonFields(CommentItemResponse dto, Dictionary<Guid, string> names, Dictionary<Guid, string> slugs, Dictionary<Guid, string?> avatars, HashSet<Guid> likes, Guid? currentUserId)
    {
        dto.AuthorInfo = new CommentAuthorInfo(
            dto.UserId,
            names.GetValueOrDefault(dto.UserId, "Bilinmeyen Kullanıcı"),
            slugs.GetValueOrDefault(dto.UserId, "deleted"),
            avatars.GetValueOrDefault(dto.UserId),
            dto.IsAuthorComment
        );
        dto.IsLikedByCurrentUser = likes.Contains(dto.Id);
        
        // Permissions
        if (currentUserId.HasValue)
        {
            dto.CanEdit = dto.UserId == currentUserId.Value && (DateTime.UtcNow - dto.CreatedAt).TotalMinutes < 30;
            dto.CanDelete = dto.UserId == currentUserId.Value;
            dto.CanPin = false; // Add book author check here if needed
        }
    }

    private void ApplySpoilerLogic(CommentItemResponse dto, bool includeSpoilers)
    {
        if (dto.IsSpoiler && !includeSpoilers)
        {
            dto.Content = "[SPOILER]";
            dto.ContentToken = encryptionService.Encrypt(dto.Id.ToString());
        }
    }
}
