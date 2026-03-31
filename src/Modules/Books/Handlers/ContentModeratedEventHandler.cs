using System.Threading;
using System.Threading.Tasks;
using Epiknovel.Shared.Core.Events;
using Epiknovel.Shared.Core.Enums;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;

namespace Epiknovel.Modules.Books.Handlers;

public class ContentModeratedEventHandler(BooksDbContext dbContext) : INotificationHandler<ContentModeratedEvent>
{
    public async Task Handle(ContentModeratedEvent notification, CancellationToken cancellationToken)
    {
        if (!notification.IsDeleted) return;

        switch (notification.ContentType)
        {
            case TargetContentType.Book:
                var book = await dbContext.Books.FirstOrDefaultAsync(b => b.Id == notification.ContentId, cancellationToken);
                if (book != null)
                {
                    book.IsDeleted = true;
                    book.DeletedAt = notification.ModeratedAt;
                    book.DeletedByUserId = notification.AdminId;
                    book.IsHidden = true; // Ek olarak gizle
                }
                break;

            case TargetContentType.Chapter:
                var chapter = await dbContext.Chapters.FirstOrDefaultAsync(c => c.Id == notification.ContentId, cancellationToken);
                if (chapter != null)
                {
                    chapter.IsDeleted = true;
                    chapter.DeletedAt = notification.ModeratedAt;
                    chapter.DeletedByUserId = notification.AdminId;
                    chapter.Status = ChapterStatus.Draft; // Yayından çek
                }
                break;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
