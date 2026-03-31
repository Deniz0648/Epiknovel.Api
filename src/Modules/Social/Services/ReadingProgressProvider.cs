using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Shared.Core.Interfaces;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace Epiknovel.Modules.Social.Services;

public class ReadingProgressProvider(SocialDbContext dbContext, IDistributedCache cache) : IReadingProgressProvider
{
    private static readonly System.Threading.SemaphoreSlim _syncLock = new(1, 1);

    public async Task<double?> GetProgressPercentageAsync(Guid userId, Guid bookId, Guid chapterId, CancellationToken ct = default)
    {
        var cacheKey = $"progress:{userId}:{bookId}";
        
        // 1. Redis'ten hızlıca oku (Lock dışı hızlı kontrol)
        var cachedValue = await cache.GetStringAsync(cacheKey, ct);
        if (cachedValue != null)
        {
            return GetFromModel(cachedValue, chapterId);
        }

        // 🚀 Cache Stampede Koruması: Aynı anda gelen isteklerden sadece biri DB'ye gitsin
        await _syncLock.WaitAsync(ct);
        try 
        {
            // 2. Double-Check: Lock beklerken başkası cache'i doldurmuş olabilir
            var doubleCheck = await cache.GetStringAsync(cacheKey, ct);
            if (doubleCheck != null) return GetFromModel(doubleCheck, chapterId);

            // 3. Cache Miss: Veritabanına git
            var progress = await dbContext.ReadingProgresses
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.UserId == userId && p.BookId == bookId, ct);

            if (progress != null)
            {
                var model = new ProgressCacheModel { ChapterId = progress.LastReadChapterId, Percentage = progress.ScrollPercentage };
                await cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(model), new DistributedCacheEntryOptions
                {
                    SlidingExpiration = TimeSpan.FromHours(1)
                }, ct);

                if (progress.LastReadChapterId == chapterId) return progress.ScrollPercentage;
            }
        }
        finally
        {
            _syncLock.Release();
        }

        return null;
    }

    private double? GetFromModel(string json, Guid chapterId)
    {
        try 
        {
            var cachedProgress = JsonSerializer.Deserialize<ProgressCacheModel>(json);
            if (cachedProgress != null && cachedProgress.ChapterId == chapterId)
            {
                return cachedProgress.Percentage;
            }
        } catch { }
        return null;
    }

    private class ProgressCacheModel
    {
        public Guid ChapterId { get; set; }
        public double Percentage { get; set; }
    }
}
