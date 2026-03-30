using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Social.Endpoints.Reviews.Like;

public record Request
{
    public Guid ReviewId { get; init; }
}

public class Endpoint(SocialDbContext dbContext) : Endpoint<Request, Result<int>>
{
    public override void Configure()
    {
        Post("/social/reviews/{reviewId}/like");
        Summary(s => {
            s.Summary = "Bir incelemeyi beğen veya beğenmekten vazgeç.";
            s.Description = "Kullanıcının bir incelemeyi beğenmesini sağlar. Eğer zaten beğenmişse beğeniyi geri alır (toggle).";
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

        var review = await dbContext.Reviews.FirstOrDefaultAsync(r => r.Id == req.ReviewId, ct);
        if (review == null)
        {
            await Send.ResponseAsync(Result<int>.Failure("İnceleme bulunamadı."), 404, ct);
            return;
        }

        var existingLike = await dbContext.ReviewLikes
            .FirstOrDefaultAsync(l => l.ReviewId == req.ReviewId && l.UserId == userId, ct);

        if (existingLike != null)
        {
            dbContext.ReviewLikes.Remove(existingLike);
            review.LikeCount = Math.Max(0, review.LikeCount - 1);
            await dbContext.SaveChangesAsync(ct);
            await Send.ResponseAsync(Result<int>.Success(review.LikeCount, "Beğeni geri alındı."), 200, ct);
            return;
        }

        var like = new ReviewLike
        {
            ReviewId = req.ReviewId,
            UserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.ReviewLikes.Add(like);
        review.LikeCount++;
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<int>.Success(review.LikeCount, "Beğenildi."), 200, ct);
    }
}
