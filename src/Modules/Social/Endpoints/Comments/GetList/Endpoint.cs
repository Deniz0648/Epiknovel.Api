using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using Microsoft.AspNetCore.OutputCaching;

namespace Epiknovel.Modules.Social.Endpoints.Comments.GetList;

public record Request
{
    public Guid? BookId { get; init; }
    public Guid? ChapterId { get; init; }
    public int Page { get; init; } = 1;
    public int Size { get; init; } = 20;
}

public record CommentResponse
{
    public Guid Id { get; init; }
    public Guid UserId { get; init; }
    public string Content { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public int LikeCount { get; init; }
    public List<CommentResponse> Replies { get; init; } = new();
}

public class Endpoint(SocialDbContext dbContext) : Endpoint<Request, Result<List<CommentResponse>>>
{
    public override void Configure()
    {
        Get("/social/comments");
        AllowAnonymous();
        // Redis üzerinden 1 dakikalık cache (Popüler bölümler için yükü azaltır)
        ResponseCache(60); 
        Summary(s => {
            s.Summary = "Yorum listesini getir.";
            s.Description = "Bir kitap veya bölüme ait yorumları hiyerarşik (ana ve alt yorumlar) şekilde listeler.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        IQueryable<Comment> query = dbContext.Comments
            .Where(c => !c.IsDeleted);

        if (req.BookId != null)
            query = query.Where(c => c.BookId == req.BookId);
        
        if (req.ChapterId != null)
            query = query.Where(c => c.ChapterId == req.ChapterId);

        // Önce üst yorumları (ParentCommentId == null) getir
        var parents = await query
            .Where(c => c.ParentCommentId == null)
            .OrderByDescending(c => c.CreatedAt)
            .Skip((req.Page - 1) * req.Size)
            .Take(req.Size)
            .Select(c => new CommentResponse
            {
                Id = c.Id,
                UserId = c.UserId,
                Content = c.Content,
                CreatedAt = c.CreatedAt,
                LikeCount = c.LikeCount
            })
            .ToListAsync(ct);

        // Her üst yorum için alt yorumları (yanıtları) getir (Instagram/Facebook stili)
        // Optimizasyon: Büyük sistemlerde bu 'Look ahead' veya ayrı bir servisle tek SQL'de yapılabilir.
        foreach (var parent in parents)
        {
            var replies = await dbContext.Comments
                .Where(c => c.ParentCommentId == parent.Id && !c.IsDeleted)
                .OrderBy(c => c.CreatedAt)
                .Select(c => new CommentResponse
                {
                    Id = c.Id,
                    UserId = c.UserId,
                    Content = c.Content,
                    CreatedAt = c.CreatedAt,
                    LikeCount = c.LikeCount
                })
                .ToListAsync(ct);
            
            parent.Replies.AddRange(replies);
        }

        await Send.ResponseAsync(Result<List<CommentResponse>>.Success(parents), 200, ct);
    }
}
