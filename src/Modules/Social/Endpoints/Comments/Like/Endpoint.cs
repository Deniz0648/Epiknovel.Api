using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Social.Endpoints.Comments.Like;

public record Request
{
    public Guid CommentId { get; init; }
}

public class Endpoint(SocialDbContext dbContext) : Endpoint<Request, Result<int>>
{
    public override void Configure()
    {
        Post("/social/comments/{commentId}/like");
        Summary(s => {
            s.Summary = "Bir yorumu beğen veya beğenmekten vazgeç.";
            s.Description = "Kullanıcının bir yorumu beğenmesini sağlar. Eğer zaten beğenmişse beğeniyi geri alır (toggle).";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<int>.Failure("Unauthorized"), 401, ct);
            return;
        }

        // Daha önce beğenmiş mi?
        var existingLike = await dbContext.CommentLikes
            .FirstOrDefaultAsync(l => l.CommentId == req.CommentId && l.UserId == userId, ct);

        var comment = await dbContext.Comments.FirstOrDefaultAsync(c => c.Id == req.CommentId, ct);
        if (comment == null)
        {
            await Send.ResponseAsync(Result<int>.Failure("Yorum bulunamadı."), 404, ct);
            return;
        }

        if (existingLike != null)
        {
            // Like'ı geri al (Unlike)
            dbContext.CommentLikes.Remove(existingLike);
            comment.LikeCount = Math.Max(0, comment.LikeCount - 1);
            await dbContext.SaveChangesAsync(ct);
            await Send.ResponseAsync(Result<int>.Success(comment.LikeCount, "Beğeni geri alındı."), 200, ct);
            return;
        }

        // Yeni Like ekle
        var like = new CommentLike
        {
            CommentId = req.CommentId,
            UserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.CommentLikes.Add(like);
        comment.LikeCount++;

        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<int>.Success(comment.LikeCount, "Beğenildi."), 200, ct);
    }
}
