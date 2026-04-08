using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Books.Endpoints.GetChapters;

public class Endpoint(BooksDbContext dbContext) : Endpoint<Request, Result<Response>>
{
    private const int MaxPageSize = 250;

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
        // 1. Kitabı ID veya Slug'dan Çöz
        Guid bookId;
        if (Guid.TryParse(req.BookId, out var parsedGuid))
        {
            bookId = parsedGuid;
        }
        else
        {
            // Slug üzerinden ID bul
            var book = await dbContext.Books
                .Where(x => x.Slug == req.BookId)
                .Select(x => new { x.Id, x.IsHidden })
                .FirstOrDefaultAsync(ct);

            if (book == null || book.IsHidden)
            {
                await Send.NotFoundAsync(ct);
                return;
            }
            bookId = book.Id;
        }

        var pageNumber = req.PageNumber < 1 ? 1 : req.PageNumber;
        var pageSize = req.PageSize < 1 ? 50 : Math.Min(req.PageSize, MaxPageSize);
        
        var query = dbContext.Chapters
            .Where(x => x.BookId == bookId && !x.IsDeleted);

        // 🟢 Arama Filtresi (Eklendi)
        if (!string.IsNullOrWhiteSpace(req.SearchTerm))
        {
            var term = req.SearchTerm.ToLower();
            query = query.Where(x => x.Title.ToLower().Contains(term));
        }

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
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
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
                PublishedAt = x.PublishedAt,
                ViewCount = x.ViewCount
            })
            .ToListAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Chapters = chapters,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        }), 200, ct);
    }
}
