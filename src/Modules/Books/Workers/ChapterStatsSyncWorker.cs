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
    }
}
