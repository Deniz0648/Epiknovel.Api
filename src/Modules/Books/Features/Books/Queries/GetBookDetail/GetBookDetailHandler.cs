using Epiknovel.Modules.Books.Data;
using Epiknovel.Shared.Core.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Domain;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace Epiknovel.Modules.Books.Features.Books.Queries.GetBookDetail;

public class GetBookDetailHandler(BooksDbContext dbContext, IDistributedCache cache) : IRequestHandler<GetBookDetailQuery, Result<BookDetailResponse>>
{
    public async Task<Result<BookDetailResponse>> Handle(GetBookDetailQuery request, CancellationToken ct)
    {
        var cacheKey = $"book_detail:{request.Slug}";
        var cachedData = await cache.GetStringAsync(cacheKey, ct);
        
        if (!string.IsNullOrEmpty(cachedData))
        {
            var cachedResponse = JsonSerializer.Deserialize<BookDetailResponse>(cachedData);
            if (cachedResponse != null)
                return Result<BookDetailResponse>.Success(cachedResponse);
        }

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

        var response = new BookDetailResponse
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

        var result = Result<BookDetailResponse>.Success(response);

        // Cache for 5 minutes
        await cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(response), new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
        }, ct);

        return result;
    }
}
