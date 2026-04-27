using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces;
using System.Security.Claims;

namespace Epiknovel.Modules.Books.Endpoints.GetMyChapters;

public class Endpoint(BooksDbContext dbContext, IUserAccountProvider userAccountProvider) : Endpoint<Request, Result<PagedResult<Response>>>
{
    public override void Configure()
    {
        Get("/books/mine/{BookSlug}/chapters"); // ?pageNumber=1&pageSize=10
        Policies(PolicyNames.AuthorPanelAccess);
        Summary(s => {
            s.Summary = "Yazarın kendi kitabına ait bölümleri listeler.";
            s.Description = "Sayfalama, arama ve filtreleme desteği ile sadece yetkili olunan kitabın bölümlerini döner.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdValue = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdValue, out var userId))
        {
            await Send.ResponseAsync(Result<PagedResult<Response>>.Failure("Unauthorized"), 401, ct);
            return;
        }

        // 1. Sahiplik ve Ekip Kontrolü (Book bazlı)
        var bookInfo = await dbContext.Books
            .IgnoreQueryFilters()
            .Where(x => x.Slug.ToLower() == req.BookSlug.ToLower())
            .Select(x => new { x.Id, x.AuthorId, x.IsDeleted })
            .FirstOrDefaultAsync(ct);

        if (bookInfo == null)
        {
            await Send.ResponseAsync(Result<PagedResult<Response>>.Failure("Kitap bulunamadı."), 404, ct);
            return;
        }

        var isMember = await dbContext.BookMembers.AnyAsync(m => m.BookId == bookInfo.Id && m.UserId == userId, ct);
        bool isAdmin = User.IsInRole(RoleNames.Admin) || User.IsInRole(RoleNames.Mod) || User.IsInRole(RoleNames.SuperAdmin);

        if (bookInfo.AuthorId != userId && !isMember && !isAdmin)
        {
            await Send.ResponseAsync(Result<PagedResult<Response>>.Failure("Bu işlem için yetkiniz bulunmuyor."), 403, ct);
            return;
        }

        // 2. Query İnşası
        bool filterIsDeleted = req.OnlyDeleted;
        Console.WriteLine($"[DEBUG_CHAPTERS] OnlyDeleted parameter: {req.OnlyDeleted}");
        Console.Out.Flush();
        
        var query = dbContext.Chapters
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(x => x.BookId == bookInfo.Id && x.IsDeleted == filterIsDeleted);

        // Arama (Başlık)
        if (!string.IsNullOrWhiteSpace(req.Search))
        {
            var search = req.Search.ToLower().Trim();
            query = query.Where(x => x.Title.ToLower().Contains(search));
        }

        // Filtreleme (Durum)
        if (req.Status.HasValue)
        {
            query = query.Where(x => x.Status == req.Status.Value);
        }

        // 3. Paging & Fetch
        var totalCount = await query.CountAsync(ct);
        var dbChapters = await query
            .OrderBy(x => x.Order)
            .ThenByDescending(x => x.CreatedAt)
            .Skip((req.PageNumber - 1) * req.PageSize)
            .Take(req.PageSize)
            .Select(x => new 
            {
                x.Id,
                x.IsDeleted,
                x.Title,
                x.Slug,
                x.Order,
                x.WordCount,
                x.Status,
                x.Price,
                x.IsFree,
                x.ViewCount,
                x.CreatedAt,
                x.PublishedAt,
                x.ScheduledPublishDate,
                x.UserId
            })
            .ToListAsync(ct);

        // Yazarları Getir
        var userIds = dbChapters.Select(x => x.UserId).Distinct().ToArray();
        var userDisplayNames = await userAccountProvider.GetDisplayNamesAsync(userIds, ct);

        var chapters = dbChapters.Select(x => new Response
        {
            Id = x.Id,
            IsDeleted = x.IsDeleted,
            Title = x.Title,
            Slug = x.Slug,
            Order = x.Order,
            WordCount = x.WordCount,
            Status = x.Status,
            Price = x.Price,
            IsFree = x.IsFree,
            ViewCount = x.ViewCount,
            CreatedAt = x.CreatedAt,
            PublishedAt = x.PublishedAt,
            ScheduledPublishDate = x.ScheduledPublishDate,
            AuthorName = userDisplayNames.TryGetValue(x.UserId, out var name) ? name : "Yazar"
        }).ToList();

        var pagedResult = PagedResult<Response>.Create(chapters, totalCount, req.PageNumber, req.PageSize);
        await Send.ResponseAsync(Result<PagedResult<Response>>.Success(pagedResult), 200, ct);
    }
}
