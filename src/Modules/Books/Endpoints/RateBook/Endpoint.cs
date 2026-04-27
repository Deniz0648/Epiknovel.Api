using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;
using Microsoft.Extensions.Caching.Distributed;
using StackExchange.Redis;

namespace Epiknovel.Modules.Books.Endpoints.RateBook;

public class Endpoint(
    BooksDbContext dbContext, 
    IConnectionMultiplexer redis) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/books/{BookId}/rate");
        Summary(s => {
            s.Summary = "Kitabı puanlar.";
            s.Description = "Her kullanıcı bir kitaba sadece bir kez puan verebilir. Tekrar puanladığında eski puanı güncellenir ve ortalama yeniden hesaplanır.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        try 
        {
            var userIdValue = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdValue, out var userId))
            {
                await Send.ResponseAsync(Result<Response>.Failure("Puan vermek için giriş yapmalısınız."), 401, ct);
                return;
            }

            if (req.Value < 1 || req.Value > 5)
            {
                await Send.ResponseAsync(Result<Response>.Failure("Puan 1 ile 5 arasında olmalıdır."), 400, ct);
                return;
            }

            // 1. Kitabı Bul (Soft delete kontrolü global query filter ile yapılıyor)
            var book = await dbContext.Books
                .FirstOrDefaultAsync(x => x.Id == req.BookId, ct);
            
            if (book == null)
            {
                await Send.ResponseAsync(Result<Response>.Failure("Puanlanacak kitap bulunamadı."), 404, ct);
                return;
            }

            int cappedValue = Math.Clamp(req.Value, 1, 5); // 🛡️ HARD LIMIT (1-5)

            // 2. Mevcut Puanı Kontrol Et (Update or Insert)
            var existingRating = await dbContext.BookRatings
                .FirstOrDefaultAsync(x => x.BookId == req.BookId && x.UserId == userId, ct);

            int oldValue = 0;
            if (existingRating != null)
            {
                oldValue = existingRating.Value;
                existingRating.Value = cappedValue;
                existingRating.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                var newRating = new BookRating
                {
                    BookId = req.BookId,
                    UserId = userId,
                    Value = cappedValue,
                    CreatedAt = DateTime.UtcNow
                };
                dbContext.BookRatings.Add(newRating);
            }

            // 3. Değişiklikleri Kaydet (SADECE BookRatings tablosuna - Hızlı İşlem)
            await dbContext.SaveChangesAsync(ct);

            // 4. Redis Delta Mantığı (Buffering) - ViewCount ile aynı mantık
            var db = redis.GetDatabase();
            var bookIdStr = book.Id.ToString();
            
            // Puan Farkı (DeltaSum): Yeni Puan (Capped) - (Varsa Eski Puan)
            int ratingDelta = cappedValue - oldValue;
            // Oy Sayısı Farkı (DeltaCount): Eğer yeniyse 1, güncellemeyse 0
            int countDelta = existingRating == null ? 1 : 0;

            if (ratingDelta != 0) 
                await db.StringIncrementAsync($"book:v2:rating_sum:{bookIdStr}", ratingDelta);
            
            if (countDelta > 0)
                await db.StringIncrementAsync($"book:v2:rating_count:{bookIdStr}", countDelta);
            
            // Sync Worker için kirli (dirty) listesine ekle
            await db.SetAddAsync("books:v2:rating_dirty", bookIdStr);

            // 🚀 KULLANICI PUANINI CACHE'LE (Frontend için)
            // IDistributedCache (cache) yerine doğrudan db (redis) kullanıyoruz ki WRONGTYPE hatası olmasın.
            var userRatingKey = $"v2:user:{userId}:rating:{bookIdStr}";
            await db.StringSetAsync(userRatingKey, cappedValue.ToString(), TimeSpan.FromHours(1));

            // 🚀 GERÇEK ZAMANLI PUANI HESAPLA VE DÖN (Overlay mantığı)
            var (newAvg, totalCount) = Epiknovel.Modules.Books.Helpers.RatingMath.Calculate(book.AverageRating, book.VoteCount, ratingDelta, countDelta);

            await Send.ResponseAsync(Result<Response>.Success(new Response 
            {
                NewAverageRating = newAvg, 
                TotalVotes = totalCount
            }), 200, ct);
        }
        catch (Exception ex)
        {
            await Send.ResponseAsync(Result<Response>.Failure($"Sistem Hatası: {ex.Message}"), 500, ct);
        }
    }
}
