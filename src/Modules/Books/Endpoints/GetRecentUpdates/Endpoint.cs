using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Books.Endpoints.GetRecentUpdates;

public class Endpoint(BooksDbContext dbContext) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Get("/books/updates");
        AllowAnonymous();
        Summary(s => {
            s.Summary = "Sitedeki en son yayınlanan bölümleri (updates) listeler.";
            s.Description = "Tüm kitaplardan en yeni Published bölümleri yayınlanma tarihine göre azalan sırada döner.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var pageNumber = req.PageNumber < 1 ? 1 : req.PageNumber;
        var pageSize = req.PageSize < 1 ? 20 : Math.Min(req.PageSize, 100);

        IQueryable<Chapter> query = dbContext.Chapters
            .AsNoTracking()
            .Where(x => x.Status == ChapterStatus.Published && !x.IsDeleted && !x.Book.IsHidden)
            .Include(x => x.Book)
                .ThenInclude(b => b.Categories);

        // Arama (Arama yapıldığında hem bölüm hem de kitap adına bakar)
        if (!string.IsNullOrWhiteSpace(req.Search))
        {
            var search = req.Search.ToLower();
            query = query.Where(x => x.Title.ToLower().Contains(search) || x.Book.Title.ToLower().Contains(search));
        }

        // Toplam Sayı
        var totalCount = await query.CountAsync(ct);

        // En Yeniler Üstte
        var updates = await query
            .OrderByDescending(x => x.PublishedAt ?? x.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new UpdateItem
            {
                ChapterId = x.Id,
                ChapterTitle = x.Title,
                ChapterSlug = x.Slug,
                Order = x.Order,
                PublishedAt = x.PublishedAt ?? x.CreatedAt,
                BookTitle = x.Book.Title,
                BookSlug = x.Book.Slug,
                BookCoverImageUrl = x.Book.CoverImageUrl,
                BookCategories = x.Book.Categories.Select(c => c.Name).ToList()
            })
            .ToListAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Updates = updates,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        }), 200, ct);
    }
}
