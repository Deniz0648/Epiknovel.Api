using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Social.Endpoints.InlineComments.Like;

public record Request
{
    public Guid InlineCommentId { get; init; }
}

public class Endpoint(SocialDbContext dbContext) : Endpoint<Request, Result<int>>
{
    public override void Configure()
    {
        Post("/social/inline-comments/{inlineCommentId}/like");
        Summary(s => {
            s.Summary = "Satır yorumunu beğen veya beğenmekten vazgeç.";
            s.Description = "Kullanıcının bir satır yorumunu (inline comment) beğenmesini sağlar. Toggle mantığında çalışır.";
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

        var comment = await dbContext.InlineComments.FirstOrDefaultAsync(c => c.Id == req.InlineCommentId, ct);
        if (comment == null)
        {
            await Send.ResponseAsync(Result<int>.Failure("Yorum bulunamadı."), 404, ct);
            return;
        }

        var existingLike = await dbContext.InlineCommentLikes
            .FirstOrDefaultAsync(l => l.InlineCommentId == req.InlineCommentId && l.UserId == userId, ct);

        if (existingLike != null)
        {
            dbContext.InlineCommentLikes.Remove(existingLike);
            comment.LikeCount = Math.Max(0, comment.LikeCount - 1);
            await dbContext.SaveChangesAsync(ct);
            await Send.ResponseAsync(Result<int>.Success(comment.LikeCount, "Beğeni geri alındı."), 200, ct);
            return;
        }

        var like = new InlineCommentLike
        {
            InlineCommentId = req.InlineCommentId,
            UserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.InlineCommentLikes.Add(like);
        comment.LikeCount++;
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<int>.Success(comment.LikeCount, "Beğenildi."), 200, ct);
    }
}
