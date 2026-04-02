using FastEndpoints;
using Epiknovel.Modules.Books.Features.Books.Queries.GetBookDetail;
using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Modules.Books.Endpoints.GetBook;

public class Endpoint(IMediator mediator) : Endpoint<Request, Result<Response>>
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

        var result = await mediator.Send(new GetBookDetailQuery(req.Slug, requestingUserId), ct);

        if (!result.IsSuccess)
        {
            await Send.ResponseAsync(Result<Response>.Failure(result.Message), 404, ct);
            return;
        }

        var detail = result.Data!;
        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Id = detail.Id,
            Title = detail.Title,
            Slug = detail.Slug,
            Description = detail.Description,
            CoverImageUrl = detail.CoverImageUrl,
            AuthorId = detail.AuthorId,
            AuthorName = detail.AuthorName,
            Status = detail.Status,
            ContentRating = detail.ContentRating,
            Type = detail.Type,
            VoteCount = detail.VoteCount,
            AverageRating = detail.AverageRating,
            ViewCount = detail.ViewCount,
            CreatedAt = detail.CreatedAt,
            Categories = detail.Categories.Select(c => new CategoryDto { Id = c.Id, Name = c.Name, Slug = c.Slug }).ToList(),
            Tags = detail.Tags
        }), 200, ct);
    }
}
