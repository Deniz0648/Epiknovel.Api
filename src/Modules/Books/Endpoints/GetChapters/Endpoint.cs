using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Books.Endpoints.GetChapters;

public class Endpoint(BooksDbContext dbContext) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Get("/books/{bookId}/chapters");
        AllowAnonymous();
        Summary(s => {
            s.Summary = "Bir kitabın bölümlerini sayfalanmış olarak listeler.";
            s.Description = "Sıralama ve filtrelemeye uygun sayfalamalı çıktı verir.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var bookId = Route<Guid>("bookId");
        
        var query = dbContext.Chapters
            .Where(x => x.BookId == bookId && !x.IsDeleted);

        // Draft görme yetkisi: Sadece kitabın sahibi olan kullanıcı görebilir
        var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        Guid.TryParse(userIdStr, out var requestingUserId);

        var isOwner = requestingUserId != Guid.Empty
            && await dbContext.Books.AnyAsync(b => b.Id == bookId && b.AuthorId == requestingUserId, ct);

        if (!isOwner)
        {
            // Yetkisiz kullanıcılar sadece Published bölümleri görebilir
            query = query.Where(x => x.Status == ChapterStatus.Published);
        }
        else if (!req.IncludeDrafts)
        {
            // Yazar ama IncludeDrafts=false ise yine sadece Published
            query = query.Where(x => x.Status == ChapterStatus.Published);
        }

        // Toplam Sayı
        var totalCount = await query.CountAsync(ct);

        // Sıralama
        if (req.SortBy.Equals("PublishedAt", StringComparison.OrdinalIgnoreCase))
        {
            query = req.SortDescending ? query.OrderByDescending(x => x.PublishedAt) : query.OrderBy(x => x.PublishedAt);
        }
        else
        {
            query = req.SortDescending ? query.OrderByDescending(x => x.Order) : query.OrderBy(x => x.Order);
        }

        // Sayfalama
        var chapters = await query
            .Skip((req.PageNumber - 1) * req.PageSize)
            .Take(req.PageSize)
            .Select(x => new ChapterItem 
            {
                Id = x.Id,
                Title = x.Title,
                Slug = x.Slug,
                Order = x.Order,
                WordCount = x.WordCount,
                IsFree = x.IsFree,
                Price = x.Price,
                Status = x.Status,
                IsTitleSpoiler = x.IsTitleSpoiler,
                PublishedAt = x.PublishedAt
            })
            .ToListAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Chapters = chapters,
            TotalCount = totalCount,
            PageNumber = req.PageNumber,
            PageSize = req.PageSize
        }), 200, ct);
    }
}
