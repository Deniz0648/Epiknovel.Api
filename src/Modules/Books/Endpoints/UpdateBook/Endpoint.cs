using FastEndpoints;
using Epiknovel.Modules.Books.Features.Books.Commands.UpdateBook;
using Epiknovel.Shared.Core.Models;
using MediatR;
using Microsoft.AspNetCore.OutputCaching;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;

namespace Epiknovel.Modules.Books.Endpoints.UpdateBook;

[AuditLog("Kitap Güncellendi")]
public class Endpoint(IMediator mediator, IOutputCacheStore cacheStore) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Put("/books/{Id}");
        Policies(PolicyNames.AuthorContentAccess);
        Summary(s => {
            s.Summary = "Mevcut bir kitabı günceller.";
            s.Description = "Kitap başlığı değişirse Slug otomatik olarak yeniden üretilir. BOLA korumalıdır.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // req.Id comes from route, req.UserId is automatically populated/validated by BOLAValidationPreProcessor
        
        var result = await mediator.Send(new UpdateBookCommand
        {
            Id = req.Id,
            UserId = req.UserId,
            IsAdmin = User.IsInRole(RoleNames.Admin),
            Title = req.Title,
            Description = req.Description,
            CoverImageUrl = req.CoverImageUrl,
            Status = req.Status,
            ContentRating = req.ContentRating,
            Type = req.Type,
            OriginalAuthorName = req.OriginalAuthorName,
            CategoryIds = req.CategoryIds,
            Tags = req.Tags
        }, ct);

        if (!result.IsSuccess)
        {
            var statusCode = result.Message.Contains("bulunmadı") ? 404 : 403;
            await Send.ResponseAsync(Result<Response>.Failure(result.Message), statusCode, ct);
            return;
        }

        // Cache eviction for book detail page
        await cacheStore.EvictByTagAsync("BookCache", ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Message = result.Data!.Message,
            Slug = result.Data.Slug
        }), 200, ct);
    }
}
