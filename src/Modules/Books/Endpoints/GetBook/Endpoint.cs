using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Books.Endpoints.GetBook;

public class Endpoint(BooksDbContext dbContext) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Get("/books/{Slug}");
        AllowAnonymous();
        Summary(s => {
            s.Summary = "Bir kitabın detaylarını getirir.";
            s.Description = "SEO uyumlu Slug üzerinden kitap bilgilerini, kategorileri ve etiketleri döner.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var requestingUserIdValue = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var requestingUserId = Guid.TryParse(requestingUserIdValue, out var parsedRequestingUserId)
            ? parsedRequestingUserId
            : Guid.Empty;

        var book = await dbContext.Books
            .AsNoTracking()
            .Include(x => x.Categories)
            .Include(x => x.Tags)
            .FirstOrDefaultAsync(x => x.Slug == req.Slug && !x.IsHidden, ct);

        if (book == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Kitap bulunamadı."), 404, ct);
            return;
        }

        var isOwner = requestingUserId != Guid.Empty && book.AuthorId == requestingUserId;
        if (book.Status == Modules.Books.Domain.BookStatus.Draft && !isOwner)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Kitap bulunamadı."), 404, ct);
            return;
        }

        var response = new Response
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

        await Send.ResponseAsync(Result<Response>.Success(response), 200, ct);
    }
}
