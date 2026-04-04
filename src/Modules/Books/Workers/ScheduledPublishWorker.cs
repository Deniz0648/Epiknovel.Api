using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Domain;
using Microsoft.EntityFrameworkCore;
using MediatR;
using Epiknovel.Shared.Core.Events;
using System.Data;

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
    // Global advisory lock key for scheduled chapter publishing (PostgreSQL)
    private const long ScheduledPublishLockKey = 824_531_907;

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

        var lockAcquired = await TryAcquireGlobalLockAsync(dbContext, ct);
        if (!lockAcquired)
        {
            return;
        }

        var now = DateTime.UtcNow;

        try
        {
            // Zamanı gelmiş Scheduled bölümleri bul
            var chaptersToPublish = await dbContext.Chapters
                .Include(c => c.Book) // 📚 Kitap ismine ihtiyacımız var (Bildirim için)
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
                        chapter.Book.Title,
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
        finally
        {
            await ReleaseGlobalLockAsync(dbContext, ct);
        }
    }

    private static async Task<bool> TryAcquireGlobalLockAsync(BooksDbContext dbContext, CancellationToken ct)
    {
        var connection = dbContext.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync(ct);
        }

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT pg_try_advisory_lock(@key);";

        var keyParam = cmd.CreateParameter();
        keyParam.ParameterName = "@key";
        keyParam.Value = ScheduledPublishLockKey;
        cmd.Parameters.Add(keyParam);

        var result = await cmd.ExecuteScalarAsync(ct);
        return result is bool acquired && acquired;
    }

    private static async Task ReleaseGlobalLockAsync(BooksDbContext dbContext, CancellationToken ct)
    {
        var connection = dbContext.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
        {
            return;
        }

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT pg_advisory_unlock(@key);";

        var keyParam = cmd.CreateParameter();
        keyParam.ParameterName = "@key";
        keyParam.Value = ScheduledPublishLockKey;
        cmd.Parameters.Add(keyParam);

        await cmd.ExecuteScalarAsync(ct);
    }
}
