using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace Epiknovel.Modules.Social.Features.ReadingProgress.Commands.UpdateReadingProgress;

public class UpdateReadingProgressHandler(SocialDbContext dbContext, IDistributedCache cache) : IRequestHandler<UpdateReadingProgressCommand, Result<string>>
{
    public async Task<Result<string>> Handle(UpdateReadingProgressCommand request, CancellationToken ct)
    {
        var progress = await dbContext.ReadingProgresses
            .FirstOrDefaultAsync(p => p.UserId == request.UserId && p.BookId == request.BookId, ct);

        if (progress == null)
        {
            progress = new Epiknovel.Modules.Social.Domain.ReadingProgress
            {
                UserId = request.UserId,
                BookId = request.BookId,
                LastReadChapterId = request.ChapterId,
                ScrollPercentage = request.ScrollPercentage,
                LastReadAt = DateTime.UtcNow
            };
            dbContext.ReadingProgresses.Add(progress);
        }
        else
        {
            progress.LastReadChapterId = request.ChapterId;
            progress.ScrollPercentage = request.ScrollPercentage;
            progress.LastReadAt = DateTime.UtcNow;
        }

        await dbContext.SaveChangesAsync(ct);

        // Redis Cache
        var cacheKey = $"progress:{request.UserId}:{request.BookId}";
        var model = new { ChapterId = request.ChapterId, Percentage = request.ScrollPercentage };
        await cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(model), new DistributedCacheEntryOptions
        {
            SlidingExpiration = TimeSpan.FromHours(1)
        }, ct);

        return Result<string>.Success("İlerleme kaydedildi.");
    }
}
