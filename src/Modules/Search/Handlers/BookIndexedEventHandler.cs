using MediatR;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Shared.Core.Events;
using Epiknovel.Modules.Search.Data;
using Epiknovel.Modules.Search.Domain;
using Microsoft.Extensions.Logging;

namespace Epiknovel.Modules.Search.Handlers;

public class BookIndexedEventHandler(
    SearchDbContext dbContext,
    ILogger<BookIndexedEventHandler> logger) : INotificationHandler<BookUpdatedEvent>
{
    public async Task Handle(BookUpdatedEvent notification, CancellationToken cancellationToken)
    {
        try
        {
            // Orijinal kitap ID sine sahip indeks varsa güncelle, yoksa oluştur
            var document = await dbContext.SearchDocuments
                .FirstOrDefaultAsync(d => d.ReferenceId == notification.BookId && d.Type == DocumentType.Book, cancellationToken);

            bool isNew = false;
            if (document == null)
            {
                document = new SearchDocument
                {
                    Type = DocumentType.Book,
                    ReferenceId = notification.BookId
                };
                isNew = true;
            }

            // Temel Bilgiler
            document.Title = notification.Title;
            document.Description = notification.Description;
            document.Slug = notification.Slug;
            document.ImageUrl = notification.CoverImageUrl;
            document.IsActive = !notification.IsHidden && !notification.IsDeleted;

            // FTS "Hidden Tags" (Yazar adı + Kategoriler + Etiketler birleşimi)
            // Bu alan, arama sorgularının verimli eşleşmesini sağlar.
            var tagsList = new List<string> { notification.AuthorName };
            tagsList.AddRange(notification.Categories);
            tagsList.AddRange(notification.Tags);
            
            document.Tags = string.Join(" ", tagsList.Where(t => !string.IsNullOrWhiteSpace(t)));

            if (isNew)
            {
                await dbContext.SearchDocuments.AddAsync(document, cancellationToken);
            }
            
            await dbContext.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Kitap (BookId: {BookId}) arama indeksine güncellendi.", notification.BookId);
        }
        catch (Exception ex)
        {
            // Arama indeksleme başarısız olsa bile ana işlemi durdurmamalıyız (CQRS kuralı),
            // Sadece loglayıp daha sonra Re-Index ile toparlamayı hedefliyoruz.
            logger.LogError(ex, "Kitap {BookId} aranabilir hale getirilirken hata oluştu.", notification.BookId);
        }
    }
}
