using Epiknovel.Modules.Books.Data;
using Epiknovel.Shared.Core.Events;
using Epiknovel.Shared.Core.Constants;
using Microsoft.AspNetCore.OutputCaching;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Domain;

namespace Epiknovel.Modules.Books.Handlers;

public class ReviewCreatedHandler(
    BooksDbContext dbContext, 
    StackExchange.Redis.IConnectionMultiplexer redis,
    IOutputCacheStore cacheStore) : INotificationHandler<ReviewCreatedEvent>
{
    public async Task Handle(ReviewCreatedEvent notification, CancellationToken ct)
    {
        var book = await dbContext.Books
            .FirstOrDefaultAsync(b => b.Id == notification.BookId, ct);

        if (book == null) return;

        // Check if the user has already rated this book via the separate rating system
        var existingRating = await dbContext.BookRatings
            .FirstOrDefaultAsync(r => r.BookId == notification.BookId && r.UserId == notification.UserId, ct);

        double oldRatingValue = notification.OldRating ?? (existingRating?.Value ?? 0);
        bool isNewVote = !notification.OldRating.HasValue && existingRating == null;

        var currentTotal = book.AverageRating * book.VoteCount;

        int ratingDelta = (int)notification.Rating - (int)oldRatingValue;
        int countDelta = isNewVote ? 1 : 0;

        var (newAvg, newCount) = Epiknovel.Modules.Books.Helpers.RatingMath.Calculate(book.AverageRating, book.VoteCount, ratingDelta, countDelta);
        
        book.AverageRating = newAvg;
        book.VoteCount = newCount;

        // Eğer mevcut bir rating kaydı varsa, onu güncelle; yoksa yeni oluştur.
        // Bu sayede Books modülündeki ana rating sistemi ile Social modülündeki review sistemi senkronize olur.
        if (existingRating != null)
        {
            existingRating.Value = (int)notification.Rating;
            existingRating.UpdatedAt = DateTime.UtcNow;
        }
        else 
        {
            dbContext.BookRatings.Add(new BookRating 
            {
                BookId = notification.BookId,
                UserId = notification.UserId,
                Value = (int)notification.Rating,
                CreatedAt = DateTime.UtcNow
            });
        }

        await dbContext.SaveChangesAsync(ct);

        // 🚀 REDIS SYNC: Cache'i temizle ve Puan Senkronizasyonunu tetikle
        var db = redis.GetDatabase();
        var bookIdStr = notification.BookId.ToString();
        
        // 🚀 SMART CACHE INVALIDATION: Listeleri ve kitabı anında güncelle
        await cacheStore.EvictByTagAsync(CacheTags.AllBooks, ct);
        await cacheStore.EvictByTagAsync(CacheTags.Book(notification.BookId), ct);
        
        // Redis 'dirty' işaretle (Worker puanları toplu kontrol etsin diye)
        await db.SetAddAsync("books:v2:rating_dirty", bookIdStr);
    }
}
