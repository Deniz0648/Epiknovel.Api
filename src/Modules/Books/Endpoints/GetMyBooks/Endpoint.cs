using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Books.Endpoints.GetMyBooks;

public class Endpoint(
    BooksDbContext dbContext,
    StackExchange.Redis.IConnectionMultiplexer redis) : Endpoint<Request, Result<PagedResult<Response>>>
{
    public override void Configure()
    {
        Get("/books/mine");
        Policies(PolicyNames.AuthorPanelAccess);
        Summary(s =>
        {
            s.Summary = "Oturum sahibinin kitaplarını listeler.";
            s.Description = "Yazar paneli için güvenli, sayfalı ve filtrelenebilir kitap listesi döndürür.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdValue = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdValue, out var userId))
        {
            await Send.ResponseAsync(Result<PagedResult<Response>>.Failure("Unauthorized"), 401, ct);
            return;
        }

        var pageNumber = req.PageNumber;
        var pageSize = req.PageSize;

        bool filterIsDeleted = req.OnlyDeleted;
        
        var query = dbContext.Books
            .IgnoreQueryFilters()
            .Where(x => x.IsDeleted == filterIsDeleted && (x.AuthorId == userId || x.Members.Any(m => m.UserId == userId)));

        if (!string.IsNullOrWhiteSpace(req.Search))
        {
            query = query.Where(x => x.Title.Contains(req.Search) || x.Description.Contains(req.Search));
        }

        if (req.Status.HasValue)
        {
            query = query.Where(x => x.Status == req.Status.Value);
        }

        if (req.Type.HasValue)
        {
            query = query.Where(x => x.Type == req.Type.Value);
        }

        query = (req.SortBy, req.SortDescending) switch
        {
            ("CreatedAt", true) => query.OrderByDescending(x => x.CreatedAt),
            ("CreatedAt", false) => query.OrderBy(x => x.CreatedAt),
            ("Title", true) => query.OrderByDescending(x => x.Title),
            ("Title", false) => query.OrderBy(x => x.Title),
            ("Status", true) => query.OrderByDescending(x => x.Status),
            ("Status", false) => query.OrderBy(x => x.Status),
            ("UpdatedAt", false) => query.OrderBy(x => x.UpdatedAt),
            _ => query.OrderByDescending(x => x.UpdatedAt)
        };

        var totalCount = await query.CountAsync(ct);

        var items = await query
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new Response
            {
                Id = x.Id,
                IsDeleted = x.IsDeleted,
                Title = x.Title,
                Slug = x.Slug,
                Description = x.Description,
                CoverImageUrl = x.CoverImageUrl,
                Status = x.Status,
                ContentRating = x.ContentRating,
                Type = x.Type,
                ChapterCount = x.Chapters.Count(c => !c.IsDeleted),
                ViewCount = x.ViewCount,
                AverageRating = x.AverageRating,
                VoteCount = x.VoteCount,
                Categories = x.Categories.Select(c => new BookCategoryResponse
                {
                    Id = c.Id,
                    Name = c.Name,
                    Slug = c.Slug
                }).ToList(),
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt ?? x.CreatedAt
            })
            .ToListAsync(ct);
            
        // 🚀 Redis üzerinden anlık hitleri bindir
        try 
        {
            var db = redis.GetDatabase();
            var keys = items.Select(x => (StackExchange.Redis.RedisKey)$"book:hits:{x.Id}").ToArray();
            if (keys.Length > 0)
            {
                var redisHits = await db.StringGetAsync(keys);
                for (int i = 0; i < items.Count; i++)
                {
                    if (redisHits[i].HasValue)
                    {
                        items[i].ViewCount += (long)redisHits[i];
                    }
                }
            }
        } catch { }

        var pagedResult = PagedResult<Response>.Create(items, totalCount, pageNumber, pageSize);
        await Send.ResponseAsync(Result<PagedResult<Response>>.Success(pagedResult), 200, ct);
    }
}
