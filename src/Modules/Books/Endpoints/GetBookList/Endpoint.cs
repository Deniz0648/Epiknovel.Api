using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Books.Endpoints.GetBookList;

public class Endpoint(BooksDbContext dbContext) : Endpoint<Request, Result<PagedResult<Response>>>
{
    public override void Configure()
    {
        Get("/books");
        AllowAnonymous();
        Summary(s => {
            s.Summary = "Kitap listesini sayfalamalı olarak getirir.";
            s.Description = "SEO uyumlu Slug ve Kapak resimleri ile birlikte döner. (Zorunlu Pagination).";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // 1. Sorguyu Hazırla (Base Query)
        var query = dbContext.Books
            .AsNoTracking()
            .AsQueryable();

        // 2. Filtreler
        if (!string.IsNullOrWhiteSpace(req.Search))
        {
            query = query.Where(x => x.Title.Contains(req.Search) || x.Description.Contains(req.Search));
        }

        if (req.CategoryId.HasValue)
        {
            query = query.Where(x => x.Categories.Any(c => c.Id == req.CategoryId.Value));
        }

        // 3. Toplam Kayıt Sayısı (Sayfalama için kritik)
        var totalCount = await query.CountAsync(ct);

        // 4. Veriyi Çek (Pagination & Projection)
        var items = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip((req.PageNumber - 1) * req.PageSize)
            .Take(req.PageSize)
            .Select(x => new Response
            {
                Id = x.Id,
                Title = x.Title,
                Slug = x.Slug,
                Description = x.Description,
                CoverImageUrl = x.CoverImageUrl,
                AuthorName = "Yazar" // TODO: Users modülünden çekilecek (MediatR tabanlı veya Cache)
            })
            .ToListAsync(ct);

        // 5. PagedResult Oluştur ve Gönder
        var pagedResult = PagedResult<Response>.Create(items, totalCount, req.PageNumber, req.PageSize);
        
        await Send.ResponseAsync(Result<PagedResult<Response>>.Success(pagedResult), 200, ct);
    }
}

