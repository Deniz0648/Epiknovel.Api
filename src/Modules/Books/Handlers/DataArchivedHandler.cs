using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Events;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Epiknovel.Modules.Books.Handlers;

/// <summary>
/// Asenkron Veri Arşivleme (Cold Storage) İşleyicisi.
/// Veri silindiği anda (Soft-Delete) tetiklenir ve verinin son halini 
/// AuditArchives tablosuna JSON olarak gömer.
/// </summary>
public class DataArchivedHandler(
    BooksDbContext dbContext,
    ILogger<DataArchivedHandler> logger) : INotificationHandler<DataArchivedEvent>
{
    public async Task Handle(DataArchivedEvent notification, CancellationToken ct)
    {
        try
        {
            // Sadece Books modülüne ait varlıkları bu handler işlesin
            if (notification.EntityType != "Book" && notification.EntityType != "Chapter")
            {
                return;
            }

            var archive = new AuditArchive
            {
                EntityId = notification.EntityId,
                EntityType = notification.EntityType,
                DataJson = notification.DataJson,
                PerformedByUserId = notification.PerformedByUserId,
                ArchivedAt = notification.ArchivedAt
            };

            dbContext.AuditArchives.Add(archive);
            await dbContext.SaveChangesAsync(ct);

            logger.LogInformation("Veri arşive alındı: {Type} - {Id}", notification.EntityType, notification.EntityId);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Veri arşivlenirken hata oluştu: {Id}", notification.EntityId);
        }
    }
}
