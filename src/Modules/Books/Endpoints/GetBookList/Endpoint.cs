using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Shared.Core.Models;

using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Books.Endpoints.GetBookList;

public class Endpoint(
    BooksDbContext dbContext, 
    IUserAccountProvider userAccountProvider, 
    IUserProvider userProvider,
    StackExchange.Redis.IConnectionMultiplexer redis) : Endpoint<Request, Result<PagedResult<Response>>>
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
            .Where(x => !x.IsHidden)
            .AsQueryable();
        Guid? filteredAuthorId = null;
        var requestingUserIdValue = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var requestingUserId = Guid.TryParse(requestingUserIdValue, out var parsedRequestingUserId)
            ? parsedRequestingUserId
            : Guid.Empty;

        // 2. Filtreler
        if (!string.IsNullOrWhiteSpace(req.Search))
        {
            var search = req.Search.Trim().ToLower();
            query = query.Where(x => x.Title.ToLower().Contains(search) || x.Description.ToLower().Contains(search));
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

            filteredAuthorId = authorId.Value;
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
            // Varsayılan olarak sadece yayınlanmış kitaplar halka açıktır.
            // Ancak giriş yapan kullanıcı kendi authorSlug filtresiyle sorgu yapıyorsa
            // taslak / ongoing dahil tüm kitaplarını görebilmelidir.
            var isOwnerRequest = filteredAuthorId.HasValue && requestingUserId != Guid.Empty && filteredAuthorId.Value == requestingUserId;
            if (!isOwnerRequest)
            {
                query = query.Where(x => x.Status != Epiknovel.Modules.Books.Domain.BookStatus.Draft);
            }
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
        var itemsWithIds = await query
            .Include(x => x.Categories)
            .Skip((req.PageNumber - 1) * req.PageSize)
            .Take(req.PageSize)
            .Select(x => new 
            {
                Id = x.Id,
                AuthorId = x.AuthorId,
                Res = new Response
                {
                    Title = x.Title,
                    Slug = x.Slug,
                    Description = x.Description,
                    CoverImageUrl = x.CoverImageUrl,
                    Status = x.Status,
                    Type = x.Type,
                    ContentRating = x.ContentRating,
                    IsEditorChoice = x.IsEditorChoice,
                    ViewCount = x.ViewCount,
                    AverageRating = x.AverageRating,
                    ChapterCount = dbContext.Chapters.Count(c => c.BookId == x.Id && c.Status == Epiknovel.Modules.Books.Domain.ChapterStatus.Published),
                    CategoryNames = x.Categories.Select(c => c.Name).ToList()
                }
            })
            .ToListAsync(ct);

        // 🚀 Redis üzerinden anlık hitleri bindir (Batch Query)
        try 
        {
            var db = redis.GetDatabase();
            var keys = itemsWithIds.Select(x => (StackExchange.Redis.RedisKey)$"book:hits:{x.Id}").ToArray();
            if (keys.Length > 0)
            {
                var redisHits = await db.StringGetAsync(keys);
                for (int i = 0; i < itemsWithIds.Count; i++)
                {
                    if (redisHits[i].HasValue)
                    {
                        itemsWithIds[i].Res.ViewCount += (long)redisHits[i];
                    }
                }
            }
        } catch { }

        // 6. N+1 Çözümü: Toplu Yazar İsimlerini Çek (Modüller Arası)
        var authorIds = itemsWithIds.Select(x => x.AuthorId).Distinct().ToList();
        var authorNames = await userAccountProvider.GetDisplayNamesAsync(authorIds, ct);
        var authorSlugs = await userProvider.GetSlugsByUserIdsAsync(authorIds, ct);

        foreach (var item in itemsWithIds)
        {
            if (authorNames.TryGetValue(item.AuthorId, out var name))
            {
                item.Res.AuthorName = name;
            }
            if (authorSlugs.TryGetValue(item.AuthorId, out var slug))
            {
                item.Res.AuthorSlug = slug;
            }
        }

        var items = itemsWithIds.Select(x => x.Res).ToList();

        // 5. PagedResult Oluştur ve Gönder
        var pagedResult = PagedResult<Response>.Create(items, totalCount, req.PageNumber, req.PageSize);
        
        await Send.ResponseAsync(Result<PagedResult<Response>>.Success(pagedResult), 200, ct);
    }
}

