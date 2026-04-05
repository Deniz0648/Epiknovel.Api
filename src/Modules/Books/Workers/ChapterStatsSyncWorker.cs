using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using Epiknovel.Modules.Books.Data;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Books.Workers;

/// <summary>
/// Redis üzerindeki geçici izlenme sayılarını (Hits) periyodik olarak ana veritabanına (SQL) yansıtır.
/// Bu sayede her okumada DB'ye yük binmez, sadece 5 dakikada bir toplu güncelleme yapılır.
/// </summary>
public class ChapterStatsSyncWorker(
    IConnectionMultiplexer redis,
    IServiceScopeFactory scopeFactory,
    ILogger<ChapterStatsSyncWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Chapter Stats Sync Worker başlatıldı (Interval: 5 Min).");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SyncStatsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "İstatistik senkronizasyonu sırasında hata oluştu.");
            }

            // 5 Dakika bekle
            await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
        }
    }

    private async Task SyncStatsAsync(CancellationToken ct)
    {
        var db = redis.GetDatabase();

        // 1. 'Dirty' (hit almış) kitapların listesini al
        var dirtyIds = await db.SetMembersAsync("chapters:dirty");
        if (dirtyIds.Length == 0) return;

        // 2. Dirty listesini temizle (İşleme başladığımız için)
        await db.KeyDeleteAsync("chapters:dirty");

        using var scope = scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<BooksDbContext>();

        int totalUpdated = 0;
        foreach (var idValue in dirtyIds)
        {
            var idString = idValue.ToString();
            var hitKey = $"chapter:hits:{idString}";
            
            // 3. Mevcut hit sayısını al 
            var hits = await db.StringGetAsync(hitKey);
            
            if (hits.HasValue && Guid.TryParse(idString, out var chapterId))
            {
                var hitCount = (long)hits;

                // 4. Veritabanında toplu (Batch) artış yap
                // ExecuteUpdateAsync kullanarak veriyi çekmeden doğrudan SQL UPDATE atıyoruz
                await dbContext.Chapters
                    .Where(x => x.Id == chapterId)
                    .ExecuteUpdateAsync(s => s.SetProperty(b => b.ViewCount, b => b.ViewCount + hitCount), ct);

                // 5. Redis sayacını, işlediğimiz miktar kadar düşür (Decrement)
                // Bu sayede sync sırasında gelen yeni hitler kaybolmaz!
                await db.StringDecrementAsync(hitKey, hitCount);
                
                totalUpdated++;
            }
        }

        if (totalUpdated > 0)
        {
            logger.LogInformation("{Count} adet bölümün izlenme istatistiği SQL'e yansıtıldı.", totalUpdated);
        }

        // 6. 'Dirty' (hit almış) kitapların listesini al ve işle
        var dirtyBookIds = await db.SetMembersAsync("books:dirty");
        if (dirtyBookIds.Length > 0)
        {
            await db.KeyDeleteAsync("books:dirty");
            int totalBooksUpdated = 0;
            
            foreach (var idValue in dirtyBookIds)
            {
                var idString = idValue.ToString();
                var hitKey = $"book:hits:{idString}";
                var hits = await db.StringGetAsync(hitKey);
                
                if (hits.HasValue && Guid.TryParse(idString, out var bookId))
                {
                    var hitCount = (long)hits;
                    await dbContext.Books
                        .Where(x => x.Id == bookId)
                        .ExecuteUpdateAsync(s => s.SetProperty(b => b.ViewCount, b => b.ViewCount + hitCount), ct);
                        
                    await db.StringDecrementAsync(hitKey, hitCount);
                    totalBooksUpdated++;
                }
            }
            
            if (totalBooksUpdated > 0)
            {
                logger.LogInformation("{Count} adet kitabın toplam izlenme istatistiği SQL'e yansıtıldı.", totalBooksUpdated);
            }
        }

        // 7. 'Rating Dirty' (yeni puan almış) kitapları işle
        var dirtyRatingIds = await db.SetMembersAsync("books:v2:rating_dirty");
        if (dirtyRatingIds.Length > 0)
        {
            await db.KeyDeleteAsync("books:v2:rating_dirty");
            int ratingBooksUpdated = 0;

            foreach (var idValue in dirtyRatingIds)
            {
                var idString = idValue.ToString();
                var sumKey = $"book:v2:rating_sum:{idString}";
                var countKey = $"book:v2:rating_count:{idString}";

                var deltaSumRaw = await db.StringGetAsync(sumKey);
                var deltaCountRaw = await db.StringGetAsync(countKey);

                if ((deltaSumRaw.HasValue || deltaCountRaw.HasValue) && Guid.TryParse(idString, out var bookId))
                {
                    long deltaSum = (long?)deltaSumRaw ?? 0;
                    long deltaCount = (long?)deltaCountRaw ?? 0;

                    // Karmaşık matematiksel güncelleme için kitabı çekmemiz gerekiyor 
                    // (veya SQL'de doğrudan Sum/Count tutuyor olmalıydık).
                    // Ama burada ViewCount mantığına en yakın şekilde:
                    var book = await dbContext.Books.FirstOrDefaultAsync(x => x.Id == bookId, ct);
                    if (book != null)
                    {
                        double oldSum = book.AverageRating * book.VoteCount;
                        double newSum = oldSum + deltaSum;
                        int newCount = book.VoteCount + (int)deltaCount;

                        if (newCount > 0)
                        {
                            book.AverageRating = Math.Round(newSum / newCount, 1);
                            book.VoteCount = newCount;
                            book.UpdatedAt = DateTime.UtcNow;
                        }

                        // Redis'ten işlediğimiz kadarını düşüyoruz
                        await db.StringDecrementAsync(sumKey, deltaSum);
                        await db.StringDecrementAsync(countKey, deltaCount);
                        
                        ratingBooksUpdated++;
                    }
                }
            }
            
            if (ratingBooksUpdated > 0)
            {
                await dbContext.SaveChangesAsync(ct);
                logger.LogInformation("{Count} adet kitabın puan istatistikleri SQL'e yansıtıldı.", ratingBooksUpdated);
            }
        }
    }
}
