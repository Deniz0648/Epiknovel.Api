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

        // Gerçek zamanlı Ortalama Puan Hesaplama (veya sonradan asenkron olarak da yapılabilir)
        // Burada basitçe (EskiToplam + YeniPuan) / (EskiCount + 1) yapıyoruz.
        // Not: Review bazlı rating genelde Reviews tablosundan SUM/COUNT ile çekilse daha sağlıklı olur ama cache olarak tutuyoruz.
        
        var totalRating = book.AverageRating * book.VoteCount;
        book.VoteCount++;
        book.AverageRating = (totalRating + notification.Rating) / book.VoteCount;

        await dbContext.SaveChangesAsync(ct);
    }
}
