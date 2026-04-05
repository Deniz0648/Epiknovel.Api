using Epiknovel.Modules.Books.Data;
using Epiknovel.Shared.Core.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Domain;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace Epiknovel.Modules.Books.Features.Books.Queries.GetBookDetail;

public class GetBookDetailHandler(
    BooksDbContext dbContext, 
    IDistributedCache cache,
    StackExchange.Redis.IConnectionMultiplexer redis) : IRequestHandler<GetBookDetailQuery, Result<BookDetailResponse>>
{
    public async Task<Result<BookDetailResponse>> Handle(GetBookDetailQuery request, CancellationToken ct)
    {
        var cacheKey = $"book_detail:{request.Slug}";
        var cachedData = await cache.GetStringAsync(cacheKey, ct);
        BookDetailResponse? response = null;
        
        if (!string.IsNullOrEmpty(cachedData))
        {
            response = JsonSerializer.Deserialize<BookDetailResponse>(cachedData);
        }

        if (response == null)
        {
            var book = await dbContext.Books
                .AsNoTracking()
                .AsSplitQuery()
                .Include(x => x.Categories)
                .Include(x => x.Tags)
                .FirstOrDefaultAsync(x => x.Slug == request.Slug && !x.IsHidden, ct);

            if (book == null)
            {
                return Result<BookDetailResponse>.Failure("Kitap bulunamadı.");
            }

            var isOwner = request.RequestingUserId != Guid.Empty && book.AuthorId == request.RequestingUserId;
            if (book.Status == BookStatus.Draft && !isOwner)
            {
                return Result<BookDetailResponse>.Failure("Kitap bulunamadı.");
            }

            response = new BookDetailResponse
            {
                Id = book.Id,
                Title = book.Title,
                Slug = book.Slug,
                Description = book.Description,
                CoverImageUrl = book.CoverImageUrl,
                AuthorId = book.AuthorId,
                AuthorName = "Yazar", // TODO: Users modülünden çekilecek
                Status = book.Status.ToString(),
                ContentRating = book.ContentRating.ToString(),
                Type = book.Type.ToString(),
                VoteCount = book.VoteCount,
                AverageRating = book.AverageRating,
                ViewCount = book.ViewCount,
                CreatedAt = book.CreatedAt,
                Categories = book.Categories.Select(c => new CategoryDto { Id = c.Id, Name = c.Name, Slug = c.Slug }).ToList(),
                Tags = book.Tags.Select(t => t.Name).ToList()
            };

            // Cache for 5 minutes
            await cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(response), new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
            }, ct);
        }

        // 🚀 ANLIK GÖRSEL İYİLEŞTİRME (Hit Sayısı Overlay)
        try 
        {
            var db = redis.GetDatabase();
            var pendingHits = await db.StringGetAsync($"book:hits:{response.Id}");
            if (pendingHits.HasValue)
            {
                response = response with { ViewCount = response.ViewCount + (long)pendingHits };
            }

            // 🚀 PUANLAMA OVERLAY (Delta Buffering Mantığı - ViewCount ile aynı)
            // SQL'deki eski puanlarla Redis'teki bekleyen puan değişimlerini (DeltaSum/Count) birleştiriyoruz.
            var deltaSumTask = db.StringGetAsync($"book:v2:rating_sum:{response.Id}");
            var deltaCountTask = db.StringGetAsync($"book:v2:rating_count:{response.Id}");
            await Task.WhenAll(deltaSumTask, deltaCountTask);

            long deltaSum = (long)(await deltaSumTask);
            long deltaCount = (long)(await deltaCountTask);

            if (deltaSum != 0 || deltaCount != 0)
            {
                double currentAvg = response.AverageRating;
                int currentCount = response.VoteCount;

                double totalSum = (currentAvg * currentCount) + deltaSum;
                int totalCount = currentCount + (int)deltaCount;

                if (totalCount > 0)
                {
                    response = response with { 
                        AverageRating = Math.Min(5.0, Math.Round(totalSum / totalCount, 1)), 
                        VoteCount = totalCount 
                    };
                }
            }

            // 🚀 KULLANICI PUANI OVERLAY
            if (request.RequestingUserId != Guid.Empty)
            {
                var userRatingKey = $"v2:user:{request.RequestingUserId}:rating:{response.Id}";
                var uRating = await db.StringGetAsync(userRatingKey);
                if (uRating.HasValue)
                {
                    response = response with { UserRating = int.Parse(uRating!) };
                }
                else 
                {
                    // Redis'te yoksa DB'den bak (Normalde DB her zaman bakılmalı ama performans için cache'liyoruz)
                    var dbRating = await dbContext.BookRatings
                        .AsNoTracking()
                        .Where(x => x.BookId == response.Id && x.UserId == request.RequestingUserId)
                        .Select(x => x.Value)
                        .FirstOrDefaultAsync(ct);
                    
                    if (dbRating > 0)
                    {
                        response = response with { UserRating = dbRating };
                        // Redis'e de atalım (Tutarlı olması için v2 key'e)
                        await db.StringSetAsync(userRatingKey, dbRating.ToString(), TimeSpan.FromHours(1));
                    }
                }
            }
        } catch { }

        return Result<BookDetailResponse>.Success(response);
    }
}

public class RatingOverlayDto
{
    public double Avg { get; set; }
    public int Count { get; set; }
}
