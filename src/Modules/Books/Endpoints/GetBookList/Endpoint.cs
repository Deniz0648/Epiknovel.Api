using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Shared.Core.Models;

using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Books.Endpoints.GetBookList;

public class Endpoint(BooksDbContext dbContext, IUserAccountProvider userAccountProvider, IUserProvider userProvider) : Endpoint<Request, Result<PagedResult<Response>>>
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

        if (!string.IsNullOrWhiteSpace(req.AuthorSlug))
        {
            var normalizedAuthorSlug = Epiknovel.Shared.Core.Common.SlugHelper.ToSlug(req.AuthorSlug);
            var authorId = await userProvider.GetUserIdBySlugAsync(normalizedAuthorSlug, ct);
            if (!authorId.HasValue)
            {
                var emptyResult = PagedResult<Response>.Create([], 0, req.PageNumber, req.PageSize);
                await Send.ResponseAsync(Result<PagedResult<Response>>.Success(emptyResult), 200, ct);
                return;
            }

            query = query.Where(x => x.AuthorId == authorId.Value);
        }

        if (req.CategoryId.HasValue)
        {
            query = query.Where(x => x.Categories.Any(c => c.Id == req.CategoryId.Value));
        }

        if (req.TagId.HasValue)
        {
            query = query.Where(x => x.Tags.Any(t => t.Id == req.TagId.Value));
        }

        if (req.Type.HasValue)
        {
            query = query.Where(x => x.Type == req.Type.Value);
        }

        if (req.Status.HasValue)
        {
            query = query.Where(x => x.Status == req.Status.Value);
        }
        else
        {
            // Varsayılan olarak sadece yayınlanmış kitaplar (Halka açık keşif için)
            // Eğer admin/author yetkisi varsa tümünü görebilir (Gelecekte eklenecek)
            query = query.Where(x => x.Status == Epiknovel.Modules.Books.Domain.BookStatus.Published);
        }

        if (req.IsEditorChoice.HasValue)
        {
            query = query.Where(x => x.IsEditorChoice == req.IsEditorChoice.Value);
        }

        if (req.ContentRating.HasValue)
        {
            query = query.Where(x => x.ContentRating == req.ContentRating.Value);
        }

        // 3. Toplam Kayıt Sayısı
        var totalCount = await query.CountAsync(ct);

        // 4. Sıralama
        query = req.SortBy switch
        {
            "ViewCount" => req.SortDescending ? query.OrderByDescending(x => x.ViewCount) : query.OrderBy(x => x.ViewCount),
            "AverageRating" => req.SortDescending ? query.OrderByDescending(x => x.AverageRating) : query.OrderBy(x => x.AverageRating),
            _ => req.SortDescending ? query.OrderByDescending(x => x.CreatedAt) : query.OrderBy(x => x.CreatedAt)
        };

        // 5. Veriyi Çek (Pagination & Projection)
        var items = await query
            .Skip((req.PageNumber - 1) * req.PageSize)
            .Take(req.PageSize)
            .Select(x => new Response
            {
                Id = x.Id,
                Title = x.Title,
                Slug = x.Slug,
                Description = x.Description,
                CoverImageUrl = x.CoverImageUrl,
                AuthorId = x.AuthorId
            })
            .ToListAsync(ct);

        // 6. N+1 Çözümü: Toplu Yazar İsimlerini Çek (Modüller Arası)
        var authorIds = items.Select(x => x.AuthorId).Distinct().ToList();
        var authorNames = await userAccountProvider.GetDisplayNamesAsync(authorIds, ct);
        var authorSlugs = await userProvider.GetSlugsByUserIdsAsync(authorIds, ct);

        foreach (var item in items)
        {
            if (authorNames.TryGetValue(item.AuthorId, out var name))
            {
                item.AuthorName = name;
            }
            if (authorSlugs.TryGetValue(item.AuthorId, out var slug))
            {
                item.AuthorSlug = slug;
            }
        }

        // 5. PagedResult Oluştur ve Gönder
        var pagedResult = PagedResult<Response>.Create(items, totalCount, req.PageNumber, req.PageSize);
        
        await Send.ResponseAsync(Result<PagedResult<Response>>.Success(pagedResult), 200, ct);
    }
}

