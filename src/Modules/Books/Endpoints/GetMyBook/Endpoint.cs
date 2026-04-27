using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Constants;

namespace Epiknovel.Modules.Books.Endpoints.GetMyBook;

public class Endpoint(BooksDbContext dbContext) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Get("/books/mine/{Slug}");
        Policies(PolicyNames.AuthorPanelAccess);
        Summary(s => {
            s.Summary = "Yazarın kendi kitap detaylarını getirir.";
            s.Description = "Sahiplik kontrolü yapar ve yazara özel yönetim bilgilerini içeren detaylı kitap bilgisini döner.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdValue = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdValue, out var userId))
        {
            await Send.ResponseAsync(Result<Response>.Failure("Unauthorized"), 401, ct);
            return;
        }

        var slug = req.Slug.ToLower().Trim();
        var book = await dbContext.Books
            .IgnoreQueryFilters()
            .Include(x => x.Categories)
            .Include(x => x.Tags)
            .Include(x => x.Chapters)
            .AsNoTracking()
            .AsSplitQuery()
            .FirstOrDefaultAsync(x => x.Slug.ToLower() == slug, ct);

        if (book == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Kitap bulunamadı."), 404, ct);
            return;
        }

        var isMember = await dbContext.BookMembers.AnyAsync(m => m.BookId == book.Id && m.UserId == userId, ct);
        bool isAdmin = User.IsInRole(RoleNames.Admin) || User.IsInRole(RoleNames.Mod) || User.IsInRole(RoleNames.SuperAdmin);
        
        if (book.AuthorId != userId && !isMember && !isAdmin)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Bu işlem için yetkiniz bulunmuyor."), 403, ct);
            return;
        }

        var response = new Response
        {
            Id = book.Id,
            Title = book.Title,
            Slug = book.Slug,
            Description = book.Description,
            CoverImageUrl = book.CoverImageUrl,
            Status = book.Status.ToString(),
            ContentRating = book.ContentRating.ToString(),
            Type = book.Type.ToString(),
            OriginalAuthorName = book.OriginalAuthorName,
            AuthorId = book.AuthorId,
            ChapterCount = book.Chapters.Count(c => !c.IsDeleted),
            ViewCount = book.ViewCount,
            AverageRating = book.AverageRating,
            VoteCount = book.VoteCount,
            CreatedAt = book.CreatedAt,
            UpdatedAt = book.UpdatedAt,
            Categories = book.Categories.Select(c => new CategoryDto { Id = c.Id, Name = c.Name, Slug = c.Slug }).ToList(),
            Tags = book.Tags.Select(t => t.Name).ToList()
        };

        await Send.ResponseAsync(Result<Response>.Success(response), 200, ct);
    }
}
