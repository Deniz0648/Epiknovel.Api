using Epiknovel.Modules.Books.Data;
using Epiknovel.Shared.Core.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Books.Handlers;

public class ReviewCreatedHandler(BooksDbContext dbContext) : INotificationHandler<ReviewCreatedEvent>
{
    public async Task Handle(ReviewCreatedEvent notification, CancellationToken ct)
    {
        var book = await dbContext.Books
            .FirstOrDefaultAsync(b => b.Id == notification.BookId, ct);

        if (book == null) return;

        if (notification.OldRating.HasValue)
        {
            // Güncelleme Durumu: VoteCount artmaz, sadece toplam değer değişir
            var currentTotal = book.AverageRating * book.VoteCount;
            book.AverageRating = (currentTotal - notification.OldRating.Value + notification.Rating) / book.VoteCount;
        }
        else
        {
            // Yeni İnceleme Durumu
            var currentTotal = book.AverageRating * book.VoteCount;
            book.VoteCount++;
            book.AverageRating = (currentTotal + notification.Rating) / book.VoteCount;
        }

        await dbContext.SaveChangesAsync(ct);
    }
}
