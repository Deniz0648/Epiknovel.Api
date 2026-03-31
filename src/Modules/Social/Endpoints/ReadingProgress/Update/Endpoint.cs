using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;

namespace Epiknovel.Modules.Social.Endpoints.ReadingProgress.Update;

public record Request
{
    public Guid BookId { get; init; }
    public Guid ChapterId { get; init; }
    public double ScrollPercentage { get; init; } // 0-100
}

public class Endpoint(SocialDbContext dbContext, IDistributedCache cache) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/social/reading-progress");
        Options(x => x.RequireRateLimiting("ProgressPolicy"));
        Summary(s => {
            s.Summary = "Okuma ilerlemesini güncelle.";
            s.Description = "Kullanıcının okuma sırasında kaldığı satırı/yüzdeyi kaydeder (10 saniyede bir eşitleme limiti).";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<string>.Failure("Unauthorized"), 401, ct);
            return;
        }

        var progress = await dbContext.ReadingProgresses
            .FirstOrDefaultAsync(p => p.UserId == userId && p.BookId == req.BookId, ct);

        if (progress == null)
        {
            progress = new Domain.ReadingProgress
            {
                UserId = userId,
                BookId = req.BookId,
                LastReadChapterId = req.ChapterId,
                ScrollPercentage = req.ScrollPercentage,
                LastReadAt = DateTime.UtcNow
            };
            dbContext.ReadingProgresses.Add(progress);
        }
        else
        {
            progress.LastReadChapterId = req.ChapterId;
            progress.ScrollPercentage = req.ScrollPercentage;
            progress.LastReadAt = DateTime.UtcNow;
        }

        await dbContext.SaveChangesAsync(ct);

        // 🚀 Redis Cache Güncelle (Distributed Cache: IReadingProgressProvider'ın hızlı kalması için)
        var cacheKey = $"progress:{userId}:{req.BookId}";
        var model = new { ChapterId = req.ChapterId, Percentage = req.ScrollPercentage };
        await cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(model), new DistributedCacheEntryOptions
        {
            SlidingExpiration = TimeSpan.FromHours(1)
        }, ct);


        await Send.ResponseAsync(Result<string>.Success("İlerleme kaydedildi."), 200, ct);
    }
}
