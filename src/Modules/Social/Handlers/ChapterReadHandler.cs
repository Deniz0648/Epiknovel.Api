using MediatR;
using Epiknovel.Shared.Core.Events;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Social.Handlers;

/// <summary>
/// Books modülünden fırlatılan ChapterReadEvent'i dinler.
/// Kullanıcının okuma geçmişini (ReadingProgress) otomatik olarak günceller.
/// </summary>
public class ChapterReadHandler(
    SocialDbContext dbContext, 
    StackExchange.Redis.IConnectionMultiplexer redis) : INotificationHandler<ChapterReadEvent>
{
    public async Task Handle(ChapterReadEvent notification, CancellationToken ct)
    {
        var db = redis.GetDatabase();
        var lockKey = $"read:lock:{notification.UserId}:{notification.ChapterId}";

        // 1. Event Flood Protection: Aynı kullanıcı aynı bölümü son 2 dakikada okuduysa görmezden gel
        // Bu sayede bot/saldırı ihtimali ve gereksiz DB yükü engellenmiş olur.
        if (await db.KeyExistsAsync(lockKey)) return;

        // 2 dakika boyunca bu kullanıcı-bölüm ikilisi için tekrar işlem yapma
        await db.StringSetAsync(lockKey, "1", TimeSpan.FromMinutes(2));

        // 2. Mevcut ilerlemeyi ara (BOLA: UserId bazlı izole sorgu)
        var progress = await dbContext.ReadingProgresses
            .FirstOrDefaultAsync(x => x.UserId == notification.UserId && x.BookId == notification.BookId, ct);

        if (progress == null)
        {
            // İlk kez okuyor, yeni kayıt oluştur
            progress = new ReadingProgress
            {
                UserId = notification.UserId,
                BookId = notification.BookId,
                LastReadChapterId = notification.ChapterId,
                ScrollPercentage = notification.ScrollPercentage,
                LastReadAt = notification.ReadAt
            };
            dbContext.ReadingProgresses.Add(progress);
        }
        else
        {
            // Kaldığı yeri güncelle (Sadece daha ileriye gittiğinde veya bölüm değiştiğinde değil, her açılışta güncellenir ancak lock korumalıdır)
            progress.LastReadChapterId = notification.ChapterId;
            progress.ScrollPercentage = notification.ScrollPercentage;
            progress.LastReadAt = notification.ReadAt;
        }

        await dbContext.SaveChangesAsync(ct);
    }
}
