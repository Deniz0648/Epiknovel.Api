using MediatR;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Shared.Core.Events;
using Epiknovel.Modules.Search.Data;
using Epiknovel.Modules.Search.Domain;
using Microsoft.Extensions.Logging;

namespace Epiknovel.Modules.Search.Handlers;

public class UserIndexedEventHandler(
    SearchDbContext dbContext,
    ILogger<UserIndexedEventHandler> logger) : INotificationHandler<UserProfileUpdatedEvent>
{
    public async Task Handle(UserProfileUpdatedEvent notification, CancellationToken cancellationToken)
    {
        try
        {
            var document = await dbContext.SearchDocuments
                .FirstOrDefaultAsync(d => d.ReferenceId == notification.UserId && d.Type == DocumentType.User, cancellationToken);

            bool isNew = false;
            if (document == null)
            {
                document = new SearchDocument
                {
                    Type = DocumentType.User,
                    ReferenceId = notification.UserId
                };
                isNew = true;
            }

            document.Title = notification.DisplayName;
            document.Description = notification.Bio;
            document.Slug = notification.Slug;
            document.ImageUrl = notification.AvatarUrl;
            document.IsActive = true; 
            document.Tags = "yazar yazar-profili";

            if (isNew)
            {
                await dbContext.SearchDocuments.AddAsync(document, cancellationToken);
            }
            
            await dbContext.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Kullanıcı (UserId: {UserId}) arama indeksine güncellendi.", notification.UserId);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Kullanıcı {UserId} aranabilir hale getirilirken hata oluştu.", notification.UserId);
        }
    }
}
