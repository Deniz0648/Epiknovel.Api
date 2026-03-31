using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Domain;
using Microsoft.EntityFrameworkCore;
using MediatR;
using Epiknovel.Shared.Core.Events;

namespace Epiknovel.Modules.Books.Workers;

/// <summary>
/// Zamanlanmış (Scheduled) bölümleri periyodik olarak kontrol eder.
/// ScheduledPublishDate'i geçmiş olan bölümleri otomatik olarak Published durumuna çeker
/// ve ChapterPublishedEvent fırlatır (Arama indeksi, bildirimler vb. için).
/// </summary>
public class ScheduledPublishWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<ScheduledPublishWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Scheduled Publish Worker başlatıldı (Kontrol aralığı: 1 dakika).");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await PublishScheduledChaptersAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Zamanlanmış yayın kontrolü sırasında hata oluştu.");
            }

            // 1 dakikada bir kontrol et
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }

    private async Task PublishScheduledChaptersAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<BooksDbContext>();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var now = DateTime.UtcNow;

        // Zamanı gelmiş Scheduled bölümleri bul (Global Query Filter OLMADAN — IsDeleted olanları da görmemek için IgnoreQueryFilters kullanmıyoruz)
        var chaptersToPublish = await dbContext.Chapters
            .Where(c => c.Status == ChapterStatus.Scheduled
                     && c.ScheduledPublishDate != null
                     && c.ScheduledPublishDate <= now
                     && !c.IsDeleted)
            .ToListAsync(ct);

        if (chaptersToPublish.Count == 0) return;

        logger.LogInformation("{Count} adet zamanlanmış bölüm yayınlanıyor.", chaptersToPublish.Count);

        foreach (var chapter in chaptersToPublish)
        {
            chapter.Status = ChapterStatus.Published;
            chapter.PublishedAt = now;
            chapter.UpdatedAt = now;
        }

        await dbContext.SaveChangesAsync(ct);

        // Her bölüm için ChapterPublishedEvent fırlat (Arama, bildirim modülleri dinler)
        foreach (var chapter in chaptersToPublish)
        {
            try
            {
                await mediator.Publish(new ChapterPublishedEvent(
                    chapter.BookId,
                    chapter.Id,
                    chapter.Title,
                    chapter.Slug,
                    chapter.UserId,
                    chapter.PublishedAt!.Value), ct);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "ChapterPublishedEvent fırlatılamadı. ChapterId: {ChapterId}", chapter.Id);
            }
        }
    }
}
