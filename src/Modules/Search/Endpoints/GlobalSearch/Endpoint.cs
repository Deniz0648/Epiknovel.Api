using FastEndpoints;
using Epiknovel.Modules.Search.Features.GlobalSearch.Queries;
using Epiknovel.Shared.Core.Models;
using MediatR;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Builder;
using Epiknovel.Modules.Search.Domain;

namespace Epiknovel.Modules.Search.Endpoints.GlobalSearch;

public record Request
{
    public string Q { get; set; } = string.Empty;
    public DocumentType? Type { get; set; } 
    public int Page { get; set; } = 1;
    public int Size { get; set; } = 20;
}

public class Endpoint(IMediator mediator) : Endpoint<Request, Result<GlobalSearchResponse>>
{
    public override void Configure()
    {
        Get("/search");
        AllowAnonymous();
        Options(x => x.RequireRateLimiting("GlobalPolicy")); 
        Summary(s => {
            s.Summary = "Global arama yap.";
            s.Description = "PostgreSQL Full-Text Search altyapısını kullanarak site genelinde kitap, yazar ve kategori araması yapar. MediatR standardı uygulanmıştır.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userId = User.Identity?.IsAuthenticated == true 
            ? User.FindFirstValue(ClaimTypes.NameIdentifier) 
            : null;

        var result = await mediator.Send(new GlobalSearchQuery(
            req.Q,
            req.Type,
            req.Page,
            req.Size,
            userId
        ), ct);

        if (!result.IsSuccess)
        {
            await Send.ResponseAsync(Result<GlobalSearchResponse>.Failure(result.Message), 400, ct);
            return;
        }

        await Send.ResponseAsync(result, 200, ct);
    }
}
