using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Social.Features.Comments.Queries.GetCommentList;

public class GetCommentListHandler(SocialDbContext dbContext) : IRequestHandler<GetCommentListQuery, Result<List<CommentItemResponse>>>
{
    public async Task<Result<List<CommentItemResponse>>> Handle(GetCommentListQuery request, CancellationToken ct)
    {
        IQueryable<Comment> query = dbContext.Comments
            .AsNoTracking()
            .Where(c => !c.IsDeleted);

        if (request.BookId != null)
            query = query.Where(c => c.BookId == request.BookId);
        
        if (request.ChapterId != null)
            query = query.Where(c => c.ChapterId == request.ChapterId);

        // 1. Ana yorumları (Parents) getir
        var parents = await query
            .Where(c => c.ParentCommentId == null)
            .OrderByDescending(c => c.CreatedAt)
            .Skip((request.Page - 1) * request.Size)
            .Take(request.Size)
            .Select(c => new CommentItemResponse
            {
                Id = c.Id,
                UserId = c.UserId,
                Content = c.Content,
                CreatedAt = c.CreatedAt,
                LikeCount = c.LikeCount
            })
            .ToListAsync(ct);

        if (parents.Count == 0)
        {
            return Result<List<CommentItemResponse>>.Success(new List<CommentItemResponse>());
        }

        // 🚀 OPTIMIZATION: BATCH FETCH ALL REPLIES (Anti N+1)
        var parentIds = parents.Select(p => p.Id).ToList();
        var allReplies = await dbContext.Comments
            .AsNoTracking()
            .Where(c => c.ParentCommentId != null && parentIds.Contains(c.ParentCommentId.Value) && !c.IsDeleted)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new CommentItemResponse
            {
                Id = c.Id,
                UserId = c.UserId,
                Content = c.Content,
                CreatedAt = c.CreatedAt,
                LikeCount = c.LikeCount,
                // Biz sadece 2. seviyeyi getiriyoruz şu an (Hierarchical tree can be deeper, but this solves common use-case)
                // Note: Re-inject the parent ID to map in memory
                Replies = new List<CommentItemResponse>() 
            })
            .ToListAsync(ct);

        // 💡 In-Memory Mapping for replies
        // (If replies have their own replies, we would need a recursive approach, but for now we solve the N+1 for the first level)
        
        // Let's re-fetch with ParentId included to map it correctly. 
        // Actually, let's just fetch everything including the ParentId field in the query if we could, 
        // or just use a look-ahead logic.

        // Simpler way to map: Fetch with ParentId as an anonymous object
        var repliesWithParentMap = await dbContext.Comments
            .AsNoTracking()
            .Where(c => c.ParentCommentId != null && parentIds.Contains(c.ParentCommentId.Value) && !c.IsDeleted)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new { 
                ParentId = c.ParentCommentId, 
                Item = new CommentItemResponse
                {
                    Id = c.Id,
                    UserId = c.UserId,
                    Content = c.Content,
                    CreatedAt = c.CreatedAt,
                    LikeCount = c.LikeCount
                }
            })
            .ToListAsync(ct);

        foreach (var parent in parents)
        {
            parent.Replies.AddRange(repliesWithParentMap
                .Where(r => r.ParentId == parent.Id)
                .Select(r => r.Item));
        }

        return Result<List<CommentItemResponse>>.Success(parents);
    }
}
